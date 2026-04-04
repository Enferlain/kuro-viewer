mod schema_validation;

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{Emitter, Manager};
use zip::ZipArchive;

use crate::plugin_manifest::{is_valid_plugin_id, validate_plugin_manifest_json, PluginManifest};
pub(crate) use schema_validation::validate_plugin_settings_schema_json;
#[cfg(test)]
use schema_validation::MAX_SETTINGS_SCHEMA_SECTIONS;

/// Maximum number of entries allowed in a .plugin archive.
const MAX_ARCHIVE_ENTRIES: usize = 500;

/// Maximum total uncompressed size allowed (50 MiB).
const MAX_UNCOMPRESSED_BYTES: u64 = 50 * BYTES_PER_MIB;

/// Maximum size for settings.schema.json reads (512 KiB).
const MAX_SETTINGS_SCHEMA_BYTES: u64 = 512 * 1024;

const BYTES_PER_MIB: u64 = 1024 * 1024;
const PLUGIN_INDEX_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
struct PluginInstallIndex {
    schema_version: u32,
    plugins: BTreeMap<String, PluginInstallRecord>,
}

impl Default for PluginInstallIndex {
    fn default() -> Self {
        Self {
            schema_version: PLUGIN_INDEX_SCHEMA_VERSION,
            plugins: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct PluginInstallRecord {
    id: String,
    version: String,
    installed_at_unix_ms: u64,
    source_filename: String,
    archive_sha256: String,
}

fn plugins_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    Ok(dir.join("plugins"))
}

fn plugin_index_path(plugins_root: &Path) -> PathBuf {
    plugins_root.join("index.json")
}

fn current_unix_timestamp_ms() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("system clock error: {e}"))
        .map(|duration| duration.as_millis() as u64)
}

fn hex_encode_lower(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(&mut output, "{byte:02x}");
    }
    output
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file =
        fs::File::open(path).map_err(|e| format!("failed to open archive for hashing: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 8192];

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("failed to hash archive {}: {e}", path.display()))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex_encode_lower(&hasher.finalize()))
}

fn read_plugin_index(plugins_root: &Path) -> Result<PluginInstallIndex, String> {
    let index_path = plugin_index_path(plugins_root);
    if !index_path.exists() {
        return Ok(PluginInstallIndex::default());
    }

    let json = fs::read_to_string(&index_path)
        .map_err(|e| format!("failed to read plugin install index: {e}"))?;
    let index: PluginInstallIndex = serde_json::from_str(&json)
        .map_err(|e| format!("plugin install index is invalid JSON: {e}"))?;

    if index.schema_version != PLUGIN_INDEX_SCHEMA_VERSION {
        return Err(format!(
            "plugin install index schema_version '{}' is unsupported; expected {}",
            index.schema_version, PLUGIN_INDEX_SCHEMA_VERSION
        ));
    }

    for (id, record) in &index.plugins {
        if id != &record.id {
            return Err(format!(
                "plugin install index entry key '{id}' does not match embedded id '{}'",
                record.id
            ));
        }
    }

    Ok(index)
}

fn write_plugin_index(plugins_root: &Path, index: &PluginInstallIndex) -> Result<(), String> {
    fs::create_dir_all(plugins_root)
        .map_err(|e| format!("failed to ensure plugin index directory exists: {e}"))?;

    let index_path = plugin_index_path(plugins_root);
    let temp_path = plugins_root.join(".index.json.tmp");
    let json = serde_json::to_vec_pretty(index)
        .map_err(|e| format!("failed to serialize plugin install index: {e}"))?;

    fs::write(&temp_path, json)
        .map_err(|e| format!("failed to write temporary plugin install index: {e}"))?;

    if index_path.exists() {
        fs::remove_file(&index_path)
            .map_err(|e| format!("failed to replace plugin install index: {e}"))?;
    }

    if let Err(error) = fs::rename(&temp_path, &index_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("failed to finalize plugin install index: {error}"));
    }

    Ok(())
}

fn update_plugin_index_after_install(
    plugins_root: &Path,
    archive_path: &Path,
    manifest: &PluginManifest,
) -> Result<(), String> {
    let mut index = read_plugin_index(plugins_root)?;
    let installed_at_unix_ms = current_unix_timestamp_ms()?;
    let archive_sha256 = sha256_file(archive_path)?;
    let source_filename = archive_path
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| archive_path.display().to_string());

    index.plugins.insert(
        manifest.id.clone(),
        PluginInstallRecord {
            id: manifest.id.clone(),
            version: manifest.version.clone(),
            installed_at_unix_ms,
            source_filename,
            archive_sha256,
        },
    );

    write_plugin_index(plugins_root, &index)
}

fn update_plugin_index_after_uninstall(plugins_root: &Path, plugin_id: &str) -> Result<(), String> {
    let mut index = read_plugin_index(plugins_root)?;
    if index.plugins.remove(plugin_id).is_none() && !plugin_index_path(plugins_root).exists() {
        return Ok(());
    }

    write_plugin_index(plugins_root, &index)
}

fn require_plugin_archive_extension(path: &Path) -> Result<(), String> {
    let has_plugin_extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("plugin"))
        .unwrap_or(false);

    if !has_plugin_extension {
        return Err(format!(
            "invalid plugin archive '{}': file extension must be .plugin",
            path.display()
        ));
    }

    Ok(())
}

/// Validate a plugin ID for safe use in filesystem paths.
fn require_valid_plugin_id(plugin_id: &str) -> Result<(), String> {
    if !is_valid_plugin_id(plugin_id) {
        return Err(format!(
            "invalid plugin id '{plugin_id}': must be kebab-case (a-z, 0-9, '-'), 3-64 chars"
        ));
    }
    Ok(())
}

/// Enforce archive resource limits to prevent zip-bomb/DoS attacks.
/// Fails closed: any entry read error is treated as a rejection.
fn check_archive_limits<R: std::io::Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<(), String> {
    let entry_count = archive.len();
    if entry_count > MAX_ARCHIVE_ENTRIES {
        return Err(format!(
            "archive has {entry_count} entries, maximum is {MAX_ARCHIVE_ENTRIES}"
        ));
    }

    let mut total_size: u64 = 0;
    for i in 0..entry_count {
        let entry = archive
            .by_index(i)
            .map_err(|e| format!("failed to read archive entry {i} during preflight: {e}"))?;

        total_size = total_size
            .checked_add(entry.size())
            .ok_or_else(|| "archive uncompressed size overflows u64".to_string())?;

        if total_size > MAX_UNCOMPRESSED_BYTES {
            return Err(format!(
                "archive uncompressed size exceeds {} MiB limit",
                MAX_UNCOMPRESSED_BYTES / BYTES_PER_MIB
            ));
        }
    }

    Ok(())
}

/// Extract archive into a target directory.
/// Enforces a runtime byte cap during extraction (defense-in-depth
/// beyond the preflight metadata check).
fn extract_archive<R: std::io::Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    target_dir: &Path,
) -> Result<(), String> {
    let mut total_extracted: u64 = 0;
    let mut buffer = [0_u8; 8192];

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("failed to read archive entry: {e}"))?;

        if entry.is_symlink() {
            return Err("archive contains symlink entry".to_string());
        }

        let entry_name = entry
            .enclosed_name()
            .ok_or_else(|| "archive contains unsafe path".to_string())?;

        let target = target_dir.join(entry_name);

        if entry.is_dir() {
            fs::create_dir_all(&target)
                .map_err(|e| format!("failed to create directory {}: {e}", target.display()))?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(|e| {
                    format!(
                        "failed to create parent directory {}: {e}",
                        parent.display()
                    )
                })?;
            }

            let mut out = fs::File::create(&target)
                .map_err(|e| format!("failed to create file {}: {e}", target.display()))?;
            loop {
                let bytes_read = entry
                    .read(&mut buffer)
                    .map_err(|e| format!("failed to extract {}: {e}", target.display()))?;
                if bytes_read == 0 {
                    break;
                }

                let next_total = total_extracted
                    .checked_add(bytes_read as u64)
                    .ok_or_else(|| "extracted bytes overflow u64".to_string())?;

                if next_total > MAX_UNCOMPRESSED_BYTES {
                    return Err(format!(
                        "extraction exceeded {} MiB runtime limit",
                        MAX_UNCOMPRESSED_BYTES / BYTES_PER_MIB
                    ));
                }

                out.write_all(&buffer[..bytes_read]).map_err(|e| {
                    format!("failed to write extracted file {}: {e}", target.display())
                })?;
                total_extracted = next_total;
            }
        }
    }

    Ok(())
}

/// Re-validate the extracted manifest and ensure full equality with the pre-validated one.
/// Guards against duplicate plugin.json entries in the archive where the final
/// extracted copy differs from the one read via `by_name("plugin.json")`.
fn verify_extracted_manifest(staging_dir: &Path, expected: &PluginManifest) -> Result<(), String> {
    let manifest_path = staging_dir.join("plugin.json");
    let json = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("extracted archive is missing or unreadable plugin.json: {e}"))?;

    let extracted = validate_plugin_manifest_json(&json)?;

    if extracted != *expected {
        return Err(
			"extracted manifest does not match pre-validated manifest (possible duplicate plugin.json in archive)".to_string()
		);
    }

    Ok(())
}

fn read_plugin_settings_schema_in_dir(
    plugins_root: &Path,
    plugin_id: &str,
) -> Result<Option<String>, String> {
    require_valid_plugin_id(plugin_id)?;

    let install_dir = plugins_root.join(plugin_id);
    if !install_dir.exists() {
        return Ok(None);
    }

    let manifest_path = install_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err(format!(
            "directory for '{plugin_id}' is missing plugin.json — refusing to read schema"
        ));
    }

    let schema_path = install_dir.join("settings.schema.json");
    if !schema_path.exists() {
        return Ok(None);
    }

    let schema_metadata = fs::metadata(&schema_path)
        .map_err(|e| format!("failed to read schema metadata for '{plugin_id}': {e}"))?;
    if schema_metadata.len() > MAX_SETTINGS_SCHEMA_BYTES {
        return Err(format!(
            "settings schema for '{plugin_id}' exceeds {} KiB limit",
            MAX_SETTINGS_SCHEMA_BYTES / 1024
        ));
    }

    let schema_json = fs::read_to_string(&schema_path)
        .map_err(|e| format!("failed to read settings schema for '{plugin_id}': {e}"))?;
    Ok(Some(schema_json))
}

fn read_manifest_from_archive<R: std::io::Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<PluginManifest, String> {
    let mut manifest_file = archive
        .by_name("plugin.json")
        .map_err(|_| "archive is missing plugin.json".to_string())?;

    let mut manifest_json = String::new();
    manifest_file
        .read_to_string(&mut manifest_json)
        .map_err(|e| format!("failed to read plugin.json: {e}"))?;

    validate_plugin_manifest_json(&manifest_json)
}

fn inspect_plugin_manifest_path(archive_path: &Path) -> Result<PluginManifest, String> {
    require_plugin_archive_extension(archive_path)?;

    if !archive_path.exists() {
        return Err(format!("file not found: {}", archive_path.display()));
    }

    let file = fs::File::open(archive_path).map_err(|e| format!("failed to open archive: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("invalid .plugin archive: {e}"))?;

    check_archive_limits(&mut archive)?;
    read_manifest_from_archive(&mut archive)
}

/// Core installer logic that does not require Tauri types.
fn install_plugin_in_dir(
    plugins_root: &Path,
    archive_path: &Path,
) -> Result<PluginManifest, String> {
    let mut rename = |from: &Path, to: &Path| fs::rename(from, to);
    install_plugin_in_dir_with_rename(plugins_root, archive_path, &mut rename)
}

fn install_plugin_in_dir_with_rename<F>(
    plugins_root: &Path,
    archive_path: &Path,
    rename_fn: &mut F,
) -> Result<PluginManifest, String>
where
    F: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    require_plugin_archive_extension(archive_path)?;

    if !archive_path.exists() {
        return Err(format!("file not found: {}", archive_path.display()));
    }

    let file = fs::File::open(archive_path).map_err(|e| format!("failed to open archive: {e}"))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("invalid .plugin archive: {e}"))?;

    check_archive_limits(&mut archive)?;
    let manifest = read_manifest_from_archive(&mut archive)?;

    // Determine install paths
    let install_dir = plugins_root.join(&manifest.id);
    let staging_dir = plugins_root.join(format!(".staging-{}", &manifest.id));
    let backup_dir = plugins_root.join(format!(".backup-{}", &manifest.id));

    // Check for existing installation
    if install_dir.exists() {
        let existing_manifest_path = install_dir.join("plugin.json");
        if existing_manifest_path.exists() {
            if let Ok(existing_json) = fs::read_to_string(&existing_manifest_path) {
                if let Ok(existing) = validate_plugin_manifest_json(&existing_json) {
                    if existing.version == manifest.version {
                        return Err(format!(
                            "plugin '{}' v{} is already installed",
                            manifest.id, manifest.version
                        ));
                    }
                }
            }
        }
    }

    // Clean up any leftover staging/backup directories
    if staging_dir.exists() {
        let _ = fs::remove_dir_all(&staging_dir);
    }
    if backup_dir.exists() {
        let _ = fs::remove_dir_all(&backup_dir);
    }

    // Extract to staging directory first
    fs::create_dir_all(&staging_dir)
        .map_err(|e| format!("failed to create staging directory: {e}"))?;

    if let Err(e) = extract_archive(&mut archive, &staging_dir) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(format!("extraction failed: {e}"));
    }

    // Re-validate extracted manifest matches pre-validated one
    if let Err(e) = verify_extracted_manifest(&staging_dir, &manifest) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(format!("post-extraction verification failed: {e}"));
    }

    // Atomic upgrade: backup old → rename staging → cleanup backup
    if install_dir.exists() {
        // Step 1: Move old install to backup
        rename_fn(&install_dir, &backup_dir).map_err(|e| {
            let _ = fs::remove_dir_all(&staging_dir);
            format!("failed to back up old plugin version: {e}")
        })?;

        // Step 2: Move staging to install
        if let Err(finalize_err) = rename_fn(&staging_dir, &install_dir) {
            // Rollback: restore backup
            let rollback_result = rename_fn(&backup_dir, &install_dir);
            let _ = fs::remove_dir_all(&staging_dir);
            return Err(match rollback_result {
                Ok(()) => format!(
					"failed to finalize plugin installation: {finalize_err}; rollback restored previous version"
				),
                Err(rollback_err) => format!(
					"failed to finalize plugin installation: {finalize_err}; rollback also failed: {rollback_err}"
				),
            });
        }

        // Step 3: Remove backup (best effort)
        let _ = fs::remove_dir_all(&backup_dir);
    } else {
        // Fresh install: just rename staging to final
        rename_fn(&staging_dir, &install_dir).map_err(|e| {
            let _ = fs::remove_dir_all(&staging_dir);
            format!("failed to finalize plugin installation: {e}")
        })?;
    }

    update_plugin_index_after_install(plugins_root, archive_path, &manifest)?;

    Ok(manifest)
}

/// Core list logic that does not require Tauri types.
fn list_plugins_in_dir(plugins_root: &Path) -> Vec<PluginManifest> {
    if !plugins_root.exists() {
        return Vec::new();
    }

    let mut plugins = Vec::new();
    if let Ok(entries) = fs::read_dir(plugins_root) {
        for entry in entries.flatten() {
            if !entry.path().is_dir() {
                continue;
            }
            // Skip staging/backup directories
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(".staging-") || name.starts_with(".backup-") {
                continue;
            }
            let manifest_path = entry.path().join("plugin.json");
            if let Ok(json) = fs::read_to_string(&manifest_path) {
                if let Ok(manifest) = validate_plugin_manifest_json(&json) {
                    plugins.push(manifest);
                }
            }
        }
    }

    plugins
}

/// Core uninstall logic that does not require Tauri types.
fn uninstall_plugin_in_dir(plugins_root: &Path, plugin_id: &str) -> Result<(), String> {
    // Validate plugin ID before using it in path construction
    require_valid_plugin_id(plugin_id)?;
    let install_dir = plugins_root.join(plugin_id);

    if !install_dir.exists() {
        return Err(format!("plugin '{plugin_id}' is not installed"));
    }

    // Sanity check: ensure the directory contains a plugin.json
    let manifest_path = install_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err(format!(
            "directory for '{plugin_id}' is missing plugin.json — refusing to delete"
        ));
    }

    fs::remove_dir_all(&install_dir)
        .map_err(|e| format!("failed to uninstall plugin '{plugin_id}': {e}"))?;
    update_plugin_index_after_uninstall(plugins_root, plugin_id)?;

    Ok(())
}

/// Inspect a `.plugin` archive without installing it.
/// Validates and returns the manifest after archive preflight checks.
#[tauri::command]
pub fn inspect_plugin_manifest(path: String) -> Result<PluginManifest, String> {
    let archive_path = PathBuf::from(path);
    inspect_plugin_manifest_path(&archive_path)
}

/// Install a `.plugin` archive: validate manifest, extract to `plugins/<id>/`.
/// Returns the validated manifest on success.
#[tauri::command]
pub fn install_plugin(app: tauri::AppHandle, path: String) -> Result<PluginManifest, String> {
    let plugins_root = plugins_dir(&app)?;
    let archive_path = PathBuf::from(path);
    let manifest = install_plugin_in_dir(&plugins_root, &archive_path)?;

    // Emit event to frontend
    if let Err(e) = app.emit("plugin-installed", &manifest) {
        eprintln!("warning: failed to emit plugin-installed event: {e}");
    }

    Ok(manifest)
}

/// List all installed plugins by reading their manifests.
#[tauri::command]
pub fn list_plugins(app: tauri::AppHandle) -> Vec<PluginManifest> {
    let plugins_root = match plugins_dir(&app) {
        Ok(dir) => dir,
        Err(_) => return Vec::new(),
    };

    list_plugins_in_dir(&plugins_root)
}

/// Read settings.schema.json for an installed plugin, if present.
#[tauri::command]
pub fn read_plugin_settings_schema(
    app: tauri::AppHandle,
    plugin_id: String,
) -> Result<Option<String>, String> {
    let plugins_root = plugins_dir(&app)?;
    read_plugin_settings_schema_in_dir(&plugins_root, &plugin_id)
}

/// Validate settings.schema.json for an installed plugin.
#[tauri::command]
pub fn validate_plugin_settings_schema(
    app: tauri::AppHandle,
    plugin_id: String,
) -> Result<(), String> {
    let plugins_root = plugins_dir(&app)?;
    let schema_json = read_plugin_settings_schema_in_dir(&plugins_root, &plugin_id)?
        .ok_or_else(|| format!("plugin '{plugin_id}' does not provide settings.schema.json"))?;
    validate_plugin_settings_schema_json(&schema_json, &plugin_id)
}

/// Uninstall a plugin by its ID.
#[tauri::command]
pub fn uninstall_plugin(app: tauri::AppHandle, plugin_id: String) -> Result<(), String> {
    let plugins_root = plugins_dir(&app)?;
    uninstall_plugin_in_dir(&plugins_root, &plugin_id)?;

    // Emit event to frontend
    if let Err(e) = app.emit("plugin-uninstalled", &plugin_id) {
        eprintln!("warning: failed to emit plugin-uninstalled event: {e}");
    }

    Ok(())
}

#[cfg(test)]
mod tests;

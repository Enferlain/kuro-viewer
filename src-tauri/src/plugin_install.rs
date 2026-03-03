use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use tauri::{Emitter, Manager};
use zip::ZipArchive;

use crate::plugin_manifest::{
	is_valid_plugin_id, validate_plugin_manifest_json, PluginManifest,
};

/// Maximum number of entries allowed in a .plugin archive.
const MAX_ARCHIVE_ENTRIES: usize = 500;

/// Maximum total uncompressed size allowed (50 MiB).
const MAX_UNCOMPRESSED_BYTES: u64 = 50 * BYTES_PER_MIB;

const BYTES_PER_MIB: u64 = 1024 * 1024;

fn plugins_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
	let dir = app
		.path()
		.app_data_dir()
		.map_err(|e| format!("failed to resolve app data dir: {e}"))?;
	Ok(dir.join("plugins"))
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
					format!("failed to create parent directory {}: {e}", parent.display())
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
fn verify_extracted_manifest(
	staging_dir: &Path,
	expected: &PluginManifest,
) -> Result<(), String> {
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

/// Core installer logic that does not require Tauri types.
fn install_plugin_in_dir(plugins_root: &Path, archive_path: &Path) -> Result<PluginManifest, String> {
	if !archive_path.exists() {
		return Err(format!("file not found: {}", archive_path.display()));
	}

	// Open the ZIP archive
	let file =
		fs::File::open(&archive_path).map_err(|e| format!("failed to open archive: {e}"))?;
	let mut archive =
		ZipArchive::new(file).map_err(|e| format!("invalid .plugin archive: {e}"))?;

	// Enforce resource limits before any extraction
	check_archive_limits(&mut archive)?;

	// Read and validate plugin.json from the archive
	let manifest = {
		let mut manifest_file = archive
			.by_name("plugin.json")
			.map_err(|_| "archive is missing plugin.json".to_string())?;

		let mut manifest_json = String::new();
		manifest_file
			.read_to_string(&mut manifest_json)
			.map_err(|e| format!("failed to read plugin.json: {e}"))?;

		validate_plugin_manifest_json(&manifest_json)?
	};

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
		fs::rename(&install_dir, &backup_dir).map_err(|e| {
			let _ = fs::remove_dir_all(&staging_dir);
			format!("failed to back up old plugin version: {e}")
		})?;

		// Step 2: Move staging to install
		if let Err(finalize_err) = fs::rename(&staging_dir, &install_dir) {
			// Rollback: restore backup
			let rollback_result = fs::rename(&backup_dir, &install_dir);
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
		fs::rename(&staging_dir, &install_dir).map_err(|e| {
			let _ = fs::remove_dir_all(&staging_dir);
			format!("failed to finalize plugin installation: {e}")
		})?;
	}

	Ok(manifest)
}

/// Core list logic that does not require Tauri types.
fn list_plugins_in_dir(plugins_root: &Path) -> Vec<PluginManifest> {
	if !plugins_root.exists() {
		return Vec::new();
	}

	let mut plugins = Vec::new();
	if let Ok(entries) = fs::read_dir(&plugins_root) {
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

	Ok(())
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
mod tests {
	use super::*;
	use std::time::{SystemTime, UNIX_EPOCH};
	use zip::write::SimpleFileOptions;
	use zip::ZipWriter;

	fn unique_temp_dir(prefix: &str) -> PathBuf {
		let now = SystemTime::now()
			.duration_since(UNIX_EPOCH)
			.expect("time went backwards")
			.as_nanos();
		let pid = std::process::id();
		let dir = std::env::temp_dir().join(format!("{prefix}-{pid}-{now}"));
		fs::create_dir_all(&dir).expect("failed to create temp dir");
		dir
	}

	fn cleanup_dir(path: &Path) {
		let _ = fs::remove_dir_all(path);
	}

	fn write_plugin_archive(path: &Path, manifest_json: &str) {
		let file = fs::File::create(path).expect("failed to create archive file");
		let mut zip = ZipWriter::new(file);
		let options = SimpleFileOptions::default();
		zip.start_file("plugin.json", options)
			.expect("failed to create plugin.json entry");
		zip.write_all(manifest_json.as_bytes())
			.expect("failed to write plugin.json");
		zip.finish().expect("failed to finalize archive");
	}

	fn manifest_json(version: &str) -> String {
		format!(
			r#"{{
				"schema_version": "1.0.0",
				"id": "sepia-filter",
				"name": "Sepia Filter",
				"version": "{version}",
				"api_version": "1.0.0",
				"min_host_version": "0.1.0",
				"theme_contract": "1.x",
				"backend": "none"
			}}"#
		)
	}

	#[test]
	fn install_list_uninstall_roundtrip() {
		let root = unique_temp_dir("plugin-install-roundtrip");
		let plugins_root = root.join("plugins");
		fs::create_dir_all(&plugins_root).expect("failed to create plugins root");
		let archive_path = root.join("test.plugin");

		write_plugin_archive(&archive_path, &manifest_json("1.0.0"));

		let installed =
			install_plugin_in_dir(&plugins_root, &archive_path).expect("install should succeed");
		assert_eq!(installed.id, "sepia-filter");
		assert!(plugins_root.join("sepia-filter").join("plugin.json").exists());

		let listed = list_plugins_in_dir(&plugins_root);
		assert_eq!(listed.len(), 1);
		assert_eq!(listed[0].id, "sepia-filter");

		uninstall_plugin_in_dir(&plugins_root, "sepia-filter").expect("uninstall should succeed");
		assert!(!plugins_root.join("sepia-filter").exists());

		cleanup_dir(&root);
	}

	#[test]
	fn install_rejects_same_version_when_already_installed() {
		let root = unique_temp_dir("plugin-install-same-version");
		let plugins_root = root.join("plugins");
		fs::create_dir_all(&plugins_root).expect("failed to create plugins root");
		let archive_path = root.join("test.plugin");

		write_plugin_archive(&archive_path, &manifest_json("1.2.3"));

		let first = install_plugin_in_dir(&plugins_root, &archive_path);
		assert!(first.is_ok());

		let second = install_plugin_in_dir(&plugins_root, &archive_path);
		assert!(second.is_err());

		cleanup_dir(&root);
	}

	#[test]
	fn uninstall_rejects_invalid_plugin_id() {
		let root = unique_temp_dir("plugin-uninstall-invalid-id");
		let plugins_root = root.join("plugins");
		fs::create_dir_all(&plugins_root).expect("failed to create plugins root");

		let result = uninstall_plugin_in_dir(&plugins_root, "../escape");
		assert!(result.is_err());

		cleanup_dir(&root);
	}

	#[test]
	fn list_plugins_skips_staging_and_backup_dirs() {
		let root = unique_temp_dir("plugin-list-skip-dirs");
		let plugins_root = root.join("plugins");
		fs::create_dir_all(&plugins_root).expect("failed to create plugins root");

		let valid_dir = plugins_root.join("sepia-filter");
		fs::create_dir_all(&valid_dir).expect("failed to create valid plugin dir");
		fs::write(valid_dir.join("plugin.json"), manifest_json("1.0.0"))
			.expect("failed to write valid manifest");

		let staging_dir = plugins_root.join(".staging-sepia-filter");
		fs::create_dir_all(&staging_dir).expect("failed to create staging dir");
		fs::write(staging_dir.join("plugin.json"), manifest_json("1.0.0"))
			.expect("failed to write staging manifest");

		let backup_dir = plugins_root.join(".backup-sepia-filter");
		fs::create_dir_all(&backup_dir).expect("failed to create backup dir");
		fs::write(backup_dir.join("plugin.json"), manifest_json("1.0.0"))
			.expect("failed to write backup manifest");

		let listed = list_plugins_in_dir(&plugins_root);
		assert_eq!(listed.len(), 1);
		assert_eq!(listed[0].id, "sepia-filter");

		cleanup_dir(&root);
	}
}

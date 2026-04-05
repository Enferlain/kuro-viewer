use crate::plugin_install::validate_plugin_settings_schema_json;
use crate::plugin_manifest::validate_plugin_manifest_json;
use std::collections::BTreeMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

#[derive(Debug, Clone)]
pub struct PackWorkspacePluginResult {
    pub archive_path: PathBuf,
    pub included_entries: Vec<String>,
}

const IGNORED_DIR_NAMES: &[&str] = &["src", "node_modules", "target", ".git", ".build", "dist"];

fn normalize_relative_path(path: &Path) -> Result<String, String> {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => parts.push(part.to_string_lossy().to_string()),
            Component::CurDir => {}
            _ => {
                return Err(format!(
                    "workspace packaging only supports safe relative paths, got '{}'",
                    path.display()
                ))
            }
        }
    }

    if parts.is_empty() {
        return Err("workspace packaging encountered an empty relative path".to_string());
    }

    Ok(parts.join("/"))
}

fn ensure_no_symlink(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|e| format!("failed to inspect '{}': {e}", path.display()))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "workspace packaging does not support symlinks: '{}'",
            path.display()
        ));
    }
    Ok(())
}

fn should_skip_entry(relative_path: &Path, file_type: &fs::FileType) -> bool {
    if let Some(file_name) = relative_path.file_name().and_then(|name| name.to_str()) {
        if file_name == ".DS_Store" || file_name.ends_with(".plugin") {
            return true;
        }
    }

    if file_type.is_dir() {
        return relative_path
            .components()
            .filter_map(|component| match component {
                Component::Normal(part) => part.to_str(),
                _ => None,
            })
            .any(|part| IGNORED_DIR_NAMES.contains(&part));
    }

    false
}

fn collect_workspace_files(
    root: &Path,
    current_dir: &Path,
    files: &mut BTreeMap<String, PathBuf>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|e| format!("failed to read '{}': {e}", current_dir.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("failed to read workspace entry: {e}"))?;
        let path = entry.path();
        ensure_no_symlink(&path)?;
        let file_type = entry
            .file_type()
            .map_err(|e| format!("failed to inspect '{}': {e}", path.display()))?;
        let relative_path = path.strip_prefix(root).map_err(|e| {
            format!(
                "failed to compute relative path for '{}': {e}",
                path.display()
            )
        })?;

        if should_skip_entry(relative_path, &file_type) {
            continue;
        }

        if file_type.is_dir() {
            collect_workspace_files(root, &path, files)?;
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        let normalized = normalize_relative_path(relative_path)?;
        files.insert(normalized, path);
    }

    Ok(())
}

fn add_overlay_files(
    overlay_root: &Path,
    files: &mut BTreeMap<String, PathBuf>,
) -> Result<(), String> {
    if !overlay_root.exists() {
        return Err(format!(
            "workspace build overlay '{}' was not found",
            overlay_root.display()
        ));
    }
    collect_workspace_files(overlay_root, overlay_root, files)
}

fn read_manifest(plugin_dir: &Path) -> Result<crate::plugin_manifest::PluginManifest, String> {
    let manifest_path = plugin_dir.join("plugin.json");
    let manifest_json = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("failed to read '{}': {e}", manifest_path.display()))?;
    validate_plugin_manifest_json(&manifest_json)
}

fn validate_workspace_schema(plugin_dir: &Path, plugin_id: &str) -> Result<(), String> {
    let schema_path = plugin_dir.join("settings.schema.json");
    if !schema_path.exists() {
        return Ok(());
    }

    let schema_json = fs::read_to_string(&schema_path)
        .map_err(|e| format!("failed to read '{}': {e}", schema_path.display()))?;
    validate_plugin_settings_schema_json(&schema_json, plugin_id)
}

fn ensure_required_entries_exist(
    files: &BTreeMap<String, PathBuf>,
    manifest: &crate::plugin_manifest::PluginManifest,
) -> Result<(), String> {
    if !files.contains_key("plugin.json") {
        return Err("workspace package is missing plugin.json".to_string());
    }

    if let Some(frontend_entry) = manifest.frontend_entry.as_ref() {
        if !files.contains_key(frontend_entry) {
            return Err(format!(
                "workspace package is missing declared frontend_entry '{}'",
                frontend_entry
            ));
        }
    }

    if let Some(backend_entry) = manifest.backend_entry.as_ref() {
        if !files.contains_key(backend_entry) {
            return Err(format!(
                "workspace package is missing declared backend_entry '{}'",
                backend_entry
            ));
        }
    }

    Ok(())
}

pub fn package_workspace_plugin_dir(
    plugin_dir: &Path,
    archive_path: &Path,
    overlay_root: Option<&Path>,
) -> Result<PackWorkspacePluginResult, String> {
    if !plugin_dir.exists() {
        return Err(format!(
            "workspace plugin directory '{}' was not found",
            plugin_dir.display()
        ));
    }

    let manifest = read_manifest(plugin_dir)?;
    validate_workspace_schema(plugin_dir, &manifest.id)?;

    let mut files = BTreeMap::new();
    collect_workspace_files(plugin_dir, plugin_dir, &mut files)?;

    if let Some(overlay_root) = overlay_root {
        add_overlay_files(overlay_root, &mut files)?;
    }

    ensure_required_entries_exist(&files, &manifest)?;

    if let Some(parent) = archive_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create '{}': {e}", parent.display()))?;
    }

    let file = fs::File::create(archive_path)
        .map_err(|e| format!("failed to create '{}': {e}", archive_path.display()))?;
    let mut archive = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let mut included_entries = Vec::new();
    for (relative_path, source_path) in &files {
        archive
            .start_file(relative_path, options)
            .map_err(|e| format!("failed to start archive entry '{relative_path}': {e}"))?;

        let mut source = fs::File::open(source_path)
            .map_err(|e| format!("failed to open '{}': {e}", source_path.display()))?;
        let mut buffer = Vec::new();
        source
            .read_to_end(&mut buffer)
            .map_err(|e| format!("failed to read '{}': {e}", source_path.display()))?;
        archive
            .write_all(&buffer)
            .map_err(|e| format!("failed to write archive entry '{relative_path}': {e}"))?;

        included_entries.push(relative_path.clone());
    }

    archive
        .finish()
        .map_err(|e| format!("failed to finalize '{}': {e}", archive_path.display()))?;

    Ok(PackWorkspacePluginResult {
        archive_path: archive_path.to_path_buf(),
        included_entries,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    use zip::ZipArchive;

    fn unique_temp_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("kuro-viewer-{label}-{timestamp}"));
        fs::create_dir_all(&path).expect("failed to create temp dir");
        path
    }

    fn sample_manifest(id: &str, frontend_entry: &str) -> String {
        format!(
            r#"{{
                "schema_version": "1.0.0",
                "id": "{id}",
                "name": "Pack Sample",
                "version": "1.2.3",
                "description": "Pack test plugin",
                "author": "Kuro Viewer Team",
                "api_version": "1.0.0",
                "min_host_version": "0.1.0",
                "theme_contract": "1.x",
                "backend": "none",
                "frontend_entry": "{frontend_entry}",
                "slots": ["panel"],
                "permissions": []
            }}"#
        )
    }

    fn sample_schema(plugin_id: &str) -> String {
        format!(
            r#"{{
                "schema_version": "1.0.0",
                "plugin_id": "{plugin_id}",
                "title": "Pack Sample Settings",
                "presentation": "inline",
                "sections": [
                    {{
                        "id": "general",
                        "label": "General",
                        "fields": [
                            {{
                                "id": "general.enabled",
                                "type": "boolean",
                                "label": "Enabled",
                                "default": true
                            }}
                        ]
                    }}
                ]
            }}"#
        )
    }

    #[test]
    fn packages_workspace_plugin_with_overlay_frontend() {
        let temp_root = unique_temp_dir("workspace-pack-overlay");
        let plugin_dir = temp_root.join("plugin");
        let overlay_dir = temp_root.join("overlay");
        let archive_path = temp_root.join("dist").join("pack-sample.plugin");

        fs::create_dir_all(plugin_dir.join("src")).expect("failed to create plugin src dir");
        fs::create_dir_all(&overlay_dir).expect("failed to create overlay dir");

        fs::write(
            plugin_dir.join("plugin.json"),
            sample_manifest("pack-sample", "frontend.js"),
        )
        .expect("failed to write plugin manifest");
        fs::write(
            plugin_dir.join("settings.schema.json"),
            sample_schema("pack-sample"),
        )
        .expect("failed to write settings schema");
        fs::write(plugin_dir.join("README.md"), "# Pack Sample\n")
            .expect("failed to write readme");
        fs::write(plugin_dir.join("src").join("index.ts"), "export default {};\n")
            .expect("failed to write source stub");
        fs::write(
            overlay_dir.join("frontend.js"),
            "export default { id: 'pack-sample' };\n",
        )
        .expect("failed to write overlay frontend");

        let result = package_workspace_plugin_dir(&plugin_dir, &archive_path, Some(&overlay_dir))
            .expect("expected packaging to succeed");

        assert_eq!(result.archive_path, archive_path);
        assert!(result.included_entries.contains(&"plugin.json".to_string()));
        assert!(result.included_entries.contains(&"frontend.js".to_string()));
        assert!(!result.included_entries.iter().any(|entry| entry.starts_with("src/")));

        let archive_file = fs::File::open(&archive_path).expect("failed to open archive");
        let mut archive = ZipArchive::new(archive_file).expect("failed to read archive");

        let mut frontend = String::new();
        archive
            .by_name("frontend.js")
            .expect("archive should contain frontend")
            .read_to_string(&mut frontend)
            .expect("failed to read frontend");
        assert!(frontend.contains("pack-sample"));
        assert!(archive.by_name("README.md").is_ok());
        assert!(archive.by_name("settings.schema.json").is_ok());
        assert!(archive.by_name("src/index.ts").is_err());
    }

    #[test]
    fn rejects_missing_declared_frontend_entry() {
        let temp_root = unique_temp_dir("workspace-pack-missing-frontend");
        let plugin_dir = temp_root.join("plugin");
        let archive_path = temp_root.join("dist").join("pack-sample.plugin");

        fs::create_dir_all(&plugin_dir).expect("failed to create plugin dir");
        fs::write(
            plugin_dir.join("plugin.json"),
            sample_manifest("pack-sample", "frontend.js"),
        )
        .expect("failed to write plugin manifest");

        let error = package_workspace_plugin_dir(&plugin_dir, &archive_path, None)
            .expect_err("expected missing frontend to fail");
        assert!(error.contains("frontend_entry"));
    }
}

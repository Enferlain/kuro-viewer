use super::*;
use std::cmp;
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

fn write_archive_entries(path: &Path, entries: &[(&str, Vec<u8>)]) {
    let file = fs::File::create(path).expect("failed to create archive file");
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default();

    for (entry_name, bytes) in entries {
        zip.start_file(entry_name, options)
            .expect("failed to create archive entry");
        zip.write_all(bytes)
            .expect("failed to write archive entry bytes");
    }

    zip.finish().expect("failed to finalize archive");
}

fn write_oversized_payload_archive(path: &Path, manifest_json: &str, payload_size: u64) {
    let file = fs::File::create(path).expect("failed to create archive file");
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default();

    zip.start_file("plugin.json", options)
        .expect("failed to create plugin.json entry");
    zip.write_all(manifest_json.as_bytes())
        .expect("failed to write plugin.json");

    zip.start_file("payload.bin", options)
        .expect("failed to create payload entry");
    let chunk = vec![b'a'; BYTES_PER_MIB as usize];
    let mut written = 0_u64;
    while written < payload_size {
        let remaining = (payload_size - written) as usize;
        let to_write = cmp::min(remaining, chunk.len());
        zip.write_all(&chunk[..to_write])
            .expect("failed to write payload bytes");
        written += to_write as u64;
    }

    zip.finish().expect("failed to finalize archive");
}

fn installed_manifest_version(plugins_root: &Path, plugin_id: &str) -> String {
    let manifest_path = plugins_root.join(plugin_id).join("plugin.json");
    let json =
        fs::read_to_string(&manifest_path).expect("failed to read installed plugin manifest");
    let manifest =
        validate_plugin_manifest_json(&json).expect("installed manifest should be valid");
    manifest.version
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
    assert!(plugins_root
        .join("sepia-filter")
        .join("plugin.json")
        .exists());

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

#[test]
fn install_rejects_archive_with_path_traversal_entry() {
    let root = unique_temp_dir("plugin-install-traversal-entry");
    let plugins_root = root.join("plugins");
    fs::create_dir_all(&plugins_root).expect("failed to create plugins root");
    let archive_path = root.join("bad.plugin");

    write_archive_entries(
        &archive_path,
        &[
            ("plugin.json", manifest_json("1.0.0").into_bytes()),
            ("../escape.txt", b"not-safe".to_vec()),
        ],
    );

    let result = install_plugin_in_dir(&plugins_root, &archive_path);
    assert!(result.is_err());
    let error = result.expect_err("install should fail for traversal");
    assert!(error.contains("unsafe path"));
    assert!(!plugins_root.join("sepia-filter").exists());

    cleanup_dir(&root);
}

#[test]
fn install_rejects_archive_with_too_many_entries() {
    let root = unique_temp_dir("plugin-install-entry-limit");
    let plugins_root = root.join("plugins");
    fs::create_dir_all(&plugins_root).expect("failed to create plugins root");
    let archive_path = root.join("many.plugin");

    let file = fs::File::create(&archive_path).expect("failed to create archive file");
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default();
    zip.start_file("plugin.json", options)
        .expect("failed to create plugin.json entry");
    zip.write_all(manifest_json("1.0.0").as_bytes())
        .expect("failed to write plugin.json");

    for index in 0..MAX_ARCHIVE_ENTRIES {
        let name = format!("entry-{index}.txt");
        zip.start_file(name, options)
            .expect("failed to create archive entry");
        zip.write_all(b"x").expect("failed to write archive entry");
    }
    zip.finish().expect("failed to finalize archive");

    let result = install_plugin_in_dir(&plugins_root, &archive_path);
    assert!(result.is_err());
    let error = result.expect_err("install should fail entry cap");
    assert!(error.contains("maximum"));

    cleanup_dir(&root);
}

#[test]
fn install_rejects_archive_over_uncompressed_size_cap() {
    let root = unique_temp_dir("plugin-install-size-limit");
    let plugins_root = root.join("plugins");
    fs::create_dir_all(&plugins_root).expect("failed to create plugins root");
    let archive_path = root.join("oversized.plugin");

    write_oversized_payload_archive(
        &archive_path,
        &manifest_json("1.0.0"),
        MAX_UNCOMPRESSED_BYTES + 1,
    );

    let result = install_plugin_in_dir(&plugins_root, &archive_path);
    assert!(result.is_err());
    let error = result.expect_err("install should fail uncompressed byte cap");
    assert!(error.contains("uncompressed size exceeds"));

    cleanup_dir(&root);
}

#[test]
fn verify_extracted_manifest_rejects_mismatched_manifest() {
    let root = unique_temp_dir("plugin-verify-mismatch-manifest");
    let staging_dir = root.join("staging");
    fs::create_dir_all(&staging_dir).expect("failed to create staging dir");

    fs::write(staging_dir.join("plugin.json"), manifest_json("1.0.1"))
        .expect("failed to write extracted manifest");

    let expected = validate_plugin_manifest_json(&manifest_json("1.0.0"))
        .expect("expected manifest should be valid");

    let result = verify_extracted_manifest(&staging_dir, &expected);
    assert!(result.is_err());
    let error = result.expect_err("verification should fail on manifest mismatch");
    assert!(error.contains("does not match pre-validated manifest"));

    cleanup_dir(&root);
}

#[test]
fn install_rolls_back_previous_version_on_finalize_failure() {
    let root = unique_temp_dir("plugin-install-rollback");
    let plugins_root = root.join("plugins");
    fs::create_dir_all(&plugins_root).expect("failed to create plugins root");

    let first_archive = root.join("first.plugin");
    let second_archive = root.join("second.plugin");
    write_plugin_archive(&first_archive, &manifest_json("1.0.0"));
    write_plugin_archive(&second_archive, &manifest_json("1.1.0"));

    install_plugin_in_dir(&plugins_root, &first_archive)
        .expect("initial plugin install should succeed");
    assert_eq!(
        installed_manifest_version(&plugins_root, "sepia-filter"),
        "1.0.0"
    );

    let mut rename_call = 0_usize;
    let mut rename_with_failure = |from: &Path, to: &Path| {
        rename_call += 1;
        if rename_call == 2 {
            return Err(std::io::Error::other("simulated finalize failure"));
        }
        fs::rename(from, to)
    };

    let result =
        install_plugin_in_dir_with_rename(&plugins_root, &second_archive, &mut rename_with_failure);
    assert!(result.is_err());
    let error = result.expect_err("upgrade should fail and trigger rollback");
    assert!(error.contains("rollback restored previous version"));
    assert_eq!(
        installed_manifest_version(&plugins_root, "sepia-filter"),
        "1.0.0"
    );

    cleanup_dir(&root);
}

#[test]
fn validate_settings_schema_accepts_valid_contract() {
    let schema = r#"{
        "schema_version": "1.0.0",
        "plugin_id": "sepia-filter",
        "presentation": "inline",
        "sections": [
            {
                "id": "core",
                "label": "Core",
                "fields": [
                    {
                        "id": "noise.opacity",
                        "type": "number",
                        "label": "Opacity",
                        "default": 0.5,
                        "min": 0,
                        "max": 1,
                        "step": 0.01,
                        "ui": "slider"
                    },
                    {
                        "id": "noise.enabled",
                        "type": "boolean",
                        "label": "Enabled",
                        "default": true
                    },
                    {
                        "id": "noise.mode",
                        "type": "enum",
                        "label": "Mode",
                        "default": "fast",
                        "options": [
                            { "value": "fast", "label": "Fast" },
                            { "value": "accurate", "label": "Accurate" }
                        ]
                    },
                    {
                        "id": "noise.pattern",
                        "type": "string",
                        "label": "Pattern",
                        "default": "abc",
                        "min_length": 1,
                        "max_length": 8
                    },
                    {
                        "id": "hotkeys.toggle",
                        "type": "keybinding",
                        "label": "Toggle",
                        "default": "N",
                        "scope": "viewer"
                    }
                ]
            }
        ]
    }"#;

    let result = validate_plugin_settings_schema_json(schema, "sepia-filter");
    assert!(result.is_ok());
}

#[test]
fn validate_settings_schema_rejects_plugin_id_mismatch() {
    let schema = r#"{
        "schema_version": "1.0.0",
        "plugin_id": "other-plugin",
        "presentation": "inline",
        "sections": [
            {
                "id": "core",
                "label": "Core",
                "fields": [
                    {
                        "id": "enabled",
                        "type": "boolean",
                        "label": "Enabled",
                        "default": true
                    }
                ]
            }
        ]
    }"#;

    let result = validate_plugin_settings_schema_json(schema, "sepia-filter");
    assert!(result.is_err());
    let error = result.expect_err("schema should fail plugin id mismatch");
    assert!(error.contains("does not match installed plugin id"));
}

#[test]
fn validate_settings_schema_rejects_section_count_over_limit() {
    let mut sections = Vec::new();
    for index in 0..=MAX_SETTINGS_SCHEMA_SECTIONS {
        sections.push(format!(
            r#"{{
                "id": "s{index}",
                "label": "Section {index}",
                "fields": [
                    {{
                        "id": "f{index}",
                        "type": "boolean",
                        "label": "Enabled {index}",
                        "default": true
                    }}
                ]
            }}"#
        ));
    }
    let schema = format!(
        r#"{{
            "schema_version": "1.0.0",
            "plugin_id": "sepia-filter",
            "presentation": "inline",
            "sections": [{}]
        }}"#,
        sections.join(",")
    );

    let result = validate_plugin_settings_schema_json(&schema, "sepia-filter");
    assert!(result.is_err());
    let error = result.expect_err("schema should fail max sections");
    assert!(error.contains("maximum"));
}

#[test]
fn read_plugin_settings_schema_rejects_invalid_plugin_id() {
    let root = unique_temp_dir("plugin-read-settings-schema-invalid-id");
    let plugins_root = root.join("plugins");
    fs::create_dir_all(&plugins_root).expect("failed to create plugins root");

    let result = read_plugin_settings_schema_in_dir(&plugins_root, "../escape");
    assert!(result.is_err());
    let error = result.expect_err("invalid plugin id should fail");
    assert!(error.contains("invalid plugin id"));

    cleanup_dir(&root);
}

#[test]
fn read_plugin_settings_schema_rejects_missing_manifest() {
    let root = unique_temp_dir("plugin-read-settings-schema-missing-manifest");
    let plugins_root = root.join("plugins");
    let plugin_dir = plugins_root.join("sepia-filter");
    fs::create_dir_all(&plugin_dir).expect("failed to create plugin dir");
    fs::write(plugin_dir.join("settings.schema.json"), "{}").expect("failed to write schema file");

    let result = read_plugin_settings_schema_in_dir(&plugins_root, "sepia-filter");
    assert!(result.is_err());
    let error = result.expect_err("missing plugin.json should fail");
    assert!(error.contains("missing plugin.json"));

    cleanup_dir(&root);
}

#[test]
fn read_plugin_settings_schema_rejects_oversized_schema() {
    let root = unique_temp_dir("plugin-read-settings-schema-oversized");
    let plugins_root = root.join("plugins");
    let plugin_dir = plugins_root.join("sepia-filter");
    fs::create_dir_all(&plugin_dir).expect("failed to create plugin dir");
    fs::write(plugin_dir.join("plugin.json"), manifest_json("1.0.0"))
        .expect("failed to write plugin manifest");

    let oversized = "a".repeat((MAX_SETTINGS_SCHEMA_BYTES + 1) as usize);
    fs::write(plugin_dir.join("settings.schema.json"), oversized)
        .expect("failed to write oversized schema file");

    let result = read_plugin_settings_schema_in_dir(&plugins_root, "sepia-filter");
    assert!(result.is_err());
    let error = result.expect_err("oversized schema should fail");
    assert!(error.contains("exceeds"));

    cleanup_dir(&root);
}

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const PLUGIN_MANIFEST_SCHEMA_VERSION: &str = "1.0.0";
pub const HOST_PLUGIN_API_VERSION: &str = "1.0.0";
pub const HOST_THEME_CONTRACT_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize)]
pub struct HostPluginContract {
    pub manifest_schema_version: String,
    pub plugin_api_version: String,
    pub theme_contract_version: String,
    pub supported_backends: Vec<String>,
    pub supported_slots: Vec<String>,
    pub supported_permissions: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PluginBackend {
    Wasm,
    PythonSubprocess,
    None,
}

impl Default for PluginBackend {
    fn default() -> Self {
        Self::Wasm
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PluginSlot {
    Toolbar,
    Sidebar,
    Panel,
    ContextMenu,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PluginPermission {
    #[serde(rename = "fs.read")]
    FsRead,
    #[serde(rename = "fs.write")]
    FsWrite,
    #[serde(rename = "net.http")]
    NetHttp,
    #[serde(rename = "clipboard.read")]
    ClipboardRead,
    #[serde(rename = "clipboard.write")]
    ClipboardWrite,
    #[serde(rename = "process.spawn")]
    ProcessSpawn,
    #[serde(rename = "shell.open")]
    ShellOpen,
    #[serde(rename = "image.decode")]
    ImageDecode,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PluginManifest {
    pub schema_version: String,
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub source_url: Option<String>,
    #[serde(default)]
    pub docs_url: Option<String>,
    #[serde(default)]
    pub usage: Option<String>,
    pub api_version: String,
    pub min_host_version: String,
    pub theme_contract: String,
    #[serde(default)]
    pub backend: PluginBackend,
    #[serde(default)]
    pub backend_entry: Option<String>,
    #[serde(default)]
    pub frontend_entry: Option<String>,
    #[serde(default)]
    pub slots: Vec<PluginSlot>,
    #[serde(default)]
    pub permissions: Vec<PluginPermission>,
}

pub fn host_plugin_contract() -> HostPluginContract {
    HostPluginContract {
        manifest_schema_version: PLUGIN_MANIFEST_SCHEMA_VERSION.to_string(),
        plugin_api_version: HOST_PLUGIN_API_VERSION.to_string(),
        theme_contract_version: HOST_THEME_CONTRACT_VERSION.to_string(),
        supported_backends: vec![
            "wasm".to_string(),
            "python-subprocess".to_string(),
            "none".to_string(),
        ],
        supported_slots: vec![
            "toolbar".to_string(),
            "sidebar".to_string(),
            "panel".to_string(),
            "context-menu".to_string(),
        ],
        supported_permissions: vec![
            "fs.read".to_string(),
            "fs.write".to_string(),
            "net.http".to_string(),
            "clipboard.read".to_string(),
            "clipboard.write".to_string(),
            "process.spawn".to_string(),
            "shell.open".to_string(),
            "image.decode".to_string(),
        ],
    }
}

pub fn validate_plugin_manifest_json(manifest_json: &str) -> Result<PluginManifest, String> {
    let manifest: PluginManifest =
        serde_json::from_str(manifest_json).map_err(|e| format!("invalid JSON: {e}"))?;

    validate_plugin_manifest(&manifest)?;
    Ok(manifest)
}

pub fn validate_plugin_manifest(manifest: &PluginManifest) -> Result<(), String> {
    let schema_major =
        parse_semver_major(&manifest.schema_version).map_err(|e| format!("schema_version {e}"))?;
    let host_schema_major = parse_semver_major(PLUGIN_MANIFEST_SCHEMA_VERSION)
        .map_err(|e| format!("internal host schema version is invalid: {e}"))?;
    if schema_major != host_schema_major {
        return Err(format!(
            "unsupported schema_version '{}'; expected major {}",
            manifest.schema_version, host_schema_major
        ));
    }

    if !is_valid_plugin_id(&manifest.id) {
        return Err("id must be kebab-case (a-z, 0-9, '-') and 3-64 chars".to_string());
    }

    if manifest.name.trim().is_empty() || manifest.name.len() > 80 {
        return Err("name must be 1-80 chars".to_string());
    }
    validate_optional_text(&manifest.description, "description", 280)?;
    validate_optional_text(&manifest.author, "author", 80)?;
    validate_optional_text(&manifest.usage, "usage", 2000)?;
    validate_optional_http_url(&manifest.source_url, "source_url")?;
    validate_optional_http_url(&manifest.docs_url, "docs_url")?;

    parse_semver_major(&manifest.version).map_err(|e| format!("version {e}"))?;
    let plugin_api_major =
        parse_semver_major(&manifest.api_version).map_err(|e| format!("api_version {e}"))?;
    let host_api_major = parse_semver_major(HOST_PLUGIN_API_VERSION)
        .map_err(|e| format!("internal host API version is invalid: {e}"))?;
    if plugin_api_major != host_api_major {
        return Err(format!(
            "plugin api major {} is incompatible with host api major {}",
            plugin_api_major, host_api_major
        ));
    }

    parse_semver_major(&manifest.min_host_version).map_err(|e| format!("min_host_version {e}"))?;

    let plugin_theme_major = parse_contract_major(&manifest.theme_contract)
        .map_err(|e| format!("theme_contract {e}"))?;
    let host_theme_major = parse_semver_major(HOST_THEME_CONTRACT_VERSION)
        .map_err(|e| format!("internal theme contract version is invalid: {e}"))?;
    if plugin_theme_major != host_theme_major {
        return Err(format!(
            "theme contract '{}' is incompatible with host major {}",
            manifest.theme_contract, host_theme_major
        ));
    }

    if has_duplicates(&manifest.slots) {
        return Err("slots contain duplicates".to_string());
    }

    if has_duplicates(&manifest.permissions) {
        return Err("permissions contain duplicates".to_string());
    }

    if let Some(frontend_entry) = &manifest.frontend_entry {
        validate_relative_path(frontend_entry, "frontend_entry")?;
        if !(frontend_entry.ends_with(".js") || frontend_entry.ends_with(".mjs")) {
            return Err("frontend_entry must end with .js or .mjs".to_string());
        }
    }

    if !manifest.slots.is_empty() && manifest.frontend_entry.is_none() {
        return Err("frontend_entry is required when slots are declared".to_string());
    }

    match manifest.backend {
        PluginBackend::Wasm => {
            let backend_entry = manifest
                .backend_entry
                .as_ref()
                .ok_or_else(|| "backend_entry is required for backend=wasm".to_string())?;
            validate_relative_path(backend_entry, "backend_entry")?;
            if !backend_entry.ends_with(".wasm") {
                return Err("backend_entry must end with .wasm for backend=wasm".to_string());
            }
        }
        PluginBackend::PythonSubprocess => {
            let backend_entry = manifest.backend_entry.as_ref().ok_or_else(|| {
                "backend_entry is required for backend=python-subprocess".to_string()
            })?;
            validate_relative_path(backend_entry, "backend_entry")?;
            if !backend_entry.starts_with("python/") {
                return Err(
                    "backend_entry for backend=python-subprocess must start with 'python/'"
                        .to_string(),
                );
            }
        }
        PluginBackend::None => {
            if manifest.backend_entry.is_some() {
                return Err("backend_entry must be omitted when backend=none".to_string());
            }
        }
    }

    Ok(())
}

fn has_duplicates<T>(values: &[T]) -> bool
where
    T: Eq + std::hash::Hash + Copy,
{
    let mut set = HashSet::with_capacity(values.len());
    values.iter().any(|value| !set.insert(*value))
}

fn parse_semver_major(version: &str) -> Result<u64, String> {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3 {
        return Err(format!("must be semver 'x.y.z', got '{version}'"));
    }
    if !parts
        .iter()
        .all(|p| !p.is_empty() && p.chars().all(|ch| ch.is_ascii_digit()))
    {
        return Err(format!(
            "must contain numeric semver parts, got '{version}'"
        ));
    }
    parts[0]
        .parse::<u64>()
        .map_err(|_| format!("must contain a valid major number, got '{version}'"))
}

fn parse_contract_major(contract: &str) -> Result<u64, String> {
    let (major, suffix) = contract
        .split_once('.')
        .ok_or_else(|| format!("must use '<major>.x' format, got '{contract}'"))?;
    if suffix != "x" {
        return Err(format!("must use '<major>.x' format, got '{contract}'"));
    }
    major
        .parse::<u64>()
        .map_err(|_| format!("must contain numeric major value, got '{contract}'"))
}

fn validate_optional_text(
    value: &Option<String>,
    label: &str,
    max_len: usize,
) -> Result<(), String> {
    if let Some(text) = value {
        if text.trim().is_empty() {
            return Err(format!("{label} cannot be empty when provided"));
        }
        if text.len() > max_len {
            return Err(format!("{label} must be <= {max_len} chars"));
        }
    }
    Ok(())
}

fn validate_optional_http_url(value: &Option<String>, label: &str) -> Result<(), String> {
    if let Some(url) = value {
        if url.trim().is_empty() {
            return Err(format!("{label} cannot be empty when provided"));
        }
        if url.len() > 2048 {
            return Err(format!("{label} must be <= 2048 chars"));
        }
        if !(url.starts_with("https://") || url.starts_with("http://")) {
            return Err(format!("{label} must start with http:// or https://"));
        }
    }
    Ok(())
}

pub fn is_valid_plugin_id(value: &str) -> bool {
    if value.len() < 3 || value.len() > 64 {
        return false;
    }

    let mut previous_was_hyphen = false;
    for (index, ch) in value.chars().enumerate() {
        let is_allowed = ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-';
        if !is_allowed {
            return false;
        }

        if ch == '-' {
            if index == 0 || index == value.len() - 1 || previous_was_hyphen {
                return false;
            }
            previous_was_hyphen = true;
        } else {
            previous_was_hyphen = false;
        }
    }

    true
}

fn validate_relative_path(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{label} cannot be empty"));
    }

    if value.contains('\0') {
        return Err(format!("{label} cannot contain null bytes"));
    }

    if value.starts_with('/') || value.starts_with('\\') {
        return Err(format!("{label} must be relative"));
    }

    for segment in value.split(['/', '\\']) {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(format!(
                "{label} must not contain '.', '..', or empty segments"
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_manifest_json() -> String {
        r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "wasm",
			"backend_entry": "backend.wasm",
			"frontend_entry": "frontend.js",
			"slots": ["toolbar"],
			"permissions": ["fs.read", "image.decode"]
		}"#
        .to_string()
    }

    #[test]
    fn accepts_valid_manifest() {
        let result = validate_plugin_manifest_json(&valid_manifest_json());
        assert!(result.is_ok());
    }

    #[test]
    fn rejects_unknown_permission() {
        let manifest = r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "none",
			"permissions": ["network.all"]
		}"#;

        let result = validate_plugin_manifest_json(manifest);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_missing_frontend_entry_when_slots_are_declared() {
        let manifest = r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "none",
			"slots": ["toolbar"]
		}"#;

        let result = validate_plugin_manifest_json(manifest);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_path_traversal_in_backend_entry() {
        let manifest = r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "wasm",
			"backend_entry": "../../../etc/passwd.wasm"
		}"#;

        let result = validate_plugin_manifest_json(manifest);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_backend_entry_for_backend_none() {
        let manifest = r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "none",
			"backend_entry": "backend.wasm"
		}"#;

        let result = validate_plugin_manifest_json(manifest);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_invalid_source_url() {
        let manifest = r#"{
			"schema_version": "1.0.0",
			"id": "sepia-filter",
			"name": "Sepia Filter",
			"version": "1.2.0",
			"source_url": "github.com/owner/repo",
			"api_version": "1.0.0",
			"min_host_version": "0.1.0",
			"theme_contract": "1.x",
			"backend": "none"
		}"#;

        let result = validate_plugin_manifest_json(manifest);
        assert!(result.is_err());
    }
}

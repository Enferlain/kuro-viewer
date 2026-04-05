use crate::plugin_install::validate_plugin_settings_schema_json;
use crate::plugin_manifest::{
    is_valid_plugin_id, validate_plugin_manifest_json, PluginBackend, PluginManifest,
    PluginPermission, PluginSlot, HOST_PLUGIN_API_VERSION, PLUGIN_MANIFEST_SCHEMA_VERSION,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WorkspacePluginTemplate {
    Blank,
    PanelFirst,
    ToolbarFirst,
    PythonBacked,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspacePluginScaffoldRequest {
    pub plugin_id: String,
    pub name: String,
    #[serde(default)]
    pub template: Option<WorkspacePluginTemplate>,
    #[serde(default = "default_true")]
    pub include_readme: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspacePluginScaffoldResult {
    pub plugin_id: String,
    pub directory_path: String,
    pub manifest_path: String,
    pub settings_schema_path: String,
    pub source_entry_path: String,
    pub backend_entry_path: Option<String>,
    pub readme_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWorkspacePathResult {
    pub opened_path: String,
    pub method: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreferredEditorLaunch {
    pub path: String,
    #[serde(default)]
    pub args_template: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePluginIssue {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePluginManifestSummary {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub source_url: Option<String>,
    pub docs_url: Option<String>,
    pub usage: Option<String>,
    pub backend: String,
    pub slots: Vec<String>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePluginRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub directory: String,
    pub manifest_path: String,
    pub settings_schema_path: Option<String>,
    pub source_entry_path: Option<String>,
    pub status: String,
    pub manifest: WorkspacePluginManifestSummary,
    pub issues: Vec<WorkspacePluginIssue>,
}

fn default_true() -> bool {
    true
}

fn ensure_devtools_enabled() -> Result<(), String> {
    if cfg!(debug_assertions) {
        Ok(())
    } else {
        Err("Workspace devtools commands are only available in debug builds.".to_string())
    }
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."))
}

fn workspace_plugins_root() -> PathBuf {
    repo_root().join("plugins")
}

fn ensure_safe_workspace_segment(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{label} cannot be empty"));
    }
    if value.contains('\0') {
        return Err(format!("{label} cannot contain null bytes"));
    }
    if value.contains('/') || value.contains('\\') {
        return Err(format!("{label} must be a single path segment"));
    }
    if value == "." || value == ".." {
        return Err(format!("{label} cannot be '.' or '..'"));
    }
    Ok(())
}

fn resolve_repo_relative_path(repo_path: &str) -> Result<PathBuf, String> {
    if repo_path.trim().is_empty() {
        return Err("repo_path cannot be empty".to_string());
    }
    if repo_path.contains('\0') {
        return Err("repo_path cannot contain null bytes".to_string());
    }

    let relative = Path::new(repo_path);
    if relative.is_absolute() {
        return Err("repo_path must be relative to the repository root".to_string());
    }

    for component in relative.components() {
        match component {
            std::path::Component::Normal(_) | std::path::Component::CurDir => {}
            _ => {
                return Err("repo_path must stay within the repository root".to_string());
            }
        }
    }

    let full_path = repo_root().join(relative);
    if !full_path.exists() {
        return Err(format!("repo path '{}' was not found", full_path.display()));
    }

    Ok(full_path)
}

fn theme_contract_string() -> String {
    let major = crate::plugin_manifest::HOST_THEME_CONTRACT_VERSION
        .split('.')
        .next()
        .unwrap_or("1");
    format!("{major}.x")
}

fn to_repo_json_format(value: &serde_json::Value) -> Result<String, String> {
    let pretty = serde_json::to_string_pretty(value)
        .map_err(|e| format!("failed to serialize JSON scaffold content: {e}"))?;

    let formatted = pretty
        .lines()
        .map(|line| {
            let indent_width = line.chars().take_while(|ch| *ch == ' ').count();
            let depth = indent_width / 4;
            format!("{}{}", "\t".repeat(depth), &line[indent_width..])
        })
        .collect::<Vec<_>>()
        .join("\n");

    Ok(format!("{formatted}\n"))
}

fn template_slots(template: WorkspacePluginTemplate) -> Vec<&'static str> {
    match template {
        WorkspacePluginTemplate::Blank => Vec::new(),
        WorkspacePluginTemplate::PanelFirst | WorkspacePluginTemplate::PythonBacked => {
            vec!["panel"]
        }
        WorkspacePluginTemplate::ToolbarFirst => vec!["toolbar"],
    }
}

fn backend_label(backend: &PluginBackend) -> String {
    match backend {
        PluginBackend::Wasm => "wasm",
        PluginBackend::PythonSubprocess => "python-subprocess",
        PluginBackend::None => "none",
    }
    .to_string()
}

fn slot_label(slot: &PluginSlot) -> String {
    match slot {
        PluginSlot::Toolbar => "toolbar",
        PluginSlot::Sidebar => "sidebar",
        PluginSlot::Panel => "panel",
        PluginSlot::ContextMenu => "context-menu",
    }
    .to_string()
}

fn permission_label(permission: &PluginPermission) -> String {
    match permission {
        PluginPermission::FsRead => "fs.read",
        PluginPermission::FsWrite => "fs.write",
        PluginPermission::NetHttp => "net.http",
        PluginPermission::ClipboardRead => "clipboard.read",
        PluginPermission::ClipboardWrite => "clipboard.write",
        PluginPermission::ProcessSpawn => "process.spawn",
        PluginPermission::ShellOpen => "shell.open",
        PluginPermission::ImageDecode => "image.decode",
    }
    .to_string()
}

fn workspace_manifest_summary(manifest: &PluginManifest) -> WorkspacePluginManifestSummary {
    WorkspacePluginManifestSummary {
        id: manifest.id.clone(),
        name: manifest.name.clone(),
        version: manifest.version.clone(),
        description: manifest.description.clone(),
        author: manifest.author.clone(),
        source_url: manifest.source_url.clone(),
        docs_url: manifest.docs_url.clone(),
        usage: manifest.usage.clone(),
        backend: backend_label(&manifest.backend),
        slots: manifest.slots.iter().map(slot_label).collect(),
        permissions: manifest.permissions.iter().map(permission_label).collect(),
    }
}

fn fallback_manifest_summary(directory: &str) -> WorkspacePluginManifestSummary {
    WorkspacePluginManifestSummary {
        id: directory.to_string(),
        name: directory.to_string(),
        version: "invalid".to_string(),
        description: None,
        author: None,
        source_url: None,
        docs_url: None,
        usage: None,
        backend: "unknown".to_string(),
        slots: Vec::new(),
        permissions: Vec::new(),
    }
}

fn create_manifest_json(
    request: &CreateWorkspacePluginScaffoldRequest,
    template: WorkspacePluginTemplate,
) -> Result<String, String> {
    let manifest = json!({
        "schema_version": PLUGIN_MANIFEST_SCHEMA_VERSION,
        "id": request.plugin_id,
        "name": request.name,
        "version": "0.1.0",
        "description": format!(
            "Workspace starter scaffold for {}.",
            request.name.trim()
        ),
        "author": "Kuro Viewer Team",
        "source_url": "https://github.com/kuro-viewer/kuro-viewer",
        "docs_url": "https://github.com/kuro-viewer/kuro-viewer/blob/main/docs/PLUGIN_CONTRACT_1.0.md",
        "usage": "Open Plugin Devtools in dev mode to inspect the workspace plugin, then build/package it when ready.",
        "api_version": HOST_PLUGIN_API_VERSION,
        "min_host_version": "0.1.0",
        "theme_contract": theme_contract_string(),
        "backend": match template {
            WorkspacePluginTemplate::PythonBacked => "python-subprocess",
            _ => "none",
        },
        "backend_entry": match template {
            WorkspacePluginTemplate::PythonBacked => Some("python/main.py"),
            _ => None::<&str>,
        },
        "frontend_entry": "frontend.js",
        "slots": template_slots(template),
        "permissions": [],
    });

    let manifest_json = to_repo_json_format(&manifest)?;
    validate_plugin_manifest_json(&manifest_json)?;
    Ok(manifest_json)
}

fn create_settings_schema_json(
    request: &CreateWorkspacePluginScaffoldRequest,
    template: WorkspacePluginTemplate,
) -> Result<String, String> {
    let (description, fields) = match template {
        WorkspacePluginTemplate::Blank => (
            "Minimal starter settings while the plugin shape is still evolving.",
            vec![
                json!({
                    "id": "general.enabled",
                    "type": "boolean",
                    "label": "Enable draft behavior",
                    "description": "Useful placeholder while wiring the first real feature.",
                    "default": true
                }),
                json!({
                    "id": "general.label",
                    "type": "string",
                    "label": "Draft label",
                    "description": "Host-rendered string field to verify the settings surface quickly.",
                    "default": request.name,
                    "max_length": 80
                }),
            ],
        ),
        WorkspacePluginTemplate::PanelFirst => (
            "Starter fields for a panel-oriented plugin workspace.",
            vec![
                json!({
                    "id": "panel.title",
                    "type": "string",
                    "label": "Panel title",
                    "default": request.name,
                    "max_length": 80
                }),
                json!({
                    "id": "panel.compact",
                    "type": "boolean",
                    "label": "Compact layout",
                    "default": false
                }),
            ],
        ),
        WorkspacePluginTemplate::ToolbarFirst => (
            "Starter fields for a toolbar-focused plugin workspace.",
            vec![
                json!({
                    "id": "toolbar.label",
                    "type": "string",
                    "label": "Button label",
                    "default": request.name,
                    "max_length": 40
                }),
                json!({
                    "id": "toolbar.highlight",
                    "type": "boolean",
                    "label": "Highlight active state",
                    "default": true
                }),
            ],
        ),
        WorkspacePluginTemplate::PythonBacked => (
            "Starter fields for a Python subprocess plugin workspace.",
            vec![
                json!({
                    "id": "runtime.model",
                    "type": "string",
                    "label": "Model name",
                    "default": "baseline",
                    "max_length": 80
                }),
                json!({
                    "id": "runtime.useGpu",
                    "type": "boolean",
                    "label": "Use GPU when available",
                    "default": true
                }),
            ],
        ),
    };

    let schema = json!({
        "schema_version": "1.0.0",
        "plugin_id": request.plugin_id,
        "title": format!("{} Settings", request.name.trim()),
        "description": description,
        "presentation": "inline",
        "sections": [
            {
                "id": "general",
                "label": "General",
                "description": "Starter host-rendered settings generated by Plugin Devtools.",
                "fields": fields
            }
        ]
    });

    to_repo_json_format(&schema)
}

fn create_source_stub(
    request: &CreateWorkspacePluginScaffoldRequest,
    template: WorkspacePluginTemplate,
) -> String {
    let slot_summary = match template {
        WorkspacePluginTemplate::Blank => "[]",
        WorkspacePluginTemplate::PanelFirst | WorkspacePluginTemplate::PythonBacked => {
            "[\"panel\"]"
        }
        WorkspacePluginTemplate::ToolbarFirst => "[\"toolbar\"]",
    };
    let backend_summary = match template {
        WorkspacePluginTemplate::PythonBacked => "python-subprocess",
        _ => "none",
    };

    format!(
        "export const workspacePlugin = {{\n\tid: \"{plugin_id}\",\n\ttemplate: \"{template}\",\n\tslots: {slot_summary},\n\tbackend: \"{backend_summary}\",\n}};\n\nexport default workspacePlugin;\n",
        plugin_id = request.plugin_id,
        template = match template {
            WorkspacePluginTemplate::Blank => "blank",
            WorkspacePluginTemplate::PanelFirst => "panel-first",
            WorkspacePluginTemplate::ToolbarFirst => "toolbar-first",
            WorkspacePluginTemplate::PythonBacked => "python-backed",
        },
        slot_summary = slot_summary,
        backend_summary = backend_summary
    )
}

fn create_python_stub() -> String {
    "def main() -> None:\n    print(\"Kuro Viewer python-backed plugin scaffold\")\n\n\nif __name__ == \"__main__\":\n    main()\n".to_string()
}

fn create_readme(
    request: &CreateWorkspacePluginScaffoldRequest,
    template: WorkspacePluginTemplate,
) -> String {
    let template_label = match template {
        WorkspacePluginTemplate::Blank => "blank",
        WorkspacePluginTemplate::PanelFirst => "panel-first",
        WorkspacePluginTemplate::ToolbarFirst => "toolbar-first",
        WorkspacePluginTemplate::PythonBacked => "python-backed",
    };

    format!(
        "# {name}\n\nThis workspace plugin scaffold was generated from Kuro Viewer's Plugin Devtools.\n\n- Plugin id: `{plugin_id}`\n- Template: `{template_label}`\n- Contract guide: `docs/PLUGIN_CONTRACT_1.0.md`\n- Workspace workflow: `docs/PLUGIN_WORKSPACE_DEV.md`\n\n## Next Steps\n\n1. Edit `plugin.json` to match the behavior you want to prototype.\n2. Replace `src/index.ts` with the real plugin frontend entry.\n3. Adjust `settings.schema.json` so the host Configure UI matches your plugin surface.\n4. Run `pnpm plugin:build {plugin_id}` to bundle `src/index.ts` into a packageable frontend artifact.\n5. Run `pnpm plugin:pack {plugin_id}` to emit `plugins/dist/{plugin_id}-<version>.plugin`.\n",
        name = request.name.trim(),
        plugin_id = request.plugin_id,
        template_label = template_label
    )
}

fn create_workspace_plugin_scaffold_in(
    plugins_root: &Path,
    request: &CreateWorkspacePluginScaffoldRequest,
) -> Result<CreateWorkspacePluginScaffoldResult, String> {
    let plugin_id = request.plugin_id.trim();
    let name = request.name.trim();
    if !is_valid_plugin_id(plugin_id) {
        return Err("plugin_id must be kebab-case (a-z, 0-9, '-') and 3-64 chars".to_string());
    }
    if name.is_empty() || name.len() > 80 {
        return Err("name must be 1-80 chars".to_string());
    }

    let template = request
        .template
        .unwrap_or(WorkspacePluginTemplate::PanelFirst);
    fs::create_dir_all(plugins_root).map_err(|e| {
        format!(
            "failed to create plugins directory '{}': {e}",
            plugins_root.display()
        )
    })?;

    let plugin_dir = plugins_root.join(plugin_id);
    if plugin_dir.exists() {
        return Err(format!(
            "workspace plugin directory '{}' already exists",
            plugin_dir.display()
        ));
    }

    let src_dir = plugin_dir.join("src");
    fs::create_dir_all(&src_dir).map_err(|e| {
        format!(
            "failed to create scaffold directory '{}': {e}",
            src_dir.display()
        )
    })?;

    let manifest_path = plugin_dir.join("plugin.json");
    let settings_schema_path = plugin_dir.join("settings.schema.json");
    let source_entry_path = src_dir.join("index.ts");
    let backend_entry_path = match template {
        WorkspacePluginTemplate::PythonBacked => Some(plugin_dir.join("python").join("main.py")),
        _ => None,
    };
    let readme_path = request.include_readme.then(|| plugin_dir.join("README.md"));

    if let Some(path) = backend_entry_path.as_ref() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                format!(
                    "failed to create python scaffold directory '{}': {e}",
                    parent.display()
                )
            })?;
        }
    }

    let manifest_json = create_manifest_json(request, template)?;
    let settings_schema_json = create_settings_schema_json(request, template)?;
    let source_stub = create_source_stub(request, template);

    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("failed to write '{}': {e}", manifest_path.display()))?;
    fs::write(&settings_schema_path, settings_schema_json)
        .map_err(|e| format!("failed to write '{}': {e}", settings_schema_path.display()))?;
    fs::write(&source_entry_path, source_stub)
        .map_err(|e| format!("failed to write '{}': {e}", source_entry_path.display()))?;

    if let Some(path) = backend_entry_path.as_ref() {
        fs::write(path, create_python_stub())
            .map_err(|e| format!("failed to write '{}': {e}", path.display()))?;
    }

    if let Some(path) = readme_path.as_ref() {
        fs::write(path, create_readme(request, template))
            .map_err(|e| format!("failed to write '{}': {e}", path.display()))?;
    }

    Ok(CreateWorkspacePluginScaffoldResult {
        plugin_id: plugin_id.to_string(),
        directory_path: plugin_dir.display().to_string(),
        manifest_path: manifest_path.display().to_string(),
        settings_schema_path: settings_schema_path.display().to_string(),
        source_entry_path: source_entry_path.display().to_string(),
        backend_entry_path: backend_entry_path.map(|path| path.display().to_string()),
        readme_path: readme_path.map(|path| path.display().to_string()),
    })
}

fn scan_workspace_plugins_in(plugins_root: &Path) -> Result<Vec<WorkspacePluginRecord>, String> {
    if !plugins_root.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(plugins_root).map_err(|e| {
        format!(
            "failed to read plugins directory '{}': {e}",
            plugins_root.display()
        )
    })?;
    let mut records = Vec::new();

    for entry_result in entries {
        let entry =
            entry_result.map_err(|e| format!("failed to read plugins directory entry: {e}"))?;
        let file_type = entry.file_type().map_err(|e| {
            format!(
                "failed to read file type for '{}': {e}",
                entry.path().display()
            )
        })?;
        if !file_type.is_dir() {
            continue;
        }

        let directory = entry.file_name().to_string_lossy().to_string();
        let plugin_dir = entry.path();
        let manifest_path = plugin_dir.join("plugin.json");
        if !manifest_path.exists() {
            continue;
        }

        let settings_schema_path = plugin_dir.join("settings.schema.json");
        let source_entry_path = plugin_dir.join("src").join("index.ts");

        let mut issues = Vec::new();
        let manifest_contents = match fs::read_to_string(&manifest_path) {
            Ok(contents) => contents,
            Err(error) => {
                issues.push(WorkspacePluginIssue {
                    level: "error".to_string(),
                    message: format!("Failed to read manifest: {error}"),
                });
                records.push(WorkspacePluginRecord {
                    id: directory.clone(),
                    name: directory.clone(),
                    version: "invalid".to_string(),
                    directory,
                    manifest_path: manifest_path.display().to_string(),
                    settings_schema_path: settings_schema_path
                        .exists()
                        .then(|| settings_schema_path.display().to_string()),
                    source_entry_path: source_entry_path
                        .exists()
                        .then(|| source_entry_path.display().to_string()),
                    status: "error".to_string(),
                    manifest: fallback_manifest_summary(&entry.file_name().to_string_lossy()),
                    issues,
                });
                continue;
            }
        };

        let manifest = match validate_plugin_manifest_json(&manifest_contents) {
            Ok(manifest) => manifest,
            Err(error) => {
                issues.push(WorkspacePluginIssue {
                    level: "error".to_string(),
                    message: format!("Manifest validation failed: {error}"),
                });
                records.push(WorkspacePluginRecord {
                    id: directory.clone(),
                    name: directory.clone(),
                    version: "invalid".to_string(),
                    directory,
                    manifest_path: manifest_path.display().to_string(),
                    settings_schema_path: settings_schema_path
                        .exists()
                        .then(|| settings_schema_path.display().to_string()),
                    source_entry_path: source_entry_path
                        .exists()
                        .then(|| source_entry_path.display().to_string()),
                    status: "error".to_string(),
                    manifest: fallback_manifest_summary(&entry.file_name().to_string_lossy()),
                    issues,
                });
                continue;
            }
        };

        if directory != manifest.id {
            issues.push(WorkspacePluginIssue {
                level: "warning".to_string(),
                message: format!(
                    "Workspace folder '{}' does not match manifest id '{}'.",
                    directory, manifest.id
                ),
            });
        }

        let settings_schema_path_string = if settings_schema_path.exists() {
            match fs::read_to_string(&settings_schema_path) {
                Ok(schema_json) => {
                    if let Err(error) =
                        validate_plugin_settings_schema_json(&schema_json, &manifest.id)
                    {
                        issues.push(WorkspacePluginIssue {
                            level: "error".to_string(),
                            message: format!("settings.schema.json is invalid: {error}"),
                        });
                    }
                    Some(settings_schema_path.display().to_string())
                }
                Err(error) => {
                    issues.push(WorkspacePluginIssue {
                        level: "error".to_string(),
                        message: format!("Failed to read settings.schema.json: {error}"),
                    });
                    Some(settings_schema_path.display().to_string())
                }
            }
        } else {
            issues.push(WorkspacePluginIssue {
                level: "warning".to_string(),
                message: "No settings.schema.json found in the workspace root.".to_string(),
            });
            None
        };

        let source_entry_path_string = if source_entry_path.exists() {
            Some(source_entry_path.display().to_string())
        } else {
            issues.push(WorkspacePluginIssue {
                level: "warning".to_string(),
                message: "No src/index.ts entry found for the workspace plugin.".to_string(),
            });
            None
        };

        let status = if issues.iter().any(|issue| issue.level == "error") {
            "error"
        } else if issues.is_empty() {
            "ready"
        } else {
            "warning"
        };

        records.push(WorkspacePluginRecord {
            id: manifest.id.clone(),
            name: manifest.name.clone(),
            version: manifest.version.clone(),
            directory,
            manifest_path: manifest_path.display().to_string(),
            settings_schema_path: settings_schema_path_string,
            source_entry_path: source_entry_path_string,
            status: status.to_string(),
            manifest: workspace_manifest_summary(&manifest),
            issues,
        });
    }

    records.sort_by(|left, right| left.id.cmp(&right.id));
    Ok(records)
}

fn resolve_workspace_dir(workspace_directory: &str) -> Result<PathBuf, String> {
    ensure_safe_workspace_segment(workspace_directory, "workspace_directory")?;
    let path = workspace_plugins_root().join(workspace_directory);
    if !path.exists() {
        return Err(format!(
            "workspace plugin directory '{}' was not found",
            path.display()
        ));
    }
    Ok(path)
}

fn open_path_in_file_manager(path: &Path) -> Result<OpenWorkspacePathResult, String> {
    let launch_path = normalize_launch_path(path);
    let status = if cfg!(target_os = "windows") {
        Command::new("explorer").arg(&launch_path).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&launch_path).spawn()
    } else {
        Command::new("xdg-open").arg(&launch_path).spawn()
    };

    status
        .map_err(|e| format!("failed to open '{}': {e}", launch_path.display()))
        .map(|_| OpenWorkspacePathResult {
            opened_path: launch_path.display().to_string(),
            method: "file-manager".to_string(),
        })
}

fn format_editor_target(path: &Path, line: Option<u32>, column: Option<u32>) -> String {
    let normalized_path = normalize_launch_path(path);
    let path_string = normalized_path.display().to_string();
    match line {
        Some(line) if line > 0 => match column {
            Some(column) if column > 0 => format!("{path_string}:{line}:{column}"),
            _ => format!("{path_string}:{line}"),
        },
        _ => path_string,
    }
}

fn normalize_launch_path(path: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let raw = path.to_string_lossy();
        if let Some(stripped) = raw.strip_prefix(r"\\?\UNC\") {
            return PathBuf::from(format!(r"\\{stripped}"));
        }
        if let Some(stripped) = raw.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
    }

    path.to_path_buf()
}

fn editor_path_string(path: &Path) -> String {
    normalize_launch_path(path).display().to_string()
}

fn editor_line_value(line: Option<u32>) -> String {
    line.unwrap_or(1).to_string()
}

fn editor_column_value(column: Option<u32>) -> String {
    column.unwrap_or(1).to_string()
}

#[derive(Debug, Clone, Copy)]
enum EditorFamily {
    CodeLike,
    Sublime,
    JetBrains,
    NotepadPlusPlus,
    Zed,
    Generic,
}

fn normalized_editor_name(path_or_command: &Path) -> String {
    path_or_command
        .file_stem()
        .or_else(|| path_or_command.file_name())
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default()
        .replace(" - ", "-")
        .replace([' ', '_'], "-")
        .replace(".exe", "")
}

fn detect_editor_family(path_or_command: &Path) -> EditorFamily {
    let normalized = normalized_editor_name(path_or_command);
    if [
        "code",
        "code-insiders",
        "codium",
        "cursor",
        "windsurf",
        "vscodium",
    ]
    .iter()
    .any(|candidate| normalized.contains(candidate))
    {
        return EditorFamily::CodeLike;
    }
    if normalized.contains("subl") || normalized.contains("sublime") {
        return EditorFamily::Sublime;
    }
    if normalized.contains("notepad++") || normalized.contains("notepad-plus-plus") {
        return EditorFamily::NotepadPlusPlus;
    }
    if normalized.contains("zed") {
        return EditorFamily::Zed;
    }
    if [
        "idea",
        "webstorm",
        "pycharm",
        "goland",
        "rider",
        "clion",
        "phpstorm",
        "rubymine",
    ]
    .iter()
    .any(|candidate| normalized.contains(candidate))
    {
        return EditorFamily::JetBrains;
    }

    EditorFamily::Generic
}

fn direct_editor_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if cfg!(target_os = "windows") {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let base = PathBuf::from(local_app_data).join("Programs");
            candidates.push(base.join("Microsoft VS Code").join("Code.exe"));
            candidates.push(
                base.join("Microsoft VS Code Insiders")
                    .join("Code - Insiders.exe"),
            );
            candidates.push(base.join("VSCodium").join("VSCodium.exe"));
            candidates.push(base.join("Cursor").join("Cursor.exe"));
            candidates.push(base.join("Windsurf").join("Windsurf.exe"));
            candidates.push(base.join("Zed").join("Zed.exe"));
        }

        for env_key in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Ok(program_files) = std::env::var(env_key) {
                let base = PathBuf::from(program_files);
                candidates.push(base.join("Sublime Text").join("subl.exe"));
                candidates.push(base.join("Sublime Text").join("sublime_text.exe"));
                candidates.push(base.join("Notepad++").join("notepad++.exe"));
            }
        }
    } else if cfg!(target_os = "macos") {
        candidates.push(PathBuf::from("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"));
        candidates.push(PathBuf::from("/Applications/Cursor.app/Contents/Resources/app/bin/cursor"));
        candidates.push(PathBuf::from("/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf"));
        candidates.push(PathBuf::from("/Applications/Zed.app/Contents/MacOS/zed"));
        candidates.push(PathBuf::from("/usr/local/bin/subl"));
    } else {
        candidates.push(PathBuf::from("/usr/bin/code"));
        candidates.push(PathBuf::from("/usr/local/bin/code"));
        candidates.push(PathBuf::from("/usr/bin/codium"));
        candidates.push(PathBuf::from("/usr/local/bin/codium"));
        candidates.push(PathBuf::from("/usr/bin/cursor"));
        candidates.push(PathBuf::from("/usr/local/bin/cursor"));
        candidates.push(PathBuf::from("/usr/bin/windsurf"));
        candidates.push(PathBuf::from("/usr/local/bin/windsurf"));
        candidates.push(PathBuf::from("/usr/bin/zed"));
        candidates.push(PathBuf::from("/usr/local/bin/zed"));
        candidates.push(PathBuf::from("/usr/bin/subl"));
        candidates.push(PathBuf::from("/usr/local/bin/subl"));
    }

    candidates
}

fn build_editor_args(
    editor_family: EditorFamily,
    target_path: &Path,
    line: Option<u32>,
    column: Option<u32>,
) -> Vec<String> {
    let target_arg = format_editor_target(target_path, line, column);
    match editor_family {
        EditorFamily::CodeLike => vec!["--goto".to_string(), target_arg],
        EditorFamily::Sublime => vec![target_arg],
        EditorFamily::JetBrains => {
            let mut args = Vec::new();
            if let Some(line) = line {
                args.push("--line".to_string());
                args.push(line.to_string());
            }
            args.push(editor_path_string(target_path));
            args
        }
        EditorFamily::NotepadPlusPlus => {
            let mut args = Vec::new();
            if let Some(line) = line {
                args.push(format!("-n{line}"));
            }
            args.push(editor_path_string(target_path));
            args
        }
        EditorFamily::Zed | EditorFamily::Generic => vec![editor_path_string(target_path)],
    }
}

fn build_editor_args_from_template(
    args_template: &str,
    target_path: &Path,
    line: Option<u32>,
    column: Option<u32>,
) -> Result<Vec<String>, String> {
    let template = args_template.trim();
    if template.is_empty() {
        return Ok(Vec::new());
    }

    let Some(parts) = shlex::split(template) else {
        return Err("editor arguments contain unmatched quotes".to_string());
    };

    let path_value = editor_path_string(target_path);
    let line_value = editor_line_value(line);
    let column_value = editor_column_value(column);
    let target_value = format_editor_target(target_path, line, column);

    Ok(parts
        .into_iter()
        .map(|part| {
            part.replace("{target}", &target_value)
                .replace("{path}", &path_value)
                .replace("{line}", &line_value)
                .replace("{column}", &column_value)
        })
        .collect())
}

fn spawn_editor_command(
    command_path: &Path,
    args: &[String],
    method_suffix: &str,
    opened_path: &str,
) -> Result<OpenWorkspacePathResult, std::io::Error> {
    let mut child = Command::new(command_path);
    child.args(args);
    child.spawn().map(|_| OpenWorkspacePathResult {
        opened_path: opened_path.to_string(),
        method: format!("editor:{method_suffix}"),
    })
}

fn try_spawn_editor(
    command_path: &Path,
    path: &Path,
    line: Option<u32>,
    column: Option<u32>,
) -> Result<OpenWorkspacePathResult, std::io::Error> {
    let editor_family = detect_editor_family(command_path);
    let args = build_editor_args(editor_family, path, line, column);
    let opened_path = match editor_family {
        EditorFamily::CodeLike | EditorFamily::Sublime => format_editor_target(path, line, column),
        _ => editor_path_string(path),
    };
    spawn_editor_command(
        command_path,
        &args,
        &normalized_editor_name(command_path),
        &opened_path,
    )
}

fn try_spawn_editor_with_template(
    command_path: &Path,
    path: &Path,
    line: Option<u32>,
    column: Option<u32>,
    args_template: &str,
) -> Result<OpenWorkspacePathResult, String> {
    let args = build_editor_args_from_template(args_template, path, line, column)?;
    spawn_editor_command(
        command_path,
        &args,
        &normalized_editor_name(command_path),
        &editor_path_string(path),
    )
    .map_err(|error| error.to_string())
}

fn open_path_in_editor(
    path: &Path,
    line: Option<u32>,
    column: Option<u32>,
    preferred_editors: &[PreferredEditorLaunch],
) -> Result<OpenWorkspacePathResult, String> {
    let editor_candidates = [
        "code",
        "code-insiders",
        "codium",
        "cursor",
        "windsurf",
        "zed",
        "subl",
        "idea",
        "webstorm",
        "pycharm",
        "goland",
        "rider",
        "clion",
        "phpstorm",
        "notepad++",
    ];

    let mut first_error: Option<String> = None;
    for preferred_editor in preferred_editors {
        let preferred_path = preferred_editor.path.trim();
        if preferred_path.is_empty() {
            continue;
        }

        let command_path = PathBuf::from(preferred_path);
        let args_template = preferred_editor.args_template.trim();

        if !args_template.is_empty() {
            match try_spawn_editor_with_template(
                &command_path,
                path,
                line,
                column,
                args_template,
            ) {
                Ok(result) => return Ok(result),
                Err(error) => {
                    if first_error.is_none() {
                        first_error = Some(format!("{preferred_path}: {error}"));
                    }
                    continue;
                }
            }
        }

        match try_spawn_editor(&command_path, path, line, column) {
            Ok(result) => return Ok(result),
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => {
                if first_error.is_none() {
                    first_error = Some(format!("{preferred_path}: {error}"));
                }
            }
        }
    }

    for command_path in direct_editor_candidates() {
        if !command_path.exists() {
            continue;
        }

        match try_spawn_editor(&command_path, path, line, column) {
            Ok(result) => return Ok(result),
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => {
                if first_error.is_none() {
                    first_error = Some(format!("{}: {error}", command_path.display()));
                }
            }
        }
    }

    for command in editor_candidates {
        match try_spawn_editor(Path::new(command), path, line, column) {
            Ok(result) => return Ok(result),
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => {
                if first_error.is_none() {
                    first_error = Some(format!("{command}: {error}"));
                }
            }
        }
    }

    open_path_in_file_manager(path).map(|mut result| {
        result.method = "system-open".to_string();
        result
    }).map_err(|fallback_error| {
        if let Some(editor_error) = first_error {
            format!(
                "no supported editor command was available ({editor_error}); fallback open also failed: {fallback_error}"
            )
        } else {
            format!(
                "no supported editor command was available and fallback open failed: {fallback_error}"
            )
        }
    })
}

#[tauri::command]
pub fn create_workspace_plugin_scaffold(
    request: CreateWorkspacePluginScaffoldRequest,
) -> Result<CreateWorkspacePluginScaffoldResult, String> {
    ensure_devtools_enabled()?;
    create_workspace_plugin_scaffold_in(&workspace_plugins_root(), &request)
}

#[tauri::command]
pub fn list_workspace_plugins() -> Result<Vec<WorkspacePluginRecord>, String> {
    ensure_devtools_enabled()?;
    scan_workspace_plugins_in(&workspace_plugins_root())
}

#[tauri::command]
pub fn open_workspace_plugin_folder(
    workspace_directory: String,
) -> Result<OpenWorkspacePathResult, String> {
    ensure_devtools_enabled()?;
    let workspace_dir = resolve_workspace_dir(&workspace_directory)?;
    open_path_in_file_manager(&workspace_dir)
}

#[tauri::command]
pub fn open_workspace_plugin_source(
    workspace_directory: String,
) -> Result<OpenWorkspacePathResult, String> {
    ensure_devtools_enabled()?;
    let workspace_dir = resolve_workspace_dir(&workspace_directory)?;
    let preferred_source = workspace_dir.join("src").join("index.ts");
    let source_path = if preferred_source.exists() {
        preferred_source
    } else {
        workspace_dir.join("plugin.json")
    };
    open_path_in_editor(&source_path, None, None, &[])
}

#[tauri::command]
pub fn open_workspace_plugin_manifest(
    workspace_directory: String,
) -> Result<OpenWorkspacePathResult, String> {
    ensure_devtools_enabled()?;
    let workspace_dir = resolve_workspace_dir(&workspace_directory)?;
    let manifest_path = workspace_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err(format!(
            "workspace plugin manifest '{}' was not found",
            manifest_path.display()
        ));
    }
    open_path_in_editor(&manifest_path, None, None, &[])
}

#[tauri::command]
pub fn open_repo_source_path(
    repo_path: String,
    line: Option<u32>,
    column: Option<u32>,
    preferred_editors: Option<Vec<PreferredEditorLaunch>>,
) -> Result<OpenWorkspacePathResult, String> {
    ensure_devtools_enabled()?;
    let path = resolve_repo_relative_path(&repo_path)?;
    let preferred_editors = preferred_editors.unwrap_or_default();
    open_path_in_editor(&path, line, column, &preferred_editors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("kuro-viewer-{label}-{timestamp}"));
        fs::create_dir_all(&path).expect("failed to create temp dir");
        path
    }

    fn sample_request(template: WorkspacePluginTemplate) -> CreateWorkspacePluginScaffoldRequest {
        CreateWorkspacePluginScaffoldRequest {
            plugin_id: "workspace-sample".to_string(),
            name: "Workspace Sample".to_string(),
            template: Some(template),
            include_readme: true,
        }
    }

    #[test]
    fn detects_common_editor_families() {
        assert!(matches!(
            detect_editor_family(Path::new("Code.exe")),
            EditorFamily::CodeLike
        ));
        assert!(matches!(
            detect_editor_family(Path::new("idea64.exe")),
            EditorFamily::JetBrains
        ));
        assert!(matches!(
            detect_editor_family(Path::new("notepad++.exe")),
            EditorFamily::NotepadPlusPlus
        ));
    }

    #[test]
    fn expands_editor_argument_templates() {
        let args = build_editor_args_from_template(
            r#"--goto "{target}" --label inspect"#,
            Path::new("src/components/ImageViewer.tsx"),
            Some(154),
            Some(1),
        )
        .expect("template should parse");

        assert_eq!(
            args,
            vec![
                "--goto".to_string(),
                "src/components/ImageViewer.tsx:154:1".to_string(),
                "--label".to_string(),
                "inspect".to_string(),
            ]
        );
    }

    #[test]
    fn rejects_invalid_editor_argument_templates() {
        let error = build_editor_args_from_template(
            "\"--goto",
            Path::new("src/components/ImageViewer.tsx"),
            Some(154),
            Some(1),
        )
        .expect_err("template should fail");

        assert!(error.contains("unmatched quotes"));
    }

    #[test]
    fn creates_panel_first_workspace_scaffold() {
        let temp_root = unique_temp_dir("scaffold-panel");
        let plugins_root = temp_root.join("plugins");

        let result = create_workspace_plugin_scaffold_in(
            &plugins_root,
            &sample_request(WorkspacePluginTemplate::PanelFirst),
        )
        .expect("expected scaffold creation to succeed");

        assert!(Path::new(&result.directory_path).exists());
        assert!(Path::new(&result.manifest_path).exists());
        assert!(Path::new(&result.settings_schema_path).exists());
        assert!(Path::new(&result.source_entry_path).exists());
        assert!(result.backend_entry_path.is_none());
        assert!(result.readme_path.is_some());

        let manifest_json =
            fs::read_to_string(&result.manifest_path).expect("expected generated manifest");
        let manifest = validate_plugin_manifest_json(&manifest_json)
            .expect("generated manifest should pass validation");
        assert_eq!(manifest.id, "workspace-sample");
        assert_eq!(manifest.frontend_entry.as_deref(), Some("frontend.js"));
        assert_eq!(manifest.slots.len(), 1);
    }

    #[test]
    fn creates_python_backed_workspace_scaffold() {
        let temp_root = unique_temp_dir("scaffold-python");
        let plugins_root = temp_root.join("plugins");

        let result = create_workspace_plugin_scaffold_in(
            &plugins_root,
            &sample_request(WorkspacePluginTemplate::PythonBacked),
        )
        .expect("expected python scaffold creation to succeed");

        let backend_path = result
            .backend_entry_path
            .clone()
            .expect("python-backed scaffold should create a backend entry");
        assert!(Path::new(&backend_path).exists());

        let manifest_json =
            fs::read_to_string(&result.manifest_path).expect("expected generated manifest");
        let manifest = validate_plugin_manifest_json(&manifest_json)
            .expect("generated manifest should pass validation");
        assert_eq!(manifest.backend_entry.as_deref(), Some("python/main.py"));
    }

    #[test]
    fn rejects_invalid_plugin_id() {
        let temp_root = unique_temp_dir("scaffold-invalid");
        let plugins_root = temp_root.join("plugins");
        let mut request = sample_request(WorkspacePluginTemplate::Blank);
        request.plugin_id = "Invalid Plugin".to_string();

        let error = create_workspace_plugin_scaffold_in(&plugins_root, &request)
            .expect_err("expected invalid id rejection");
        assert!(error.contains("plugin_id must be kebab-case"));
    }

    #[test]
    fn rejects_existing_workspace_directory() {
        let temp_root = unique_temp_dir("scaffold-duplicate");
        let plugins_root = temp_root.join("plugins");
        let request = sample_request(WorkspacePluginTemplate::ToolbarFirst);

        create_workspace_plugin_scaffold_in(&plugins_root, &request)
            .expect("first scaffold creation should succeed");
        let error = create_workspace_plugin_scaffold_in(&plugins_root, &request)
            .expect_err("expected duplicate rejection");
        assert!(error.contains("already exists"));
    }

    #[test]
    fn resolves_safe_repo_relative_path() {
        let path = resolve_repo_relative_path("src/App.tsx")
            .expect("expected repo-relative app path to resolve");
        assert!(path.ends_with(Path::new("src").join("App.tsx")));
    }

    #[test]
    fn rejects_repo_path_traversal() {
        let error = resolve_repo_relative_path("../Cargo.toml")
            .expect_err("expected traversal path to be rejected");
        assert!(error.contains("repository root"));
    }
}

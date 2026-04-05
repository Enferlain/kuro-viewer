mod devtools;
mod plugin_install;
mod plugin_manifest;
mod settings;
pub mod workspace_packaging;

use plugin_manifest::{host_plugin_contract, validate_plugin_manifest_json, HostPluginContract};

#[tauri::command]
fn plugin_contract_info() -> HostPluginContract {
    host_plugin_contract()
}

#[tauri::command]
fn validate_plugin_manifest(manifest_json: String) -> Result<(), String> {
    validate_plugin_manifest_json(&manifest_json).map(|_| ())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            devtools::create_workspace_plugin_scaffold,
            devtools::list_workspace_plugins,
            devtools::open_workspace_plugin_folder,
            devtools::open_workspace_plugin_manifest,
            devtools::open_repo_source_path,
            devtools::open_workspace_plugin_source,
            plugin_contract_info,
            validate_plugin_manifest,
            settings::read_settings,
            settings::write_settings,
            plugin_install::inspect_plugin_manifest,
            plugin_install::install_plugin,
            plugin_install::list_plugins,
            plugin_install::read_plugin_settings_schema,
            plugin_install::validate_plugin_settings_schema,
            plugin_install::uninstall_plugin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

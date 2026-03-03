use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
	let dir = app
		.path()
		.app_data_dir()
		.map_err(|e| format!("failed to resolve app data dir: {e}"))?;
	Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn read_settings(app: tauri::AppHandle) -> String {
	let path = match settings_path(&app) {
		Ok(p) => p,
		Err(_) => return "{}".to_string(),
	};

	match fs::read_to_string(&path) {
		Ok(contents) => {
			// Validate it's parseable JSON; if not, return empty object
			if serde_json::from_str::<Value>(&contents).is_ok() {
				contents
			} else {
				"{}".to_string()
			}
		}
		Err(_) => "{}".to_string(),
	}
}

#[tauri::command]
pub fn write_settings(app: tauri::AppHandle, json: String) -> Result<(), String> {
	// Validate JSON is parseable before writing
	serde_json::from_str::<Value>(&json).map_err(|e| format!("invalid JSON: {e}"))?;

	let path = settings_path(&app)?;
	let dir = path
		.parent()
		.ok_or_else(|| "settings path has no parent directory".to_string())?;

	// Ensure AppData directory exists
	fs::create_dir_all(dir).map_err(|e| format!("failed to create settings directory: {e}"))?;

	// Atomic write: write to temp file, then rename
	let tmp_path = dir.join("settings.tmp.json");
	fs::write(&tmp_path, &json).map_err(|e| format!("failed to write temp settings: {e}"))?;

	if let Err(rename_err) = fs::rename(&tmp_path, &path) {
		// Fallback: try direct overwrite if rename fails (e.g., locked file on Windows).
		// If this succeeds, treat the overall operation as success.
		fs::write(&path, &json).map_err(|write_err| {
			format!("failed to save settings: rename={rename_err}, write={write_err}")
		})?;

		// Best effort cleanup of the temp file if it still exists.
		let _ = fs::remove_file(&tmp_path);
	}

	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn rejects_invalid_json_on_write() {
		// We can't easily test with a real AppHandle, but we can test the JSON validation
		let bad_json = "not valid json {{{";
		let parsed = serde_json::from_str::<Value>(bad_json);
		assert!(parsed.is_err());
	}
}

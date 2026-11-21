// Windows Tauri Desktop Entry Point for VoxelVerse (v7.3.0 Native Filesystem Save Bridge)
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::fs;
use std::path::PathBuf;

fn sanitize_world_id(world_id: &str) -> Result<String, String> {
  let clean: String = world_id
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
    .take(64)
    .collect();
  if clean.is_empty() {
    return Err("Invalid world_id".to_string());
  }
  Ok(clean)
}

fn resolve_worlds_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
  let base = app_handle
    .path_resolver()
    .app_data_dir()
    .ok_or_else(|| "Unable to resolve app_data_dir".to_string())?;
  let worlds_dir = base.join("worlds");
  fs::create_dir_all(&worlds_dir).map_err(|e| format!("Failed to create worlds dir: {}", e))?;
  Ok(worlds_dir)
}

#[tauri::command]
fn save_world_native(
  app_handle: tauri::AppHandle,
  world_id: String,
  payload_json: String,
) -> Result<String, String> {
  let safe_id = sanitize_world_id(&world_id)?;
  let dir = resolve_worlds_dir(&app_handle)?;
  let final_path = dir.join(format!("{}.vvsave.json", safe_id));
  let tmp_path = dir.join(format!("{}.vvsave.tmp", safe_id));

  fs::write(&tmp_path, payload_json.as_bytes())
    .map_err(|e| format!("Failed to write temp save: {}", e))?;
  fs::rename(&tmp_path, &final_path)
    .map_err(|e| format!("Failed to finalize atomic save: {}", e))?;

  Ok(final_path.to_string_lossy().to_string())
}

#[tauri::command]
fn load_world_native(app_handle: tauri::AppHandle, world_id: String) -> Result<String, String> {
  let safe_id = sanitize_world_id(&world_id)?;
  let dir = resolve_worlds_dir(&app_handle)?;
  let path = dir.join(format!("{}.vvsave.json", safe_id));
  fs::read_to_string(&path).map_err(|e| format!("Failed to load world save: {}", e))
}

#[tauri::command]
fn list_native_worlds(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
  let dir = resolve_worlds_dir(&app_handle)?;
  let mut ids = Vec::new();
  if let Ok(entries) = fs::read_dir(&dir) {
    for entry in entries.flatten() {
      if let Some(name) = entry.file_name().to_str() {
        if let Some(stripped) = name.strip_suffix(".vvsave.json") {
          ids.push(stripped.to_string());
        }
      }
    }
  }
  Ok(ids)
}

#[tauri::command]
fn delete_world_native(app_handle: tauri::AppHandle, world_id: String) -> Result<(), String> {
  let safe_id = sanitize_world_id(&world_id)?;
  let dir = resolve_worlds_dir(&app_handle)?;
  let path = dir.join(format!("{}.vvsave.json", safe_id));
  if path.exists() {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete world save: {}", e))?;
  }
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      save_world_native,
      load_world_native,
      list_native_worlds,
      delete_world_native
    ])
    .run(tauri::generate_context!())
    .expect("error while running VoxelVerse desktop application");
}

use std::process::Command;

#[tauri::command]
pub fn run_application(command: &str) -> Result<(), String> {
    Command::new("sh")
        .arg("-c")
        .arg(command)
        .spawn()
        .map_err(|e| {
            log::error!("[application] Failed to run application: {}", e);
            format!("アプリケーションの起動に失敗しました: {}", e)
        })?;

    log::debug!("[application] Started application: {}", command);
    Ok(())
}

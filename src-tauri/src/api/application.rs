use std::process::Command;

#[tauri::command]
pub fn run_application(command: &str) -> Result<(), String> {
    Command::new("sh")
        .arg("-c")
        .arg(command)
        .spawn()
        .map_err(|e| {
            // macOS では /bin/sh が必ず存在するため、spawn() が Err になることは実質ない。
            // コマンドの実行失敗（存在しないアプリ名など）は sh プロセス内で発生するため、
            // spawn() 自体は成功し、このエラーハンドラは呼ばれない。
            log::error!("[application] Failed to run application: {}", e);
            format!("アプリケーションの起動に失敗しました: {}", e)
        })?;

    log::debug!("[application] Started application: {}", command);
    Ok(())
}

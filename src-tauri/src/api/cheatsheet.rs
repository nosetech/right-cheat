use crate::common;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json;
use std::error::Error;
use std::fmt;
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, EventTarget};

lazy_static! {
    static ref CACHE: Mutex<Option<Vec<CheatSheet>>> = Mutex::new(None);
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    success: bool,
    error: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheatSheet {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    sheet_type: Option<String>,
    title: String,
    commandlist: Vec<Command>,
}
impl fmt::Display for CheatSheet {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "title = {}, commandlist = ", self.title)?;
        for command in self.commandlist.iter() {
            write!(f, "(")?;
            command.fmt(f)?;
            write!(f, "),")?;
        }
        write!(f, "")
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Command {
    description: String,
    command: String,
}
impl fmt::Display for Command {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "description = {}, command = {}",
            self.description, self.command
        )
    }
}

#[tauri::command]
pub fn get_cheat_titles(input_path: &str) -> String {
    let mut cache = CACHE.lock().unwrap();

    // キャッシュが空ならファイルから読み込む
    if cache.is_none() {
        log::debug!("Cache is empty, reading from file: {}", input_path);
        match read_json_from_file(PathBuf::from(input_path)) {
            Ok(data) => *cache = Some(data),
            Err(e) => {
                let error_msg = format_json_error(e.as_ref());
                log::error!("Failed to read JSON file: {}", error_msg);
                let error_response = ErrorResponse {
                    success: false,
                    error: error_msg,
                };
                return serde_json::to_string(&error_response).unwrap_or_else(|_| {
                    r#"{"success":false,"error":"JSONレスポンス生成エラー"}"#.to_string()
                });
            }
        }
    }

    let titlelist = cache
        .as_ref()
        .unwrap_or(&vec![])
        .iter()
        .map(|sheet| format!("\"{}\"", sheet.title))
        .collect::<Vec<String>>()
        .join(",");

    format!("{{\"title\": [{}]}}", titlelist)
}

#[tauri::command]
pub fn get_cheat_sheet(input_path: &str, title: &str) -> String {
    let mut cache = CACHE.lock().unwrap();

    // キャッシュが空ならファイルから読み込む
    if cache.is_none() {
        log::debug!("Cache is empty, reading from file: {}", input_path);
        match read_json_from_file(PathBuf::from(input_path)) {
            Ok(data) => *cache = Some(data),
            Err(e) => {
                let error_msg = format_json_error(e.as_ref());
                log::error!("Failed to read JSON file: {}", error_msg);
                let error_response = ErrorResponse {
                    success: false,
                    error: error_msg,
                };
                return serde_json::to_string(&error_response).unwrap_or_else(|_| {
                    r#"{"success":false,"error":"JSONレスポンス生成エラー"}"#.to_string()
                });
            }
        }
    }

    let binding = vec![];
    let cheatsheet = cache
        .as_ref()
        .unwrap_or(&binding)
        .iter()
        .find(|sheet| sheet.title == title);
    let response = cheatsheet.map_or("{}".to_string(), |sheet| {
        serde_json::to_string(&sheet).unwrap_or("{}".to_string())
    });

    response
}

#[tauri::command]
pub fn reload_cheat_sheet<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    let mut cache = CACHE.lock().unwrap();
    *cache = None; // キャッシュをクリア

    let response;
    match app.emit_to(EventTarget::app(), common::event::RELOAD_CHEAT_SHEET, ()) {
        Ok(_) => response = "success",
        Err(_) => response = "fail",
    }

    format!("{{\"status\": {}}}", response)
}

fn read_json_from_file(file_path: PathBuf) -> Result<Vec<CheatSheet>, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let cheatsheet: Vec<CheatSheet> = serde_json::from_reader(reader)?;
    Ok(cheatsheet)
}

fn format_json_error(error: &dyn std::error::Error) -> String {
    let error_msg = error.to_string();

    // serde_json エラーはメッセージに行とカラムの情報を含む
    // 例: "expected value at line 5 column 10"
    // このメッセージをそのままユーザーに返す
    if error_msg.contains("line") && error_msg.contains("column") {
        format!(
            "JSONファイルのパースに失敗しました。\nエラー: {}",
            error_msg
        )
    } else if error_msg.contains("No such file") || error_msg.contains("not found") {
        format!(
            "指定されたJSONファイルが見つかりません。\nエラー: {}",
            error_msg
        )
    } else {
        format!(
            "JSONファイルの読み込みに失敗しました。\nエラー: {}",
            error_msg
        )
    }
}

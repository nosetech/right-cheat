use serde::{Deserialize, Serialize};
use serde_json;
use std::error::Error;
use std::fmt;
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, EventTarget};

#[tauri::command]
pub fn get_cheat_titles(input_path: &str) -> String {
    let cheatsheets = read_json_from_file(PathBuf::from(input_path)).unwrap_or(vec![]);
    let titlelist = cheatsheets
        .iter()
        .map(|sheet| format!("\"{}\"", sheet.title))
        .collect::<Vec<String>>()
        .join(",");

    format!("{{\"title\": [{}]}}", titlelist)
}

#[tauri::command]
pub fn get_cheat_sheet(input_path: &str, title: &str) -> String {
    let cheatsheets = read_json_from_file(PathBuf::from(input_path)).unwrap_or(vec![]);
    let cheatsheet = cheatsheets.iter().find(|sheet| sheet.title == title);
    let response = cheatsheet.map_or("{}".to_string(), |sheet| {
        serde_json::to_string(&sheet).unwrap_or("{}".to_string())
    });

    response
}

#[tauri::command]
pub fn reload_cheat_sheat(app: AppHandle) -> String {
    let response;
    match app.emit_to(EventTarget::app(), "reload_cheat_sheat", ()) {
        Ok(_) => response = "success",
        Err(_) => response = "fail",
    }

    format!("{{\"status\": {}}}", response)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheatSheet {
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

fn read_json_from_file(file_path: PathBuf) -> Result<Vec<CheatSheet>, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let cheatsheet: Vec<CheatSheet> = serde_json::from_reader(reader)?;
    Ok(cheatsheet)
}

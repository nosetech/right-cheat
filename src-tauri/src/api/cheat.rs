use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs::File;
use std::io::BufReader;
use std::error::Error;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::fs;
use dirs;

#[tauri::command]
pub fn greet(name: &str) -> String {
   format!("Hello, {}!", name)
}

#[tauri::command]
pub fn getCheatTitles() -> String {
    "{title: ['Terraform']}".to_string()
}

#[tauri::command]
pub fn getCheatSheet(title: &str) -> String {
    "{title: ['Terraform']}".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheatSheet {
    title: String,
    commandlist: Vec<Command>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Command {
    description: String,
    command: String,
}

pub fn read_json_from_file(file_path: PathBuf) -> Result<Vec<CheatSheet>, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let cheatsheet: Vec<CheatSheet> = serde_json::from_reader(reader)?;
    Ok(cheatsheet)
}

pub static CHEATSHEETS: Lazy<Mutex<Vec<CheatSheet>>> = Lazy::new(|| {
  let defaultfile_path = "repo/right-cheat/src-tauri/src/config/default.json"; // JSONファイルのパス
                                                                               //
  match dirs::home_dir() {
      Some(path) => {
        let config_file = path.join(defaultfile_path);
        let cheatsheets = read_json_from_file(config_file).unwrap_or(vec![]);
        Mutex::new(cheatsheets)
      },
      None => {
        eprintln!("Could not determine home directory");
        Mutex::new(vec![])
      }
  }
});

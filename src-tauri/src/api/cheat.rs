use dirs;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json;
use std::error::Error;
use std::fmt;
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::Mutex;

#[tauri::command]
pub fn get_cheat_titles() -> String {
    let cheatsheets = CHEATSHEETS.lock().unwrap();
    let titlelist = cheatsheets
        .iter()
        .map(|sheet| format!("\"{}\"", sheet.title))
        .collect::<Vec<String>>()
        .join(",");

    format!("{{title: [{}]}}", titlelist)
}

#[tauri::command]
pub fn get_cheat_sheet(title: &str) -> String {
    let cheatsheets = CHEATSHEETS.lock().unwrap();
    let cheatsheet = cheatsheets.iter().find(|sheet| sheet.title == title);
    let response = cheatsheet.map_or("{}".to_string(), |sheet| {
        serde_json::to_string(&sheet).unwrap_or("{}".to_string())
    });

    response
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

pub fn read_json_from_file(file_path: PathBuf) -> Result<Vec<CheatSheet>, Box<dyn Error>> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let cheatsheet: Vec<CheatSheet> = serde_json::from_reader(reader)?;
    Ok(cheatsheet)
}

pub static CHEATSHEETS: Lazy<Mutex<Vec<CheatSheet>>> = Lazy::new(|| {
    let defaultfile_path = "repo/right-cheat/src-tauri/src/config/default.json"; // JSONファイルのパス

    match dirs::home_dir() {
        Some(path) => {
            let config_file = path.join(defaultfile_path);
            let cheatsheets = read_json_from_file(config_file).unwrap_or(vec![]);
            Mutex::new(cheatsheets)
        }
        None => {
            eprintln!("Could not determine home directory");
            Mutex::new(vec![])
        }
    }
});

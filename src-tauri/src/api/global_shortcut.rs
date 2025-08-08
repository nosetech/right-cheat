use crate::common;
use crate::settings_store;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::error::Error;
use std::fmt;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

#[derive(Debug)]
struct ShortcutDefError;

impl fmt::Display for ShortcutDefError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Invalid shortcut definition")
    }
}
impl Error for ShortcutDefError {}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToggleVisibleShortcut {
    ctrl: bool,
    option: bool,
    command: bool,
    hotkey: String,
}
impl fmt::Display for ToggleVisibleShortcut {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "ctrl = {}, option = {}, command = {}, hotkey = {}",
            self.ctrl, self.option, self.command, self.hotkey
        )
    }
}

impl ToggleVisibleShortcut {
    pub fn to_shortcut(&self) -> Result<Shortcut, Box<dyn Error>> {
        let mut modifiers = Modifiers::empty();
        if self.ctrl {
            modifiers.insert(Modifiers::CONTROL);
        }
        if self.option {
            modifiers.insert(Modifiers::ALT);
        }
        if self.command {
            modifiers.insert(Modifiers::META);
        }
        if modifiers == Modifiers::empty() {
            Err(Box::new(ShortcutDefError))
        } else {
            Ok(Shortcut::new(Some(modifiers), self.convert_hotkey_code()?))
        }
    }

    fn convert_hotkey_code(&self) -> Result<Code, Box<dyn Error>> {
        match self.hotkey.as_str() {
            // 数字キー
            "0" => Ok(Code::Digit0),
            "1" => Ok(Code::Digit1),
            "2" => Ok(Code::Digit2),
            "3" => Ok(Code::Digit3),
            "4" => Ok(Code::Digit4),
            "5" => Ok(Code::Digit5),
            "6" => Ok(Code::Digit6),
            "7" => Ok(Code::Digit7),
            "8" => Ok(Code::Digit8),
            "9" => Ok(Code::Digit9),

            // アルファベットキー (大文字小文字区別なし)
            "A" | "a" => Ok(Code::KeyA),
            "B" | "b" => Ok(Code::KeyB),
            "C" | "c" => Ok(Code::KeyC),
            "D" | "d" => Ok(Code::KeyD),
            "E" | "e" => Ok(Code::KeyE),
            "F" | "f" => Ok(Code::KeyF),
            "G" | "g" => Ok(Code::KeyG),
            "H" | "h" => Ok(Code::KeyH),
            "I" | "i" => Ok(Code::KeyI),
            "J" | "j" => Ok(Code::KeyJ),
            "K" | "k" => Ok(Code::KeyK),
            "L" | "l" => Ok(Code::KeyL),
            "M" | "m" => Ok(Code::KeyM),
            "N" | "n" => Ok(Code::KeyN),
            "O" | "o" => Ok(Code::KeyO),
            "P" | "p" => Ok(Code::KeyP),
            "Q" | "q" => Ok(Code::KeyQ),
            "R" | "r" => Ok(Code::KeyR),
            "S" | "s" => Ok(Code::KeyS),
            "T" | "t" => Ok(Code::KeyT),
            "U" | "u" => Ok(Code::KeyU),
            "V" | "v" => Ok(Code::KeyV),
            "W" | "w" => Ok(Code::KeyW),
            "X" | "x" => Ok(Code::KeyX),
            "Y" | "y" => Ok(Code::KeyY),
            "Z" | "z" => Ok(Code::KeyZ),

            // 未対応のキー
            _ => Err(Box::new(ShortcutDefError)),
        }
    }

    pub fn to_shortcut_for_menu(&self) -> Result<String, Box<dyn Error>> {
        let mut shortcut_str = String::from("");
        if self.ctrl {
            shortcut_str.push_str("Ctrl+")
        }
        if self.option {
            shortcut_str.push_str("Alt+")
        }
        if self.command {
            shortcut_str.push_str("Cmd+")
        }

        if shortcut_str.len() == 0 {
            Err(Box::new(ShortcutDefError))
        } else {
            Ok(shortcut_str + &self.hotkey)
        }
    }
}

pub fn init_toggle_visible_shortcut_settings<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<(), tauri_plugin_store::Error> {
    let shortcut_settings =
        settings_store::get_setting(app, common::config::TOGGLE_VISIBLE_SHORTCUT);

    match shortcut_settings {
        Ok(result) => match result {
            Some(value) => {
                log::info!("Toggle visible shortcut settings already exists: {}", value);
            }
            None => {
                let default_shortcut = ToggleVisibleShortcut {
                    ctrl: true,
                    option: false,
                    command: true,
                    hotkey: String::from("R"),
                };
                if let Err(err) = settings_store::set_setting(
                    app,
                    common::config::TOGGLE_VISIBLE_SHORTCUT,
                    json!(default_shortcut),
                ) {
                    log::error!(
                        "Failed to set default toggle visible shortcut settings: {}",
                        err
                    );
                    return Err(err);
                } else {
                    log::info!("Default toggle visible shortcut settings initialized.");
                }
            }
        },
        Err(err) => {
            log::error!("{:?}", err);
            return Err(err);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_toggle_visible_shortcut_settings<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    let shortcut_settings =
        settings_store::get_setting(&app, common::config::TOGGLE_VISIBLE_SHORTCUT);

    let response;
    let message;
    match shortcut_settings {
        Ok(result) => match result {
            Some(value) => {
                response = "success";
                message = format!("{}", value);
            }
            None => {
                response = "fail";
                message = String::from("No settings found for toggle visible shortcut.");
            }
        },
        Err(err) => {
            log::error!("{:?}", err);
            response = "fail";
            message = format!("{}", err);
        }
    }

    format!("{{\"status\": {}, \"message\": {}}}", response, message)
}

#[tauri::command]
pub fn set_toggle_visible_shortcut_settings<R: tauri::Runtime>(
    app: AppHandle<R>,
    shortcut: ToggleVisibleShortcut,
) -> String {
    let result = settings_store::set_setting(
        &app,
        common::config::TOGGLE_VISIBLE_SHORTCUT,
        json!(shortcut),
    );

    let response;
    let message;
    match result {
        Ok(()) => {
            response = "success";
            message = String::from("");
        }
        Err(err) => {
            log::error!("{:?}", err);
            response = "fail";
            message = format!("{}", err);
        }
    }

    format!("{{\"status\": {}, \"message\": {}}}", response, message)
}

#[tauri::command]
pub fn restart_app<R: tauri::Runtime>(app: AppHandle<R>) {
    app.restart();
}

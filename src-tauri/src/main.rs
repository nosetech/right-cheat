// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  app_lib::run();
}
// // Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
//
// fn main() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_global_shortcut::Builder::new().build())
//         .invoke_handler(tauri::generate_handler![greet])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
//
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}!", name)
// }

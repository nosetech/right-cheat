mod api;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cheatsheets = api::cheat::CHEATSHEETS.lock().unwrap();
    println!("読み込んだデータ: {:?}", cheatsheets);

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };

                let ctrl_n_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyN);
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, shortcut, event| {
                            println!("{:?}", shortcut);
                            if shortcut == &ctrl_n_shortcut {
                                match event.state() {
                                    ShortcutState::Pressed => {
                                        println!("Ctrl-N Pressed!");
                                    }
                                    ShortcutState::Released => {
                                        println!("Ctrl-N Released!");
                                    }
                                }
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(ctrl_n_shortcut)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![api::cheat::greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

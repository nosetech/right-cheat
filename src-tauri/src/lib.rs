mod api;
use std::path::Path;
use tauri::image::Image;
use tauri::menu::{AboutMetadataBuilder, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri_plugin_opener::OpenerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .menu(|handle| {
            Menu::with_items(
                handle,
                &[
                    &Submenu::with_items(
                        handle,
                        "",
                        true,
                        &[
                            &PredefinedMenuItem::about(
                                handle,
                                Some("About RightCheat"),
                                Some(
                                    AboutMetadataBuilder::new()
                                        .name(Some("RightCheat"))
                                        .version(Some("prototype 1.0"))
                                        .short_version(Some("prototype 1.0"))
                                        .copyright(Some("©︎ 2025 nosetech"))
                                        .icon(Some(Image::from_path(Path::new(
                                            "./icons/icon.png",
                                        ))?))
                                        .build(),
                                ),
                            )?,
                            &PredefinedMenuItem::separator(handle)?,
                            &MenuItem::with_id(
                                handle,
                                "id_preferences",
                                "Preferences ",
                                true,
                                Some("CmdOrCtrl+,"),
                            )?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::quit(handle, Some("Quit"))?,
                        ],
                    )?,
                    &Submenu::with_items(
                        handle,
                        "Help",
                        true,
                        &[&MenuItem::with_id(
                            handle,
                            "id_help",
                            "RightCheat Help",
                            true,
                            None::<&str>,
                        )?],
                    )?,
                ],
            )
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "id_help" => {
                let opener = app.opener();
                let _ = opener.open_url("https://github.com/nosetech/right-cheat", None::<&str>);
            }
            "id_preferences" => {
                let _ = tauri::webview::WebviewWindowBuilder::new(
                    app,
                    "preferences",
                    tauri::WebviewUrl::App("/preferences".into()),
                )
                .title("Preferences")
                .inner_size(500.0, 150.0)
                .max_inner_size(800.0, 150.0)
                .min_inner_size(500.0, 150.0)
                .build();
            }
            _ => {
                println!("Event id={:?}", event.id());
            }
        })
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
        .invoke_handler(tauri::generate_handler![
            api::cheat::get_cheat_titles,
            api::cheat::get_cheat_sheet,
            api::cheat::reload_cheat_sheat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub mod api;
pub mod common;
pub mod settings_store;

use serde_json;
use settings_store::{SettingsStore, TauriSettingsStore};
use std::path::Path;
use tauri::image::Image;
use tauri::menu::{AboutMetadataBuilder, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin({
            let mut logger = tauri_plugin_log::Builder::new()
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal);
            if cfg!(dev) {
                logger = logger.level(log::LevelFilter::Trace)
            } else {
                logger = logger.level(log::LevelFilter::Info)
            }
            logger.build()
        })
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .on_menu_event(|handle, event| on_menu_event_configuration(handle, event))
        .setup(|app| global_shortcut_configuration(app))
        .invoke_handler(tauri::generate_handler![
            api::cheatsheet::get_cheat_titles,
            api::cheatsheet::get_cheat_sheet,
            api::cheatsheet::reload_cheat_sheet,
            api::global_shortcut::get_toggle_visible_shortcut_settings,
            api::global_shortcut::set_toggle_visible_shortcut_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn menu_configuration<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    toggle_visible_shortcut: String,
) -> Result<Menu<R>, tauri::Error> {
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
                        Some({
                            let app_version = handle.package_info().version.to_string();
                            let mut metadata = AboutMetadataBuilder::new()
                                .version(Some(format!("バージョン {}", app_version)))
                                .short_version(Some(app_version))
                                .copyright(Some("©︎ 2025 nosetech"));
                            if cfg!(dev) {
                                metadata = metadata
                                    .icon(Some(Image::from_path(Path::new("./icons/icon.png"))?));
                            }
                            metadata.build()
                        }),
                    )?,
                    &PredefinedMenuItem::separator(handle)?,
                    &MenuItem::with_id(
                        handle,
                        "id_preferences",
                        "Preferences ",
                        true,
                        Some("Cmd+,"),
                    )?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::quit(handle, Some("Quit"))?,
                ],
            )?,
            &Submenu::with_items(
                handle,
                "View ", // NOTE: デフォルトメニューにならないよう、Viewの後にスペースを入れている。
                true,
                &[
                    &MenuItem::with_id(
                        handle,
                        "id_toggle_visible",
                        "Toggle Visible",
                        true,
                        Some(toggle_visible_shortcut),
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "id_reload",
                        "CheatSheet Reload",
                        true,
                        Some("Cmd+r"),
                    )?,
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
}

fn on_menu_event_configuration<R: tauri::Runtime>(handle: &tauri::AppHandle<R>, event: MenuEvent) {
    match event.id().as_ref() {
        "id_help" => {
            let opener = handle.opener();
            let _ = opener.open_url("https://github.com/nosetech/right-cheat", None::<&str>);
        }
        "id_preferences" => {
            let _ = tauri::webview::WebviewWindowBuilder::new(
                handle,
                "preferences",
                tauri::WebviewUrl::App("/preferences".into()),
            )
            .title("Preferences")
            .inner_size(520.0, 240.0)
            .max_inner_size(800.0, 240.0)
            .min_inner_size(520.0, 240.0)
            .build();
        }
        "id_reload" => {
            let _ = api::cheatsheet::reload_cheat_sheet(handle.clone());
        }
        "id_toggle_visible" => {
            handle
                .emit(common::event::WINDOW_VISIABLE_TOGGLE, ())
                .unwrap();
        }
        _ => {
            log::warn!("Unexpected event occurs. Event id={:?}", event.id());
        }
    }
}

fn global_shortcut_configuration<R: tauri::Runtime>(
    app: &tauri::App<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(desktop)]
    {
        let settings_store = TauriSettingsStore;
        api::global_shortcut::init_toggle_visible_shortcut_settings(app.handle())?;
        let shortcut_settings =
            settings_store.get_setting(app.handle(), common::config::TOGGLE_VISIBLE_SHORTCUT)?;
        if let Some(ref json) = shortcut_settings {
            let settings: api::global_shortcut::ShortcutDef = serde_json::from_value(json.clone())?;
            let window_visible_shortcut = settings.to_shortcut()?;
            log::info!(
                "Toggle visible shortcut settings : {}",
                window_visible_shortcut
            );

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        if shortcut == &window_visible_shortcut
                            && event.state() == ShortcutState::Pressed
                        {
                            _app.emit(common::event::WINDOW_VISIABLE_TOGGLE, ())
                                .unwrap();
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(window_visible_shortcut)?;

            let menu = menu_configuration(app.handle(), settings.to_shortcut_for_menu()?)?;
            app.set_menu(menu)?;
        }
    }
    Ok(())
}

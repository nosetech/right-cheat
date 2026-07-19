pub mod api;
pub mod common;
pub mod db;
pub mod settings_store;

use db::DbConnection;
use settings_store::{SettingsStore, TauriSettingsStore};
use tauri::image::Image;
use tauri::menu::{
    AboutMetadataBuilder, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID,
};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;

const TAURI_CONF: &str = include_str!("../tauri.conf.json");

fn get_copyright() -> String {
    let v: serde_json::Value = serde_json::from_str(TAURI_CONF).unwrap_or_default();
    v["bundle"]["copyright"]
        .as_str()
        .unwrap_or_default()
        .to_string()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin({
            let log_settings = api::log_settings::read_log_settings_from_file();
            let mut logger = tauri_plugin_log::Builder::new()
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .max_file_size(log_settings.max_file_size as u128)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(
                    log_settings.rotation_count as usize,
                ));
            if cfg!(dev) {
                logger = logger.level(log::LevelFilter::Trace)
            } else {
                logger = logger.level(log::LevelFilter::Info)
            }
            if let Some(ref dir) = log_settings.output_dir {
                // When a custom output directory is configured, explicitly set targets so
                // that logs go only to the specified folder (and stdout in dev mode).
                // Calling .target() replaces the plugin's default targets (app_log_dir).
                logger = logger.target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Folder {
                        path: std::path::PathBuf::from(dir),
                        file_name: None,
                    },
                ));
                if cfg!(dev) {
                    logger = logger.target(tauri_plugin_log::Target::new(
                        tauri_plugin_log::TargetKind::Stdout,
                    ));
                }
            }
            logger.build()
        })
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .on_menu_event(|handle, event| on_menu_event_configuration(handle, event))
        .setup(|app| {
            // DB を初期化して Tauri State に登録
            // 設定ファイルから DB パスを読み込む（Tauri store 初期化前のため直接読み込み）
            let db_settings = api::db_settings::read_db_settings_from_file();
            let db_path = match db_settings.output_path {
                Some(path) => std::path::PathBuf::from(path),
                None => app
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app_data_dir")
                    .join("cheatsheet.db"),
            };
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            let conn = db::open_connection(db_path).expect("Failed to initialize DB");
            app.manage(DbConnection(std::sync::Mutex::new(conn)));

            #[cfg(target_os = "macos")]
            {
                use objc2::AllocAnyThread;
                use objc2_app_kit::{
                    NSApplication, NSImage, NSWorkspace, NSWorkspaceIconCreationOptions,
                };
                use objc2_foundation::{MainThreadMarker, NSBundle, NSData};
                let icon_bytes = include_bytes!("../icons/icon.png");
                let mtm = unsafe { MainThreadMarker::new_unchecked() };
                let ns_app = NSApplication::sharedApplication(mtm);
                let data = NSData::with_bytes(icon_bytes);
                if let Some(icon) = NSImage::initWithData(NSImage::alloc(), &data) {
                    unsafe { ns_app.setApplicationIconImage(Some(&icon)) };
                    let bundle_path = unsafe { NSBundle::mainBundle().bundlePath() };
                    let workspace = unsafe { NSWorkspace::sharedWorkspace() };
                    unsafe {
                        workspace.setIcon_forFile_options(
                            Some(&icon),
                            &bundle_path,
                            NSWorkspaceIconCreationOptions(0),
                        )
                    };
                }
            }
            // チートシートウィンドウのラベル採番カウンタと最終フォーカスラベルを State 登録。
            // フォーカスハンドラが LastFocusedCheatsheetWindow を参照するため、
            // ハンドラ登録より前に manage する。
            app.manage(api::cheatsheet_window::NextCheatsheetWindowId::default());
            app.manage(api::cheatsheet_window::LastFocusedCheatsheetWindow::new_with_main());

            global_shortcut_configuration(app)?;
            api::log_settings::init_log_settings(app.handle())?;
            api::db_settings::init_db_settings(app.handle())?;
            api::clipboard_settings::init_clipboard_settings(app.handle())?;

            #[cfg(target_os = "macos")]
            {
                let monitor = api::clipboard_monitor::ClipboardMonitor::new();
                monitor.start(app.handle().clone());
                app.manage(monitor);
            }

            // main ウィンドウにも動的生成ウィンドウと同じフォーカスハンドラを適用する。
            if let Some(main_window) = app.get_webview_window("main") {
                api::cheatsheet_window::register_focus_handler(&main_window);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::cheatsheet::list_cheat_sheet_summaries,
            api::cheatsheet::update_cheat_sheets,
            api::cheatsheet::get_cheat_titles,
            api::cheatsheet::get_cheat_sheet,
            api::cheatsheet::reload_cheat_sheet,
            api::cheatsheet::get_cheat_sheet_window_size,
            api::cheatsheet::save_cheat_sheet_window_size,
            api::cheatsheet::import_from_json,
            api::cheatsheet::export_to_json,
            api::cheatsheet::search_commands,
            api::cheatsheet::add_command,
            api::cheatsheet::update_command,
            api::cheatsheet::delete_command,
            api::cheatsheet::add_group,
            api::cheatsheet::update_group,
            api::cheatsheet::delete_group,
            api::cheatsheet::save_cheat_sheet_commandlist,
            api::global_shortcut::get_toggle_visible_shortcut_settings,
            api::global_shortcut::set_toggle_visible_shortcut_settings,
            api::global_shortcut::get_clipboard_history_shortcut_settings,
            api::global_shortcut::set_clipboard_history_shortcut_settings,
            api::window::notify_theme_changed,
            api::window::get_clipboard_history_window_size,
            api::window::save_clipboard_history_window_size,
            api::font_size::get_font_size_settings,
            api::font_size::set_font_size_settings,
            api::font_size::increase_font_size,
            api::font_size::decrease_font_size,
            api::font_size::reset_font_size,
            api::cheatsheet_window::open_cheatsheet_window,
            api::cheatsheet_window::get_last_focused_cheatsheet_window,
            api::application::run_application,
            api::log_settings::get_log_settings,
            api::log_settings::set_log_settings,
            api::log_settings::open_latest_log_file,
            api::log_settings::get_log_dir,
            api::db_settings::get_db_settings,
            api::db_settings::set_db_settings,
            api::db_settings::get_db_path,
            api::db_settings::pick_db_file_path,
            api::clipboard_settings::get_clipboard_settings,
            api::clipboard_settings::set_clipboard_settings,
            api::clipboard_history::list_clipboard_history,
            api::clipboard_history::delete_clipboard_history_item,
            api::clipboard_history::clear_clipboard_history,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // 終了時全削除の前にモニターを停止し、削除後に新たな履歴が書き込まれないようにする
                #[cfg(target_os = "macos")]
                if let Some(monitor) =
                    app_handle.try_state::<api::clipboard_monitor::ClipboardMonitor>()
                {
                    monitor.stop();
                }
                api::clipboard_settings::clear_history_on_quit_if_enabled(app_handle);
            }
        });
}

/// Clipboard History ウィンドウの表示をトグルする。
/// 未作成なら `/clipboard-history` を開き、表示中なら hide、
/// 隠れていれば show + フォーカス（メインウィンドウの Toggle Visible と同等の挙動）。
fn toggle_clipboard_history_window<R: tauri::Runtime>(handle: &tauri::AppHandle<R>) {
    if let Some(win) = handle.get_webview_window("clipboard_history") {
        match win.is_visible() {
            Ok(true) => {
                if let Err(e) = win.hide() {
                    log::error!("[lib] Failed to hide clipboard history window: {}", e);
                }
            }
            Ok(false) => {
                let _ = win.show();
                let _ = win.set_focus();
            }
            Err(e) => {
                // 可視状態の取得に失敗した場合は表示側に倒す
                log::error!(
                    "[lib] Failed to get clipboard history window visibility: {}",
                    e
                );
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    } else {
        let result = tauri::webview::WebviewWindowBuilder::new(
            handle,
            "clipboard_history",
            tauri::WebviewUrl::App("/clipboard-history".into()),
        )
        .title("Clipboard History")
        .inner_size(360.0, 620.0)
        .min_inner_size(320.0, 400.0)
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        .build();
        if let Err(e) = result {
            log::error!("[lib] Failed to create clipboard history window: {}", e);
        }
    }
}

/// すべてのチートシートウィンドウの表示をトグルする。
/// チートシートウィンドウが 1 つも開いていない場合は、復帰導線として
/// 新しいチートシートウィンドウを開く（`New Cheatsheet Window` と同等）。
fn toggle_cheatsheet_windows_visible<R: tauri::Runtime>(handle: &tauri::AppHandle<R>) {
    if api::cheatsheet_window::has_cheatsheet_window(handle) {
        // 各チートシートウィンドウが listen している WINDOW_VISIABLE_TOGGLE を
        // ブロードキャストし、全ウィンドウを一括でトグルする。
        if let Err(e) = handle.emit(common::event::WINDOW_VISIABLE_TOGGLE, ()) {
            log::error!("[lib] Failed to emit window_visible_toggle: {}", e);
        }
    } else if let Err(e) = api::cheatsheet_window::create_cheatsheet_window(handle) {
        log::error!(
            "[lib] Failed to open cheatsheet window on toggle visible: {}",
            e
        );
    }
}

fn menu_configuration<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    toggle_visible_shortcut: String,
    clipboard_history_shortcut: String,
) -> Result<Menu<R>, tauri::Error> {
    let window_submenu = Submenu::with_id_and_items(
        handle,
        WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, None)?,
            &PredefinedMenuItem::maximize(handle, None)?,
            &PredefinedMenuItem::fullscreen(handle, None)?,
        ],
    )?;
    let menu = Menu::with_items(
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
                                .version(Some(format!("Version {}", app_version)))
                                .short_version(Some(app_version))
                                .copyright(Some(get_copyright()));
                            metadata = metadata.icon(Some(Image::from_bytes(include_bytes!(
                                "../icons/icon.png"
                            ))?));
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
                "File",
                true,
                &[
                    &MenuItem::with_id(
                        handle,
                        "id_new_cheatsheet_window",
                        "New Cheatsheet Window",
                        true,
                        Some("Cmd+N"),
                    )?,
                    &PredefinedMenuItem::separator(handle)?,
                    &MenuItem::with_id(
                        handle,
                        "id_edit_cheatsheets",
                        "Edit Cheatsheets",
                        true,
                        Some("Cmd+E"),
                    )?,
                    &PredefinedMenuItem::separator(handle)?,
                    &MenuItem::with_id(
                        handle,
                        "id_import_json",
                        "Import from JSON...",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "id_export_json",
                        "Export to JSON...",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?,
            &Submenu::with_items(
                handle,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(handle, None)?,
                    &PredefinedMenuItem::redo(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::cut(handle, None)?,
                    &PredefinedMenuItem::copy(handle, None)?,
                    &PredefinedMenuItem::paste(handle, None)?,
                    &PredefinedMenuItem::select_all(handle, None)?,
                ],
            )?,
            &Submenu::with_items(
                handle,
                "View ", // NOTE: デフォルトメニューにならないよう、Viewの後にスペースを入れている。
                true,
                &[
                    &MenuItem::with_id(
                        handle,
                        "id_clipboard_history",
                        "Clipboard History",
                        true,
                        Some(clipboard_history_shortcut),
                    )?,
                    &PredefinedMenuItem::separator(handle)?,
                    &MenuItem::with_id(handle, "id_find", "Find...", true, Some("Cmd+F"))?,
                    &PredefinedMenuItem::separator(handle)?,
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
                    &PredefinedMenuItem::separator(handle)?,
                    &MenuItem::with_id(
                        handle,
                        "id_increase_font_size",
                        "Increase Font Size",
                        true,
                        Some("Cmd+="),
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "id_decrease_font_size",
                        "Decrease Font Size",
                        true,
                        Some("Cmd+-"),
                    )?,
                    &MenuItem::with_id(
                        handle,
                        "id_reset_font_size",
                        "Reset Font Size",
                        true,
                        Some("Cmd+0"),
                    )?,
                ],
            )?,
            &window_submenu,
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
    )?;
    Ok(menu)
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
            .inner_size(580.0, 680.0)
            .max_inner_size(800.0, 1100.0)
            .min_inner_size(580.0, 680.0)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .build();
        }
        "id_new_cheatsheet_window" => {
            if let Err(e) = api::cheatsheet_window::create_cheatsheet_window(handle) {
                log::error!("[lib] Failed to open new cheatsheet window: {}", e);
            }
        }
        "id_edit_cheatsheets" => {
            let _ = tauri::webview::WebviewWindowBuilder::new(
                handle,
                "edit_cheatsheets",
                tauri::WebviewUrl::App("/edit-cheatsheets".into()),
            )
            .title("Edit Cheatsheets")
            .inner_size(620.0, 640.0)
            .min_inner_size(560.0, 400.0)
            .max_inner_size(800.0, 800.0)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .build();
        }
        "id_import_json" => {
            let handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
                let path = handle
                    .dialog()
                    .file()
                    .add_filter("JSON", &["json"])
                    .blocking_pick_file();

                if let Some(path) = path {
                    let path_str = path.to_string();

                    // 重複タイトルを事前チェック
                    let conflicts = match api::cheatsheet::scan_import_conflicts(&handle, &path_str)
                    {
                        Ok(c) => c,
                        Err(e) => {
                            log::error!("[lib] scan_import_conflicts error: {}", e);
                            handle
                                .dialog()
                                .message(format!("Import failed.\n{}", e))
                                .title("Import Result")
                                .blocking_show();
                            return;
                        }
                    };

                    // 重複がある場合は3択ダイアログ（2段階）
                    let on_conflict = if conflicts.is_empty() {
                        api::cheatsheet::ConflictResolution::Skip
                    } else {
                        let continue_import = handle
                            .dialog()
                            .message(format!(
                                "{} duplicate title(s) found.\nDo you want to continue importing?",
                                conflicts.len()
                            ))
                            .title("Import")
                            .buttons(MessageDialogButtons::OkCancelCustom(
                                "Continue".to_string(),
                                "Cancel".to_string(),
                            ))
                            .blocking_show();

                        if !continue_import {
                            log::info!("[lib] import cancelled by user");
                            return;
                        }

                        let overwrite = handle
                            .dialog()
                            .message("How do you want to handle duplicates?")
                            .title("Import")
                            .buttons(MessageDialogButtons::OkCancelCustom(
                                "Overwrite".to_string(),
                                "Skip".to_string(),
                            ))
                            .blocking_show();

                        if overwrite {
                            api::cheatsheet::ConflictResolution::Overwrite
                        } else {
                            api::cheatsheet::ConflictResolution::Skip
                        }
                    };

                    match api::cheatsheet::import_from_json(handle.clone(), path_str, on_conflict) {
                        Ok(summary) => {
                            let msg = format!(
                                "Import complete\nAdded: {} / Overwritten: {} / Skipped: {}",
                                summary.added, summary.updated, summary.skipped
                            );
                            log::info!("[lib] {}", msg);
                            handle
                                .dialog()
                                .message(&msg)
                                .title("Import Result")
                                .blocking_show();
                        }
                        Err(e) => {
                            log::error!("[lib] import_from_json error: {}", e);
                            handle
                                .dialog()
                                .message(format!("Import failed.\n{}", e))
                                .title("Import Result")
                                .blocking_show();
                        }
                    }
                }
            });
        }
        "id_export_json" => {
            let _ = tauri::webview::WebviewWindowBuilder::new(
                handle,
                "export",
                tauri::WebviewUrl::App("/export".into()),
            )
            .title("Export Cheatsheets")
            .inner_size(480.0, 480.0)
            .min_inner_size(360.0, 320.0)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .build();
        }
        "id_find" => {
            // 既に検索ウィンドウが開いている場合はフォーカスのみ移す
            if let Some(win) = handle.get_webview_window("search") {
                let _ = win.set_focus();
                return;
            }
            let _ = tauri::webview::WebviewWindowBuilder::new(
                handle,
                "search",
                tauri::WebviewUrl::App("/search".into()),
            )
            .title("Search")
            .inner_size(600.0, 560.0)
            .min_inner_size(480.0, 420.0)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .build();
        }
        "id_reload" => {
            let _ = api::cheatsheet::reload_cheat_sheet(handle.clone());
        }
        "id_toggle_visible" => {
            toggle_cheatsheet_windows_visible(handle);
        }
        "id_clipboard_history" => {
            toggle_clipboard_history_window(handle);
        }
        "id_increase_font_size" => {
            let _ = api::font_size::increase_font_size(handle.clone());
        }
        "id_decrease_font_size" => {
            let _ = api::font_size::decrease_font_size(handle.clone());
        }
        "id_reset_font_size" => {
            let _ = api::font_size::reset_font_size(handle.clone());
        }
        _ => {
            log::warn!("[lib] Unexpected event occurs. Event id={:?}", event.id());
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
        api::global_shortcut::init_clipboard_history_shortcut_settings(app.handle())?;
        let toggle_visible_settings_json =
            settings_store.get_setting(app.handle(), common::config::TOGGLE_VISIBLE_SHORTCUT)?;
        let clipboard_history_settings_json =
            settings_store.get_setting(app.handle(), common::config::CLIPBOARD_HISTORY_SHORTCUT)?;
        if let (Some(ref toggle_json), Some(ref clipboard_json)) = (
            toggle_visible_settings_json,
            clipboard_history_settings_json,
        ) {
            let toggle_settings: api::global_shortcut::ShortcutDef =
                serde_json::from_value(toggle_json.clone())?;
            let clipboard_settings: api::global_shortcut::ShortcutDef =
                serde_json::from_value(clipboard_json.clone())?;
            let window_visible_shortcut = toggle_settings.to_shortcut()?;
            let clipboard_history_shortcut = clipboard_settings.to_shortcut()?;
            log::info!(
                "[lib] Toggle visible shortcut settings : {}",
                window_visible_shortcut
            );
            log::info!(
                "[lib] Clipboard history shortcut settings : {}",
                clipboard_history_shortcut
            );

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        if event.state() != ShortcutState::Pressed {
                            return;
                        }
                        if shortcut == &window_visible_shortcut {
                            toggle_cheatsheet_windows_visible(_app);
                        } else if shortcut == &clipboard_history_shortcut {
                            toggle_clipboard_history_window(_app);
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(window_visible_shortcut)?;
            app.global_shortcut().register(clipboard_history_shortcut)?;

            let menu = menu_configuration(
                app.handle(),
                toggle_settings.to_shortcut_for_menu()?,
                clipboard_settings.to_shortcut_for_menu()?,
            )?;
            app.set_menu(menu)?;
            #[cfg(target_os = "macos")]
            {
                // Tauri's init_app_menu already calls setWindowsMenu: via WINDOW_SUBMENU_ID,
                // but it passes the Submenu's internal ns_menu (created at Submenu construction
                // time), which is a different NSMenu object from the one actually rendered in
                // the menu bar (created later in create_ns_item_for_submenu). We override it
                // here by fetching the real Window NSMenu directly from NSApp.mainMenu().
                use objc2_app_kit::NSApplication;
                use objc2_foundation::MainThreadMarker;
                let mtm = unsafe { MainThreadMarker::new_unchecked() };
                let ns_app = NSApplication::sharedApplication(mtm);
                if let Some(main_menu) = unsafe { ns_app.mainMenu() } {
                    let count = unsafe { main_menu.numberOfItems() };
                    for i in 0..count {
                        if let Some(item) = unsafe { main_menu.itemAtIndex(i) } {
                            if unsafe { item.title() }.to_string() == "Window" {
                                if let Some(window_ns_menu) = unsafe { item.submenu() } {
                                    unsafe { ns_app.setWindowsMenu(Some(&window_ns_menu)) };
                                }
                                break;
                            }
                        }
                    }
                }
            }
        } else {
            // 通常は init_*_shortcut_settings がデフォルトを書き込むため到達しないが、
            // 設定ファイルの欠損時にメニュー・グローバルショートカットが無言で無効化
            // されないよう、原因が追えるようログを残す。
            log::error!(
                "[lib] Shortcut settings are missing; menu and global shortcuts were not configured"
            );
        }
    }
    Ok(())
}

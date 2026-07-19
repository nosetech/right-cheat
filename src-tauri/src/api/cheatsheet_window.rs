use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};

use crate::common;

/// チートシートウィンドウ（`main` / `cheatsheet-*`）の設定値。
/// `main`（tauri.conf.json）と揃える。
const CHEATSHEET_WINDOW_WIDTH: f64 = 500.0;
const CHEATSHEET_WINDOW_HEIGHT: f64 = 800.0;
const CHEATSHEET_WINDOW_MIN_WIDTH: f64 = 400.0;
const CHEATSHEET_WINDOW_MIN_HEIGHT: f64 = 300.0;

/// 追加チートシートウィンドウのラベル接頭辞（`cheatsheet-2`, `cheatsheet-3`, ...）。
const CHEATSHEET_WINDOW_LABEL_PREFIX: &str = "cheatsheet-";
/// 起動時に config から生成される固定ラベル。
const MAIN_WINDOW_LABEL: &str = "main";

/// 追加チートシートウィンドウのラベル採番用カウンタ（次に採番する番号）。
/// `main` は起動時に生成されるため、追加ウィンドウは 2 から始める。
/// 「空き番号の再利用」はせず常にインクリメントすることで、閉じたラベル宛の
/// in-flight イベントが別ウィンドウへ誤配送される問題を原理的に回避する。
pub struct NextCheatsheetWindowId(pub AtomicU32);

impl Default for NextCheatsheetWindowId {
    fn default() -> Self {
        Self(AtomicU32::new(2))
    }
}

/// 最後にフォーカスされたチートシートウィンドウのラベル。
/// 検索ウィンドウ等が「どのチートシートウィンドウへ表示するか」を解決するために参照する。
pub struct LastFocusedCheatsheetWindow(pub Mutex<Option<String>>);

impl LastFocusedCheatsheetWindow {
    /// 初期値として `main` を保持した状態で生成する。
    pub fn new_with_main() -> Self {
        Self(Mutex::new(Some(MAIN_WINDOW_LABEL.to_string())))
    }
}

/// ラベルがチートシートウィンドウ（`main` または `cheatsheet-*`）のものか判定する。
pub fn is_cheatsheet_window_label(label: &str) -> bool {
    label == MAIN_WINDOW_LABEL || label.starts_with(CHEATSHEET_WINDOW_LABEL_PREFIX)
}

/// チートシートウィンドウが 1 つ以上開いているか判定する。
pub fn has_cheatsheet_window<R: Runtime>(handle: &AppHandle<R>) -> bool {
    handle
        .webview_windows()
        .keys()
        .any(|label| is_cheatsheet_window_label(label))
}

/// チートシートウィンドウに `WindowEvent::Focused(true)` ハンドラを登録する。
/// フォーカス時に以下を行う:
/// - 自ウィンドウへ `WINDOW_FOCUSED` を emit（WKWebView のフォーカス復元用）
/// - 「最後にフォーカスされたチートシートウィンドウ」の State を更新
pub fn register_focus_handler<R: Runtime>(window: &WebviewWindow<R>) {
    let win = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(true) = event {
            let label = win.label().to_string();
            log::debug!("[cheatsheet_window] Window focused: {}", label);
            // 複数ウィンドウ環境で他ウィンドウへ誤ってフォーカス復元処理が走らないよう、
            // 自ウィンドウのみへ emit する。
            if let Err(e) = win.emit_to(win.label(), common::event::WINDOW_FOCUSED, ()) {
                log::error!("[cheatsheet_window] Failed to emit window_focused: {}", e);
            }
            if let Some(state) = win.app_handle().try_state::<LastFocusedCheatsheetWindow>() {
                if let Ok(mut last) = state.0.lock() {
                    *last = Some(label);
                }
            }
        }
    });
}

/// 新しいチートシートウィンドウを生成する。
/// ラベルは連番方式（`cheatsheet-N`）で採番し、生成したウィンドウのラベルを返す。
/// 表示位置は少しずらして既存ウィンドウと重ならないようにする（カスケード表示）。
pub fn create_cheatsheet_window<R: Runtime>(handle: &AppHandle<R>) -> Result<String, String> {
    let id = handle
        .state::<NextCheatsheetWindowId>()
        .0
        .fetch_add(1, Ordering::SeqCst);
    let label = format!("{}{}", CHEATSHEET_WINDOW_LABEL_PREFIX, id);

    // カスケード表示: 追加ウィンドウごとに右下へずらす（一定数で折り返す）。
    let step = ((id.saturating_sub(2)) % 10) as f64;
    let offset = 40.0 + step * 30.0;

    let window = tauri::webview::WebviewWindowBuilder::new(
        handle,
        &label,
        tauri::WebviewUrl::App("/".into()),
    )
    .title("RightCheat")
    .inner_size(CHEATSHEET_WINDOW_WIDTH, CHEATSHEET_WINDOW_HEIGHT)
    .min_inner_size(CHEATSHEET_WINDOW_MIN_WIDTH, CHEATSHEET_WINDOW_MIN_HEIGHT)
    .position(offset, offset)
    .resizable(true)
    .title_bar_style(tauri::TitleBarStyle::Overlay)
    .hidden_title(true)
    .build()
    .map_err(|e| e.to_string())?;

    register_focus_handler(&window);
    log::info!("[cheatsheet_window] Opened cheatsheet window: {}", label);
    Ok(label)
}

/// 新しいチートシートウィンドウを開き、生成したウィンドウのラベルを返す。
#[tauri::command]
pub fn open_cheatsheet_window<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    create_cheatsheet_window(&app)
}

/// 最後にフォーカスされたチートシートウィンドウのラベルを返す。
/// 該当ウィンドウが既に閉じられている場合は `None` を返す。
#[tauri::command]
pub fn get_last_focused_cheatsheet_window<R: Runtime>(app: AppHandle<R>) -> Option<String> {
    let state = app.state::<LastFocusedCheatsheetWindow>();
    let label = state.0.lock().ok().and_then(|guard| guard.clone());
    match label {
        Some(l) if app.get_webview_window(&l).is_some() => Some(l),
        _ => None,
    }
}

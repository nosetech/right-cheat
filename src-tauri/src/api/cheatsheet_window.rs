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

/// 親チートシートウィンドウに紐づく編集ウィンドウのラベル一覧を返す。
/// ラベル規則はフロントエンド（useEditWindows.ts）と揃えること。
pub fn edit_window_labels(parent_label: &str) -> [String; 2] {
    [
        format!("edit_command-{}", parent_label),
        format!("edit_group-{}", parent_label),
    ]
}

/// 親チートシートウィンドウに紐づく編集ウィンドウ（`edit_command-<親ラベル>` /
/// `edit_group-<親ラベル>`）を閉じる。
/// 親を閉じたまま編集ウィンドウが残ると、SAVE が存在しないラベル宛の emit と
/// なり入力内容が無言で失われるため、親の破棄時にオーファン化を防ぐ。
fn close_edit_windows_of<R: Runtime>(handle: &AppHandle<R>, parent_label: &str) {
    for label in edit_window_labels(parent_label) {
        if let Some(w) = handle.get_webview_window(&label) {
            log::info!(
                "[cheatsheet_window] Closing orphaned edit window: {}",
                label
            );
            if let Err(e) = w.close() {
                log::error!(
                    "[cheatsheet_window] Failed to close edit window {}: {}",
                    label,
                    e
                );
            }
        }
    }
}

/// チートシートウィンドウにウィンドウイベントハンドラを登録する。
/// - `Focused(true)`: 自ウィンドウへ `WINDOW_FOCUSED` を emit（WKWebView の
///   フォーカス復元用）し、「最後にフォーカスされたチートシートウィンドウ」の
///   State を更新する
/// - `Destroyed`: 自ウィンドウに紐づく編集ウィンドウを閉じる（オーファン化防止）
pub fn register_window_event_handler<R: Runtime>(window: &WebviewWindow<R>) {
    let win = window.clone();
    window.on_window_event(move |event| match event {
        tauri::WindowEvent::Focused(true) => {
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
        tauri::WindowEvent::Destroyed => {
            let label = win.label().to_string();
            log::debug!("[cheatsheet_window] Window destroyed: {}", label);
            close_edit_windows_of(win.app_handle(), &label);
        }
        _ => {}
    });
}

/// カスケード表示のオフセット量（基準位置からの相対値、論理ピクセル）を返す。
/// id に応じて右下へずらし、一定数（10ウィンドウ）で折り返す。
fn cascade_offset(id: u32) -> f64 {
    let step = ((id.saturating_sub(2)) % 10) as f64;
    40.0 + step * 30.0
}

/// カスケード表示の基準位置（論理ピクセル）を、id に応じたオフセット分
/// ずらした絶対位置に変換する。
pub fn cascade_position(base: (f64, f64), id: u32) -> (f64, f64) {
    let offset = cascade_offset(id);
    (base.0 + offset, base.1 + offset)
}

/// カスケード表示の基準位置を、最後にフォーカスされたチートシートウィンドウの
/// 実際の画面座標（論理ピクセル）から求める。
/// 絶対座標 (0, 0) を基準にすると、ユーザーがセカンダリディスプレイで作業して
/// いる場合に新規ウィンドウが常にプライマリディスプレイの左上に生成されて
/// しまうため、既存ウィンドウの実座標を基準にすることでマルチディスプレイ
/// 環境に対応する。基準ウィンドウの座標が取得できない場合は `None` を返し、
/// 呼び出し側は position 指定を省略して OS のデフォルト配置に委ねる。
fn cascade_base_position<R: Runtime>(handle: &AppHandle<R>) -> Option<(f64, f64)> {
    let state = handle.try_state::<LastFocusedCheatsheetWindow>()?;
    let label = state.0.lock().ok()?.clone()?;
    let window = handle.get_webview_window(&label)?;
    let scale_factor = window.scale_factor().ok()?;
    let physical = window.outer_position().ok()?;
    let logical = physical.to_logical::<f64>(scale_factor);
    Some((logical.x, logical.y))
}

/// 新しいチートシートウィンドウを生成する。
/// ラベルは連番方式（`cheatsheet-N`）で採番し、生成したウィンドウのラベルを返す。
/// 表示位置は最後にフォーカスされたチートシートウィンドウの実座標を基準に
/// 少しずらして重ならないようにする（カスケード表示）。基準ウィンドウの座標が
/// 取得できない場合は OS のデフォルト配置に委ねる。
pub fn create_cheatsheet_window<R: Runtime>(handle: &AppHandle<R>) -> Result<String, String> {
    let id = handle
        .state::<NextCheatsheetWindowId>()
        .0
        .fetch_add(1, Ordering::SeqCst);
    let label = format!("{}{}", CHEATSHEET_WINDOW_LABEL_PREFIX, id);

    let mut builder = tauri::webview::WebviewWindowBuilder::new(
        handle,
        &label,
        tauri::WebviewUrl::App("/".into()),
    )
    .title("RightCheat")
    .inner_size(CHEATSHEET_WINDOW_WIDTH, CHEATSHEET_WINDOW_HEIGHT)
    .min_inner_size(CHEATSHEET_WINDOW_MIN_WIDTH, CHEATSHEET_WINDOW_MIN_HEIGHT)
    .resizable(true)
    .title_bar_style(tauri::TitleBarStyle::Overlay)
    .hidden_title(true);

    if let Some(base) = cascade_base_position(handle) {
        let (x, y) = cascade_position(base, id);
        builder = builder.position(x, y);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    register_window_event_handler(&window);
    log::info!("[cheatsheet_window] Opened cheatsheet window: {}", label);
    Ok(label)
}

/// 各チートシートウィンドウの現在の表示状態から、トグル後の目標表示状態を決定する。
/// 個々のウィンドウが自身の表示状態だけを見て独立にトグルすると、ウィンドウごとに
/// 表示/非表示の状態がバラバラになり得るため、集約した目標状態をここで一箇所に
/// 決定し、全ウィンドウへ同じ状態を適用させる。
/// いずれか1つでも表示中なら非表示（false）を、全て非表示なら表示（true）を返す。
pub fn resolve_toggle_target_visible(visibilities: &[bool]) -> bool {
    !visibilities.iter().any(|&visible| visible)
}

/// すべてのチートシートウィンドウの表示をトグルする。
/// チートシートウィンドウが 1 つも開いていない場合は、復帰導線として
/// 新しいチートシートウィンドウを開く（`New Cheatsheet Window` と同等）。
///
/// 各ウィンドウが `WINDOW_VISIABLE_TOGGLE` を受けて自分の現在の表示状態だけを
/// 見て独立にトグルすると、ウィンドウごとに表示/非表示の状態がバラバラになり
/// 得る。ここで全チートシートウィンドウの現在の表示状態を集約して目標状態
/// （bool）を一箇所で決定し、その値をペイロードとしてブロードキャストする
/// ことで、全ウィンドウが同じ目標状態に揃うようにする。
pub fn toggle_cheatsheet_windows_visible<R: Runtime>(handle: &AppHandle<R>) {
    let visibilities: Vec<bool> = handle
        .webview_windows()
        .into_iter()
        .filter(|(label, _)| is_cheatsheet_window_label(label))
        .map(|(_, w)| w.is_visible().unwrap_or(false))
        .collect();

    if visibilities.is_empty() {
        if let Err(e) = create_cheatsheet_window(handle) {
            log::error!(
                "[cheatsheet_window] Failed to open cheatsheet window on toggle visible: {}",
                e
            );
        }
        return;
    }

    let target_visible = resolve_toggle_target_visible(&visibilities);
    if let Err(e) = handle.emit(common::event::WINDOW_VISIABLE_TOGGLE, target_visible) {
        log::error!(
            "[cheatsheet_window] Failed to emit window_visible_toggle: {}",
            e
        );
    }
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

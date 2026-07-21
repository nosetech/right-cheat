//! アプリ内コピー用の Tauri コマンド。
//!
//! `navigator.clipboard.writeText()` は追加の UTI を書き込めないため、
//! チートシート（`CommandField`）や Clipboard History（`HistoryItemRow`）からの
//! コピーはこのコマンド経由で NSPasteboard に書き込む。テキストと同時に
//! 自前のマーカー UTI（[`SELF_COPY_TYPE`]）を書き込むことで、
//! `clipboard_monitor` がこのコピーを Clipboard History に取り込まないようにする。

use tauri::{AppHandle, Runtime};

/// アプリ内コピーであることを示す自前 UTI（アプリ識別子ベース）。
/// `clipboard_monitor::skip_reason()` がこの UTI を検知してスキップする。
pub const SELF_COPY_TYPE: &str = "biz.nosetech.rightcheat.self-copy";

/// テキストをクリップボードへコピーする。
/// NSPasteboardTypeString と同時に [`SELF_COPY_TYPE`] を書き込む。
#[tauri::command]
pub fn copy_text_to_clipboard<R: Runtime>(app: AppHandle<R>, text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::sync::mpsc;
        let (tx, rx) = mpsc::channel::<Result<(), String>>();
        app.run_on_main_thread(move || {
            let _ = tx.send(write_text_with_marker(&text));
        })
        .map_err(|e| e.to_string())?;
        return rx.recv().map_err(|e| e.to_string())?;
    }
    #[allow(unreachable_code)]
    {
        let _ = (app, text);
        Err("Unsupported platform".to_string())
    }
}

/// NSPasteboard へテキストとマーカー UTI を書き込む。
#[cfg(target_os = "macos")]
fn write_text_with_marker(text: &str) -> Result<(), String> {
    use objc2_app_kit::{NSPasteboard, NSPasteboardTypeString};
    use objc2_foundation::{NSArray, NSString};

    objc2::rc::autoreleasepool(|_| {
        // SAFETY: run_on_main_thread 経由でメインスレッドから呼ばれることが保証されている
        unsafe {
            let pb = NSPasteboard::generalPasteboard();
            pb.clearContents();

            let marker_type = NSString::from_str(SELF_COPY_TYPE);
            let types = NSArray::from_slice(&[NSPasteboardTypeString, marker_type.as_ref()]);
            pb.declareTypes_owner(&types, None);

            let ns_text = NSString::from_str(text);
            if !pb.setString_forType(&ns_text, NSPasteboardTypeString) {
                return Err("Failed to write text to clipboard".to_string());
            }
            pb.setString_forType(&NSString::from_str(""), &marker_type);
            Ok(())
        }
    })?;

    log::debug!(
        "[clipboard] copy_text_to_clipboard: {} char(s)",
        text.chars().count()
    );
    Ok(())
}

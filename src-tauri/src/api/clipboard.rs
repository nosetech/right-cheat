//! アプリ内コピー用の Tauri コマンド。
//!
//! `navigator.clipboard.writeText()` は追加の UTI を書き込めないため、
//! チートシート（`CommandField`）や Clipboard History（`HistoryItemRow`）からの
//! コピーはこのコマンド経由で NSPasteboard に書き込む。テキストと同時に
//! 自前のマーカー UTI（[`SELF_COPY_TYPE`]）を書き込むことで、
//! `clipboard_monitor` がこのコピーを Clipboard History に取り込まないようにする。
//!
//! NSPasteboard への実際の書き込みは `clipboard_monitor::ClipboardMonitor` が保持する
//! 専用バックグラウンドスレッド（ポーリングスレッドと同一）へチャネル経由で委譲する。
//! これにより NSPasteboard へアクセスするスレッドを常に1本に限定できる
//! （詳細は `clipboard_monitor` モジュール冒頭の SAFETY NOTE を参照）。

use tauri::{AppHandle, Manager, Runtime};

/// アプリ内コピーであることを示す自前 UTI（アプリ識別子ベース）。
/// `clipboard_monitor::skip_reason()` がこの UTI を検知してスキップする。
pub const SELF_COPY_TYPE: &str = "biz.nosetech.rightcheat.self-copy";

/// テキストをクリップボードへコピーする。
/// NSPasteboardTypeString と同時に [`SELF_COPY_TYPE`] を書き込む。
/// 実際の NSPasteboard 操作は `ClipboardMonitor` の専用スレッドへ委譲する。
#[tauri::command]
pub fn copy_text_to_clipboard<R: Runtime>(app: AppHandle<R>, text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use crate::api::clipboard_monitor::ClipboardMonitor;

        let monitor = app
            .try_state::<ClipboardMonitor>()
            .ok_or_else(|| "ClipboardMonitor is not available".to_string())?;
        return monitor.write_text(text);
    }
    #[allow(unreachable_code)]
    {
        let _ = (app, text);
        Err("Unsupported platform".to_string())
    }
}

/// NSPasteboard へテキストとマーカー UTI を書き込む。
/// `ClipboardMonitor` の専用スレッドからのみ呼び出される前提で、
/// このスレッド限定により NSPasteboard への単一スレッドアクセスを保証している。
#[cfg(target_os = "macos")]
pub(crate) fn write_text_with_marker(text: &str) -> Result<(), String> {
    use objc2_app_kit::{NSPasteboard, NSPasteboardTypeString};
    use objc2_foundation::{NSArray, NSString};

    objc2::rc::autoreleasepool(|_| {
        // SAFETY: 呼び出し元は ClipboardMonitor の専用スレッドに限定されている
        unsafe {
            let pb = NSPasteboard::generalPasteboard();

            let marker_type = NSString::from_str(SELF_COPY_TYPE);
            let types = NSArray::from_slice(&[NSPasteboardTypeString, marker_type.as_ref()]);
            // declareTypes:owner: は呼び出し時点で pasteboard の既存内容を
            // 自動的にクリアするため、事前の clearContents() 呼び出しは不要
            pb.declareTypes_owner(&types, None);

            let ns_text = NSString::from_str(text);
            if !pb.setString_forType(&ns_text, NSPasteboardTypeString) {
                return Err("Failed to write text to clipboard".to_string());
            }
            if !pb.setString_forType(&NSString::from_str(""), &marker_type) {
                return Err("Failed to write self-copy marker to clipboard".to_string());
            }
            Ok(())
        }
    })?;

    log::debug!(
        "[clipboard] copy_text_to_clipboard: {} char(s)",
        text.chars().count()
    );
    Ok(())
}

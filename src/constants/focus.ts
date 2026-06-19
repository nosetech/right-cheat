// ウィンドウ操作（setResizable / setSize）で WKWebView が native first responder を
// 失った際、フォーカス可能な要素が無くても復元できるよう、ルートに常設する
// フォールバックフォーカス要素の id。
export const FOCUS_FALLBACK_ID = 'rc-focus-fallback'

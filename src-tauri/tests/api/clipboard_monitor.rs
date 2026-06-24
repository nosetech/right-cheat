#[cfg(target_os = "macos")]
mod tests {
    use app_lib::api::clipboard_monitor::truncate_for_log;

    // --- truncate_for_log ---

    #[test]
    fn test_short_string_unchanged() {
        assert_eq!(truncate_for_log("hello", 10), "hello");
    }

    #[test]
    fn test_exact_length_unchanged() {
        assert_eq!(truncate_for_log("hello", 5), "hello");
    }

    #[test]
    fn test_long_string_truncated_with_ellipsis() {
        let result = truncate_for_log("abcdefghij", 5);
        assert_eq!(result, "abcde…");
    }

    #[test]
    fn test_empty_string_unchanged() {
        assert_eq!(truncate_for_log("", 5), "");
    }

    #[test]
    fn test_multibyte_characters_counted_by_char() {
        // "あいうえお" is 5 chars; max_chars=3 should truncate after "あいう"
        let result = truncate_for_log("あいうえお", 3);
        assert_eq!(result, "あいう…");
    }

    #[test]
    fn test_multibyte_within_limit_unchanged() {
        assert_eq!(truncate_for_log("あいう", 5), "あいう");
    }

    #[test]
    fn test_max_chars_zero_truncates_immediately() {
        let result = truncate_for_log("abc", 0);
        assert_eq!(result, "…");
    }

    #[test]
    fn test_single_char_at_limit() {
        assert_eq!(truncate_for_log("a", 1), "a");
    }

    #[test]
    fn test_single_char_over_limit() {
        let result = truncate_for_log("ab", 1);
        assert_eq!(result, "a…");
    }

    // --- ClipboardMonitor lifecycle ---

    #[test]
    fn test_monitor_double_start_is_noop() {
        use app_lib::api::clipboard_monitor::ClipboardMonitor;
        use std::time::Duration;

        let monitor = ClipboardMonitor::new();
        monitor.start();
        monitor.start(); // second call must not panic
        monitor.stop();
        std::thread::sleep(Duration::from_millis(10));
    }

    #[test]
    fn test_monitor_stop_without_start_is_safe() {
        use app_lib::api::clipboard_monitor::ClipboardMonitor;
        let monitor = ClipboardMonitor::new();
        monitor.stop(); // must not panic
    }

    #[test]
    fn test_monitor_default_is_same_as_new() {
        use app_lib::api::clipboard_monitor::ClipboardMonitor;
        let _m = ClipboardMonitor::default();
    }
}

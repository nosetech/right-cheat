// clipboard_monitor API のユニットテスト（issue #178）
//
// テスト対象: src-tauri/src/api/clipboard_monitor.rs の save_clipboard_text()
//   （設定に基づく保存ロジック。ClipboardMonitor 本体の NSPasteboard ポーリングは
//   CI 環境で不安定要因になるためテスト対象外とする。）
//
// save_clipboard_text は macOS 専用モジュール（#[cfg(target_os = "macos")]）内の
// 関数のため、このテストファイル自体も tests/api/mod.rs 側で
// #[cfg(target_os = "macos")] によりゲートする。
//
// テストは tests/api/clipboard_settings.rs の clear_history_on_quit_if_enabled
// テスト（setup_mock_app_with_db パターン）と tests/db/repository.rs の
// インメモリ DB 構築パターンに準拠する。settings ストアは不要
// （ClipboardSettings は引数として直接渡されるため）。
//
// ブラックボックス テスト設計:
//   [同値分割]
//     min_chars: [文字数が min_chars 未満（保存しない）] [min_chars 以上（保存する）]
//     max_chars: [文字数が max_chars 以下（そのまま保存）] [max_chars 超過（切り詰めて保存）]
//     文字種: ASCII / 日本語（マルチバイト） / 絵文字（サロゲートペア相当）
//     重複: [履歴中に既に存在する同一テキスト（move-to-top され新規行は作成されない）]
//           [履歴中に存在しない新規テキスト（新規行として保存される）]
//   [境界値分析]
//     min_chars 境界: min_chars-1 / min_chars / min_chars+1 文字
//     max_chars 境界: max_chars ちょうど / max_chars+1
//     max_items 境界: max_items ちょうど到達 / max_items+1 で最古1件削除
//
// ホワイトボックス テスト設計:
//   - save_clipboard_text 内の分岐:
//     ① char_count < min_chars → SkippedTooShort（早期 return、DB 未挿入）
//     ② char_count <= max_chars → truncated=false（text.to_string() 経路）
//     ③ char_count > max_chars → truncated=true（text.chars().take() 経路）
//   - delete_oldest_clipboard_history が保存の都度呼ばれること（max_items 超過時に反映される）

#[cfg(target_os = "macos")]
mod save_clipboard_text {
    use app_lib::api::clipboard_monitor::{save_clipboard_text, SaveOutcome};
    use app_lib::api::clipboard_settings::ClipboardSettings;
    use app_lib::db::repository::{count_clipboard_history, list_clipboard_history};
    use app_lib::db::{schema, DbConnection};
    use rusqlite::Connection;
    use std::sync::Mutex;
    use tauri::Manager;

    /// インメモリ DB を manage した mock app を構築する。
    /// （tests/api/clipboard_settings.rs の setup_mock_app_with_db と同様のパターン。
    /// save_clipboard_text は設定ストアを参照しないため settings 初期化は不要。）
    fn setup_mock_app_with_db() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        let conn = Connection::open_in_memory().expect("in-memory DB の作成に失敗");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        schema::apply_migrations(&conn).unwrap();
        app.manage(DbConnection(Mutex::new(conn)));
        app
    }

    fn settings(min_chars: u32, max_chars: u32, max_items: u32) -> ClipboardSettings {
        ClipboardSettings {
            monitoring_enabled: true,
            min_chars,
            max_chars,
            max_items,
            clear_on_quit: false,
            heat_bar_color: "orange".to_string(),
        }
    }

    fn count(app: &tauri::App<tauri::test::MockRuntime>) -> i64 {
        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        count_clipboard_history(&conn).unwrap()
    }

    // ── min_chars の境界値分析 ─────────────────────────────

    /// 文字数 = min_chars - 1（下限の直下）はスキップされ DB に保存されない
    #[test]
    fn just_below_min_chars_is_skipped_and_not_saved() {
        let app = setup_mock_app_with_db();
        let s = settings(5, 200, 100);

        let result = save_clipboard_text(&app.handle(), &s, "abcd").unwrap(); // 4文字

        assert_eq!(result, SaveOutcome::SkippedTooShort(4));
        assert_eq!(count(&app), 0);
    }

    /// 文字数 = min_chars（下限ちょうど）は保存される
    #[test]
    fn at_min_chars_is_saved() {
        let app = setup_mock_app_with_db();
        let s = settings(5, 200, 100);

        let result = save_clipboard_text(&app.handle(), &s, "abcde").unwrap(); // 5文字

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 5,
                truncated: false,
            }
        );
        assert_eq!(count(&app), 1);
    }

    /// 文字数 = min_chars + 1（下限の直上）は保存される
    #[test]
    fn just_above_min_chars_is_saved() {
        let app = setup_mock_app_with_db();
        let s = settings(5, 200, 100);

        let result = save_clipboard_text(&app.handle(), &s, "abcdef").unwrap(); // 6文字

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 6,
                truncated: false,
            }
        );
        assert_eq!(count(&app), 1);
    }

    /// 境界値の極値: min_chars = 0 の場合、空文字列（0文字）でも保存される
    #[test]
    fn min_chars_zero_allows_empty_string() {
        let app = setup_mock_app_with_db();
        let s = settings(0, 200, 100);

        let result = save_clipboard_text(&app.handle(), &s, "").unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 0,
                truncated: false,
            }
        );
        assert_eq!(count(&app), 1);
    }

    /// 空文字列で min_chars = 1 の場合はスキップされる（0 < 1）
    #[test]
    fn empty_string_below_min_chars_one_is_skipped() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 100);

        let result = save_clipboard_text(&app.handle(), &s, "").unwrap();

        assert_eq!(result, SaveOutcome::SkippedTooShort(0));
        assert_eq!(count(&app), 0);
    }

    // ── max_chars の境界値分析（切り詰め） ─────────────────

    /// 文字数 = max_chars（上限ちょうど）は切り詰められず保存される
    #[test]
    fn at_max_chars_is_saved_without_truncation() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 10, 100);
        let text = "a".repeat(10);

        let result = save_clipboard_text(&app.handle(), &s, &text).unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 10,
                truncated: false,
            }
        );

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        assert_eq!(rows[0].text, text);
    }

    /// 文字数 = max_chars + 1（上限の直上）は先頭 max_chars 文字に切り詰めて保存される
    #[test]
    fn just_above_max_chars_is_truncated_and_saved() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 10, 100);
        let text = "a".repeat(11);

        let result = save_clipboard_text(&app.handle(), &s, &text).unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 10,
                truncated: true,
            }
        );

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        assert_eq!(rows[0].text, "a".repeat(10));
        assert_eq!(rows[0].char_count, 10);
    }

    // ── マルチバイト文字での「文字数」基準の切り詰め ────────

    /// 日本語（3バイト/文字）テキストが max_chars を超える場合、バイト数ではなく
    /// 文字数で切り詰められる（バイト境界で切ると不正な UTF-8 になり panic するため、
    /// 文字境界での切り詰めが正しく行われることを検証する）。
    #[test]
    fn japanese_text_is_truncated_by_char_count_not_byte_count() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 3, 100);
        let text = "あいうえお"; // 5文字、15バイト

        let result = save_clipboard_text(&app.handle(), &s, text).unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 3,
                truncated: true,
            }
        );

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        assert_eq!(rows[0].text, "あいう");
        assert_eq!(rows[0].text.chars().count(), 3);
    }

    /// 絵文字（4バイト/文字の Unicode スカラー値）テキストの切り詰めも文字数基準で
    /// 正しく行われ、不正な UTF-8 分割が発生しないことを検証する。
    #[test]
    fn emoji_text_is_truncated_by_char_count_not_byte_count() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 2, 100);
        let text = "🎉🎊🎈🎁"; // 4文字（絵文字）

        let result = save_clipboard_text(&app.handle(), &s, text).unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 2,
                truncated: true,
            }
        );

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        assert_eq!(rows[0].text, "🎉🎊");
    }

    /// 日本語テキストが max_chars 以内であれば切り詰められず、文字数もそのまま。
    #[test]
    fn japanese_text_within_max_chars_is_not_truncated() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 10, 100);
        let text = "こんにちは"; // 5文字

        let result = save_clipboard_text(&app.handle(), &s, text).unwrap();

        assert_eq!(
            result,
            SaveOutcome::Saved {
                char_count: 5,
                truncated: false,
            }
        );
    }

    // ── 重複排除（リポジトリ層との統合） ─────────────────

    /// 直前と同一テキストを連続して保存した場合、DB には1件のみ保存される
    /// （SaveOutcome 自体は毎回 Saved を返すが、実際に INSERT されるのは1回のみ）。
    #[test]
    fn consecutive_identical_text_is_deduplicated_in_db() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 100);

        let r1 = save_clipboard_text(&app.handle(), &s, "same text").unwrap();
        let r2 = save_clipboard_text(&app.handle(), &s, "same text").unwrap();

        assert_eq!(
            r1,
            SaveOutcome::Saved {
                char_count: 9,
                truncated: false,
            }
        );
        assert_eq!(r1, r2);
        assert_eq!(count(&app), 1);
    }

    /// 異なるテキストを挟んで同一テキストを再保存した場合でも、
    /// リポジトリ層の move-to-top 仕様により新規行は作成されず、
    /// 一致した既存行が最新へ移動するだけで件数は増えない
    /// （repository::insert_clipboard_history の仕様変更に追従）。
    ///
    /// 注: A, B の並び順（どちらが先頭に来るか）は copied_at（datetime('now')、
    /// 秒精度）のタイブレークが id 依存になり、テスト実行がすべて1秒未満で
    /// 完了する場合は非決定的になり得るため、ここでは検証しない
    /// （並び順の決定論的な検証は tests/db/repository.rs の
    /// insert_clipboard_history_moves_non_consecutive_same_text_to_top で
    /// insert_history_with_timestamp を用いて行っている）。
    /// このテストでは「新規行が作成されず件数が増えない（重複しない）」ことのみを検証する。
    #[test]
    fn same_text_separated_by_different_text_is_moved_to_top_not_duplicated() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 100);

        save_clipboard_text(&app.handle(), &s, "A").unwrap();
        save_clipboard_text(&app.handle(), &s, "B").unwrap();
        save_clipboard_text(&app.handle(), &s, "A").unwrap();

        // move-to-top によりユニークなテキスト（A, B）の2件のみ
        assert_eq!(count(&app), 2);

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        let mut texts: Vec<&str> = rows.iter().map(|r| r.text.as_str()).collect();
        texts.sort_unstable();
        assert_eq!(
            texts,
            vec!["A", "B"],
            "move-to-top により重複せず A, B の2件のみになること"
        );
    }

    // ── max_items の境界値分析（保存後の古い履歴削除） ──────

    /// 保存件数が max_items ちょうどの場合は削除されない
    #[test]
    fn saving_up_to_max_items_does_not_delete_anything() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 3);

        save_clipboard_text(&app.handle(), &s, "text1").unwrap();
        save_clipboard_text(&app.handle(), &s, "text2").unwrap();
        save_clipboard_text(&app.handle(), &s, "text3").unwrap();

        assert_eq!(count(&app), 3);
    }

    /// 保存件数が max_items を1件超えると、最古の1件が削除され件数は max_items に保たれる
    #[test]
    fn saving_beyond_max_items_deletes_oldest_entry() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 3);

        save_clipboard_text(&app.handle(), &s, "text1").unwrap();
        save_clipboard_text(&app.handle(), &s, "text2").unwrap();
        save_clipboard_text(&app.handle(), &s, "text3").unwrap();
        save_clipboard_text(&app.handle(), &s, "text4").unwrap();

        assert_eq!(count(&app), 3);

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        let texts: Vec<&str> = rows.iter().map(|r| r.text.as_str()).collect();
        // 最古の "text1" が削除され、新しい3件（新しい順）が残る
        assert_eq!(texts, vec!["text4", "text3", "text2"]);
    }

    /// 複数件が max_items を大幅に超えた場合でも、常に新しい max_items 件のみが残る
    #[test]
    fn saving_far_beyond_max_items_keeps_only_newest_entries() {
        let app = setup_mock_app_with_db();
        let s = settings(1, 200, 2);

        for i in 1..=5 {
            save_clipboard_text(&app.handle(), &s, &format!("text{i}")).unwrap();
        }

        assert_eq!(count(&app), 2);

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        let rows = list_clipboard_history(&conn, 10).unwrap();
        let texts: Vec<&str> = rows.iter().map(|r| r.text.as_str()).collect();
        assert_eq!(texts, vec!["text5", "text4"]);
    }

    // 注記: ClipboardMonitor (start/stop/Drop) は NSPasteboard への実アクセスを伴い
    // CI 環境での安定性に欠けるため、issue #178 の方針どおりテスト対象外とする。
    // また DB ロック失敗（Mutex poisoning）分岐は tauri::test の mock 環境では
    // 意図的に発生させる手段がなく、テスト不可能なコードとしてカバレッジ対象外とする。
    //
    // 注記（issue #199）: `skip_reason()` / `SkipReason` enum（Concealed / AutoGenerated /
    // SelfCopy の判定）は private な関数・型のためこのテストファイル（外部クレートとしての
    // 統合テスト）からは直接呼び出せない。実際の NSPasteboard の types() 一覧を用意する
    // 必要もあり検証コストが高いため、既存の Concealed / AutoGenerated 判定と同様に
    // テスト対象外とする。`SkipReason::SelfCopy` は `crate::api::clipboard::SELF_COPY_TYPE`
    // と同一の文字列を比較するだけの単純な分岐であり、定数値自体は
    // tests/api/clipboard.rs でテスト済み。
}

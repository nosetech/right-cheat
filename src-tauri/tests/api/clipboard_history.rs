// clipboard_history API のユニットテスト（issue #178）
//
// テスト対象: src-tauri/src/api/clipboard_history.rs
//   - list_clipboard_history(app, limit) Tauri コマンド
//   - delete_clipboard_history_item(app, id) Tauri コマンド
//   - clear_clipboard_history(app) Tauri コマンド
//   - ClipboardHistoryItem::from(ClipboardHistoryRow)（フィールドマッピング）
//
// このモジュールはクロスプラットフォーム（macOS 限定ゲートなし）。
// テストは tests/api/cheatsheet.rs / tests/api/clipboard_settings.rs の
// setup_mock_app_with_db パターン（インメモリ DB + マイグレーション適用 + DbConnection を
// mock app に manage）に準拠する。リポジトリ層自体の詳細な同値分割・境界値分析は
// tests/db/repository.rs で網羅済みのため、ここでは Tauri コマンド層（DB 呼び出しの
// 委譲・戻り値の型変換・エラー伝播）に焦点を当てる。
//
// ブラックボックス テスト設計:
//   [同値分割]
//     list: [空テーブル] [1件] [複数件]
//     delete: [存在する id] [存在しない id]
//     clear: [空テーブル] [複数件]
//   [境界値分析]
//     limit: 0（最小値） / 全件より少ない / 全件と同じ / 全件より多い
//     id: 存在しない最小値相当（0） / 負値 / 存在しない大きな値
//
// ホワイトボックス テスト設計:
//   - ClipboardHistoryItem::from の全フィールド（id, text, char_count, copied_at）が
//     ClipboardHistoryRow から漏れなくコピーされることを検証
//   - list_clipboard_history はリポジトリの新しい順ソートをそのまま維持して返す

#[cfg(test)]
mod test_support {
    use app_lib::db::{schema, DbConnection};
    use rusqlite::Connection;
    use std::sync::Mutex;
    use tauri::Manager;

    /// インメモリ DB を manage した mock app を構築する。
    pub fn setup_mock_app_with_db() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        let conn = Connection::open_in_memory().expect("in-memory DB の作成に失敗");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        schema::apply_migrations(&conn).unwrap();
        app.manage(DbConnection(Mutex::new(conn)));
        app
    }
}

// ─────────────────────────────────────────────────────────────
// ClipboardHistoryItem::from(ClipboardHistoryRow) — 純粋な変換ロジック
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod clipboard_history_item_from {
    use app_lib::api::clipboard_history::ClipboardHistoryItem;
    use app_lib::db::repository::ClipboardHistoryRow;

    /// 全フィールドが漏れなくコピーされることを検証する
    #[test]
    fn maps_all_fields_from_row() {
        let row = ClipboardHistoryRow {
            id: 42,
            text: "hello world".to_string(),
            char_count: 11,
            copied_at: "2026-07-14 12:00:00".to_string(),
        };

        let item: ClipboardHistoryItem = row.into();

        assert_eq!(item.id, 42);
        assert_eq!(item.text, "hello world");
        assert_eq!(item.char_count, 11);
        assert_eq!(item.copied_at, "2026-07-14 12:00:00");
    }

    /// 境界値: 空文字列・char_count = 0 の行も正しく変換される
    #[test]
    fn maps_row_with_empty_text() {
        let row = ClipboardHistoryRow {
            id: 1,
            text: String::new(),
            char_count: 0,
            copied_at: "2026-07-14 00:00:00".to_string(),
        };

        let item: ClipboardHistoryItem = row.into();

        assert_eq!(item.text, "");
        assert_eq!(item.char_count, 0);
    }

    /// マルチバイト文字を含む行も文字列がそのまま保持される
    #[test]
    fn maps_row_with_multibyte_text() {
        let row = ClipboardHistoryRow {
            id: 2,
            text: "こんにちは🎉".to_string(),
            char_count: 6,
            copied_at: "2026-07-14 09:30:00".to_string(),
        };

        let item: ClipboardHistoryItem = row.into();

        assert_eq!(item.text, "こんにちは🎉");
        assert_eq!(item.char_count, 6);
    }
}

// ─────────────────────────────────────────────────────────────
// list_clipboard_history
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod list_clipboard_history {
    use super::test_support::setup_mock_app_with_db;
    use app_lib::api::clipboard_history::list_clipboard_history;
    use app_lib::db::repository::insert_clipboard_history;
    use app_lib::db::DbConnection;
    use tauri::Manager;

    /// 同値クラス: 空テーブル
    /// 期待値: 空の Vec を返す
    #[test]
    fn returns_empty_vec_for_empty_table() {
        let app = setup_mock_app_with_db();

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();

        assert!(result.is_empty());
    }

    /// 同値クラス: 1件のみ存在
    /// 期待値: 1件がそのまま返る
    #[test]
    fn returns_single_item() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "only one").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "only one");
        assert_eq!(result[0].char_count, 8);
    }

    /// 複数件挿入時、リポジトリの新しい順ソート（copied_at DESC, id DESC）が
    /// そのまま維持されて返ることを検証する
    #[test]
    fn returns_items_in_newest_first_order() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            insert_clipboard_history(&conn, "c").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();

        let texts: Vec<&str> = result.iter().map(|i| i.text.as_str()).collect();
        assert_eq!(texts, vec!["c", "b", "a"]);
    }

    // ── limit の境界値分析 ─────────────────────────────────

    /// 境界値: limit = 0（最小値）は空の Vec を返す
    #[test]
    fn limit_zero_returns_empty_vec() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "x").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 0).unwrap();

        assert!(result.is_empty());
    }

    /// 境界値: limit が全件数より少ない場合、新しい順に limit 件のみ返る
    #[test]
    fn limit_less_than_total_returns_limited_items() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            insert_clipboard_history(&conn, "c").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 2).unwrap();

        let texts: Vec<&str> = result.iter().map(|i| i.text.as_str()).collect();
        assert_eq!(texts, vec!["c", "b"]);
    }

    /// 境界値: limit が全件数とちょうど同じ場合、全件が返る
    #[test]
    fn limit_equal_to_total_returns_all_items() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 2).unwrap();

        assert_eq!(result.len(), 2);
    }

    /// 境界値: limit が全件数より多い場合、全件が返る（不足分はエラーにならない）
    #[test]
    fn limit_greater_than_total_returns_all_items() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 100).unwrap();

        assert_eq!(result.len(), 1);
    }
}

// ─────────────────────────────────────────────────────────────
// delete_clipboard_history_item
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod delete_clipboard_history_item {
    use super::test_support::setup_mock_app_with_db;
    use app_lib::api::clipboard_history::{delete_clipboard_history_item, list_clipboard_history};
    use app_lib::db::repository::{count_clipboard_history, insert_clipboard_history};
    use app_lib::db::DbConnection;
    use tauri::Manager;

    /// 同値クラス: 存在する id を削除
    /// 期待値: 該当行のみ削除され、他の行は残る
    #[test]
    fn deletes_existing_item_and_keeps_others() {
        let app = setup_mock_app_with_db();
        let target_id;
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "keep me").unwrap();
            target_id = insert_clipboard_history(&conn, "delete me").unwrap();
        }

        delete_clipboard_history_item(app.handle().clone(), target_id).unwrap();

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "keep me");
    }

    /// 削除後の件数がちょうど1件減ることを確認する
    #[test]
    fn deleting_one_item_decrements_count_by_one() {
        let app = setup_mock_app_with_db();
        let target_id;
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            target_id = insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            insert_clipboard_history(&conn, "c").unwrap();
        }

        delete_clipboard_history_item(app.handle().clone(), target_id).unwrap();

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 2);
    }

    /// 境界値: 存在しない id（テーブルが空の状態での id=1）を削除してもエラーにならない
    #[test]
    fn deleting_nonexistent_id_on_empty_table_does_not_error() {
        let app = setup_mock_app_with_db();

        let result = delete_clipboard_history_item(app.handle().clone(), 1);

        assert!(result.is_ok());
    }

    /// 境界値: id = 0（テーブルの AUTOINCREMENT は 1 始まりのため存在しない）を
    /// 削除してもエラーにならず、既存行にも影響しない
    #[test]
    fn deleting_id_zero_does_not_error_and_does_not_affect_existing_rows() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "untouched").unwrap();
        }

        let result = delete_clipboard_history_item(app.handle().clone(), 0);

        assert!(result.is_ok());
        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();
        assert_eq!(result.len(), 1);
    }

    /// 境界値: 負の id を削除してもエラーにならない（存在しない id として扱われる）
    #[test]
    fn deleting_negative_id_does_not_error() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "untouched").unwrap();
        }

        let result = delete_clipboard_history_item(app.handle().clone(), -1);

        assert!(result.is_ok());
        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();
        assert_eq!(result.len(), 1);
    }
}

// ─────────────────────────────────────────────────────────────
// clear_clipboard_history
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod clear_clipboard_history {
    use super::test_support::setup_mock_app_with_db;
    use app_lib::api::clipboard_history::{clear_clipboard_history, list_clipboard_history};
    use app_lib::db::repository::{count_clipboard_history, insert_clipboard_history};
    use app_lib::db::DbConnection;
    use tauri::Manager;

    /// 同値クラス: 複数件存在する状態から全削除
    /// 期待値: 全件削除され、件数は 0 になる
    #[test]
    fn clears_all_items_when_multiple_exist() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            insert_clipboard_history(&conn, "c").unwrap();
        }

        clear_clipboard_history(app.handle().clone()).unwrap();

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();
        assert!(result.is_empty());
    }

    /// 境界値: 空テーブルに対して clear してもエラーにならない
    #[test]
    fn clearing_empty_table_does_not_error() {
        let app = setup_mock_app_with_db();

        let result = clear_clipboard_history(app.handle().clone());

        assert!(result.is_ok());
        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 0);
    }

    /// clear 後に新規保存すれば、通常どおり保存できることを確認する
    /// （テーブル自体やインデックスが破壊されていないことの間接検証）
    #[test]
    fn can_insert_after_clear() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "old").unwrap();
        }

        clear_clipboard_history(app.handle().clone()).unwrap();

        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "new").unwrap();
        }

        let result = list_clipboard_history(app.handle().clone(), 10).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, "new");
    }
}

// 注記: DB ロック失敗（Mutex poisoning）分岐は tauri::test の mock 環境では
// 意図的に発生させる手段がなく、テスト不可能なコードとしてカバレッジ対象外とする
// （tests/api/clipboard_settings.rs と同じ方針）。

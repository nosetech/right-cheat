//! SQLite FTS5 + trigram tokenizer による日本語全文検索の検証用ライブラリ。
//!
//! RightCheat 本体には組み込まない。issue #70 のための調査コードであり、
//! issue #142 の SQLite 移行時に検索機能を実装する際の前提となる挙動確認を行う。
//!
//! 確認項目:
//! - 通常テーブルと FTS5 仮想テーブルの作成
//! - 通常テーブル変更時に FTS5 テーブルへ同期するトリガー
//! - trigram tokenizer による 3 文字以上の MATCH 検索
//! - 1〜2 文字検索（unigram / bigram）のフォールバック手段
//! - 日本語の部分一致挙動

use rusqlite::{params, Connection, Result, Row};

/// 検索結果の 1 レコード（commands テーブルの内容）。
#[derive(Debug, PartialEq, Eq, Clone)]
pub struct CommandRow {
    pub id: i64,
    pub description: String,
    pub command_text: String,
}

impl CommandRow {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            description: row.get("description")?,
            command_text: row.get("command_text")?,
        })
    }
}

/// 検証用スキーマを構築する。
///
/// - `commands` … 通常テーブル
/// - `commands_fts` … `trigram` トークナイザの FTS5 仮想テーブル
/// - 同期トリガー（INSERT / UPDATE / DELETE）
///
/// `commands_fts` は `content=commands` の external content を使わず、
/// 検索対象列だけを保持する独立テーブルとして作成する。
/// rowid を `commands.id` と一致させて結合できるようにする。
pub fn create_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS commands (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            description   TEXT NOT NULL DEFAULT '',
            command_text  TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS commands_fts USING fts5(
            description,
            command_text,
            tokenize = 'trigram'
        );

        CREATE TRIGGER IF NOT EXISTS commands_ai AFTER INSERT ON commands BEGIN
            INSERT INTO commands_fts(rowid, description, command_text)
            VALUES (new.id, new.description, new.command_text);
        END;

        CREATE TRIGGER IF NOT EXISTS commands_au AFTER UPDATE ON commands BEGIN
            UPDATE commands_fts
            SET description = new.description,
                command_text = new.command_text
            WHERE rowid = old.id;
        END;

        CREATE TRIGGER IF NOT EXISTS commands_ad AFTER DELETE ON commands BEGIN
            DELETE FROM commands_fts WHERE rowid = old.id;
        END;
        "#,
    )
}

/// `commands` に 1 件挿入する。FTS テーブルへはトリガーで同期される。
pub fn insert_command(conn: &Connection, description: &str, command_text: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO commands (description, command_text) VALUES (?1, ?2)",
        params![description, command_text],
    )?;
    Ok(conn.last_insert_rowid())
}

/// FTS5 の MATCH を使った全文検索。
///
/// `query` は trigram tokenizer に渡す検索式。3 文字以上の場合に
/// trigram インデックスが効く。1〜2 文字でも構文上は許容されるが、
/// 内部的には全件スキャンになる可能性がある。
pub fn search_fts(conn: &Connection, query: &str) -> Result<Vec<CommandRow>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT c.id, c.description, c.command_text
        FROM commands c
        JOIN commands_fts f ON f.rowid = c.id
        WHERE commands_fts MATCH ?1
        ORDER BY c.id
        "#,
    )?;
    let rows = stmt
        .query_map(params![query], CommandRow::from_row)?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

/// FTS の MATCH と LIKE フォールバックを組み合わせたハイブリッド検索。
///
/// - 3 文字以上 → FTS5 MATCH（trigram インデックス）
/// - 1〜2 文字 → 元テーブルへの LIKE スキャン
///
/// FTS5 trigram tokenizer のドキュメント上、3 文字未満の場合は
/// インデックスを利用できないため、明示的に LIKE で代替する。
pub fn search_hybrid(conn: &Connection, query: &str) -> Result<Vec<CommandRow>> {
    let chars = query.chars().count();
    if chars >= 3 {
        search_fts(conn, query)
    } else if chars >= 1 {
        search_like(conn, query)
    } else {
        Ok(Vec::new())
    }
}

/// LIKE 演算子による部分一致検索（unigram / bigram フォールバック用）。
///
/// SQLite の LIKE はデフォルトでエスケープ文字を持たないため、`%` や `_` を
/// エスケープして部分一致のワイルドカードと混同しないようにする。
/// ESCAPE 文字には `\` を採用する。
pub fn search_like(conn: &Connection, query: &str) -> Result<Vec<CommandRow>> {
    let pattern = format!("%{}%", escape_like(query));
    let mut stmt = conn.prepare(
        // ESCAPE には 1 文字を渡す必要がある。Rust の raw string 内の `'\'` を
        // そのまま SQL に渡すと、SQL リテラルとしての解釈で 1 文字（バックスラッシュ）
        // になる。
        r"
        SELECT id, description, command_text
        FROM commands
        WHERE description LIKE ?1 ESCAPE '\'
           OR command_text LIKE ?1 ESCAPE '\'
        ORDER BY id
        ",
    )?;
    let rows = stmt
        .query_map(params![pattern], CommandRow::from_row)?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

/// LIKE 用に `%` `_` `\` をエスケープする。
fn escape_like(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '\\' | '%' | '_' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
    }
    out
}

/// 検証用のサンプルデータを投入する。
pub fn seed_sample_data(conn: &Connection) -> Result<()> {
    let samples = [
        ("Gitコミットの取り消し", "git reset --soft HEAD^"),
        ("Gitブランチの一覧表示", "git branch -a"),
        ("Dockerコンテナの一覧", "docker ps -a"),
        ("Docker全コンテナ停止", "docker stop $(docker ps -q)"),
        ("ファイル検索", "find . -name '*.rs'"),
        ("プロセスをポート番号で確認", "lsof -i :3000"),
        ("ホームディレクトリへ移動", "cd ~"),
        ("カレントディレクトリ表示", "pwd"),
        ("日本語のみのテスト", "ねこといぬ"),
        ("ひらがな2文字テスト", "あい"),
        ("カタカナ検索テスト", "コマンドラインツール"),
    ];
    for (desc, cmd) in samples {
        insert_command(conn, desc, cmd)?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// 検証用テスト群
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn open_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        create_schema(&conn).expect("create schema");
        conn
    }

    #[test]
    fn schema_creates_tables_and_triggers() {
        let conn = open_test_db();

        let table_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('commands', 'commands_fts')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 2);

        let trigger_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'commands_a%'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(trigger_count, 3);
    }

    #[test]
    fn fts5_trigram_tokenizer_is_available() {
        // trigram トークナイザを使った CREATE が失敗しないかを確認する。
        // FTS5 と trigram tokenizer は SQLite 3.34 以降で利用可能。
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE VIRTUAL TABLE t USING fts5(content, tokenize='trigram');")
            .expect("trigram tokenizer should be available");
    }

    #[test]
    fn insert_syncs_to_fts_table() {
        let conn = open_test_db();
        let id = insert_command(&conn, "Gitコミットの取り消し", "git reset HEAD^").unwrap();

        let fts_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM commands_fts WHERE rowid = ?1",
                params![id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(fts_count, 1);
    }

    #[test]
    fn update_syncs_to_fts_table() {
        let conn = open_test_db();
        let id = insert_command(&conn, "古い説明", "old command").unwrap();

        conn.execute(
            "UPDATE commands SET description = ?1, command_text = ?2 WHERE id = ?3",
            params!["新しい説明", "new command", id],
        )
        .unwrap();

        let (desc, cmd): (String, String) = conn
            .query_row(
                "SELECT description, command_text FROM commands_fts WHERE rowid = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(desc, "新しい説明");
        assert_eq!(cmd, "new command");
    }

    #[test]
    fn delete_syncs_to_fts_table() {
        let conn = open_test_db();
        let id = insert_command(&conn, "削除予定", "to be deleted").unwrap();
        conn.execute("DELETE FROM commands WHERE id = ?1", params![id])
            .unwrap();

        let fts_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM commands_fts WHERE rowid = ?1",
                params![id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(fts_count, 0);
    }

    #[test]
    fn fts_search_matches_japanese_3chars() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        // 「コミット」(4文字) で検索 → trigram インデックスが効く想定。
        let results = search_fts(&conn, "コミット").unwrap();
        assert!(
            results.iter().any(|r| r.description.contains("コミット")),
            "コミットを含むレコードが検索できる: {:?}",
            results
        );
    }

    #[test]
    fn fts_search_matches_japanese_exactly_3chars() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        // ちょうど 3 文字「コマンド」のうち先頭 3 文字「コマン」で検索可能か。
        let results = search_fts(&conn, "コマン").unwrap();
        assert!(
            results
                .iter()
                .any(|r| r.description.contains("カタカナ検索テスト")),
            "3文字でtrigram MATCH可能: {:?}",
            results
        );
    }

    #[test]
    fn fts_search_matches_alphanumeric() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        let results = search_fts(&conn, "docker").unwrap();
        assert!(
            results.len() >= 2,
            "docker関連レコードが複数ヒット: {:?}",
            results
        );
    }

    #[test]
    fn fts_search_is_case_insensitive() {
        // trigram tokenizer はデフォルトで case-insensitive なので
        // 大文字小文字を区別せず検索できる。
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        let lower = search_fts(&conn, "docker").unwrap();
        let upper = search_fts(&conn, "DOCKER").unwrap();
        assert_eq!(lower, upper, "大文字小文字に関わらず同じ結果が返る");
    }

    #[test]
    fn hybrid_search_unigram_falls_back_to_like() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        // 1 文字「ね」での検索は LIKE フォールバックを通って動作する。
        let results = search_hybrid(&conn, "ね").unwrap();
        assert!(
            results.iter().any(|r| r.command_text.contains("ねこ")),
            "1文字検索でも結果が得られる: {:?}",
            results
        );
    }

    #[test]
    fn hybrid_search_bigram_falls_back_to_like() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        // 2 文字「あい」の検索が LIKE フォールバックでヒットする。
        let results = search_hybrid(&conn, "あい").unwrap();
        assert!(
            results.iter().any(|r| r.command_text == "あい"),
            "2文字検索でも結果が得られる: {:?}",
            results
        );
    }

    #[test]
    fn hybrid_search_3chars_uses_fts() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        let results = search_hybrid(&conn, "コミット").unwrap();
        assert!(!results.is_empty());
    }

    #[test]
    fn like_escape_protects_special_chars() {
        let conn = open_test_db();
        insert_command(&conn, "100% finished", "echo done").unwrap();
        insert_command(&conn, "underscore_test", "echo us").unwrap();

        // `%` は LIKE のワイルドカードだが、エスケープして 100% を含む行のみ取得する。
        let results = search_like(&conn, "100%").unwrap();
        assert_eq!(
            results.len(),
            1,
            "% を含む完全一致だけ取得できる: {:?}",
            results
        );

        let results = search_like(&conn, "_test").unwrap();
        assert_eq!(
            results.len(),
            1,
            "_ を含む完全一致だけ取得できる: {:?}",
            results
        );
    }

    #[test]
    fn empty_query_returns_no_rows() {
        let conn = open_test_db();
        seed_sample_data(&conn).unwrap();

        let results = search_hybrid(&conn, "").unwrap();
        assert!(results.is_empty());
    }
}

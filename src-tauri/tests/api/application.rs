// run_application のテスト
//
// テスト対象: app_lib::api::application::run_application
//
// 実装メモ:
//   run_application は内部で `sh -c <command>` を spawn する。
//   spawn() は「sh プロセスを起動できたかどうか」を判断するだけであり、
//   コマンド自体が存在するか・成功するかは spawn() の戻り値に影響しない。
//   したがって macOS 上では sh が必ず /bin/sh に存在するため、spawn() が
//   Err になるケースは実質発生しない（sh 自体を消す等の異常環境を除く）。
//
// ブラックボックス テスト設計:
//   [同値分割]
//     有効クラス①: echo/true のような実行可能なシェルコマンド文字列
//     有効クラス②: 空文字列（sh -c "" は無害に即終了する）
//     有効クラス③: 存在しないバイナリ名（sh 自体は spawn できる）
//     有効クラス④: パイプや演算子を含む複合シェルコマンド
//     有効クラス⑤: スペースのみの文字列
//   [境界値分析]
//     境界①: 空文字列（最短コマンド）
//     境界②: 通常コマンドの最小形（1文字: ":" は sh の組み込みで常に成功）
//
// ホワイトボックス テスト設計:
//   分岐①: spawn() が Ok(_) → log::debug! を呼び Ok(()) を返すパス
//   分岐②: spawn() が Err(_) → log::error! を呼び Err(String) を返すパス
//           ※ macOS の通常環境では発生しないため、分岐①を中心にテストする

#[cfg(test)]
mod run_application {
    use app_lib::api::application::run_application;

    // ブラックボックス: 同値分割 - 有効クラス① (実行可能なシェルコマンド)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    #[test]
    fn returns_ok_for_echo_command() {
        // Arrange: echo は macOS で必ず存在するシェルコマンド
        // Act
        let result = run_application("echo hello");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス① (常に成功するシェルコマンド)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    #[test]
    fn returns_ok_for_true_command() {
        // Arrange: true はシェルの組み込みコマンドで常に終了コード0を返す
        // Act
        let result = run_application("true");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス② / 境界値分析 - 境界① (空文字列)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   sh -c "" は sh プロセスが起動し即終了するだけなので spawn() は成功する
    #[test]
    fn returns_ok_for_empty_command() {
        // Arrange: 空文字列はコマンドとして無害（sh 自体はspawnできる）
        // Act
        let result = run_application("");

        // Assert: sh プロセスは起動できるため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス③ (存在しないバイナリ)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   sh -c "/nonexistent_binary" は sh プロセスが起動し、
    //   バイナリが見つからないエラーをシェル内部で処理するだけ。
    //   spawn() の成否には影響しない。
    #[test]
    fn returns_ok_for_nonexistent_binary() {
        // Arrange: 存在しないバイナリのパスを指定
        //   sh -c "/nonexistent_binary" では sh 自体は spawn できる
        // Act
        let result = run_application("/nonexistent_binary");

        // Assert: sh プロセスは起動できるため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス④ (パイプを含む複合コマンド)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    #[test]
    fn returns_ok_for_compound_command_with_pipe() {
        // Arrange: パイプを含む複合シェルコマンド（sh -c 経由で解釈される）
        // Act
        let result = run_application("echo hello | cat");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス⑤ (スペースのみの文字列)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   sh -c "   " はスペースをコマンドとして処理し、即終了する
    #[test]
    fn returns_ok_for_whitespace_only_command() {
        // Arrange: スペースのみの文字列（シェルは何もせずに終了する）
        // Act
        let result = run_application("   ");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 境界値分析 - 境界② (1文字コマンド)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   ":" は sh の組み込みコマンドで常に終了コード0を返す（最短の有効コマンド）
    #[test]
    fn returns_ok_for_single_char_builtin_command() {
        // Arrange: ":" は sh の組み込みで最短の有効コマンド
        // Act
        let result = run_application(":");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス① (引数付きコマンド)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   複数引数を持つコマンドが正しく sh -c に渡されることを確認
    #[test]
    fn returns_ok_for_command_with_arguments() {
        // Arrange: 引数を含むコマンド（ls -la など典型的なユースケース）
        // Act
        let result = run_application("echo -n test_output");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }

    // ブラックボックス: 同値分割 - 有効クラス① (シェルスクリプト的な記法)
    // ホワイトボックス: spawn() が Ok(_) → Ok(()) を返すパス
    //   セミコロンで区切った複数コマンドが sh -c に渡されることを確認
    #[test]
    fn returns_ok_for_semicolon_separated_commands() {
        // Arrange: セミコロン区切りの複数コマンド（典型的なチートシートのユースケース）
        // Act
        let result = run_application("true; true");

        // Assert: spawn が成功するため Ok(()) が返ること
        assert!(result.is_ok());
    }
}

# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## プロジェクト概要

RightCheat は Tauri 2 + Next.js + React + Material-UI で構築されたデスクトップチートシートアプリケーションです。頻繁に使用するコマンドやショートカットを表示し、クリックやキーボードナビゲーションでクリップボードにコピーできます。ウィンドウ切り替えのグローバルショートカットをサポートし、JSONファイルからコマンドデータを読み込みます。

## 開発コマンド

### フロントエンド (Next.js)
- `yarn dev` - Next.js 開発サーバーを起動
- `yarn build` - 本番用 Next.js フロントエンドをビルド
- `yarn start` - Next.js 本番サーバーを起動

### コード品質
- `yarn lint` - 全てのリンター（ESLint + Prettier）を実行
- `yarn lint:eslint` - ESLint のみ実行
- `yarn lint:prettier` - Prettier フォーマットのチェックのみ
- `yarn fix` - 全てのフォーマットとリンティング問題を修正
- `yarn fix:eslint` - ESLint 問題のみ修正
- `yarn fix:prettier` - Prettier フォーマットのみ修正

### Tauri
- `yarn tauri dev` - 開発モードで Tauri アプリを起動
- `yarn tauri build` - 本番用 Tauri アプリをビルド

### テスト
- `cargo test` - Rust テストを実行（src-tauri ディレクトリから）

### Rust コードフォーマット
- **重要**: Rust コードを修正した後は必ず `cargo fmt` を実行して一貫したフォーマットを維持する
- Rust コードは rustfmt を使用した標準的なフォーマット規則に従う

## アーキテクチャ概要

### フロントエンド (Next.js/React)
- **App Router**: Next.js 16 app ディレクトリ構造を使用
- **主要コンポーネント**:
  - `CheatSheet.tsx`: 状態管理と API 呼び出しを管理するメイン UI コンポーネント
  - `CommandField.tsx`: クリップボード機能付きの個別コマンド表示（複数行コマンド対応）
  - atoms/molecules/organisms 構造でのアトミックデザインパターン
- **状態管理**: カスタムフック（usePreferencesStore, useClipboard）
- **Tauri 統合**: バックエンド通信に @tauri-apps/api を使用
- **ロギング**: @tauri-apps/plugin-log を使用した統一されたログ出力

### バックエンド (Rust/Tauri)
- **API レイヤー**: src-tauri/src/api/ のモジュラー API 構造
  - `cheatsheet.rs`: JSON ファイル読み込み、キャッシュ、コマンド管理
  - `global_shortcut.rs`: キーボードショートカットの設定と処理（再起動確認ダイアログ対応）
  - `application.rs`: アプリケーション起動コマンド（`run_application`）
- **データフロー**: JSON ファイル → キャッシュ → Tauri コマンド経由でフロントエンド
- **設定**: tauri-plugin-store を使用した永続化ストレージ
- **メニューシステム**: 設定とヘルプオプション付きのネイティブ macOS メニュー
- **マルチディスプレイ対応**: ウィンドウの表示位置がマルチディスプレイ環境に対応
- **ロギング**: @tauri-apps/plugin-log を使用した構造化ログ

### アプリケーションランチャー機能

`type: "application"` を指定したチートシートで、クリックまたはキーボード操作でアプリケーションを起動できる機能。

**実装ファイル**:
- `src-tauri/src/api/application.rs`: `run_application` Tauri コマンド
- `src/components/molecules/CommandField.tsx`: `mode='execute'` でアプリ起動動作に切り替え
- `src/components/organisms/CheatSheet.tsx`: `type === 'application'` のとき `CommandField` に `mode='execute'` を渡す

**コマンド実行方式**:
`std::process::Command` で `sh -c <command>` を実行する。`tauri-plugin-shell` による実行方式と比較検討した結果、**任意のシェルコマンドを実行できる柔軟性を優先**するためこの方式を採用している。

`tauri-plugin-shell` を使うとコマンドを `capabilities/` のホワイトリストで制限できるセキュリティ上のメリットがあるが、それにより `open -a "App"` 以外のコマンド形式が制限される。RightCheat はローカルの JSON ファイルのみを参照するためコマンドの発生元は信頼できるとみなし、柔軟性を優先する設計判断とした。

**セキュリティ上の注意**:
`sh -c` 経由のため、JSON ファイルに記述された内容はシェルコマンドとして実行される。JSON ファイルは信頼できるソースのみを使用すること。

**UI の動作**:
- クリックまたはエンターキーでアプリケーションを起動
- 数字キー（1〜9）にも対応
- `sh -c` 経由で実行するため、`sh` プロセスの起動失敗（macOS では実質発生しない）のみ Snackbar でエラー通知される。存在しないアプリ名など JSON に誤ったコマンドを指定した場合のエラーは `sh` プロセス内で発生するため、アプリ側では検知できない。

### ウィンドウサイズのピン留め機能

チートシートごとにウィンドウサイズを保存・復元する機能。

**データ保存先**: チートシートJSONファイル内の各チートシートオブジェクトに `window_size` フィールドとして保存（論理ピクセル単位）。アプリが自動的に書き込む。

```json
{
  "title": "チートシートのタイトル",
  "window_size": { "width": 400, "height": 600 },
  "commandlist": [...]
}
```

**関連ファイル**:
- `src-tauri/src/api/cheatsheet.rs`: `WindowSize` 構造体、`get_cheat_sheet_window_size` / `save_cheat_sheet_window_size` Tauri コマンド
- `src/hooks/useWindowSize.ts`: ウィンドウサイズの読み込み・保存・適用を管理するフロントエンドフック
- `src/types/api/WindowSize.ts`: TypeScript 型定義（`WindowSizeSettings`, `WindowSizeAPI`）

**動作仕様**:
- ピン留め時: 現在のウィンドウサイズ（論理ピクセル）をJSONファイルに保存し `setResizable(false)` でリサイズ不可にする
- ピン留め解除時: JSONファイルから `window_size` フィールドを削除し `setResizable(true)` に戻す
- チートシート切り替え時: 保存済みサイズがあればウィンドウに適用してリサイズ不可にし、なければリサイズ可能にする

**操作方法**: 右下のピンアイコンクリック、または `p` キー押下でトグル

**macOS 実装上の注意**:
`setResizable()`/`setSize()` は `NSWindow.styleMask` を変更するため WKWebView がキーボードのファーストレスポンダーを失う。`restoreFocusAfterWindowOp()` で以下の手順でフォーカスを復元する:
1. 50ms 待機（native イベントの後処理を待つ）
2. `win.setFocus()` でウィンドウのキーステータスを復元
3. 対象要素に `blur()` → `focus()` を呼ぶ（`focus()` 単独では `document.activeElement` が既に対象の場合 no-op になり、WKWebView のネイティブ first responder が復元されないため `blur()` が必要）

### ログ仕様

#### ログスタック

| レイヤー | ライブラリ |
|---------|-----------|
| フロントエンド (TypeScript) | `@tauri-apps/plugin-log` (~2) |
| バックエンド (Rust) | `log` (0.4) + `tauri-plugin-log` (2) |

フロントエンドのログも Tauri プラグイン経由でバックエンドのログシステムに統合され、同一ファイルに出力される。

#### ログ出力先

- **本番環境 (macOS)**: `~/Library/Logs/biz.nosetech.rightcheat/RightCheat.log`
- **開発時**: 上記ファイル + 標準出力 (stdout)

#### ログレベル設定

```rust
// 開発時: Trace 以上を出力
// 本番時: Info 以上を出力（debug! は記録されない）
```

#### ログファイルのライフサイクル

| 項目 | 設定値 |
|------|--------|
| 最大ファイルサイズ | 1MB (1,048,576 バイト) |
| ローテーション戦略 | KeepSome(3)（書き込み中を含む最大3ファイルを保持） |
| チェックタイミング | アプリ起動時のみ |

#### ログメッセージ命名規約

ログメッセージには必ず `[モジュール名]` プレフィックスを付ける。

**フロントエンド (TypeScript)**:
- `[preferences]` - `src/app/preferences/page.tsx`
- `[CheatSheet]` - `src/components/organisms/CheatSheet.tsx`
- `[useCheatSheetLoader]` - `src/hooks/useCheatSheetLoader.ts`
- `[useThemeStore]` - `src/hooks/useThemeStore.ts`
- `[useFontSize]` - `src/hooks/useFontSize.ts`
- `[useWindowSize]` - `src/hooks/useWindowSize.ts`
- `[page]` - `src/app/page.tsx`

**バックエンド (Rust)**:
- `[lib]` - `src-tauri/src/lib.rs`
- `[cheatsheet]` - `src-tauri/src/api/cheatsheet.rs`
- `[global_shortcut]` - `src-tauri/src/api/global_shortcut.rs`
- `[visible_on_all_workspaces]` - `src-tauri/src/api/visible_on_all_workspaces.rs`
- `[application]` - `src-tauri/src/api/application.rs`

#### ログレベルの使い分け

| レベル | 使用例 |
|-------|--------|
| `debug` | UI操作の詳細（API呼び出しレスポンス、ウィンドウサイズ変更など） |
| `info` | システム初期化、設定の初期化など重要イベント |
| `warn` | 予期しないが回復可能なイベント（未知のメニューイベントなど） |
| `error` | 操作失敗・例外 |

### UI通知仕様

エラー・ワーニング発生時のユーザーへの通知方式は、画面と重大度に応じて使い分ける。

#### 通知方式の選択基準

| 画面 | エラー種別 | 通知方式 |
|------|----------|---------|
| チートシート画面 | 重大エラー（チートシートが使えない） | MUI `Alert` コンポーネント（画面内固定表示） |
| チートシート画面 | 軽微エラー（チートシートは使えるが操作が失敗） | MUI `Snackbar`（画面下中央トースト、5秒後自動消去） |
| Preferences 画面 | 全エラー | Tauri ネイティブダイアログ（`message()` from `@tauri-apps/plugin-dialog`） |

#### Snackbar の実装

`src/context/NotificationContext.tsx` に `NotificationProvider` を実装。`layout.tsx` で `ThemeProviderWrapper` の内側に配置することで、テーマ（ダーク/ライトモード）が適用される。

```tsx
// layout.tsx
<ThemeProviderWrapper>
  <CssBaseline />
  <NotificationProvider>{children}</NotificationProvider>
</ThemeProviderWrapper>
```

**使用方法**:
```tsx
const { showError } = useNotificationContext() ?? {}
// ...
showError?.('エラーメッセージ')
```

`useNotificationContext()` は `NotificationProvider` の外（`ThemeProviderWrapper` 内など）では `null` を返す。`?? {}` と `?.` でnull-safeに呼び出す。

#### Preferences 画面のエラー制御

設定保存に失敗した場合は、再起動確認ダイアログを表示しない。`saved` フラグで制御する。

```tsx
let saved = false
try {
  await invoke(...)
  saved = true
} catch (err) {
  await message('エラーメッセージ', { title: 'RightCheat', kind: 'error' })
}
if (saved) {
  await showRestartConfirmationDialog()
}
```

#### 未対応の箇所

以下は構造上の制約により UI 通知を実装していない（ログ出力のみ）:
- `src/hooks/useFontSize.ts` — `ThemeProviderWrapper` 内で使用されており `NotificationProvider` の外側のため
- `src/components/ThemeProviderWrapper.tsx` — `NotificationProvider` の外側のため

### 主要な設計パターン
- **遅延読み込み**: CheatSheet データは初回読み込み時にメモリにキャッシュ
- **イベント駆動**: ウィンドウの表示切り替えとリロードに Tauri イベントを使用
- **型安全性**: フロントエンドとバックエンド間通信で TypeScript 型を共有

### ファイル構造
- `src/`: Next.js フロントエンドコード
- `src-tauri/`: Rust バックエンドコードと Tauri 設定
- `src-tauri/tests/`: テストデータファイル付き Rust ユニットテスト
- JSON 設定でチートシートのカテゴリとコマンドを定義

## 重要な注意事項

- **プラットフォーム**: macOS 専用アプリケーション（macOS での動作に注力、他OSはサポート対象外）
- 日本人ユーザーをターゲット（UI テキストは日本語）
- セキュリティ重視: インターネット通信なし、ローカルファイルアクセスのみ
- Yarn パッケージマネージャーを使用
- TypeScript strict モードを有効
- コンポーネントライブラリに Material-UI v7 を使用
- tauriではuseContextを使ってウィンドウ間でデータを共有することはできません。ウィンドウ間でデータを受け渡す必要がある場合は、バックエンドに必要なAPIを作成してそのAPIからフロントエンドに通知（emit）し、フロントエンドではイベントをlistenして処理をする方式にする必要があります。
- feature/* の名前のブランチについてプルリクエストを作成する場合は、developブランチにマージするプルリクエストにしてください。

## Journaling workflow

InkdropのMCPサーバーを使用できる状態の場合、このプロジェクトで行った作業について Inkdrop にまとめます。
報告することを依頼されたら以下のルールでInkdropにノートを作成してください。

「RightCheat」ノートブックに「Log: <Job title>」というタイトルで作成します。

次の形式でノートを書いてください。:

## Log: <task title>

- **Issue**: <課題の内容>

### What I did: <やったことの要約>

...

### How I did it: <どうやって解決したか>

...

### What were challenging: <難しかったこと>

...

### Future work (optional)

- <今後の改善案など>

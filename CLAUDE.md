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
- **データフロー**: JSON ファイル → キャッシュ → Tauri コマンド経由でフロントエンド
- **設定**: tauri-plugin-store を使用した永続化ストレージ
- **メニューシステム**: 設定とヘルプオプション付きのネイティブ macOS メニュー
- **マルチディスプレイ対応**: ウィンドウの表示位置がマルチディスプレイ環境に対応
- **ロギング**: @tauri-apps/plugin-log を使用した構造化ログ

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

InkdropのMCPサーバーを使用できる状態の場合、あなた (AI エージェント) は、このプロジェクトで行った作業を、タスクの終了ごとに私の Inkdrop ノートに報告してください。

「RightCheat」ノートブックに「Log: <Job title>」というタイトルで作成します。

タスクの終了ごとに、次の形式でノートを書いてください。:

## Log: <task title>

- **Prompt**: <受け取った指示>
- **Issue**: <課題の内容>

### What I did: <やったことの要約>

...

### How I did it: <どうやって解決したか>

...

### What were challenging: <難しかったこと>

...

### Future work (optional)

- <今後の改善案など>

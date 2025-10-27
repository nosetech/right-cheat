# RightCheat

頻繁に使用するコマンドやショートカットの一覧を表示するチートシートツールです。

## 主な機能

- コマンド,ショートカットキーの一覧表示と管理
- コマンドはクリックまたはEnterキーでクリップボードにコピー
- キーボード操作を中心とした快適な操作性

## 設計コンセプト

ITエンジニアの業務利用を想定した以下の特徴があります：

- 作業効率向上のため、キーボード操作を最適化
- 機密情報保護のため、インターネット通信を行わない設計

## 動作確認済みOS

Mac Tahoe 26.0.1 (ARM)

## インストール手順

1. [dmgファイルをダウンロード](https://github.com/nosetech/right-cheat/releases/download/prototype-0.1.2/RightCheat_0.1.2_aarch64.dmg)します
2. ダウンロードしたファイルを実行し、インストールします

### 初回起動時の注意

アプリケーションの初回起動時にブロックされる場合があります。その際は以下の手順で許可します：

1. Appleメニューから［システム設定］→［プライバシーとセキュリティ］を開きます
2. セキュリティ欄の「お使いのMacを保護するために"RightCheat"がブロックされました」というメッセージを確認します
3. 「このまま開く」をクリックします

## アンインストール手順

RightCheatを完全に削除するには、以下の手順を行います：

1. アプリケーションファイルを削除します
2. 必要に応じて設定ファイルも削除します：

```plaintext
/Users/[ユーザー名]/Library/Logs/biz.nosetech.rightcheat/RightCheat.log
/Users/[ユーザー名]/Library/Application Support/biz.nosetech.rightcheat/rightcheat-settings.json
```

## 初期設定

### チートシートファイルの準備

1. 以下のフォーマットでJSONファイルを作成します：

```json
[
  {
    "title": "チートシートのタイトル",
    "type": "command",
    "commandlist": [
      {
        "description": "コマンドの説明",
        "command": "コマンド"
      }
    ]
  },
  {
    "title": "チートシートのタイトル",
    "type": "shortcut",
    "commandlist": [
      {
        "description": "ショートカットの説明",
        "command": "ショートカット"
      }
    ]
  }
]
```

チートシート JSON ファイルのサンプル

```json
[
  {
    "title": "Tauri開発",
    "type": "command",
    "commandlist": [
      {
        "description": "devモード",
        "command": "yarn tauri dev"
      },
      {
        "description": "ビルド",
        "command": "yarn tauri build"
      }
    ]
  },
  {
    "title": "tmux(プレフィックスキー入力後)",
    "type": "shortcut",
    "commandlist": [
      {
        "description": "セッションの一覧選択",
        "command": "s"
      },
      {
        "description": "新規ウィンドウ作成",
        "command": "c"
      },
      {
        "description": "ウィンドウの名前変更",
        "command": ","
      }
    ]
  }
]
```

2. メニューから［RightCheat］→［Preferences］を開きます
3. Preferences画面で作成したJSONファイルを読み込みます

### ファイル管理のヒント

チートシートJSONファイルは次の場所に保存することをおすすめします：

```plaintext
~/Documents/RightCheat/
```

専用フォルダを作成することで、ファイル管理が簡単になります。

## 基本操作

### チートシート切り替え

- **マウス操作**: メインウィンドウ上部のドロップダウンリストから表示するチートシートを選択
- **キーボード操作**: 0キーでドロップダウンリストへフォーカス移動してチートシートを選択

### コマンドコピー

コマンドチートシートの場合(JSONファイル内で"type": "command"を指定しているチートシート)、コマンドをクリップボードにコピーすることができます。

- **マウス操作**: コマンドをクリックでクリップボードにコピー
- **キーボード操作**:
  - Tab/Shift+Tab: フォーカス移動
  - Enter: コピー実行
  - 1～9: 数字キーで該当のコマンドをコピー（数字順に表示されるコマンド）

### チートシートの編集

1. **ファイルを開く**:

   - Preferences画面のファイルパス横の編集アイコンをクリック
   - デフォルトエディタでJSONファイルが開きます

2. **変更を反映**:
   - メニュー: [View] → [CheatSheet Reload]
   - ショートカット: Cmd+R

> [!NOTE]
> 現在、アプリ内での直接編集機能はありません。外部エディタで編集後、再読み込みが必要です。

### メインウィンドウ表示制御

- メニュー: [View] → [Toggle Visible]
- ショートカット: ⌘ ^ R (初期設定)

> [!TIP]
> 現在、このショートカットキーのみPreferences画面で変更可能です。

### テーマ切り替え

Preferences画面で、アプリケーションのテーマを切り替えることができます。

- **ライトモード**: 明るい背景のテーマ
- **ダークモード**: 暗い背景のテーマ
- **システムのテーマ**: OSの設定にあわせてライトテーマまたはダークテーマに変更

選択したテーマはアプリケーション終了後も保持されます。

### 文字サイズ調整

- 文字を大きく

  - メニュー: [View] → [Increase Font Size]
  - ショートカット: ⌘ + (プラスキー。使用されているキーボードによって異なります。)

- 文字を小さく

  - メニュー: [View] → [Decrease Font Size]
  - ショートカット: ⌘ -

- 初期状態に戻す

  - メニュー: [View] → [Reset Font Size]
  - ショートカット: ⌘ 0

# RightCheat

頻繁に使用するコマンドやショートカットの一覧を表示するチートシートツールです。

## 主な機能

- コマンドの一覧表示と管理
- クリックまたはEnterキーでクリップボードにコピー
- キーボード操作を中心とした快適な操作性

本ツールは、[Tauri 2](https://v2.tauri.app/ja/)を使用したアプリケーション開発の学習を目的として開発しております。動作に不具合が生じる可能性がございますが、あらかじめご了承ください。

## 設計コンセプト

ITエンジニアの業務利用を想定した以下の特徴があります：

- 作業効率向上のため、キーボード操作を最適化
- 機密情報保護のため、インターネット通信を行わない設計

## 動作確認済みOS

Mac Sequoia 15.6 (ARM)

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
    "commandlist": [
      {
        "description": "コマンド（ショートカット）の説明",
        "command": "コマンド"
      }
    ]
  }
]
```

チートシート JSON ファイルのサンプル

```json
[
  {
    "title": "チートシートのタイトル",
    "commandlist": [
      {
        "description": "コマンド（ショートカット）の説明",
        "command": "コマンド"
      }
    ]
  },
  {
    "title": "Tauri開発",
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

- コマンドをクリックすることで、クリップボードにコピーされます。
- キーボード操作の場合、フォーカスの移動は Tab または Shift+Tab で行い、Enter キーでコピーを実行します。
- 表示するチートシートを変更したい場合は、メインウィンドウ上部のリストボックスから切り替えてください。
- メインウィンドウの表示・非表示は、メニューの[View] → [Toggle Visible]かキーボードショートカットの Cmd+Ctrl+R で切り替えることができます。
  - キーボードショートカットはPreferences画面で変更することができます。設定できるキーボードショートカットはToggle Visible機能のみとなっています。
- アプリケーション上でチートシート JSONファイルを更新する機能はまだありませんが、Preferences画面のチートシートJSONファイルパスが表示されているテキストボックスの右側にあるアイコンをクリックするとOSでデフォルト設定されているエディタを起動してチートシートJSONファイルを開いて編集することができます。エディタでファイルを編集・保存したらメニューの[View] → [CheatSheet Reload]かキーボードショートカットのCmd+RでチートシートJSONファイルを再読み込みできます。

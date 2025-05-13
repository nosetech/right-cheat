# RightCheat

頻繁に使用するコマンドやショートカットの一覧を表示するチートシートツールです。  
表示しているコマンドはクリック（またはEnter)してクリップボードにコピーできます。

本ツールは[Tauri 2](https://v2.tauri.app/ja/)でのアプリケーション開発を勉強するために開発しているものになります。動作に不具合がある可能性がありますがご了承ください。

## 設計コンセプト

ITエンジニアが仕事で使用することを想定しています。

- 作業効率を上げるため、できるだけキーボード操作だけで扱えるようにします。
- 機密情報を扱うケースを考えて、ツール自体はインターネットへの通信を行いません。

## 動作確認済みOS

Mac Sequoia 15.4.1 (ARM)

## インストール

[dmgファイルをダウンロード](https://github.com/nosetech/right-cheat/releases/download/prototype-0.1.0/RightCheat_0.1.0_aarch64.dmg)してインストールしてください。  
アプリケーションの初回起動時には正常に起動できないため、まずアップルメニューより［システム設定］-［プライバシーとセキュリティ］の画面を開いてください。  
画面の下のセキュリティ部分に表示される「お使いのMacを保護するために"RightCheat"がブロックされました」より「このまま開く」をクリックしてください。

## アンインストール

RightCheatアプリケーションファイルを削除してください。  
アプリケーションを起動すると以下のファイルが自動的に作られるため、不要であれば削除してください。

- /Users/[ユーザー名]/Library/Logs/biz.nosetech.rightcheat/RightCheat.log
- /Users/[ユーザー名]/Library/Application Support/biz.nosetech.rightcheat/rightcheat-settings.json

## 使用方法

### アプリケーション初期起動時の設定

1. 以下の例のようにチートシートJSONファイルを作成してください。チートシートはコマンドのカテゴリ別などで複数定義することができます。

チートシートJSONファイルのサンプル

```
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

2. メニュー[RightCheat] - [Preferences]の画面を開いてください。
3. Preferences画面で、作成したJSONファイルを開いてください。

### アプリケーションの操作

- コマンドをクリックすることでクリップボードへコピーします。
- キーボードでの操作はフォーカス移動はTab or Shift+Tabで行い、Enterでコピーを行います。
- 表示するチートシートを変更する場合は、メインウィンドウ上部のリストボックスから変更できます。
- メインウィンドウの表示・非表示はキーボードショートカットCmd+Ctrl+Rで切り替えることができます。(現状はキーボード操作でのみ切り替えられます)

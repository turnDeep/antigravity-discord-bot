# SafeClaw 仕様書

## 1. 概要
このシステムは大きく分けて2つの主要機能を持ちます。
1. **SafeClaw コマンドプロキシ**: OpenClawなどのAIエージェントが実行するシェルコマンドをフックし、危険な操作が行われる前にDiscordへ承認リクエストを送信する Human-in-the-loop (HITL) システムです。
2. **Antigravity Discord Bot**: Chrome DevTools Protocol (CDP) を利用して、ローカルで動作するAntigravity (VS Code Fork) をDiscordから遠隔操作するためのツールです。

## 2. システム構成

### アーキテクチャ図
```mermaid
graph TD
    AIAgent[OpenClaw / AI Agent] -- Command --> Proxy[SafeClaw Proxy Script]
    Proxy -- Safe --> Shell[OS Shell / Exec]
    Proxy -- Dangerous (HTTP POST) --> DiscordBot[Node.js Discord Bot]
    DiscordBot -- Ask Approval (DM) --> User[Discord Admin]
    User -- Approve / Reject --> DiscordBot
    DiscordBot -- Response --> Proxy

    User -- Command --> DiscordBot
    DiscordBot -- CDP (WebSocket) --> Antigravity["Antigravity (VS Code)"]
    Antigravity -- File System --> FileWatcher[Chokidar]
    FileWatcher -- Event --> DiscordBot
```

### 主要コンポーネント
- **SafeClaw Proxy (`src/proxy/proxy.js`)**: コマンドのラッパーとして動作し、正規表現パターンを用いて危険性を評価します。
- **Proxy Server (`src/proxy/server.js`)**: Discord Bot内部で稼働するExpressサーバー（ポート: 3001）で、Proxyからの承認リクエストを受信します。
- **CDP (Chrome DevTools Protocol)**: AntigravityのWebView（iframe）内のDOMにアクセスし、ボタンクリックやテキスト取得を行います。
- **Chokidar**: ファイルシステムの変更を監視し、Antigravityが生成したファイルや変更を検知してDiscordに通知します。
- **Discord.js**: Discord APIとの通信を行います。

## 3. 機能詳細

### 3.1 SafeClaw コマンド・インターセプトと承認プロセス
- **処理フロー**: `node proxy.js <コマンド>` の形式で呼び出されます。引数を結合して完全なコマンド文字列を構築します。
- **危険性の判定**: `proxy.js` 内に定義された正規表現の配列（`DANGEROUS_PATTERNS`）に一致するかどうかで判定します（例： `rm -rf`, `.ssh/` の読み取り, `chown` など）。
- **承認待機**: 一致した場合、ローカルホストの `3001/request-approval` エンドポイント（Discordボット側のExpressサーバー）へPOSTリクエストを送り、レスポンスがあるまでプロセスをブロックします。
- **Discordでの承認**: Expressサーバーは、`.env` で指定された `DISCORD_ALLOWED_USER_ID` のユーザーへDiscordのDMを送信し、インタラクティブボタン（許可／拒否）を提示します。
- **タイムアウト**: ユーザーが5分以内にアクションを起こさない場合、自動的に「拒否」として扱われ、コマンドプロセスはエラー終了（`process.exit(1)`）します。

### 3.2 テキスト生成
- ユーザーからのメッセージをCDP経由でAntigravityのチャット入力欄に注入します。
- 入力欄のセレクター: `textarea[class*="input"]` など
- 送信ボタンのクリックまたは `Enter` キーイベントの発火によって生成を開始します。

### 3.3 モデル切替 (`/model`)
- AntigravityのUI上にあるモデル選択ドロップダウンを操作します。
- **DOM操作**:
  1. `<button aria-expanded="false">` をクリックしてドロップダウンを展開。
  2. ドロップダウン内のモデル名リストを取得。
  3. 指定されたモデル名の要素をクリック。
  - iframe内にあるため、全iframeを走査して対象要素を探します。

### 3.4 モード切替 (`/mode`)
- Planning Mode / Fast Mode の切替を行います。
- **DOM操作**:
  1. モード切替トグルをクリック。
  2. ダイアログ内の "Planning" または "Fast" をクリック。

### 3.5 チャットタイトル取得 (`/title`)
- 現在のチャットセッションのタイトルを取得します。
- **DOM操作**:
  - `p.text-ide-sidebar-title-color` クラスを持つ要素を探し、そのテキストを取得します。

### 3.6 ファイル監視
- プロジェクトルート（デフォルトはボットの親ディレクトリ、環境変数 `WATCH_DIR` や起動時の対話設定で指定可能）以下のファイル変更を監視します。
- 除外ファイル: `node_modules`, `.git`, `.env`, ログファイルなど。
- 新規作成 (`add`) または変更 (`change`) があった場合、そのファイルパスと内容（テキストファイルの場合）をDiscordに通知します。

## 4. 環境設定

### 必要な環境変数 (.env)
- `DISCORD_BOT_TOKEN`: Discord Botのトークン
- `DISCORD_ALLOWED_USER_ID`: 操作を許可するユーザーID（セキュリティのため制限）
- `WATCH_DIR`: (任意) 監視対象のディレクトリパス。未指定の場合は起動時に対話的に設定を求められ、空欄でEnterを押すと監視機能が無効化されます。

### 依存関係
- `discord.js`: ^14.x
- `chokidar`: ^3.x
- `ws`: ^8.x
- `dotenv`: ^16.x
- `express`: ^4.x
- `body-parser`: ^1.x

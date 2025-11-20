# ミラコスタ空室通知サービス

東京ディズニーシー・ホテルミラコスタの空室情報をリアルタイムで通知するWebサービスです。

## 🏰 機能

- **リアルタイム空室監視**: 5分間隔で空室をチェック
- **マルチ通知**: メール・LINE Notifyで即座に通知
- **条件指定**: 日付や部屋タイプを指定して通知を受け取れます（プレミアムプラン）
- **空室一覧**: Webで現在の空室状況を確認
- **通知履歴**: 過去の通知を確認

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Auth + Functions)
- **通知**: LINE Notify API + SMTP (nodemailer)
- **ホスティング**: Vercel (フロントエンド) + Supabase Functions (バックエンド)

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`を`.env.local`にコピーして、以下の環境変数を設定します：

```bash
cp .env.local.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabaseのセットアップ

#### データベースのマイグレーション

Supabaseダッシュボードで`supabase/migrations/001_initial_schema.sql`を実行します。

#### Supabase Functionsのデプロイ

```bash
# Supabase CLIのインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref your-project-ref

# Functionのデプロイ
supabase functions deploy monitor-rooms
```

#### Cron設定（5分間隔で実行）

Supabaseダッシュボードで以下のCronジョブを設定：

```sql
SELECT cron.schedule(
  'monitor-rooms-job',
  '*/5 * * * *',  -- 5分ごと
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/monitor-rooms',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 🚀 デプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel
```

または、GitHubにプッシュしてVercelと連携してください。

## 📝 使い方

1. **アカウント登録**: メールアドレスとパスワードで登録
2. **通知設定**: 希望の通知方法（メール/LINE）を設定
3. **条件指定**: プレミアムプランで日付・部屋タイプを指定（オプション）
4. **通知受信**: 空室が出たら自動的に通知が届きます

## 💰 料金プラン

- **無料プラン**: 基本的な空室通知、メール通知
- **プレミアムプラン（¥980/月）**: LINE通知、日付・部屋タイプ指定、優先通知

## ⚠️ 注意事項

- このサービスは非公式サービスです
- 東京ディズニーリゾート・ホテルミラコスタとは一切関係ありません
- 過度なアクセスを避けるため、5分間隔での監視に制限しています
- 公式サイトの利用規約を遵守してください

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Pull Requestsは歓迎します。大きな変更の場合は、まずIssueを開いて変更内容を議論してください。

## 📧 サポート

問題が発生した場合は、GitHubのIssueを作成してください。

# ミラコスタ空室通知サービス - セットアップガイド

このドキュメントでは、サービスを立ち上げるための詳細な手順を説明します。

## 📋 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント
- Vercelアカウント（デプロイ用）
- Gmail アカウント（メール送信用）

## 🚀 セットアップ手順

### 1. プロジェクトのクローン

```bash
cd "vacancy search"
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてログイン
2. "New Project"をクリック
3. プロジェクト名、データベースパスワード、リージョンを設定
4. プロジェクトが作成されるまで待機（数分かかります）

### 3. データベースのセットアップ

#### 3.1 SQLエディタでマイグレーション実行

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/migrations/001_initial_schema.sql`の内容をコピー
3. SQLエディタに貼り付けて「Run」をクリック

#### 3.2 テーブルの確認

「Table Editor」で以下のテーブルが作成されているか確認：
- users
- room_availability
- notification_settings
- notification_history

### 4. 環境変数の設定

#### 4.1 Supabaseの認証情報取得

Supabaseダッシュボードの「Settings」→「API」から以下を取得：
- Project URL
- anon public key
- service_role key

#### 4.2 .env.localファイルの作成

```bash
cp .env.local.example .env.local
```

`.env.local`を編集：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 4.3 Gmailアプリパスワードの取得

1. Googleアカウントの「セキュリティ」設定にアクセス
2. 「2段階認証」を有効化
3. 「アプリパスワード」を生成
4. 生成されたパスワードを`SMTP_PASSWORD`に設定

### 5. Supabase Functionsのセットアップ

#### 5.1 Supabase CLIのインストール

```bash
npm install -g supabase
```

#### 5.2 Supabaseにログイン

```bash
supabase login
```

ブラウザが開き、認証が求められます。

#### 5.3 プロジェクトにリンク

```bash
supabase link --project-ref your-project-ref
```

プロジェクトRefは、Supabaseダッシュボードの「Settings」→「General」で確認できます。

#### 5.4 Functionのデプロイ

```bash
supabase functions deploy monitor-rooms
```

#### 5.5 環境変数の設定（Supabase Functions用）

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set APP_URL=https://your-app.vercel.app
```

### 6. Cron設定（定期実行）

#### 6.1 pg_cronの有効化

Supabaseダッシュボードの「Database」→「Extensions」で`pg_cron`を有効化

#### 6.2 Cronジョブの作成

SQLエディタで以下を実行：

```sql
-- 5分ごとに実行
SELECT cron.schedule(
  'monitor-rooms-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/monitor-rooms',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-anon-key"}'::jsonb
  ) AS request_id;
  $$
);
```

#### 6.3 Cronジョブの確認

```sql
SELECT * FROM cron.job;
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

### 8. 動作確認

1. **ユーザー登録**
   - 新規登録ページでアカウント作成
   - メールアドレスに確認メールが届く（Supabaseの設定による）

2. **通知設定**
   - 設定ページで通知方法を選択
   - LINE通知を使う場合はトークンを設定

3. **空室監視の確認**
   - Supabase Functionsのログで実行を確認
   - `room_availability`テーブルにデータが追加されているか確認

### 9. Vercelへのデプロイ

#### 9.1 Vercelアカウント作成・ログイン

```bash
npm install -g vercel
vercel login
```

#### 9.2 プロジェクトのデプロイ

```bash
vercel
```

初回は質問に答えながらセットアップ：
- プロジェクト名
- ディレクトリ（デフォルトのまま）
- ビルド設定（Next.jsを自動検出）

#### 9.3 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を追加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `NEXT_PUBLIC_APP_URL`（Vercelのドメイン）

#### 9.4 再デプロイ

```bash
vercel --prod
```

### 10. 本番環境の設定更新

Supabase Functionsの環境変数を更新：

```bash
supabase secrets set APP_URL=https://your-app.vercel.app
```

Cronジョブも本番URLに更新：

```sql
SELECT cron.unschedule('monitor-rooms-every-5-minutes');

SELECT cron.schedule(
  'monitor-rooms-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/monitor-rooms',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-anon-key"}'::jsonb
  ) AS request_id;
  $$
);
```

## 🔍 トラブルシューティング

### メール送信エラー

- Gmailのアプリパスワードが正しく設定されているか確認
- 2段階認証が有効になっているか確認
- SMTP設定が正しいか確認

### Supabase Functionsが実行されない

- Cronジョブが正しく設定されているか確認: `SELECT * FROM cron.job;`
- Functionのログを確認: Supabaseダッシュボードの「Functions」→「Logs」
- 環境変数が正しく設定されているか確認: `supabase secrets list`

### 認証エラー

- Supabase AuthのEmail設定を確認
- RLSポリシーが正しく設定されているか確認

## 📝 次のステップ

1. **実際のスクレイピング実装**
   - `supabase/functions/monitor-rooms/index.ts`の`fetchRoomAvailability`関数を実装
   - ミラコスタの公式予約システムから空室情報を取得

2. **課金機能の追加**
   - Stripeを統合してサブスクリプション課金を実装
   - プレミアム機能の制限を追加

3. **通知の最適化**
   - 通知の重複を防ぐ
   - 通知頻度の制限
   - より詳細な条件指定

4. **モニタリング**
   - エラー通知の設定
   - パフォーマンスモニタリング
   - ユーザー分析

## ⚠️ 重要な注意事項

- ミラコスタ公式サイトの利用規約を必ず確認してください
- 過度なアクセスはサーバーに負荷をかけるため避けてください
- 個人情報の取り扱いには十分注意してください
- 本サービスは教育目的のサンプルです

## 🤝 サポート

問題が発生した場合は、GitHubのIssueを作成してください。

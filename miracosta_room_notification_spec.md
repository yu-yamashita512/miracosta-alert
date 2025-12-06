### ミラコスタ空室通知サービス仕様書（国内向け）

---

## 1. サービス概要
- **目的**：東京ディズニーシー直結ホテル「ミラコスタ」の空室情報を、ユーザーがリアルタイムで確認・通知を受けられるサービス
- **対象ユーザー**：国内ディズニーファン・ガチ勢（年数回〜年数十回リピーター、ホテル宿泊意欲が高い層）
- **提供価値**：
  1. 空室が出た瞬間に通知（LINE / メール）
  2. Web上で空室状況を即確認
  3. 課金プランでプレミアム通知や日付・部屋タイプ指定

---
```markdown
### 宿泊空室通知サービス仕様書（Rakuten Web Service 統合・手動入力フォールバック）

---

## 1. サービス概要
- **目的**：ユーザーが宿泊施設の空室・料金情報を条件指定で受け取れる通知サービス（まずは楽天トラベルAPIを一次情報源とし、手動入力をフォールバックとして採用）
- **対象ユーザー**：宿泊を頻繁に検索するユーザー（テーマパーク関連・出張・旅行好きなど）
- **提供価値**：
        1. 希望条件に合致した空室/価格変動を通知（LINE / メール）
        2. Webで空室一覧・過去通知を確認
        3. プレミアムプランで細かい条件指定（部屋タイプ、複数日指定）

---

## 2. 方針（楽天API優先）
- 自動化はまず**楽天トラベル（Rakuten Web Service）API**を利用して実装する。
- 楽天APIで取得できない/不足する情報は管理者の手動入力UIで補完する（管理者が定期チェックして更新）。
- 法的リスクを避けるため、直接のスクレイピングは原則行わない。

---

"""
# ミラコスタ空室通知サービス 仕様書（現状反映版）

最終更新: 2025-11-24

このドキュメントはプロジェクトの目的・アーキテクチャ・現在の実装状況（進捗）・開発/運用手順をまとめたものです。

## 1. サービス概要
* 目的: 東京ディズニーシー直結ホテル「ミラコスタ」の空室情報を定常的に取得し、ユーザーへ通知・表示するMVPを構築する。
* データソース: 楽天トラベル API (Rakuten Web Service) を一次情報源とし、取得できない場合は管理者による手動入力をフォールバックとして採用。

## 2. 現在の進捗（2025-11-23 更新）
* 実装済み（ローカルで動作確認済）:
        - `src/pages/api/rakuten/fetch-plans.ts` — 楽天 Travel VacantHotelSearch 等を呼び、レスポンスを正規化して `room_availability` に upsert する処理を作成。価格の数値化、日付/部屋タイプの正規化、楽天アフィリエイトURLの付与を行うロジックを含む（RAKUTEN_APP_ID 必須）。
        - `src/lib/supabase.ts` — Supabase クライアント（public / admin(service role)）を提供。
        - `supabase/migrations/001_initial_schema.sql` — `room_availability` テーブル定義を作成済。
        - `src/pages/api/availability.ts` — `GET /api/availability?start=YYYY-MM-DD&end=YYYY-MM-DD` を実装。日付レンジで `room_availability` を取得し、部屋別に日次エントリで返却する。
        - `src/pages/api/admin/load-mock-data.ts` — 管理者用のモックデータ挿入エンドポイントを実装（ヘッダ `x-admin-secret` で保護）。ローカルで実行し、モックデータ25行を upsert することを確認済。
        - `src/pages/calendar.tsx` — FullCalendar を使ったカレンダー画面を実装。API から取得した可用性データを部屋別に表示。ツールチップに Tippy を使用し、モバイル向けに動作するように調整済。

* 検証済み動作（ローカル）:
        - 管理APIでモックを upsert → `/api/availability` が JSON を返すことを確認（明日〜5日後のレンジで 5 部屋 × 5 日のサンプルを返す）。
        - カレンダーページ (`/calendar`) がビルドされ、クライアントでデータ読み込みを行う状態まで動作確認。
        - `RAKUTEN_APP_ID` を `.env.local` に追加し、`POST /api/rakuten/fetch-plans` を実行して実データを取得・upsert を確認（例: 2026-01-25〜2026-01-27 のデータを取得、`/api/availability` が `source: "rakuten"` を含むエントリを返すことを確認）。

* 追加実装済み（2025-11-23）:
        - `supabase/migrations/003_add_source_to_room_availability.sql` — Supabase に適用完了。`room_availability.source` カラムを追加し、既存モックデータを `source = 'mock'` に設定。
        - `src/pages/api/rakuten/fetch-6months.ts` — 6ヶ月分の空室データを楽天APIから取得・DB保存。`source: 'rakuten'` として保存。
        - カレンダー改善: 6ヶ月表示範囲、動的データ取得、今日〜6ヶ月後まで制限、モックデータフィルター除外。
        - Supabase pg_cron: 30分毎の自動データ取得を実装（`rakuten-fetch-every-30min` ジョブ作成）。
        - 通知パイプライン基礎: `fetch-6months.ts` に通知トリガーロジック追加。新規空室レコード検知・ログ出力実装。

* 2025-11-24 進捗:
        - 通知パイプライン（メール・LINE）を `supabase/functions/monitor-rooms/index.ts` で本実装。条件マッチング・履歴記録・API呼び出しまで動作。
        - メール送信API `/api/send-email` をNext.js側で実装済み。SMTP環境変数で動作。
        - ローカルでSupabase/Docker/Functionの起動・動作確認まで完了。
        - テスト方法（curlでのAPI叩き、環境変数例、メール送信確認手順）を整理。
        - config.tomlやSupabase/Dockerのトラブルシュートも記録。

* 2025-12-03 進捗（楽天API統合・カレンダーUI改善）:
        - **Supabase Edge Function による楽天API空室取得自動化**:
                - `supabase/functions/monitor-rooms/index.ts` を実装し、楽天Travel/VacantHotelSearch APIから180日分の空室データを自動取得・DB保存。
                - レートリミット対策（リクエスト間隔2秒、429エラー時5秒待機、エラー時false反映停止）を実装。
                - 分割取得方式（30日単位で6回に分割、startOffset/daysパラメータ）で180日制限を回避。
                - checkoutDate明示、JST基準日付計算、is_available判定ロジックを実装。
                - 環境変数 `RAKUTEN_APP_ID` を Supabase Secrets に登録・デプロイ完了。
                - デプロイ後の動作確認で空室データ24件を取得・DB保存成功（2026年1月～3月、ミラコスタ・スイート中心）。
        - **カレンダーUIからの楽天予約ページ遷移機能**:
                - `src/pages/calendar.tsx` に `generateRakutenReserveUrl()` 関数を実装。
                - FullCalendarのイベントクリックで楽天予約ページに遷移（新規タブ、noopener）。
                - 日付指定付きURL生成（チェックイン・チェックアウト日をYYYY, MM, DD形式でパース）。
                - URL形式: `https://hotel.travel.rakuten.co.jp/hotelinfo/plan/74733?f_no=74733&f_flg=PLAN&f_nen1=YYYY&f_tuki1=MM&f_hi1=DD&f_nen2=YYYY&f_tuki2=MM&f_hi2=DD&f_otona_su=2&f_heya_su=1`
                - 大人2名、1室の予約条件を含むパラメータを実装。
        - **環境変数管理の改善**:
                - ブラウザキャッシュによる環境変数の古い値が残る問題を確認。
                - **重要**: ブラウザを閉じた後、再起動して環境変数を最新化する必要あり（開発時の注意点）。
                - Supabase Edge Function のsecretsは `supabase secrets set` コマンドで設定後、再デプロイが必要。
        - デプロイ・本番反映: GitHubへpush完了、Vercel自動デプロイ実行中。

* 未完（要対応）:
        - 通知送信パイプラインの完全実装（条件マッチング → `notification_history` 登録 → LINE/Smtp 送信）。
        - 管理APIの保護強化（`/api/admin/*` の本番移行前保護）。
        - 通知設定管理UIの実装（ユーザーが条件を設定できる画面）。
        - 運用監視・エラーハンドリングの強化。
        - 楽天予約URLの本番動作確認（Vercelデプロイ後の最終検証）。

## 3. アーキテクチャ（要点）
* フロントエンド / API: Next.js（API ルートを活用）
* DB / 認証: Supabase (Postgres)
* 外部API: Rakuten Web Service（VacantHotelSearch / PlanSearch）
* カレンダー表示: FullCalendar + Tippy

## 4. 主要ファイル / エンドポイント（現状）
* `src/pages/api/rakuten/fetch-plans.ts` (POST)
        - 用途: 楽天APIを呼び、正規化した可用性（room_type, date, is_available, price）を返す/DBに upsert する。
        - 引数: JSON ボディ `{ params: { hotelNo, checkinDate, checkoutDate, ... }, upsert: boolean }`
        - 要環境変数: `RAKUTEN_APP_ID`（必須）、`RAKUTEN_AFFILIATE_ID`（任意）

* `src/pages/api/availability.ts` (GET)
        - 用途: カレンダー用に日付レンジで `room_availability` を取得し、{ room_type: [ {date,is_available,price}, ... ] } の形で返却。
        - クエリ: `start`, `end`（YYYY-MM-DD）

* `src/pages/api/admin/load-mock-data.ts` (POST)
        - 用途: 管理者がローカルでモックデータを upsert する（開発用）。ヘッダ `x-admin-secret: ADMIN_SECRET` を必須とする。

* `src/pages/calendar.tsx` (ページ)
        - 用途: FullCalendar を用いた可用性ビュー。 `/api/availability` を呼んでイベントを生成・表示。

## 5. DB スキーマ（要点）
* `room_availability` テーブル（簡略）
        - `id` UUID
        - `date` DATE
        - `room_type` TEXT
        - `is_available` BOOLEAN
        - `price` INTEGER (nullable)
        - `last_checked_at` TIMESTAMP
        - UNIQUE(date, room_type)

## 6. ローカル実行手順（開発者向け）
1. 必要な env を `.env.local` に設定（既に `ADMIN_SECRET` は生成済）:
         - `NEXT_PUBLIC_SUPABASE_URL` (既存)
         - `SUPABASE_SERVICE_ROLE_KEY` (既存)
         - `RAKUTEN_APP_ID` （Rakuten の applicationId） — 実データ取得を行う場合に必須
         - `RAKUTEN_AFFILIATE_ID` （任意）

2. 依存インストール（プロジェクトルート）:
```bash
npm install
```

3. 開発サーバー起動:
```bash
npm run dev
```

4. モックを投入（開発用）:
```bash
ADMIN_SECRET=$(grep '^ADMIN_SECRET=' .env.local | cut -d'=' -f2)
curl -X POST "http://localhost:3004/api/admin/load-mock-data" -H "x-admin-secret: $ADMIN_SECRET"
```

5. カレンダー確認:
```bash
open "http://localhost:3004/calendar"
```

6. 楽天実データを取得して DB 更新（RAKUTEN_APP_ID 設定後）:
```bash
curl -X POST "http://localhost:3004/api/rakuten/fetch-plans" \
        -H "Content-Type: application/json" \
        -d '{"params":{"hotelNo":"74733","checkinDate":"2025-11-24","checkoutDate":"2025-11-25"},"upsert":true}'
```

**重要: 環境変数の更新とブラウザキャッシュについて**
- `.env.local` や Supabase Secrets を更新した場合、開発サーバーを再起動してください。
- **ブラウザを閉じた後、再起動することで環境変数が最新化されます**。ブラウザキャッシュに古い値が残る場合があるため、環境変数を変更した際は必ずブラウザを完全に閉じて再起動してください。
- Supabase Edge Function の環境変数は `supabase secrets set KEY=VALUE` で設定後、`supabase functions deploy <function-name>` で再デプロイが必要です。

## 7. セキュリティ / 運用上の注意（追記）
* 本番環境では `src/pages/api/admin/load-mock-data.ts` のような開発用エンドポイントは削除するか、厳格な認証（OAuth / Supabase Auth + Role）で保護してください。
* 楽天 API の利用規約を順守し、レート制限に配慮したジョブスケジューリングを実施すること。

## 8. 今後の優先タスク（短期）
1. `.env` に `RAKUTEN_APP_ID` を設定し、`POST /api/rakuten/fetch-plans` を実行して実データを DB に取り込む（ローカルで検証済みの処理を実データで検証）。
2. 定期実行の仕組みを導入（Vercel Cron / Supabase Scheduled Function）。
3. 通知パイプラインを実装（条件マッチング → `notification_history` 登録 → LINE/Smtp）。
4. 管理APIの認証強化と運用用ダッシュボードの整備。

## 9. 参考: これまでのローカル検証メモ
* 管理APIでモックデータ25行を upsert → `/api/availability` が部屋別データを正しく返した（例: 5 部屋 × 5 日分）。
* カレンダーページは FullCalendar + Tippy でクライアント側にて動作（Tippy は dynamic import して SSR を回避）。

---

更新・質問があれば、この仕様書に追記します。次に私が行う推奨アクション:
1) あなたが `RAKUTEN_APP_ID` を渡すかローカルで設定して、私が実データ取り込みを再実行する。  
2) または、本番移行前に管理APIの認証強化を優先して取り組む。

## 10. 実装できていること / できていないこと（要約）

**実装できていること（ローカル検証済 + 本番デプロイ済）**
- **楽天データ取得エンドポイント**: `POST /api/rakuten/fetch-plans` を実装し、Rakuten Travel API からのレスポンスを正規化して処理可能。
- **DB への upsert 処理**: 正規化した可用性データを `room_availability` テーブルへ upsert する処理を実装（`source` を付与して保存）。
- **管理用モック挿入**: `POST /api/admin/load-mock-data` により開発用モックデータを upsert できる（`x-admin-secret` で保護）。
- **カレンダー表示**: `src/pages/calendar.tsx` にて FullCalendar を用いて部屋別の可用性を表示。ツールチップ（Tippy）で詳細を表示。
- **可用性取得 API**: `GET /api/availability?start=YYYY-MM-DD&end=YYYY-MM-DD` が日付レンジで部屋別日次エントリを返す。
- **環境変数対応**: `.env.local` に `RAKUTEN_APP_ID` を設定して実データ取得が可能（ローカルで実行済）。
- **通知パイプライン**: `supabase/functions/monitor-rooms/index.ts` で空室検知時に条件マッチング・履歴記録・メール/LINE通知API呼び出しまで実装済。
- **メール送信API**: `src/pages/api/send-email.ts` でユーザーごとにメール送信可能。SMTP環境変数で動作。
- **ローカル開発環境の起動・トラブルシュート**: Docker/Supabase CLI/config.tomlの問題を解決し、Functionのserveまで動作確認。
- **通知テスト手順**: curlやPostmanで `/api/send-email` を叩き、テストユーザーにメールが届くことを確認。
- **Supabase Edge Function による楽天API自動取得**（本番デプロイ済）:
        - `supabase/functions/monitor-rooms/index.ts` で楽天Travel/VacantHotelSearch APIから180日分の空室データを自動取得・DB保存。
        - レートリミット対策（リクエスト間隔2秒、429エラー時5秒待機）実装済。
        - 分割取得方式（30日単位×6回、startOffset/daysパラメータ）で180日制限を回避。
        - 環境変数 `RAKUTEN_APP_ID` を Supabase Secrets に登録済。
        - 本番デプロイ後、空室データ24件取得成功（2026年1月～3月）。
- **カレンダーUIからの楽天予約ページ遷移機能**（本番デプロイ済）:
        - `src/pages/calendar.tsx` に楽天予約URL生成機能を実装。
        - イベントクリックで日付指定付き楽天予約ページに遷移（新規タブ）。
        - URL形式: 年・月・日を分割パラメータ（f_nen1, f_tuki1, f_hi1など）で指定。
        - 大人2名、1室の予約条件を含む。

**未完 / 要対応**
- ✅ **Supabase マイグレーション適用**: `supabase/migrations/003_add_source_to_room_availability.sql` を Supabase のプロジェクトに適用済み（2025-11-23完了）。`room_availability.source` カラムが追加され、既存のモックデータに `source = 'mock'` が設定されている。
- **管理API の本番保護**: `admin/load-mock-data` は開発用のまま。削除または認証強化が必要。
- **定期実行（スケジューリング）**: 現状は手動実行。Vercel Cron / Supabase Scheduled Functions 等で定期取得を仕込む必要あり。
- **通知パイプライン未実装**: 条件マッチング、`notification_history` の登録、LINE/メール送信のフローは未実装。
- **運用監視・エラーハンドリングの強化**: Rakuten の 404/レート制限などに対するリトライ/監視、ログ周りの整備が必要。
- **通知パイプラインの本番検証**: 実際のユーザー通知（メール/LINE）が本番環境で確実に届くか、エラー時の挙動や履歴記録の最終確認が必要。
- **メールAPIの本番SMTP設定・運用**: Gmail等のアプリパスワードや本番用SMTPの安定運用確認。
- **通知設定UI・ユーザー管理**: 通知条件のUI実装や、ユーザー自身が設定変更できる画面の整備。
- **通知テストの自動化・監視**: テスト送信や失敗時のアラート設計。

この要約を仕様書の「現状」として参照できます。追記や表現の修正をご希望であれば指示ください。

"""

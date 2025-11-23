# `fetch-plans` API (Rakuten proxy) — 使用方法

エンドポイント: `POST /api/rakuten/fetch-plans`

要求ボディ (JSON):

- `params`: 楽天APIへ渡すクエリパラメータのオブジェクト（例: `hotelCode`, `checkinDate`）
- `fullUrl` (任意): デフォルトの `HotelPlanSearch` の代わりに完全な楽天API URLを指定
- `upsert` (任意): `true` を指定すると、取得したプラン情報を `room_availability` テーブルへベストエフォートで upsert します（`SUPABASE_SERVICE_ROLE_KEY` が必要）

- `RAKUTEN_AFFILIATE_ID` 環境変数: 楽天アフィリエイトの `affiliateId` を設定している場合、取得したホテル/プランの URL に自動で付与して `hotel._affiliate_url` として返します。


例: curl（ローカル開発）

```bash
curl -X POST 'http://localhost:3000/api/rakuten/fetch-plans' \
  -H 'Content-Type: application/json' \
  -d '{"params":{"hotelCode":"12345","checkinDate":"2025-11-24"},"upsert":true}'
```

注意点:
- 楽天APIのレスポンス構造はエンドポイント/バージョンにより様々です。本実装は一般的なパターンをカバーするベストエフォート実装です。
- 正確なマッピングを行うには、実際の楽天APIレスポンス（自分の `RAKUTEN_APP_ID` でのレスポンス）を取得し、`fetch-plans.ts` の `normalizePlanEntries` や `extractHotelsList` を調整してください。
- `upsert` を実行するには `SUPABASE_SERVICE_ROLE_KEY` を環境変数にセットし、`src/lib/supabase.ts` で `supabaseAdmin` が正しく初期化されている必要があります。

- `RAKUTEN_AFFILIATE_ID` を Vercel や本番環境にセットすると、API レスポンス中のホテルオブジェクトに `_affiliate_url` が追加されます。フロント側はそのURLを使って遷移・アフィリエイト計測が可能です。

次のステップ:
- 実際の楽天APIレスポンスで動作確認し、必要なら `room_availability` のスキーマに合わせてマッピングを調整します。
- ページングやレート制御、リトライ、監視ログを追加することを推奨します。

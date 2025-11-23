# マイグレーション適用ガイド

## 003_add_source_to_room_availability.sql の適用方法

### 方法1: SupabaseダッシュボードのSQL Editorで実行（推奨・簡単）

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 以下のSQLをコピーして貼り付け、実行：

```sql
-- Migration: add source column to room_availability
ALTER TABLE room_availability
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown';

-- Mark known mock rows as 'mock' to preserve current development data
UPDATE room_availability
SET source = 'mock'
WHERE room_type IN (
  'スーペリアルーム ハーバービュー',
  'バルコニールーム ハーバーグランドビュー',
  'ハーバールーム',
  'ポルト・パラディーゾ・サイド スーペリアルーム',
  'テラスルーム ハーバーグランドビュー'
) AND (source IS NULL OR source = 'unknown');
```

5. 「Run」ボタンをクリックして実行
6. 成功メッセージが表示されることを確認

### 方法2: Supabase CLIを使用する場合

#### 前提条件
- Supabase CLIがインストールされていること
- プロジェクトにリンクされていること

#### 手順

1. Supabaseにログイン：
```bash
supabase login
```

2. プロジェクトにリンク：
```bash
cd "/Users/taniguchikeisuke/web_prodact/vacancy search"
supabase link --project-ref your-project-ref
```

3. マイグレーションを適用：
```bash
supabase db push
```

または、特定のマイグレーションファイルを実行：
```bash
supabase migration up
```

## 適用後の確認

マイグレーションが正常に適用されたか確認するには、SQL Editorで以下を実行：

```sql
-- sourceカラムが追加されているか確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'room_availability'
AND column_name = 'source';

-- モックデータのsourceが正しく設定されているか確認
SELECT room_type, source, COUNT(*) as count
FROM room_availability
GROUP BY room_type, source
ORDER BY room_type;
```

## トラブルシューティング

### エラー: "column already exists"
- `source`カラムが既に存在する場合は、`ALTER TABLE`の部分はスキップされ、`UPDATE`のみが実行されます
- これは正常な動作です

### エラー: "relation room_availability does not exist"
- 先に`001_initial_schema.sql`が適用されていることを確認してください


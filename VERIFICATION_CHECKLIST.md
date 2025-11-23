# マイグレーション適用後の動作確認チェックリスト

## ✅ 確認完了項目

### 1. APIエンドポイントでの確認 ✅
- **エンドポイント**: `GET /api/availability?start=2025-11-24&end=2025-11-30`
- **結果**: 正常に動作し、各エントリに`source: "mock"`が含まれていることを確認
- **確認コマンド**:
  ```bash
  curl -s "http://localhost:3004/api/availability?start=2025-11-24&end=2025-11-26" | python3 -m json.tool
  ```

### 2. カレンダーページでの確認
- **URL**: http://localhost:3004/calendar
- **確認項目**:
  - [ ] カレンダーが正常に表示される
  - [ ] 空室情報が正しく表示される
  - [ ] モックデータのフィルタが機能する（「モックを表示」チェックボックス）
  - [ ] ツールチップで詳細情報が表示される

### 3. データベースでの確認
SupabaseダッシュボードのSQL Editorで以下を実行：

```sql
-- sourceカラムが正しく設定されているか確認
SELECT date, room_type, is_available, price, source
FROM room_availability
ORDER BY date, room_type
LIMIT 20;

-- source別の集計確認
SELECT source, COUNT(*) as count
FROM room_availability
GROUP BY source;
```

## 確認結果

### APIエンドポイント
- ✅ `source`カラムが正しく取得できている
- ✅ モックデータに`source: "mock"`が設定されている
- ✅ レスポンス形式が正しい

### 次のステップ
1. ブラウザでカレンダーページを開いて表示確認
2. データベースで直接確認（オプション）
3. 楽天APIから実データを取得して`source: "rakuten"`が設定されることを確認


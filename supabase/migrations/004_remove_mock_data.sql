-- Migration: Remove mock data from room_availability
-- モックデータを削除するマイグレーション

-- source='mock'のデータを削除
DELETE FROM room_availability
WHERE source = 'mock';

-- 削除結果を確認（オプション）
-- SELECT COUNT(*) as remaining_mock_data FROM room_availability WHERE source = 'mock';


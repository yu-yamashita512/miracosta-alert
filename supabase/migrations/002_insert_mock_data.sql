-- モックの空室データを追加
INSERT INTO room_availability (date, room_type, is_available, price, last_checked_at) VALUES
  -- 明日から10日間のデータ
  (CURRENT_DATE + INTERVAL '1 day', 'スーペリアルーム ハーバービュー', true, 65000, NOW()),
  (CURRENT_DATE + INTERVAL '1 day', 'バルコニールーム ハーバーグランドビュー', false, 95000, NOW()),
  (CURRENT_DATE + INTERVAL '1 day', 'ハーバールーム', true, 75000, NOW()),
  (CURRENT_DATE + INTERVAL '1 day', 'ポルト・パラディーゾ・サイド スーペリアルーム', false, 60000, NOW()),
  (CURRENT_DATE + INTERVAL '1 day', 'テラスルーム ハーバーグランドビュー', true, 120000, NOW()),
  
  (CURRENT_DATE + INTERVAL '2 days', 'スーペリアルーム ハーバービュー', false, 68000, NOW()),
  (CURRENT_DATE + INTERVAL '2 days', 'バルコニールーム ハーバーグランドビュー', true, 98000, NOW()),
  (CURRENT_DATE + INTERVAL '2 days', 'ハーバールーム', true, 78000, NOW()),
  (CURRENT_DATE + INTERVAL '2 days', 'ポルト・パラディーゾ・サイド スーペリアルーム', true, 62000, NOW()),
  (CURRENT_DATE + INTERVAL '2 days', 'テラスルーム ハーバーグランドビュー', false, 125000, NOW()),
  
  (CURRENT_DATE + INTERVAL '3 days', 'スーペリアルーム ハーバービュー', true, 66000, NOW()),
  (CURRENT_DATE + INTERVAL '3 days', 'バルコニールーム ハーバーグランドビュー', true, 96000, NOW()),
  (CURRENT_DATE + INTERVAL '3 days', 'ハーバールーム', false, 76000, NOW()),
  (CURRENT_DATE + INTERVAL '3 days', 'ポルト・パラディーゾ・サイド スーペリアルーム', true, 61000, NOW()),
  (CURRENT_DATE + INTERVAL '3 days', 'テラスルーム ハーバーグランドビュー', true, 122000, NOW()),
  
  (CURRENT_DATE + INTERVAL '4 days', 'スーペリアルーム ハーバービュー', true, 67000, NOW()),
  (CURRENT_DATE + INTERVAL '4 days', 'バルコニールーム ハーバーグランドビュー', false, 97000, NOW()),
  (CURRENT_DATE + INTERVAL '4 days', 'ハーバールーム', true, 77000, NOW()),
  (CURRENT_DATE + INTERVAL '4 days', 'ポルト・パラディーゾ・サイド スーペリアルーム', false, 63000, NOW()),
  (CURRENT_DATE + INTERVAL '4 days', 'テラスルーム ハーバーグランドビュー', true, 123000, NOW()),
  
  (CURRENT_DATE + INTERVAL '5 days', 'スーペリアルーム ハーバービュー', false, 69000, NOW()),
  (CURRENT_DATE + INTERVAL '5 days', 'バルコニールーム ハーバーグランドビュー', true, 99000, NOW()),
  (CURRENT_DATE + INTERVAL '5 days', 'ハーバールーム', true, 79000, NOW()),
  (CURRENT_DATE + INTERVAL '5 days', 'ポルト・パラディーゾ・サイド スーペリアルーム', true, 64000, NOW()),
  (CURRENT_DATE + INTERVAL '5 days', 'テラスルーム ハーバーグランドビュー', false, 126000, NOW());

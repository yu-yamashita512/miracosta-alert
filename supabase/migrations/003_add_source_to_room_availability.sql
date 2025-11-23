-- Migration: add source column to room_availability
-- Run this in Supabase SQL editor or with supabase CLI

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

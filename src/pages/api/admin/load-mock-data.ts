import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

// 管理用: モックの空室データを挿入する簡易エンドポイント
// - 保護: 必ずヘッダ `x-admin-secret` に `ADMIN_SECRET` を渡してください
// - 実行: POST で実行

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = req.headers['x-admin-secret'] || req.headers['x-admin-Secret']
  const ADMIN_SECRET = process.env.ADMIN_SECRET
  if (!ADMIN_SECRET || String(secret) !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // SQL のモックと同じデータを生成する
    const roomTypes = [
      'スーペリアルーム ハーバービュー',
      'バルコニールーム ハーバーグランドビュー',
      'ハーバールーム',
      'ポルト・パラディーゾ・サイド スーペリアルーム',
      'テラスルーム ハーバーグランドビュー',
    ]

    const pricesByDay = [
      [65000, 95000, 75000, 60000, 120000],
      [68000, 98000, 78000, 62000, 125000],
      [66000, 96000, 76000, 61000, 122000],
      [67000, 97000, 77000, 63000, 123000],
      [69000, 99000, 79000, 64000, 126000],
    ]

    const availabilityByDay = [
      [true, false, true, false, true],
      [false, true, true, true, false],
      [true, true, false, true, true],
      [true, false, true, false, true],
      [false, true, true, true, false],
    ]

    const entries: Array<any> = []
    const now = new Date()

    for (let day = 0; day < 5; day++) {
      const d = new Date(now)
      d.setDate(d.getDate() + (day + 1))
      const isoDate = d.toISOString().slice(0, 10)

      for (let i = 0; i < roomTypes.length; i++) {
        entries.push({
          date: isoDate,
          room_type: roomTypes[i],
          is_available: Boolean(availabilityByDay[day][i]),
          price: Number(pricesByDay[day][i]),
          last_checked_at: new Date().toISOString(),
          source: 'mock',
        })
      }
    }

    const { error } = await (supabaseAdmin as any).from('room_availability').upsert(entries as any, { onConflict: ['date', 'room_type'] })
    if (error) {
      console.error('mock-data upsert error', error)
      return res.status(500).json({ success: false, error })
    }

    return res.status(200).json({ success: true, inserted: entries.length })
  } catch (err) {
    console.error('load-mock-data error', err)
    return res.status(500).json({ error: String(err) })
  }
}

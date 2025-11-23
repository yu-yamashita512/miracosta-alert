import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/availability?start=YYYY-MM-DD&end=YYYY-MM-DD&room_type=
// Returns aggregated availability per date and room_type

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { start, end, room_type } = req.query
  if (!start || !end) return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' })

  try {
    const startDate = String(start)
    const endDate = String(end)

    let query = supabaseAdmin.from('room_availability')
      .select('date, room_type, is_available, price, source')
      .gte('date', startDate)
      .lte('date', endDate)

    if (room_type) {
      query = query.eq('room_type', String(room_type))
    }

    const { data, error } = await query

    if (error) {
      console.error('availability query error', error)
      return res.status(500).json({ error: 'DB query failed', details: error.message })
    }

    // Normalize to an object keyed by room_type with date entries
    const grouped: Record<string, Array<any>> = {}
    for (const row of data || []) {
      const rt = row.room_type || 'unknown'
      if (!grouped[rt]) grouped[rt] = []
      grouped[rt].push({ date: row.date, is_available: row.is_available, price: row.price, source: row.source })
    }

    return res.status(200).json({ success: true, start: startDate, end: endDate, data: grouped })
  } catch (err) {
    console.error('availability handler error', err)
    return res.status(500).json({ error: 'Internal error', details: String(err) })
  }
}

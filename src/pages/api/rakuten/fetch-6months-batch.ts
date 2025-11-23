import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/rakuten/fetch-6months-batch
// 6ヶ月分の空室データを楽天APIから取得してDBに保存（バッチ処理版）
// より効率的に、複数の日付を一度に処理

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return res.status(500).json({ error: 'RAKUTEN_APP_ID not configured' })

  try {
    const hotelNo = req.body?.hotelNo || '74733'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 今日以降の日付のみを対象
    const startDate = new Date(today)
    
    // 6ヶ月後の日付を計算
    const endDate = new Date(today)
    endDate.setMonth(endDate.getMonth() + 6)

    // 即座にレスポンスを返して、バックグラウンドで処理を続行
    res.status(202).json({
      success: true,
      message: '6ヶ月分のデータ取得を開始しました。バックグラウンドで処理を続行します。',
      dateRange: {
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      },
    })

    // バックグラウンドで処理を続行（レスポンス後も処理が続く）
    processDataInBackground(appId, hotelNo, startDate, endDate).catch((err) => {
      console.error('Background processing error:', err)
    })

    return
  } catch (err) {
    console.error('fetch-6months-batch error', err)
    return res.status(500).json({ error: 'Internal error', details: String(err) })
  }
}

async function processDataInBackground(
  appId: string,
  hotelNo: string,
  startDate: Date,
  endDate: Date
) {
  const results: Array<{ date: string; success: boolean; count: number; error?: string }> = []
  let totalEntries = 0
  const currentDate = new Date(startDate)
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 10

  // 2週間ごとにデータを取得（効率化）
  while (currentDate < endDate && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    const checkinDate = new Date(currentDate)
    const checkoutDate = new Date(checkinDate)
    checkoutDate.setDate(checkoutDate.getDate() + 1)

    const dateStr = checkinDate.toISOString().slice(0, 10)

    try {
      const endpoint = 'https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426'
      const url = new URL(endpoint)
      url.searchParams.set('applicationId', appId)
      url.searchParams.set('hotelNo', String(hotelNo))
      url.searchParams.set('checkinDate', dateStr)
      url.searchParams.set('checkoutDate', checkoutDate.toISOString().slice(0, 10))

      const response = await fetch(url.toString())

      if (response.status === 429) {
        console.log(`Rate limit hit at ${dateStr}, waiting 10 seconds...`)
        await new Promise((resolve) => setTimeout(resolve, 10000))
        consecutiveErrors++
        continue
      }

      if (!response.ok) {
        const text = await response.text()
        console.log(`Error for ${dateStr}: HTTP ${response.status}`)
        results.push({
          date: dateStr,
          success: false,
          count: 0,
          error: `HTTP ${response.status}: ${text.slice(0, 100)}`,
        })
        consecutiveErrors++
        currentDate.setDate(currentDate.getDate() + 14) // 2週間後
        await new Promise((resolve) => setTimeout(resolve, 2000))
        continue
      }

      consecutiveErrors = 0

      const data = await response.json()
      const hotels = Array.isArray(data.hotels) ? data.hotels : []
      const entries: Array<any> = []

      for (const h of hotels) {
        const hotelArray = h.hotel || h || []
        const basic = hotelArray.find((x: any) => x.hotelBasicInfo)?.hotelBasicInfo || {}
        const roomInfoObj = hotelArray.find((x: any) => x.roomInfo)
        const roomInfo = roomInfoObj?.roomInfo || []

        for (let i = 0; i < roomInfo.length; i++) {
          const r = roomInfo[i]
          const roomBasic = r.roomBasicInfo || r.roomBasic || null
          let daily = r.dailyCharge || r.daily || null
          if (!daily && roomInfo[i + 1]) {
            daily = roomInfo[i + 1].dailyCharge || roomInfo[i + 1].daily || null
          }

          if (roomBasic) {
            const rawPrice = daily && (daily.rakutenCharge || daily.total || null)
            const hotelName = basic.hotelName || basic.hotel_name || ''
            const roomType = `${hotelName ? hotelName + ' - ' : ''}${roomBasic.roomName || roomBasic.planName || 'プラン'}`

            entries.push({
              date: dateStr,
              room_type: roomType,
              is_available: true,
              price: rawPrice != null ? Number(rawPrice) : null,
              last_checked_at: new Date().toISOString(),
              source: 'rakuten',
            })
          }
        }
      }

      if (entries.length > 0) {
        const { error } = await (supabaseAdmin as any)
          .from('room_availability')
          .upsert(entries as any, { onConflict: ['date', 'room_type'] })

        if (error) {
          console.error(`Error upserting data for ${dateStr}:`, error)
          results.push({
            date: dateStr,
            success: false,
            count: 0,
            error: error.message,
          })
        } else {
          totalEntries += entries.length
          results.push({
            date: dateStr,
            success: true,
            count: entries.length,
          })
          console.log(`Successfully saved ${entries.length} entries for ${dateStr}`)
        }
      } else {
        results.push({
          date: dateStr,
          success: true,
          count: 0,
        })
      }

      // レート制限を考慮して待機（2秒）
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (err: any) {
      console.error(`Error fetching data for ${dateStr}:`, err)
      results.push({
        date: dateStr,
        success: false,
        count: 0,
        error: err.message || String(err),
      })
      consecutiveErrors++
    }

    // 次の日付に進む（2週間後）
    currentDate.setDate(currentDate.getDate() + 14)
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  console.log(`Batch processing completed: ${successCount} success, ${failCount} failed, ${totalEntries} total entries`)
  
  return {
    success: true,
    summary: {
      totalDates: results.length,
      successCount,
      failCount,
      totalEntries,
    },
  }
}


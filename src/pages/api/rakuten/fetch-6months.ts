import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/rakuten/fetch-6months
// 今日から6ヶ月分の空室データを楽天APIから取得してDBに保存

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return res.status(500).json({ error: 'RAKUTEN_APP_ID not configured' })

  try {
    const hotelNo = req.body?.hotelNo || '74733' // ミラコスタのホテル番号
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 今日以降の日付のみを対象（過去の日付は取得できない）
    const startDate = new Date(today)
    
    // 6ヶ月後の日付を計算
    const endDate = new Date(today)
    endDate.setMonth(endDate.getMonth() + 6)

    const results: Array<{ date: string; success: boolean; count: number; error?: string }> = []
    let totalEntries = 0

    let consecutiveErrors = 0
    const MAX_CONSECUTIVE_ERRORS = 10
    
    // より多くの日付を取得するため、各週の代表的な日付を取得
    // 今日以降の日付のみを対象
    const targetDates: Date[] = []
    const currentDate = new Date(startDate)
    
    // 6ヶ月分、各週の代表的な日付（月曜日、水曜日、金曜日）を取得
    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay() // 0=日曜日, 1=月曜日, ...
      
      // 月曜日、水曜日、金曜日を取得
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        targetDates.push(new Date(currentDate))
      }
      
      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // 重複を除去してソート、今日以降のみ
    const uniqueDates = Array.from(
      new Set(targetDates.map((d) => d.toISOString().slice(0, 10)))
    )
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime())
      .filter((d) => d >= startDate && d < endDate)
    
    for (const checkinDate of uniqueDates) {
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) break
      
      const checkoutDate = new Date(checkinDate)
      checkoutDate.setDate(checkoutDate.getDate() + 1)
      const dateStr = checkinDate.toISOString().slice(0, 10)
      
      try {
        // 楽天APIを呼び出し
        const endpoint = 'https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426'
        const url = new URL(endpoint)
        url.searchParams.set('applicationId', appId)
        url.searchParams.set('hotelNo', String(hotelNo))
        url.searchParams.set('checkinDate', dateStr)
        url.searchParams.set('checkoutDate', checkoutDate.toISOString().slice(0, 10))
        url.searchParams.set('stayCount', '1') // 1泊を指定
        url.searchParams.set('adultNum', '2') // 大人2名を指定（デフォルト）

        const response = await fetch(url.toString())
        
        if (response.status === 429) {
          // レート制限エラーの場合、長めに待機
          console.log(`Rate limit hit at ${dateStr}, waiting 5 seconds...`)
          await new Promise((resolve) => setTimeout(resolve, 5000))
          consecutiveErrors++
          continue
        }
        
        if (response.status === 404) {
          // 404エラー（データなし）は正常なケースとして扱う（空室がない日）
          results.push({
            date: dateStr,
            success: true,
            count: 0,
          })
          consecutiveErrors = 0 // 404は連続エラーとしてカウントしない
          continue
        }
        
        if (!response.ok) {
          const text = await response.text()
          results.push({
            date: dateStr,
            success: false,
            count: 0,
            error: `HTTP ${response.status}: ${text.slice(0, 100)}`,
          })
          consecutiveErrors++
          continue
        }
        
        consecutiveErrors = 0 // 成功したらリセット

        const data = await response.json()

        // データを正規化してDBに保存
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

        // DBに保存
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

            // ===== 通知トリガーロジックここから =====
            // 今回upsertした該当の日付・部屋タイプのみ抽出
            const inDates = entries.map(e => e.date)
            const inRoomTypes = entries.map(e => e.room_type)
            const { data: candidates } = await (supabaseAdmin as any)
              .from('room_availability')
              .select('*')
              .in('date', inDates)
              .in('room_type', inRoomTypes)
              .eq('is_available', true)
            if (candidates && candidates.length > 0) {
              for (const room of candidates) {
                console.log('[通知トリガー候補] ', room.date, room.room_type, 'price:', room.price)
                // 次ステップで: await triggerNotifications(room)
              }
            }
            // ===== 通知トリガーロジックここまで =====
          }
        } else {
          results.push({
            date: dateStr,
            success: true,
            count: 0,
          })
        }

        // レート制限を考慮して待機（1リクエストあたり2秒）
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
    }
    
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      return res.status(200).json({
        success: false,
        message: `連続エラーが${MAX_CONSECUTIVE_ERRORS}回発生したため、処理を中断しました`,
        summary: {
          totalDates: results.length,
          successCount: results.filter((r) => r.success).length,
          failCount: results.filter((r) => !r.success).length,
          totalEntries,
          dateRange: {
            start: startDate.toISOString().slice(0, 10),
            end: endDate.toISOString().slice(0, 10),
          },
        },
        results: results.slice(-10), // 最後の10件を返す
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return res.status(200).json({
      success: true,
      message: `6ヶ月分のデータ取得を完了しました`,
      summary: {
        totalDates: results.length,
        successCount,
        failCount,
        totalEntries,
        dateRange: {
          start: today.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
        },
      },
      results: results.slice(0, 10), // 最初の10件のみ返す（デバッグ用）
    })
  } catch (err) {
    console.error('fetch-6months error', err)
    return res.status(500).json({ error: 'Internal error', details: String(err) })
  }
}


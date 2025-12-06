import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RoomAvailability {
  date: string
  room_type: string
  is_available: boolean
  price: number | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // クエリパラメータから取得開始日と日数を取得
    const url = new URL(req.url)
    const startOffset = parseInt(url.searchParams.get('startOffset') ?? '0', 10)
    const days = Math.min(parseInt(url.searchParams.get('days') ?? '30', 10), 30) // 最大30日

    console.log(`空室監視を開始します... startOffset=${startOffset}, days=${days}`)

    // todayをJST（日本時間）0時00分に揃える
    const now = new Date()
    const jstOffset = 9 * 60 // JSTはUTC+9時間
    const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    const today = new Date(utc + jstOffset * 60 * 1000)
    // 空室情報を取得
    const availabilityData = await fetchRoomAvailability(startOffset, days)

    // 取得した日付・部屋タイプのセットを作成
    const foundSet = new Set(availabilityData.map(r => `${r.date}__${r.room_type}`))
    // 取得期間の全日付を生成
    const targetDates: string[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime())
      d.setDate(d.getDate() + startOffset + i)
      targetDates.push(d.toISOString().split('T')[0])
    }
    // DB上の該当期間・部屋タイプの既存データを取得
    const { data: existingRooms } = await supabase
      .from('room_availability')
      .select('*')
      .in('date', targetDates)
    // 取得できたものは従来通りinsert/update、取得できなかったものはis_available: falseでupdate
    for (const room of availabilityData) {
      const existingRoom = existingRooms?.find(r => r.date === room.date && r.room_type === room.room_type)
      if (!existingRoom) {
        const { data: newRoom, error } = await supabase
          .from('room_availability')
          .insert({
            date: room.date,
            room_type: room.room_type,
            is_available: room.is_available,
            price: room.price,
            last_checked_at: new Date().toISOString(),
            source: 'rakuten',
          })
          .select()
          .single()
        if (error) {
          console.error('データ挿入エラー:', error)
          continue
        }
        if (room.is_available && newRoom) {
          await triggerNotifications(supabase, newRoom.id, room)
        }
      } else if (existingRoom.is_available !== room.is_available) {
        const { data: updatedRoom, error } = await supabase
          .from('room_availability')
          .update({
            is_available: room.is_available,
            price: room.price,
            last_checked_at: new Date().toISOString(),
            source: 'rakuten',
          })
          .eq('id', existingRoom.id)
          .select()
          .single()
        if (error) {
          console.error('データ更新エラー:', error)
          continue
        }
        if (room.is_available && !existingRoom.is_available && updatedRoom) {
          await triggerNotifications(supabase, updatedRoom.id, room)
        }
      } else {
        await supabase
          .from('room_availability')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', existingRoom.id)
      }
    }
    // 取得できなかったものはis_available: falseでupdate
    if (existingRooms && existingRooms.length > 0) {
      for (const r of existingRooms) {
        if (!foundSet.has(`${r.date}__${r.room_type}`) && r.is_available) {
          await supabase
            .from('room_availability')
            .update({
              is_available: false,
              last_checked_at: new Date().toISOString(),
              source: 'rakuten',
            })
            .eq('id', r.id)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: '空室監視完了' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('エラー:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * ミラコスタの空室情報を取得する関数
 * 実際の実装では、公式サイトのAPIまたはスクレイピングを使用
 */
async function fetchRoomAvailability(startOffset = 0, days = 30): Promise<RoomAvailability[]> {
  // 楽天APIからミラコスタの空室情報を取得
  const appId = Deno.env.get('RAKUTEN_APP_ID')
  if (!appId) throw new Error('RAKUTEN_APP_ID not set')

  // ミラコスタの楽天ホテルNo（例: 74733）
  const hotelNo = '74733'
  // todayをJST（日本時間）0時00分に揃える
  const now = new Date()
  const jstOffset = 9 * 60 // JSTはUTC+9時間
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const today = new Date(utc + jstOffset * 60 * 1000)
  const results: RoomAvailability[] = []

  // 最大取得可能日数（楽天API仕様：180日先まで）
  const maxDays = 180
  const stayCount = 1 // 固定値

  // 指定された開始日からdays日分取得
  for (let i = 0; i < days; i++) {
    // checkin, checkoutもJST 0時で揃える
    const checkin = new Date(today.getTime())
    checkin.setDate(checkin.getDate() + startOffset + i)
    const checkinDate = checkin.toISOString().split('T')[0]

    const checkout = new Date(checkin.getTime())
    checkout.setDate(checkout.getDate() + stayCount - 1)

    // todayからcheckinまでの日数
    const diffCheckin = Math.floor((checkin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    // todayからcheckoutまでの日数
    const diffDays = Math.floor((checkout.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    // デバッグ用詳細ログ
    console.log('[DEBUG] today:', today.toISOString().split('T')[0], 'checkin:', checkin.toISOString().split('T')[0], 'checkout:', checkout.toISOString().split('T')[0], 'diffCheckin:', diffCheckin, 'diffDays:', diffDays, 'startOffset:', startOffset, 'i:', i)
    // checkinDateがtoday+179日以内のみリクエスト（180日目はスキップ）
    if (diffCheckin < 0 || diffCheckin >= maxDays - 1) {
      console.log(`skip: checkin=${checkinDate}, checkout=${checkout.toISOString().split('T')[0]}, diffCheckin=${diffCheckin}（楽天API仕様外のcheckinDate）`)
      continue;
    }
    if (diffDays < 0 || diffDays >= maxDays) {
      console.log(`skip: checkin=${checkinDate}, checkout=${checkout.toISOString().split('T')[0]}, diffDays=${diffDays}（楽天API仕様外のcheckoutDate）`)
      continue;
    }

    console.log(`request: ${checkinDate}`)

    // checkoutDateを明示的に指定
    const checkoutDate = new Date(checkin.getTime())
    checkoutDate.setDate(checkoutDate.getDate() + stayCount)
    const params = new URLSearchParams({
      applicationId: appId,
      hotelNo,
      checkinDate,
      checkoutDate: checkoutDate.toISOString().split('T')[0],
      format: 'json',
    })
    const endpoint = `https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426?${params.toString()}`
    // リクエストURLを出力
    console.log(`Rakuten API request URL: ${endpoint}`)

    const resp = await fetch(endpoint)
    const text = await resp.text()
    if (!resp.ok) {
      console.error('Rakuten API error', resp.status, checkinDate)
      console.error('Rakuten API response body:', text)
      // 429エラーの場合は5秒待機（レートリミット対策）
      if (resp.status === 429) {
        console.log(`Rate limit hit at ${checkinDate}, waiting 5 seconds...`)
        await new Promise(res => setTimeout(res, 5000))
      }
      // エラー時は次へ（is_available: falseで更新しない）
      continue
    }
    // レスポンスボディも出力
    console.log('Rakuten API response body:', text)
    const data = JSON.parse(text)
    // データ正規化
    const hotels = Array.isArray(data.hotels) ? data.hotels : []
    for (const h of hotels) {
      const hotelArray = h.hotel || h[0] || h
      const basic = Array.isArray(hotelArray)
        ? hotelArray.find((x: any) => x.hotelBasicInfo)?.hotelBasicInfo || {}
        : hotelArray.hotelBasicInfo || {}
      const roomInfoObj = Array.isArray(hotelArray)
        ? hotelArray.find((x: any) => x.roomInfo)
        : hotelArray.roomInfo ? { roomInfo: hotelArray.roomInfo } : null
      const roomInfo = roomInfoObj?.roomInfo || []
      for (let j = 0; j < roomInfo.length; j++) {
        const r = roomInfo[j]
        const roomBasic = r.roomBasicInfo || r.roomBasic || null
        let daily = r.dailyCharge || r.daily || null
        if (!daily && roomInfo[j + 1]) {
          daily = roomInfo[j + 1].dailyCharge || roomInfo[j + 1].daily || null
        }
        if (roomBasic) {
          const rawPrice = daily && (daily.rakutenCharge || daily.total || null)
          const stayDate = daily?.stayDate || checkinDate
          // チェックアウト日（宿泊最終日の翌日）はカレンダー反映から除外
          if (stayDate === checkoutDate.toISOString().split('T')[0]) {
            continue
          }
          results.push({
            date: stayDate,
            room_type: `${basic.hotelName ? basic.hotelName + ' - ' : ''}${roomBasic.roomName || roomBasic.planName || 'プラン'}`,
            is_available: true,
            price: rawPrice != null ? Number(rawPrice) : null,
          })
        }
      }
    }
    // 各リクエストごとに2秒待つ（レートリミット対策）
    await new Promise(res => setTimeout(res, 2000))
  }
  return results
}

/**
 * 条件に合致するユーザーに通知を送信
 */
async function triggerNotifications(
  supabase: any,
  roomAvailabilityId: string,
  room: RoomAvailability
) {
  console.log(`通知トリガー: ${room.date} - ${room.room_type}`)

  // 通知条件に合致するユーザーを取得
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*, users(*)')
    .eq('is_active', true)

  if (!settings || settings.length === 0) {
    console.log('通知対象のユーザーがいません')
    return
  }

  for (const setting of settings) {
    // 日付条件チェック
    const dateMatch =
      setting.target_dates.length === 0 || setting.target_dates.includes(room.date)

    // 部屋タイプ条件チェック
    const roomTypeMatch =
      setting.target_room_types.length === 0 ||
      setting.target_room_types.includes(room.room_type)

    if (dateMatch && roomTypeMatch) {
      // 通知を送信
      if (setting.notification_via_email) {
        await sendEmailNotification(supabase, setting.user_id, roomAvailabilityId, room)
      }

      if (setting.notification_via_line && setting.users.line_notify_token) {
        await sendLineNotification(
          supabase,
          setting.user_id,
          roomAvailabilityId,
          room,
          setting.users.line_notify_token
        )
      }
    }
  }
}

/**
 * メール通知を送信（Resend API使用）
 */
async function sendEmailNotification(
  supabase: any,
  userId: string,
  roomAvailabilityId: string,
  room: RoomAvailability
) {
  try {
    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.log('RESEND_API_KEY未設定 - メール送信をスキップ')
      return
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'

    // Resend APIでメール送信
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `ミラコスタ空室通知 <${fromEmail}>`,
        to: [user.email],
        subject: `【ミラコスタ】空室通知 - ${room.date}`,
        html: `
          <h1>🏰 ミラコスタ空室通知</h1>
          <p>ご登録いただいた条件に合致する空室が見つかりました！</p>
          <ul>
            <li>📅 宿泊日: ${room.date}</li>
            <li>🛏️ 部屋タイプ: ${room.room_type}</li>
            <li>💰 料金: ${room.price ? `¥${room.price.toLocaleString()}` : '公式サイトでご確認ください'}</li>
          </ul>
          <p>⚠️ 人気の日程・部屋タイプはすぐに埋まってしまう可能性があります。お早めにご予約をおすすめします。</p>
        `,
      }),
    })

    const status = response.ok ? 'success' : 'failed'
    const errorMessage = response.ok ? null : await response.text()

    // 通知履歴を記録
    await supabase.from('notification_history').insert({
      user_id: userId,
      room_availability_id: roomAvailabilityId,
      notification_type: 'email',
      status,
      error_message: errorMessage,
    })

    console.log(`メール通知: ${status} - ${user.email}`)
  } catch (error) {
    console.error('メール通知エラー:', error)
    await supabase.from('notification_history').insert({
      user_id: userId,
      room_availability_id: roomAvailabilityId,
      notification_type: 'email',
      status: 'failed',
      error_message: error.message,
    })
  }
}

/**
 * LINE Notify通知を送信
 */
async function sendLineNotification(
  supabase: any,
  userId: string,
  roomAvailabilityId: string,
  room: RoomAvailability,
  lineNotifyToken: string
) {
  try {
    const message = `
🏰 ミラコスタ空室通知

日付: ${room.date}
部屋タイプ: ${room.room_type}
料金: ${room.price ? `¥${room.price.toLocaleString()}` : '不明'}

空室が出ました！お早めにご予約ください。
    `.trim()

    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lineNotifyToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`,
    })

    const status = response.ok ? 'success' : 'failed'
    const errorMessage = response.ok ? null : await response.text()

    // 通知履歴を記録
    await supabase.from('notification_history').insert({
      user_id: userId,
      room_availability_id: roomAvailabilityId,
      notification_type: 'line',
      status,
      error_message: errorMessage,
    })

    console.log(`LINE通知: ${status}`)
  } catch (error) {
    console.error('LINE通知エラー:', error)
    await supabase.from('notification_history').insert({
      user_id: userId,
      room_availability_id: roomAvailabilityId,
      notification_type: 'line',
      status: 'failed',
      error_message: error.message,
    })
  }
}

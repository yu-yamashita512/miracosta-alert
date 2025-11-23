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

    console.log('空室監視を開始します...')

    // ミラコスタ公式サイトから空室情報を取得
    // 注意: 実際にはミラコスタの予約システムAPIまたはスクレイピングが必要
    // ここではモックデータを使用
    const availabilityData = await fetchRoomAvailability()

    // 既存のデータと比較して変更があった場合のみ更新・通知
    for (const room of availabilityData) {
      const { data: existingRoom } = await supabase
        .from('room_availability')
        .select('*')
        .eq('date', room.date)
        .eq('room_type', room.room_type)
        .single()

      if (!existingRoom) {
        // 新規データを挿入
        const { data: newRoom, error } = await supabase
          .from('room_availability')
          .insert({
            date: room.date,
            room_type: room.room_type,
            is_available: room.is_available,
            price: room.price,
            last_checked_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.error('データ挿入エラー:', error)
          continue
        }

        // 空室が出た場合、通知を送信
        if (room.is_available && newRoom) {
          await triggerNotifications(supabase, newRoom.id, room)
        }
      } else if (existingRoom.is_available !== room.is_available) {
        // 空室状態が変わった場合、更新
        const { data: updatedRoom, error } = await supabase
          .from('room_availability')
          .update({
            is_available: room.is_available,
            price: room.price,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', existingRoom.id)
          .select()
          .single()

        if (error) {
          console.error('データ更新エラー:', error)
          continue
        }

        // 空室が新たに出た場合、通知を送信
        if (room.is_available && !existingRoom.is_available && updatedRoom) {
          await triggerNotifications(supabase, updatedRoom.id, room)
        }
      } else {
        // 変更がない場合、last_checked_atのみ更新
        await supabase
          .from('room_availability')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', existingRoom.id)
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
async function fetchRoomAvailability(): Promise<RoomAvailability[]> {
  // 楽天APIからミラコスタの空室情報を取得
  const appId = Deno.env.get('RAKUTEN_APP_ID')
  if (!appId) throw new Error('RAKUTEN_APP_ID not set')

  // ミラコスタの楽天ホテルNo（例: 74733）
  const hotelNo = '74733'
  const today = new Date()
  const results: RoomAvailability[] = []

  // 直近7日分だけ取得（API制限・負荷配慮）
  for (let i = 0; i < 7; i++) {
    const checkin = new Date(today)
    checkin.setDate(checkin.getDate() + i)
    const checkinDate = checkin.toISOString().split('T')[0]
    const params = new URLSearchParams({
      applicationId: appId,
      hotelNo,
      checkinDate,
      stayCount: '1',
    })
    const endpoint = `https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426?${params.toString()}`
    const resp = await fetch(endpoint)
    if (!resp.ok) {
      console.error('Rakuten API error', resp.status)
      continue
    }
    const data = await resp.json()
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
          results.push({
            date: daily?.stayDate || checkinDate,
            room_type: `${basic.hotelName ? basic.hotelName + ' - ' : ''}${roomBasic.roomName || roomBasic.planName || 'プラン'}`,
            is_available: true,
            price: rawPrice != null ? Number(rawPrice) : null,
          })
        }
      }
    }
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
 * メール通知を送信
 */
async function sendEmailNotification(
  supabase: any,
  userId: string,
  roomAvailabilityId: string,
  room: RoomAvailability
) {
  try {
    // Next.js APIルートにメール送信をリクエスト
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
    const response = await fetch(`${appUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        room,
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

    console.log(`メール通知: ${status}`)
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

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { attachAffiliateUrlsToResponse } from '@/lib/rakuten'

// 楽天APIのレスポンスはエンドポイントやバージョンによって構造が異なります。
// このハンドラは複数の一般的なレスポンス形状に対応する堅牢なパーサを提供します。
// - POST body: { params: { ... }, fullUrl?: string, upsert?: boolean }
// - `params` は楽天APIに渡すクエリ文字列パラメータ（例: hotelCode, checkinDate, stayCount）

function extractHotelsList(data: any): any[] {
  if (!data) return []
  // 代表的なプロパティ名を列挙して探索
  if (Array.isArray(data.hotels)) return data.hotels
  if (Array.isArray(data.hotelsList)) return data.hotelsList
  if (Array.isArray(data.items)) return data.items
  // fallback: sometimes root is an array
  if (Array.isArray(data)) return data
  return []
}
function normalizePlanEntries(hotelEntry: any): Array<{ planName: string; price: number | null }> {
  const out: Array<{ planName: string; price: number | null }> = []

  // hotelEntry の形は多様
  // パターンA: { hotel: { hotelBasicInfo: {...} }, hotelPlans: [...] }
  // パターンB: [ {hotelBasicInfo}, {planList} ]
  // パターンC: { plans: [...] }

  const candidatePlans =
    hotelEntry.hotelPlans ||
    hotelEntry.plans ||
    hotelEntry.hotel?.hotelPlans ||
    hotelEntry[1]?.hotelPlans ||
    hotelEntry[1]?.plans ||
    hotelEntry[0]?.plans ||
    []

  if (Array.isArray(candidatePlans) && candidatePlans.length > 0) {
    for (const p of candidatePlans) {
      const planName = p.planName || p.plan_name || p.name || p.title || (p.plan && p.plan.name) || JSON.stringify(p).slice(0, 60)
      // 価格情報も様々な場所にある
      let price: number | null = null
      if (p.price != null) price = Number(p.price)
      else if (p.charge != null) price = Number(p.charge)
      else if (p.roomPrice != null) price = Number(p.roomPrice)
      else if (p.priceList && Array.isArray(p.priceList) && p.priceList[0]) price = Number(p.priceList[0].price || p.priceList[0].amount || null)

      out.push({ planName: String(planName || 'プラン'), price: isNaN(price as number) ? null : price })
    }
  }

  return out
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return res.status(500).json({ error: 'RAKUTEN_APP_ID not configured' })


// VacantHotelSearch の結果からプラン情報を抽出するユーティリティ
function normalizeVacantHotel(hotelWrapper: any) {
  // hotelWrapper は { hotel: [ ... ] } の形式が多い
  const out: Array<any> = [];
  const hotelArray = hotelWrapper.hotel || hotelWrapper || [];
  // ホテル基本情報は hotelArray の中の hotelBasicInfo にある
  const basic = hotelArray.find((x: any) => x.hotelBasicInfo)?.hotelBasicInfo || {};
  // roomInfo 要素を探す
  const roomInfoObj = hotelArray.find((x: any) => x.roomInfo);
  const roomInfo = roomInfoObj?.roomInfo || [];

  // roomInfo 配列は要素が分割されている場合がある（roomBasicInfo と dailyCharge が別要素）
  for (let i = 0; i < roomInfo.length; i++) {
    const r = roomInfo[i];
    const roomBasic = r.roomBasicInfo || r.roomBasic || null;
    // dailyCharge が同じ要素になければ次の要素を参照する
    let daily = r.dailyCharge || r.daily || null;
    if (!daily && roomInfo[i + 1]) {
      daily = roomInfo[i + 1].dailyCharge || roomInfo[i + 1].daily || null;
    }

    if (roomBasic) {
      const rawPrice = daily && (daily.rakutenCharge || daily.total || null);
      out.push({
        room_name: roomBasic.roomName || null,
        room_class: roomBasic.roomClass || null,
        planId: roomBasic.planId || null,
        planName: roomBasic.planName || null,
        reserveUrl: roomBasic.reserveUrl || null,
        stayDate: daily?.stayDate || null,
        price: rawPrice != null ? Number(rawPrice) : null,
      });
    }
  }

  return { hotelName: basic.hotelName || basic.hotel_name || null, entries: out };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return res.status(500).json({ error: 'RAKUTEN_APP_ID not configured' })

  try {
    const body = req.body || {}
    const params = body.params || {}
    const upsert = !!body.upsert
    // VacantHotelSearch をデフォルトにする（より確実に空室情報が取得できるため）
    const endpoint = body.fullUrl || 'https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426'

    const url = new URL(endpoint)
    url.searchParams.set('applicationId', appId)
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      url.searchParams.set(k, String(v))
    })

    const r = await fetch(url.toString())
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: 'Rakuten API error', status: r.status, body: text })
    }

    const data = await r.json()

    // 楽天アフィリエイトID を付与（存在する場合）
    const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || null
    const dataWithAffiliate = affiliateId ? attachAffiliateUrlsToResponse(data, affiliateId) : data

    if (upsert && params.checkinDate) {
      const checkinDate = params.checkinDate as string
      const hotels = extractHotelsList(data)
      const entries: Array<any> = []

      for (const h of hotels) {
        // VacantHotelSearch のホテルラッパーを正規化して抽出
        const normalized = normalizeVacantHotel(h)
        const hotelName = normalized.hotelName

        for (const e of normalized.entries) {
          // 日付が無ければ checkinDate を使う
          const date = e.stayDate || checkinDate
          const roomType = `${hotelName ? hotelName + ' - ' : ''}${e.room_name || e.planName || 'プラン'}`

          entries.push({
            date,
            room_type: roomType,
            is_available: true,
            // 明示的に数値化して保存（文字列や undefined を防ぐ）
            price: e.price != null ? Number(e.price) : null,
            last_checked_at: new Date().toISOString(),
            source: 'rakuten',
          })
        }
      }

      if (entries.length > 0) {
        const { error } = await (supabaseAdmin as any)
          .from('room_availability')
          .upsert(entries as any, { onConflict: ['date', 'room_type'] })

        if (error) console.error('Rakuten upsert error', error)
      }
    }

    return res.status(200).json({ success: true, data: dataWithAffiliate })
  } catch (err) {
    console.error('fetch-plans error', err)
    return res.status(500).json({ error: 'Internal error', details: String(err) })
  }
}

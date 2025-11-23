export function appendAffiliateToUrl(url: string | undefined | null, affiliateId?: string | null) {
  if (!url) return null
  if (!affiliateId) return url

  try {
    const u = new URL(url)
    // 一般的に affiliateId という名前で渡すプロバイダもあれば、param名が異なる場合もある。
    // 楽天側はエンドポイントによってパラメータ名が異なる可能性があるため、まずは `affiliateId` を付与する形にする。
    // すでに同名のパラメータがあれば上書きしない。
    if (!u.searchParams.get('affiliateId')) u.searchParams.set('affiliateId', affiliateId)
    return u.toString()
  } catch (err) {
    // URL パースできない場合は単純に末尾にクエリを追加
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}affiliateId=${encodeURIComponent(String(affiliateId))}`
  }
}

export function attachAffiliateUrlsToResponse(data: any, affiliateId?: string | null) {
  if (!affiliateId) return data

  const hotels = Array.isArray(data.hotels) ? data.hotels : Array.isArray(data) ? data : []

  for (const h of hotels) {
    const hotelObj = h.hotel || h[0] || h

    const info = hotelObj.hotelBasicInfo || hotelObj.hotelBasicInfo || hotelObj.hotelInfo || hotelObj
    const urlsToTry = [
      info.hotelInformationUrl,
      info.hotelUrl,
      hotelObj.hotelUrl,
      hotelObj.planUrl,
      hotelObj.linkUrl,
    ]

    for (const u of urlsToTry) {
      if (u) {
        const affiliateUrl = appendAffiliateToUrl(String(u), affiliateId)
        if (affiliateUrl) {
          // 便利のため新しいフィールドを追加
          hotelObj._affiliate_url = affiliateUrl
          break
        }
      }
    }
  }

  return data
}

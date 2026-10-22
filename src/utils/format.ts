/** 分（后端 price_cents）→ 元字符串，如 14422 → ¥144.22 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** 分 → 带千分位的元字符串 */
export function formatPriceGrouped(cents: number): string {
  const parts = (cents / 100).toFixed(2).split('.')
  const int = parts[0] ?? ''
  const dec = parts[1] ?? '00'
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${grouped}.${dec}`
}

/** ISO 时间 → 本地可读字符串 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 完整地址拼接 */
export function fullAddress(a: { province: string; city: string; district: string; detail: string }): string {
  return `${a.province}${a.city}${a.district}${a.detail}`
}

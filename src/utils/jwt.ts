export interface JwtPayload {
  user_id: number
  username: string
  role: string
  token_type: 'access' | 'refresh'
  exp: number
  iat: number
}

/** 解码 JWT 载荷（仅 base64url 解码，不做签名校验——签名校验由后端完成） */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadPart = parts[1]
    if (!payloadPart) return null
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/** 判断 access token 是否已过期（留 30s 余量） */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 - 30_000 < Date.now()
}

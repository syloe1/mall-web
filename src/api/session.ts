import axios from 'axios'
import type { AuthTokens } from '@/types'

/**
 * 认证会话相关的「裸」请求：不走业务 axios 实例，避免 401 拦截器递归。
 *
 * refresh token 只存在于 HttpOnly + SameSite=Lax Cookie 里，JS 读不到；
 * 页面刷新时前端调用 refresh-token 静默换新的 access token。
 */
export async function requestRefresh(): Promise<AuthTokens | null> {
  try {
    const resp = await axios.post<{ data?: AuthTokens }>('/api/v1/users/refresh-token', {}, { withCredentials: true })
    const tokens = resp.data.data
    return tokens?.access_token ? tokens : null
  } catch {
    return null
  }
}

export async function requestLogout(): Promise<void> {
  try {
    await axios.post('/api/v1/users/logout', {}, { withCredentials: true })
  } catch {
    // 登出失败也清本地状态，保证前端可退出
  }
}

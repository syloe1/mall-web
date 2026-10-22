import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/stores/user'
import type { ApiEnvelope, AuthTokens } from '@/types'
import { humanizeError } from '@/utils/copy'
import { requestRefresh } from './session'

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
  withCredentials: true,
})

// ---------- 请求拦截：注入内存中的 access token ----------
http.interceptors.request.use((config) => {
  const store = useUserStore()
  if (store.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`
  }
  return config
})

// ---------- 401 自动刷新（单飞模式：并发 401 只发一次 refresh） ----------
let refreshing: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  const store = useUserStore()
  const tokens: AuthTokens | null = await requestRefresh()
  if (!tokens?.access_token) return null
  store.setSession(tokens)
  return tokens.access_token
}

http.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiEnvelope>) => {
    const status = error.response?.status
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthRequest = Boolean(config?.url && /\/users\/(login|refresh-token|logout)$/.test(config.url))
    if (status === 401 && config && !config._retried && !isAuthRequest) {
      config._retried = true
      refreshing = refreshing ?? tryRefresh()
      const token = await refreshing
      refreshing = null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return http(config)
      }
      const store = useUserStore()
      store.clearSession()
      const router = (await import('@/router')).default
      const current = router.currentRoute.value
      if (current.name !== 'login') {
        router.push({ name: 'login', query: { redirect: current.fullPath } })
      }
    }
    return Promise.reject(error)
  },
)

// ---------- 统一请求封装：解包 {code,msg,data}，失败抛出中文 Error ----------
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const resp = await http.request<ApiEnvelope<T>>(config)
    const body = resp.data
    if (body.code !== 200) {
      throw new Error(body.msg || '请求失败')
    }
    return body.data as T
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ApiEnvelope | undefined
      if (body?.msg) {
        throw new Error(humanizeError(new Error(body.msg)))
      }
      if (err.response?.status === 429) {
        throw new Error('操作过于频繁，请稍后再试')
      }
      throw new Error(humanizeError(err))
    }
    throw err
  }
}

export const get = <T>(url: string, params?: object) =>
  request<T>({ url, method: 'GET', params })

export const post = <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data })

export const put = <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data })

export const del = <T>(url: string, data?: unknown) => request<T>({ url, method: 'DELETE', data })

export default http

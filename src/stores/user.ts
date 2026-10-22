import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchProfile, login as apiLogin, register as apiRegister } from '@/api/auth'
import { requestLogout, requestRefresh } from '@/api/session'
import { decodeJwtPayload } from '@/utils/jwt'
import type { AuthTokens, Role, UserProfile } from '@/types'

/**
 * 登录态 store（安全基线：token 不再落 localStorage）
 *
 * - access token：只存内存，XSS 也拿不到持久凭证
 * - refresh token：HttpOnly + SameSite=Lax Cookie，JS 完全不可读
 * - 页面刷新：restore() 用 Cookie 静默换新 access token + 拉取当前用户资料
 */
export const useUserStore = defineStore('user', () => {
  const accessToken = ref('')
  const role = ref<Role>('user')
  const profile = ref<UserProfile | null>(null)
  const ready = ref(false)

  const payload = computed(() => (accessToken.value ? decodeJwtPayload(accessToken.value) : null))
  const username = computed(() => profile.value?.nickname || profile.value?.username || payload.value?.username || '')
  const userId = computed(() => profile.value?.id ?? payload.value?.user_id ?? 0)
  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'superadmin')

  function setSession(tokens: AuthTokens) {
    accessToken.value = tokens.access_token
    role.value = (tokens.role as Role) || 'user'
  }

  function clearSession() {
    accessToken.value = ''
    role.value = 'user'
    profile.value = null
  }

  async function loadProfile() {
    try {
      profile.value = await fetchProfile()
      role.value = (profile.value.role as Role) || role.value
    } catch {
      // 资料接口失败不影响已登录状态
    }
  }

  /** 应用启动时调用：用 HttpOnly Cookie 恢复登录态（失败则保持游客） */
  async function restore() {
    try {
      const tokens = await requestRefresh()
      if (tokens) {
        setSession(tokens)
        await loadProfile()
      }
    } finally {
      ready.value = true
    }
  }

  async function login(usernameInput: string, password: string) {
    const tokens = await apiLogin(usernameInput, password)
    setSession(tokens)
    await loadProfile()
  }

  async function register(usernameInput: string, password: string) {
    await apiRegister(usernameInput, password)
  }

  async function logout() {
    clearSession()
    await requestLogout()
  }

  return {
    accessToken,
    role,
    profile,
    ready,
    payload,
    username,
    userId,
    isLoggedIn,
    isAdmin,
    setSession,
    clearSession,
    restore,
    loadProfile,
    login,
    register,
    logout,
  }
})

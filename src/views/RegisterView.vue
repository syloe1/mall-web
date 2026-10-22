<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { toastSuccess, toastError } from '@/stores/toast'
import { humanizeError } from '@/utils/copy'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)

/** 与服务端一致的前端预校验（服务端仍会再校验一次，服务端是唯一事实来源） */
function validatePassword(value: string): string | null {
  if (value.length < 8) return '密码至少 8 位'
  if (value.length > 72) return '密码不能超过 72 位'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return '密码需同时包含字母和数字'
  const weak = ['12345678', '123456789', 'password', 'password1', 'qwerty123', '11111111', '88888888', 'abc12345']
  if (weak.includes(value.toLowerCase())) return '密码太常见，请换一个更安全的密码'
  return null
}

async function submit() {
  const name = username.value.trim()
  if (!name) {
    toastError('请填写用户名')
    return
  }
  if (name.length < 3 || name.length > 32) {
    toastError('用户名长度需为 3-32 位')
    return
  }
  if (!password.value) {
    toastError('请填写密码')
    return
  }
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    toastError(passwordError)
    return
  }
  if (password.value !== confirm.value) {
    toastError('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await userStore.register(name, password.value)
    toastSuccess('注册成功，请登录')
    router.replace({ name: 'login' })
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container page">
    <div class="auth-wrap">
      <div class="auth-card">
        <p class="eyebrow">SIGN UP · 注册</p>
        <h1 class="auth-title">创建账号</h1>
        <p class="auth-sub">注册即可获得演示余额，体验收藏、购物车与下单。</p>

        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label for="register-username">用户名</label>
            <input
              id="register-username"
              v-model="username"
              class="input"
              type="text"
              placeholder="3-32 位，不含空格"
              autocomplete="username"
              minlength="3"
              maxlength="32"
              required
            />
          </div>
          <div class="field">
            <label for="register-password">密码</label>
            <input
              id="register-password"
              v-model="password"
              class="input"
              type="password"
              placeholder="至少 8 位，含字母和数字"
              autocomplete="new-password"
              minlength="8"
              required
            />
            <p class="hint">服务端强制策略：≥8 位 + 字母数字组合 + 拒绝常见弱口令。</p>
          </div>
          <div class="field">
            <label for="register-confirm">确认密码</label>
            <input
              id="register-confirm"
              v-model="confirm"
              class="input"
              type="password"
              placeholder="再次输入密码"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
            {{ loading ? '注册中…' : '注册' }}
          </button>
        </form>

        <p class="auth-switch">
          已有账号？
          <RouterLink to="/login" class="link">去登录</RouterLink>
          <span class="dot-sep">·</span>
          <RouterLink to="/about" class="link">项目说明</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 36px 34px;
  box-shadow: var(--shadow-sm);
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--accent);
  margin-bottom: 10px;
}

.auth-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.auth-sub {
  color: var(--ink-2);
  font-size: 14px;
  margin: 8px 0 24px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hint {
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.6;
}

.auth-switch {
  margin-top: 22px;
  font-size: 14px;
  color: var(--ink-2);
  text-align: center;
}

.dot-sep {
  margin: 0 6px;
  color: var(--ink-3);
}

.link {
  color: var(--accent);
  font-weight: 700;
}

.link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-wrap {
    padding: 20px 0;
  }

  .auth-card {
    padding: 24px 20px;
    border-radius: 18px;
  }
}
</style>

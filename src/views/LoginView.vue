<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { toastSuccess, toastError } from '@/stores/toast'
import { humanizeError, PROJECT } from '@/utils/copy'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const autoLoginRole = ref<'' | 'user' | 'admin'>('')

function redirectAfterLogin(defaultPath = '/') {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : defaultPath
  router.replace(redirect)
}

async function submit(target?: '/' | '/admin') {
  if (loading.value) return
  if (!username.value.trim() || !password.value) {
    toastError('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await userStore.login(username.value.trim(), password.value)
    toastSuccess('登录成功')
    await cartStore.refresh()
    redirectAfterLogin(target ?? '/')
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    loading.value = false
    autoLoginRole.value = ''
  }
}

/** 一键体验：填入演示账号并直接登录（面试官点一次即可进入） */
async function quickLogin(role: 'user' | 'admin') {
  autoLoginRole.value = role
  username.value = role === 'admin' ? PROJECT.adminUser : PROJECT.demoUser
  password.value = role === 'admin' ? PROJECT.adminPassword : PROJECT.demoPassword
  await submit(role === 'admin' ? '/admin' : '/')
}

function fillOnly(role: 'user' | 'admin') {
  username.value = role === 'admin' ? PROJECT.adminUser : PROJECT.demoUser
  password.value = role === 'admin' ? PROJECT.adminPassword : PROJECT.demoPassword
}

onMounted(() => {
  const demo = String(route.query.demo ?? '')
  if (demo === '1') fillOnly('user')
  if (demo === '2') fillOnly('admin')
})
</script>

<template>
  <div class="container page">
    <div class="auth-wrap">
      <div class="auth-main">
        <div class="auth-card">
          <p class="eyebrow">SIGN IN · 登录</p>
          <h1 class="auth-title">欢迎回来</h1>
          <p class="auth-sub">登录 Mall 演示账号，体验从浏览、加购、下单到支付的完整链路。</p>

          <form class="auth-form" @submit.prevent="submit()">
            <div class="field">
              <label for="login-username">用户名</label>
              <input
                id="login-username"
                v-model="username"
                class="input"
                type="text"
                placeholder="输入用户名"
                autocomplete="username"
                required
              />
            </div>
            <div class="field">
              <label for="login-password">密码</label>
              <input
                id="login-password"
                v-model="password"
                class="input"
                type="password"
                placeholder="输入密码"
                autocomplete="current-password"
                required
              />
            </div>
            <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
              {{ loading ? '登录中…' : '登录' }}
            </button>
          </form>

          <p class="auth-switch">
            还没有账号？
            <RouterLink to="/register" class="link">去注册</RouterLink>
            <span class="dot-sep">·</span>
            <RouterLink to="/about" class="link">了解这个项目</RouterLink>
          </p>
        </div>

        <aside class="demo-card" aria-labelledby="demo-title">
          <div class="demo-head">
            <span class="demo-badge" role="status">演示环境</span>
            <h2 id="demo-title" class="demo-title">一键体验（面试官入口）</h2>
          </div>
          <p class="demo-desc">
            无需注册。普通账号可完整体验购物链路；管理员账号可进入后台查看<strong>商品管理 / 死信队列 / 重建搜索索引</strong>。
          </p>

          <div class="demo-rows">
            <div class="demo-row">
              <div class="demo-account">
                <b>{{ PROJECT.demoUser }}</b>
                <span class="pw">{{ PROJECT.demoPassword }}</span>
                <span class="role-tag">普通用户</span>
              </div>
              <button class="btn btn-soft btn-sm" :disabled="loading" @click="quickLogin('user')">一键登录</button>
            </div>
            <div class="demo-row">
              <div class="demo-account">
                <b>{{ PROJECT.adminUser }}</b>
                <span class="pw">{{ PROJECT.adminPassword }}</span>
                <span class="role-tag admin">管理员</span>
              </div>
              <button class="btn btn-soft btn-sm" :disabled="loading" @click="quickLogin('admin')">
                {{ autoLoginRole === 'admin' ? '进入中…' : '登录并进后台' }}
              </button>
            </div>
          </div>

          <p class="demo-note">
            演示环境数据每日重置；支付为模拟支付，不产生真实扣款。账号与项目说明见
            <RouterLink to="/about" class="link">关于项目</RouterLink>。
          </p>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  display: flex;
  justify-content: center;
  padding: 40px 0 24px;
}

.auth-main {
  display: grid;
  grid-template-columns: minmax(0, 400px) minmax(0, 400px);
  gap: 22px;
  align-items: start;
  width: 100%;
  max-width: 860px;
}

.auth-card {
  width: 100%;
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
  line-height: 1.7;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.demo-card {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 28px 26px;
}

.demo-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.demo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
}

.demo-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--accent);
}

.demo-title {
  font-size: 18px;
  font-weight: 800;
}

.demo-desc {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink-2);
}

.demo-desc strong {
  color: var(--ink);
}

.demo-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 18px 0;
}

.demo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 12px 14px;
  flex-wrap: wrap;
}

.demo-account {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 14px;
}

.demo-account b {
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.pw {
  color: var(--ink-2);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
}

.role-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-2);
  background: #eeece4;
  border-radius: 999px;
  padding: 2px 8px;
}

.role-tag.admin {
  color: var(--accent);
  background: var(--accent-soft);
}

.demo-note {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-2);
}

@media (max-width: 860px) {
  .auth-main {
    grid-template-columns: 1fr;
    max-width: 440px;
  }
}

@media (max-width: 480px) {
  .auth-wrap {
    padding-top: 20px;
  }

  .auth-card,
  .demo-card {
    padding: 24px 20px;
    border-radius: 18px;
  }
}
</style>

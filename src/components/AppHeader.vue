<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const keyword = ref('')
const userMenuOpen = ref(false)
const mobileOpen = ref(false)

const userMenuRef = ref<HTMLElement | null>(null)
const userTriggerRef = ref<HTMLButtonElement | null>(null)
const hamburgerRef = ref<HTMLButtonElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)

const navLinks = [
  { name: 'home', label: '首页', path: '/' },
  { name: 'products', label: '全部商品', path: '/products' },
  { name: 'seckill', label: '秒杀', path: '/seckill' },
  { name: 'about', label: '关于项目', path: '/about' },
]

const drawerLinks = [
  { name: 'home', label: '首页', path: '/' },
  { name: 'products', label: '全部商品', path: '/products' },
  { name: 'seckill', label: '秒杀', path: '/seckill' },
  { name: 'orders', label: '我的订单', path: '/orders' },
  { name: 'favorites', label: '我的收藏', path: '/favorites' },
  { name: 'cart', label: '购物车', path: '/cart' },
  { name: 'about', label: '关于项目', path: '/about' },
]

function onSearch() {
  const q = keyword.value.trim()
  router.push({ name: 'search', query: q ? { q } : {} })
}

async function onLogout() {
  userMenuOpen.value = false
  mobileOpen.value = false
  await userStore.logout()
  cartStore.reset()
  router.push({ name: 'home' })
}

function goUser(path: string) {
  userMenuOpen.value = false
  mobileOpen.value = false
  router.push({ name: path })
}

function closeMobile() {
  mobileOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!userMenuOpen.value) return
  const target = event.target as Node | null
  if (target && userMenuRef.value && !userMenuRef.value.contains(target)) {
    userMenuOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (userMenuOpen.value) {
    userMenuOpen.value = false
    userTriggerRef.value?.focus()
  }
  if (mobileOpen.value) {
    mobileOpen.value = false
    hamburgerRef.value?.focus()
  }
}

// 移动端抽屉打开时锁定滚动，并把焦点移入抽屉
watch(mobileOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick()
    drawerRef.value?.querySelector<HTMLElement>('a, button')?.focus()
  }
})

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
    userMenuOpen.value = false
  },
)

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  if (userStore.isLoggedIn) await cartStore.refresh()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="header">
    <div class="container header-inner">
      <RouterLink to="/" class="wordmark" aria-label="Mall 商城首页">
        Mall<span class="dot">.</span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          class="nav-link"
          :class="{ active: route.name === link.name }"
          :aria-current="route.name === link.name ? 'page' : undefined"
        >
          {{ link.label }}
        </RouterLink>
        <RouterLink
          v-if="userStore.isLoggedIn"
          to="/orders"
          class="nav-link"
          :class="{ active: route.name === 'orders' }"
          :aria-current="route.name === 'orders' ? 'page' : undefined"
        >
          我的订单
        </RouterLink>
      </nav>

      <div class="search">
        <label class="sr-only" for="header-search">搜索商品</label>
        <input
          id="header-search"
          v-model="keyword"
          class="search-input"
          type="search"
          placeholder="搜索商品…"
          autocomplete="off"
          @keyup.enter="onSearch"
        />
        <button class="search-btn" aria-label="搜索" @click="onSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      <div class="actions">
        <RouterLink to="/favorites" class="icon-btn" aria-label="我的收藏" title="我的收藏">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20.3 4.7 13a5.2 5.2 0 1 1 7.3-7.3 5.2 5.2 0 1 1 7.3 7.3Z" />
          </svg>
        </RouterLink>

        <RouterLink to="/cart" class="icon-btn" aria-label="购物车" title="购物车">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 5h2l2.2 11h9.6L21 8H7" />
            <circle cx="10" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
          <span v-if="cartStore.count > 0" class="badge" aria-hidden="true">{{ cartStore.count > 99 ? '99+' : cartStore.count }}</span>
          <span class="sr-only" v-if="cartStore.count > 0">购物车共 {{ cartStore.count }} 件</span>
        </RouterLink>

        <template v-if="userStore.isLoggedIn">
          <div ref="userMenuRef" class="user-menu">
            <button
              ref="userTriggerRef"
              class="user-trigger"
              aria-haspopup="menu"
              :aria-expanded="userMenuOpen"
              aria-controls="user-menu"
              @click="userMenuOpen = !userMenuOpen"
            >
              <span class="sr-only">账号菜单</span>
              <span class="avatar" aria-hidden="true">{{ userStore.username.slice(0, 1).toUpperCase() }}</span>
              <span class="uname">{{ userStore.username }}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="userMenuOpen" id="user-menu" class="menu" role="menu">
              <button class="menu-item" role="menuitem" @click="goUser('profile')">个人中心</button>
              <button class="menu-item" role="menuitem" @click="goUser('orders')">我的订单</button>
              <button class="menu-item" role="menuitem" @click="goUser('addresses')">地址管理</button>
              <button v-if="userStore.isAdmin" class="menu-item menu-item-admin" role="menuitem" @click="goUser('admin')">
                管理后台
              </button>
              <button class="menu-item" role="menuitem" @click="goUser('about')">关于项目</button>
              <div class="menu-sep" role="separator"></div>
              <button class="menu-item menu-item-danger" role="menuitem" @click="onLogout">退出登录</button>
            </div>
          </div>
        </template>
        <RouterLink v-else to="/login" class="btn btn-primary btn-sm login-btn">登录</RouterLink>

        <button
          ref="hamburgerRef"
          class="hamburger"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-menu"
          aria-label="打开导航菜单"
          @click="mobileOpen = !mobileOpen"
        >
          <svg v-if="!mobileOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 移动端抽屉导航 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileOpen" class="drawer-mask" @click.self="closeMobile">
          <nav id="mobile-menu" ref="drawerRef" class="drawer" aria-label="移动端导航">
            <div class="drawer-head">
              <span class="drawer-title">导航</span>
              <button class="drawer-close" aria-label="关闭导航菜单" @click="closeMobile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <RouterLink
              v-for="link in drawerLinks"
              :key="link.name"
              :to="link.path"
              class="drawer-link"
              :class="{ active: route.name === link.name }"
              :aria-current="route.name === link.name ? 'page' : undefined"
              @click="closeMobile"
            >
              {{ link.label }}
              <span aria-hidden="true">→</span>
            </RouterLink>
            <div class="drawer-foot">
              <template v-if="userStore.isLoggedIn">
                <button class="btn btn-ghost btn-block" @click="onLogout">退出登录</button>
              </template>
              <RouterLink v-else to="/login" class="btn btn-primary btn-block" @click="closeMobile">登录 / 演示账号</RouterLink>
            </div>
          </nav>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(245, 243, 238, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 64px;
}

.wordmark {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  flex-shrink: 0;
}

.wordmark .dot {
  color: var(--accent);
}

.nav {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.nav-link {
  padding: 8px 11px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: var(--ink);
  background: rgba(26, 26, 23, 0.05);
}

.nav-link.active {
  color: var(--ink);
  background: rgba(26, 26, 23, 0.07);
}

.search {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 999px;
  padding: 0 6px 0 16px;
  height: 40px;
  max-width: 380px;
  transition: border-color 0.15s ease;
}

.search:focus-within {
  border-color: var(--accent);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  min-width: 0;
}

.search-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  transition: all 0.15s ease;
}

.search-btn:hover {
  background: var(--accent);
  color: #fff;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  transition: background 0.15s ease;
}

.icon-btn:hover {
  background: rgba(26, 26, 23, 0.06);
}

.badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.login-btn {
  margin-left: 4px;
}

.user-menu {
  position: relative;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.user-trigger:hover {
  border-color: var(--line-strong);
  background: var(--surface);
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.uname {
  font-size: 14px;
  font-weight: 700;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 168px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 60;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  transition: background 0.12s ease;
}

.menu-item:hover {
  background: var(--surface-2);
}

.menu-item-admin {
  color: var(--accent);
}

.menu-item-danger {
  color: var(--danger);
}

.menu-sep {
  height: 1px;
  background: var(--line);
  margin: 5px 8px;
}

.hamburger {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
}

.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(26, 26, 23, 0.42);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: min(340px, 86vw);
  height: 100%;
  background: var(--paper);
  border-left: 1px solid var(--line);
  padding: 18px 20px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.drawer-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.drawer-close {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}

.drawer-close:hover {
  background: var(--surface-2);
}

.drawer-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--line);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.drawer-link span {
  color: var(--ink-3);
}

.drawer-link.active {
  color: var(--accent);
}

.drawer-foot {
  margin-top: auto;
  padding-top: 20px;
}

.drawer-foot .btn {
  min-height: 46px;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .nav-link {
    padding: 8px 8px;
    font-size: 13.5px;
  }

  .header-inner {
    gap: 12px;
  }
}

@media (max-width: 900px) {
  .nav {
    display: none;
  }

  .hamburger {
    display: inline-flex;
  }

  .uname {
    display: none;
  }
}

@media (max-width: 480px) {
  .header-inner {
    gap: 8px;
    height: 58px;
  }

  .wordmark {
    font-size: 19px;
  }

  .icon-btn {
    width: 38px;
    height: 38px;
  }

  .search {
    padding-left: 10px;
    height: 38px;
  }

  .login-btn {
    padding: 7px 10px;
    font-size: 13px;
  }

  .hamburger {
    width: 38px;
    height: 38px;
  }
}
</style>

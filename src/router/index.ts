import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useUserStore } from '@/stores/user'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const SITE_NAME = 'Mall 商城'
const SITE_TITLE = 'Mall 商城 · Go 全栈项目｜李俊哲'
const SITE_DESC =
  'Mall 商城：Vue 3 + TypeScript 前端，Go + Gin 后端，Redis / RabbitMQ / Meilisearch 全链路实战。在线演示，含秒杀、搜索、后台管理与压测数据。'

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页', description: SITE_DESC } },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/ProductsView.vue'),
    meta: { title: '全部商品', description: 'Mall 商城全部在售商品，按分类浏览，支持加入购物车与立即购买。' },
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: () => import('@/views/ProductDetailView.vue'),
    meta: { title: '商品详情', description: '商品详情：规格参数、服务承诺、相关推荐与加入购物车。' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索', description: '搜索 Mall 商城商品，全文检索由 Meilisearch 提供。' },
  },
  {
    path: '/seckill',
    name: 'seckill',
    component: () => import('@/views/SeckillView.vue'),
    meta: { title: '限时秒杀', description: 'Mall 商城秒杀专场：Redis Lua 原子扣库存 + RabbitMQ 异步落单。' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: '关于项目',
      description:
        'Mall 商城项目说明：系统架构、技术栈、登录/购物车/下单/支付/秒杀/搜索六条核心链路、难点与取舍、压测数据、测试策略、演示账号与作者联系方式。',
    },
  },

  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录', description: '登录 Mall 商城演示账号，体验完整交易链路。' } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { title: '注册', description: '注册 Mall 商城账号。' } },

  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true },
  },
  { path: '/addresses', name: 'addresses', component: () => import('@/views/AddressListView.vue'), meta: { title: '地址管理', requiresAuth: true } },
  { path: '/cart', name: 'cart', component: () => import('@/views/CartView.vue'), meta: { title: '购物车', requiresAuth: true } },
  { path: '/checkout', name: 'checkout', component: () => import('@/views/CheckoutView.vue'), meta: { title: '确认订单', requiresAuth: true } },
  { path: '/payment', name: 'payment', component: () => import('@/views/PaymentView.vue'), meta: { title: '收银台', requiresAuth: true } },
  { path: '/order-success', name: 'order-success', component: () => import('@/views/OrderSuccessView.vue'), meta: { title: '下单成功', requiresAuth: true } },
  { path: '/orders', name: 'orders', component: () => import('@/views/OrdersView.vue'), meta: { title: '我的订单', requiresAuth: true } },
  { path: '/favorites', name: 'favorites', component: () => import('@/views/FavoritesView.vue'), meta: { title: '我的收藏', requiresAuth: true } },

  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/admin/AdminView.vue'),
    meta: { title: '管理后台', requiresAuth: true, requiresAdmin: true },
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: '页面不存在' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
}

function updateSeo(to: RouteLocationNormalized) {
  const isHome = to.name === 'home'
  const title = isHome ? SITE_TITLE : `${to.meta.title ?? SITE_NAME} · ${SITE_NAME}｜李俊哲`
  const description = to.meta.description ?? SITE_DESC
  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  const path = to.path === '/' ? '/' : to.path.replace(/\/$/, '')
  canonical.href = `https://mall.syloe1.xyz${path}`
}

router.beforeEach(async (to) => {
  const store = useUserStore()
  // 首次导航前先等 Cookie 静默恢复登录态完成（main.ts 里已 await，这里兜底）
  if (!store.ready) await store.restore()
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !store.isAdmin) {
    return { name: 'home' }
  }
  return true
})

router.afterEach((to) => {
  updateSeo(to)
})

export default router

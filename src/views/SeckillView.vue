<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listActivities, mySeckillResult, seckillBuy, type SeckillActivity } from '@/api/seckill'
import { formatPrice, formatTime } from '@/utils/format'
import { humanizeError, LABELS } from '@/utils/copy'
import { toastSuccess, toastError } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const auth = useUserStore()

const activities = ref<SeckillActivity[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)
const pollingId = ref<number | null>(null)
const wonOrderId = ref<number | null>(null)

// 每秒刷新的当前时间，用于实时倒计时
const now = ref(Date.now())
let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function remainingSeconds(a: SeckillActivity): number {
  const target = new Date(a.status === 'upcoming' ? a.start_at : a.end_at).getTime()
  return Math.max(0, Math.floor((target - now.value) / 1000))
}

// 未开始→距开始，进行中→距结束，已结束→已结束
function countdown(a: SeckillActivity) {
  if (a.status === 'ended' || a.status === 'closed') return '活动已结束'
  let diff = remainingSeconds(a)
  const h = Math.floor(diff / 3600)
  diff %= 3600
  const m = Math.floor(diff / 60)
  const s = diff % 60
  const text = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return a.status === 'running' ? `距结束 ${text}` : `距开始 ${text}`
}

function fallbackUrl(e: Event) {
  ;(e.target as HTMLImageElement).src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#6f6e66" text-anchor="middle" dominant-baseline="middle">图片加载失败</text></svg>',
    )
}

const runningList = computed(() => activities.value.filter((a) => a.status === 'running'))
const upcomingList = computed(() => activities.value.filter((a) => a.status === 'upcoming'))
const endedList = computed(() => activities.value.filter((a) => a.status === 'ended' || a.status === 'closed'))

async function load() {
  loading.value = true
  try {
    activities.value = await listActivities()
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    loading.value = false
  }
}

function soldOut(a: SeckillActivity) {
  return a.available_stock <= 0
}

function stockPct(a: SeckillActivity) {
  if (!a.total_stock) return 0
  return Math.max(0, Math.min(100, Math.round((a.available_stock / a.total_stock) * 100)))
}

function buyLabel(a: SeckillActivity) {
  if (busyId.value === a.id) return pollingId.value === a.id ? '排队中…' : '提交中…'
  if (soldOut(a)) return '已抢光'
  if (a.status === 'ended' || a.status === 'closed') return '已结束'
  return '立即抢购'
}

async function buy(a: SeckillActivity) {
  if (!auth.isLoggedIn) {
    toastError('请先登录后再参与秒杀')
    router.push({ name: 'login', query: { redirect: '/seckill' } })
    return
  }
  if (a.status !== 'running') {
    toastError(a.status === 'ended' ? '活动已结束' : '活动还未开始')
    return
  }
  if (soldOut(a)) {
    toastError('已抢光')
    return
  }
  busyId.value = a.id
  try {
    await seckillBuy(a.id)
    toastSuccess('抢购请求已提交，正在生成订单…')
    // 轮询等待 MQ 消费者落单
    pollingId.value = a.id
    let won = false
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      try {
        const res = await mySeckillResult(a.id)
        if (res) {
          won = true
          wonOrderId.value = res.order_id
          toastSuccess('恭喜，抢购成功！')
          await load()
          break
        }
      } catch {
        /* 忽略单次轮询错误 */
      }
    }
    pollingId.value = null
    if (!won) {
      toastSuccess('订单生成中，请稍后到「我的订单」查看')
      router.push({ name: 'orders' })
    }
  } catch (e) {
    toastError(humanizeError(e))
    // 409/410 说明活动状态已变化，刷新列表让 UI 与服务端一致
    await load()
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <p class="eyebrow">{{ LABELS.en.flashSale }} · 限时秒杀</p>
    <h1 class="title">秒杀专区</h1>
    <p class="sub">
      精选好物限时低价，登录后点击卡片即可参与抢购。库存有限，先到先得；
      活动状态由服务端按时间窗口实时计算，过期活动会自动标记为「已结束」。
    </p>

    <div v-if="loading" class="state" aria-busy="true">加载中…</div>

    <div v-else-if="!activities.length" class="state">
      暂无秒杀活动，敬请期待～
    </div>

    <template v-else>
      <section v-if="runningList.length" class="group" aria-labelledby="running-title">
        <h2 id="running-title" class="group-title">正在抢购</h2>
        <div class="grid">
          <article v-for="a in runningList" :key="a.id" class="sk-card card">
            <div class="media">
              <img :src="a.product_image" :alt="a.product_name" width="600" height="600" loading="lazy" decoding="async" @error="fallbackUrl" />
              <span class="badge badge-running">进行中</span>
            </div>
            <div class="info">
              <h3 class="name">{{ a.product_name }}</h3>
              <p class="act-name">{{ a.name }}</p>
              <div class="price-row">
                <span class="now">{{ formatPrice(a.seckill_price_cents) }}</span>
                <span class="orig">{{ formatPrice(a.original_price_cents) }}</span>
              </div>
              <div class="stock">
                <div class="bar" role="img" :aria-label="`剩余库存 ${a.available_stock} / ${a.total_stock}`">
                  <i :style="{ width: stockPct(a) + '%' }" />
                </div>
                <span class="stock-text">
                  {{ soldOut(a) ? '已抢光' : `剩 ${a.available_stock} / ${a.total_stock}` }}
                </span>
              </div>
              <p class="time time-live" aria-live="off">{{ countdown(a) }}</p>
              <button class="btn btn-danger btn-block" :disabled="busyId === a.id || soldOut(a)" @click="buy(a)">
                {{ buyLabel(a) }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="upcomingList.length" class="group" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" class="group-title upcoming-title">即将开始</h2>
        <div class="grid">
          <article v-for="a in upcomingList" :key="a.id" class="sk-card card upcoming">
            <div class="media">
              <img :src="a.product_image" :alt="a.product_name" width="600" height="600" loading="lazy" decoding="async" @error="fallbackUrl" />
              <span class="badge badge-upcoming">未开始</span>
            </div>
            <div class="info">
              <h3 class="name">{{ a.product_name }}</h3>
              <p class="act-name">{{ a.name }}</p>
              <div class="price-row">
                <span class="now">{{ formatPrice(a.seckill_price_cents) }}</span>
                <span class="orig">{{ formatPrice(a.original_price_cents) }}</span>
              </div>
              <p class="time">开始时间：{{ formatTime(a.start_at) }}</p>
              <p class="time time-live">{{ countdown(a) }}</p>
              <button class="btn btn-ghost btn-block" disabled>即将开启</button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="endedList.length" class="group" aria-labelledby="ended-title">
        <h2 id="ended-title" class="group-title ended-title">已结束</h2>
        <div class="grid">
          <article v-for="a in endedList" :key="a.id" class="sk-card card ended">
            <div class="media">
              <img :src="a.product_image" :alt="a.product_name" width="600" height="600" loading="lazy" decoding="async" @error="fallbackUrl" />
              <span class="badge badge-ended">已结束</span>
            </div>
            <div class="info">
              <h3 class="name">{{ a.product_name }}</h3>
              <p class="act-name">{{ a.name }}</p>
              <div class="price-row">
                <span class="now">{{ formatPrice(a.seckill_price_cents) }}</span>
                <span class="orig">{{ formatPrice(a.original_price_cents) }}</span>
              </div>
              <p class="time">结束时间：{{ formatTime(a.end_at) }}</p>
              <p class="time time-live">活动已结束</p>
              <button class="btn btn-ghost btn-block" disabled>已结束</button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- 抢购成功浮层（可访问的 dialog） -->
    <Modal :open="wonOrderId !== null" title="抢购成功" width="380px" @close="wonOrderId = null">
      <div class="win-card">
        <div class="win-icon" aria-hidden="true">✓</div>
        <p class="win-desc">订单已生成，请在 30 分钟内完成支付，超时订单会自动取消并回滚库存。</p>
        <button class="btn btn-primary btn-block" @click="wonOrderId = null; router.push({ name: 'orders' })">
          去我的订单支付
        </button>
        <button class="btn btn-ghost btn-block" @click="wonOrderId = null">再逛逛</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: var(--danger);
  text-transform: uppercase;
  margin-top: 4px;
}

.title {
  font-size: 28px;
  font-weight: 800;
  margin: 8px 0 6px;
}

.sub {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  margin-bottom: 24px;
  max-width: 820px;
}

.state {
  padding: 48px 0;
  text-align: center;
  color: var(--ink-2);
  font-size: 14px;
}

.group {
  margin-bottom: 28px;
}

.group-title {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--danger);
  border-radius: 2px;
}

.upcoming-title::before {
  background: #8a8a8a;
}

.ended-title::before {
  background: var(--ink-3);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 720px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.sk-card {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.sk-card.upcoming,
.sk-card.ended {
  opacity: 0.92;
}

.media {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--paper);
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge {
  position: absolute;
  left: 8px;
  top: 8px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}

.badge-running {
  background: var(--danger);
}

.badge-upcoming {
  background: #6f6e66;
}

.badge-ended {
  background: var(--ink);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
}

.act-name {
  font-size: 12px;
  color: var(--ink-2);
  margin: 0;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.now {
  font-size: 22px;
  font-weight: 800;
  color: var(--danger);
}

.orig {
  font-size: 13px;
  color: var(--ink-2);
  text-decoration: line-through;
}

.stock {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  flex: 1;
  height: 6px;
  background: var(--paper);
  border-radius: 999px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ff8a8a, var(--danger));
}

.stock-text {
  font-size: 11px;
  color: var(--ink-2);
  white-space: nowrap;
}

.time {
  font-size: 12px;
  color: var(--ink-2);
  margin: 0;
}

.time-live {
  color: var(--danger);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ended .time-live {
  color: var(--ink-2);
}

.win-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.win-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 30px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-desc {
  font-size: 14px;
  color: var(--ink-2);
  line-height: 1.8;
}

@media (max-width: 480px) {
  .sk-card {
    gap: 12px;
    padding: 12px;
  }

  .media {
    width: 96px;
    height: 96px;
  }
}
</style>

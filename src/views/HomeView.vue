<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/api/products'
import type { Product } from '@/types'
import { useCategoryStore } from '@/stores/categories'
import { formatPriceGrouped } from '@/utils/format'
import { humanizeError, LABELS } from '@/utils/copy'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()
const categoryStore = useCategoryStore()
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const loadedCount = ref(0)
const total = ref(0)

const featured = computed<Product | null>(() => products.value[0] ?? null)
const categories = computed(() => categoryStore.items)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [data] = await Promise.all([
      listProducts({ page: 1, page_size: 12 }),
      categoryStore.ensureLoaded(),
    ])
    products.value = data.items
    total.value = data.total
    loadedCount.value = data.items.length
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    loading.value = false
  }
}

// 加载下一页并追加（按 ID 去重），不替换已有商品
const loadingMore = ref(false)
async function loadMore(pageSize = 12) {
  if (loadingMore.value || loading.value) return
  loadingMore.value = true
  try {
    const nextPage = Math.floor(loadedCount.value / pageSize) + 1
    const data = await listProducts({ page: nextPage, page_size: pageSize })
    const existing = new Set(products.value.map((p) => p.ID))
    for (const p of data.items) {
      if (!existing.has(p.ID)) products.value.push(p)
    }
    total.value = data.total
    loadedCount.value = products.value.length
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    loadingMore.value = false
  }
}

function goCategory(categoryId?: number) {
  router.push({ name: 'products', query: categoryId ? { category_id: categoryId } : {} })
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="hero-eyebrow">MALL · GO 全栈商城</p>
          <h1 class="hero-title">好物精选<br />即刻入手</h1>
          <p class="hero-sub">从数码到家居，为每一个日常挑选恰到好处的好东西。</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" @click="router.push({ name: 'products' })">逛全部商品</button>
            <button class="btn btn-ghost btn-lg" @click="router.push({ name: 'seckill' })">秒杀专场</button>
            <RouterLink to="/about" class="hero-about">了解这个项目 ↗</RouterLink>
          </div>
        </div>

        <!-- 本周精选：指向真实在售商品（不再是无点击反应的装饰卡） -->
        <RouterLink
          v-if="featured"
          class="hero-card"
          :to="{ name: 'product-detail', params: { id: featured.ID } }"
        >
          <div class="hero-card-top">
            <span class="hero-tag">本周精选</span>
            <span class="hero-card-no">N° 01</span>
          </div>
          <img
            class="hero-card-img"
            :src="featured.images?.[0]?.url ?? ''"
            :alt="featured.name"
            width="600"
            height="600"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
          <div class="hero-card-name">{{ featured.name }}</div>
          <div class="hero-card-price">¥{{ formatPriceGrouped(featured.price_cents) }}</div>
          <div class="hero-card-line"></div>
          <div class="hero-card-label">BROWSE THE PICK →</div>
        </RouterLink>
        <div v-else class="hero-card hero-card-static">
          <div class="hero-card-top">
            <span class="hero-tag">项目数据</span>
            <span class="hero-card-no">GO / GIN</span>
          </div>
          <div class="hero-card-price">50+ API</div>
          <div class="hero-card-line"></div>
          <div class="hero-card-label">15 TABLES · 6 CORE FLOWS<br />REDIS · RABBITMQ · MEILISEARCH</div>
        </div>
      </div>
    </section>

    <!-- 商品区 -->
    <section class="container page">
      <div class="list-head">
        <div class="section-title">
          全部商品 <span class="en">/ {{ LABELS.en.shopAll }}</span>
          <span class="count">{{ total ? `共 ${total} 件` : '' }}</span>
        </div>
        <div class="chips">
          <button class="pill active" @click="goCategory()">全部</button>
          <button v-for="c in categories" :key="c.id" class="pill" @click="goCategory(c.id)">{{ c.name }}</button>
        </div>
      </div>

      <div v-if="loading" class="grid" aria-busy="true" aria-label="商品加载中">
        <div v-for="i in 8" :key="i" class="sk-card" aria-hidden="true">
          <div class="skeleton sk-img"></div>
          <div class="skeleton sk-line" style="width: 70%"></div>
          <div class="skeleton sk-line" style="width: 40%"></div>
        </div>
      </div>

      <div v-else-if="error" class="empty">
        <div class="empty-title">加载失败</div>
        <p>{{ error }}</p>
        <div class="empty-action">
          <button class="btn btn-primary btn-sm" @click="load()">重试</button>
        </div>
      </div>

      <div v-else class="grid">
        <ProductCard v-for="(p, index) in products" :key="p.ID" :product="p" :priority="index < 4" />
      </div>

      <div v-if="!loading && products.length < total" class="load-more">
        <button class="btn btn-ghost" :disabled="loadingMore" @click="loadMore()">
          {{ loadingMore ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(52% 90% at 88% 10%, rgba(31, 122, 84, 0.12), transparent 60%),
    radial-gradient(40% 80% at 8% 90%, rgba(201, 162, 39, 0.1), transparent 55%),
    var(--surface-2);
  border-bottom: 1px solid var(--line);
}

.hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 48px;
  align-items: center;
  padding-block: 64px;
}

.hero-eyebrow {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.hero-sub {
  margin-top: 18px;
  font-size: 16px;
  color: var(--ink-2);
  max-width: 420px;
}

.hero-actions {
  margin-top: 30px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.hero-about {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--accent);
}

.hero-about:hover {
  text-decoration: underline;
}

.hero-card {
  display: block;
  background: var(--ink);
  color: #fff;
  border-radius: 24px;
  padding: 20px;
  box-shadow: var(--shadow-lg);
  transform: rotate(1.2deg);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero-card:hover,
.hero-card:focus-visible {
  transform: rotate(0deg) translateY(-4px);
}

.hero-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
}

.hero-card-no {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.92);
}

.hero-card-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 14px;
  background: #efede6;
}

.hero-card-name {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.hero-card-price {
  margin-top: 4px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.hero-card-line {
  height: 3px;
  width: 48px;
  background: #fff;
  opacity: 0.85;
  margin: 12px 0;
  border-radius: 999px;
}

.hero-card-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.7;
}

.hero-card-static .hero-card-label {
  line-height: 1.8;
}

.list-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.count {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.sk-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 14px;
}

.sk-img {
  aspect-ratio: 1 / 1;
  margin-bottom: 12px;
}

.sk-line {
  height: 14px;
  margin-bottom: 10px;
}

.load-more {
  text-align: center;
  margin-top: 36px;
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .hero-inner {
    grid-template-columns: 1fr;
    padding-block: 40px;
    gap: 28px;
  }

  .hero-card {
    max-width: 340px;
    transform: none;
  }

  .hero-title {
    font-size: 40px;
  }
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .hero-inner {
    padding-block: 28px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-card {
    display: none;
  }

  .grid {
    gap: 12px;
  }

  .list-head {
    margin-bottom: 16px;
  }
}
</style>

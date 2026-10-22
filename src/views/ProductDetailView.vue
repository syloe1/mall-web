<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listProducts, getProduct } from '@/api/products'
import { addCartItem } from '@/api/cart'
import { checkFavorite, addFavoriteItem, deleteFavoriteItem, listFolders } from '@/api/favorites'
import type { Product } from '@/types'
import { formatPrice, formatPriceGrouped } from '@/utils/format'
import { humanizeError } from '@/utils/copy'
import { useUserStore } from '@/stores/user'
import { useCategoryStore } from '@/stores/categories'
import { toastSuccess, toastError, toastInfo } from '@/stores/toast'
import QuantityStepper from '@/components/QuantityStepper.vue'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const categoryStore = useCategoryStore()

const product = ref<Product | null>(null)
const related = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const qty = ref(1)
const activeImage = ref('')
const adding = ref(false)
const buying = ref(false)
const favorited = ref(false)
const favoriteBusy = ref(false)

const productId = computed(() => Number(route.params.id))

const cover = () => product.value?.images?.[0]?.url ?? ''

function fallbackUrl(e: Event) {
  ;(e.target as HTMLImageElement).src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="26" fill="#6f6e66" text-anchor="middle" dominant-baseline="middle">图片加载失败</text></svg>`,
    )
}

const specs = computed(() => {
  if (!product.value) return []
  const p = product.value
  return [
    { label: '商品编号', value: `P${String(p.ID).padStart(4, '0')}` },
    { label: '商品分类', value: categoryStore.labelOf(p.category_id) },
    { label: '当前库存', value: p.stock > 0 ? `${p.stock} 件` : '暂时售罄' },
    { label: '累计销量', value: `${p.sale_count} 件` },
    { label: '价格单位', value: '人民币（元），价格以“分”为最小单位存储' },
    { label: '发货时效', value: '演示环境：下单后 48 小时内（模拟）' },
  ]
})

const services = [
  { icon: '✓', text: '正品保障（演示数据）' },
  { icon: '↺', text: '7 天无理由退换（演示）' },
  { icon: '⚡', text: '订单 30 分钟未支付自动取消' },
  { icon: '🔒', text: '支付走模拟通道，不产生真实扣款' },
]

async function load() {
  loading.value = true
  error.value = ''
  product.value = null
  related.value = []
  try {
    const p = await getProduct(productId.value)
    product.value = p
    activeImage.value = p.images?.[0]?.url ?? ''
    if (userStore.isLoggedIn) {
      checkFavorite(p.ID)
        .then((r) => (favorited.value = r.favorited))
        .catch(() => {})
    }
    // 相关推荐：同分类商品（排除当前商品）
    listProducts({ page: 1, page_size: 5, category_id: p.category_id })
      .then((data) => {
        related.value = data.items.filter((item) => item.ID !== p.ID).slice(0, 4)
      })
      .catch(() => {})
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    loading.value = false
  }
}

async function requireLogin(): Promise<boolean> {
  if (userStore.isLoggedIn) return true
  toastInfo('请先登录')
  router.push({ name: 'login', query: { redirect: route.fullPath } })
  return false
}

async function onAddCart() {
  if (!product.value) return
  if (!(await requireLogin())) return
  if (adding.value) return
  adding.value = true
  try {
    await addCartItem(product.value.ID, qty.value)
    toastSuccess('已加入购物车')
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    adding.value = false
  }
}

async function onBuyNow() {
  if (!product.value) return
  if (!(await requireLogin())) return
  buying.value = true
  router.push({
    name: 'checkout',
    query: { buy: '1', product_id: product.value.ID, quantity: qty.value },
  })
}

async function toggleFavorite() {
  if (!product.value) return
  if (!(await requireLogin())) return
  if (favoriteBusy.value) return
  favoriteBusy.value = true
  try {
    if (favorited.value) {
      const folders = await listFolders()
      for (const f of folders) {
        try {
          await deleteFavoriteItem(f.ID, product.value.ID)
        } catch {
          // 忽略未包含该商品的文件夹
        }
      }
      favorited.value = false
      toastSuccess('已取消收藏')
    } else {
      const folders = await listFolders()
      const folder = folders[0]
      if (folder) {
        await addFavoriteItem(folder.ID, product.value.ID)
        favorited.value = true
        toastSuccess('已加入收藏')
      }
    }
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    favoriteBusy.value = false
  }
}

watch(productId, load)
onMounted(async () => {
  categoryStore.ensureLoaded()
  await load()
})
</script>

<template>
  <div class="container page">
    <nav class="breadcrumb" aria-label="面包屑导航">
      <RouterLink to="/">首页</RouterLink>
      <span aria-hidden="true">/</span>
      <RouterLink to="/products">全部商品</RouterLink>
      <template v-if="product">
        <span aria-hidden="true">/</span>
        <RouterLink :to="{ name: 'products', query: { category_id: product.category_id } }">
          {{ categoryStore.labelOf(product.category_id) }}
        </RouterLink>
      </template>
    </nav>

    <div v-if="loading" class="detail-loading" aria-busy="true" aria-label="商品加载中">
      <div class="skeleton d-img"></div>
      <div class="d-info">
        <div class="skeleton d-line" style="width: 40%"></div>
        <div class="skeleton d-line" style="width: 80%"></div>
        <div class="skeleton d-line" style="width: 55%"></div>
      </div>
    </div>

    <div v-else-if="error || !product" class="empty">
      <div class="empty-title">商品加载失败</div>
      <p>{{ error }}</p>
      <div class="empty-action">
        <RouterLink to="/products" class="btn btn-primary btn-sm">返回商品列表</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="detail">
        <div class="gallery">
          <div class="main-img">
            <img
              :src="activeImage || cover()"
              :alt="product.name"
              width="600"
              height="600"
              fetchpriority="high"
              decoding="async"
              @error="fallbackUrl"
            />
          </div>
          <div v-if="product.images && product.images.length > 1" class="thumbs">
            <button
              v-for="(img, index) in product.images"
              :key="img.ID"
              class="thumb"
              :class="{ active: img.url === activeImage }"
              :aria-label="`查看商品图 ${index + 1}`"
              :aria-pressed="img.url === activeImage"
              @click="activeImage = img.url"
            >
              <img :src="img.url" :alt="`${product.name} 商品图 ${index + 1}`" width="120" height="120" loading="lazy" decoding="async" @error="fallbackUrl" />
            </button>
          </div>
        </div>

        <div class="info">
          <div class="meta-row">
            <span class="tag">{{ categoryStore.labelOf(product.category_id) }}</span>
            <span class="stock" :class="{ low: product.stock < 10 }">
              {{ product.status === 'on_sale' ? (product.stock > 0 ? `库存 ${product.stock}` : '售罄') : '已下架' }}
            </span>
          </div>
          <h1 class="name">{{ product.name }}</h1>
          <p v-if="product.description" class="desc">{{ product.description }}</p>

          <div class="price-box">
            <span class="price">¥{{ formatPrice(product.price_cents) }}</span>
            <span v-if="product.sale_count > 0" class="sales">已售 {{ product.sale_count }} 件</span>
          </div>

          <div class="qty-row">
            <span class="qty-label" id="qty-label">数量</span>
            <QuantityStepper
              v-model="qty"
              :min="1"
              :max="Math.max(1, product.stock)"
              :disabled="product.status !== 'on_sale'"
              aria-labelledby="qty-label"
            />
          </div>

          <div class="actions">
            <button class="btn btn-ghost btn-lg fav-btn" :class="{ 'is-fav': favorited }" :disabled="favoriteBusy" @click="toggleFavorite">
              <svg width="18" height="18" viewBox="0 0 24 24" :fill="favorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20.3 4.7 13a5.2 5.2 0 1 1 7.3-7.3 5.2 5.2 0 1 1 7.3 7.3Z" />
              </svg>
              {{ favorited ? '已收藏' : '收藏' }}
            </button>
            <button class="btn btn-ghost btn-lg" :disabled="adding || product.status !== 'on_sale'" @click="onAddCart">
              {{ adding ? '添加中…' : '加入购物车' }}
            </button>
            <button class="btn btn-primary btn-lg" :disabled="buying || product.status !== 'on_sale'" @click="onBuyNow">
              {{ buying ? '跳转中…' : '立即购买' }}
            </button>
          </div>

          <ul class="service-list" aria-label="服务承诺">
            <li v-for="service in services" :key="service.text">
              <span class="service-icon" aria-hidden="true">{{ service.icon }}</span>{{ service.text }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 规格参数 / 图文详情 -->
      <section class="detail-section" aria-labelledby="spec-title">
        <h2 id="spec-title" class="detail-title">规格参数</h2>
        <table class="spec-table">
          <tbody>
            <tr v-for="spec in specs" :key="spec.label">
              <th scope="row">{{ spec.label }}</th>
              <td>{{ spec.value }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="detail-section" aria-labelledby="desc-title">
        <h2 id="desc-title" class="detail-title">商品详情</h2>
        <div class="desc-body">
          <p>{{ product.description || '该商品暂无更多图文介绍。' }}</p>
          <p class="desc-note">
            说明：演示环境的商品图为统一风格的自托管 SVG 插画（含商品名与分类），不依赖第三方图床；
            接入真实商品摄影图后，页面结构与性能策略不变。
          </p>
          <div v-if="product.images && product.images.length" class="desc-images">
            <img
              v-for="(img, index) in product.images"
              :key="img.ID"
              :src="img.url"
              :alt="`${product.name} 详情图 ${index + 1}`"
              width="600"
              height="600"
              loading="lazy"
              decoding="async"
              @error="fallbackUrl"
            />
          </div>
        </div>
      </section>

      <!-- 相关推荐 -->
      <section v-if="related.length" class="detail-section" aria-labelledby="related-title">
        <div class="related-head">
          <h2 id="related-title" class="detail-title">相关推荐</h2>
          <RouterLink class="more-link" :to="{ name: 'products', query: { category_id: product.category_id } }">
            查看同类全部商品 →
          </RouterLink>
        </div>
        <div class="related-grid">
          <ProductCard v-for="p in related" :key="p.ID" :product="p" />
        </div>
      </section>

      <p class="price-hint">价格：¥{{ formatPriceGrouped(product.price_cents) }}（以分为单位存储，前端格式化展示）</p>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-2);
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.breadcrumb a:hover {
  color: var(--accent);
}

.detail {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 48px;
  align-items: start;
}

.gallery {
  position: sticky;
  top: 88px;
}

.main-img {
  aspect-ratio: 1 / 1;
  border-radius: 24px;
  overflow: hidden;
  background: #efede6;
  border: 1px solid var(--line);
}

.main-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--r-md);
  overflow: hidden;
  border: 2px solid transparent;
  background: #efede6;
  transition: border-color 0.15s ease;
}

.thumb.active {
  border-color: var(--accent);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stock {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.stock.low {
  color: var(--warn);
}

.name {
  font-size: 30px;
  font-weight: 800;
  margin: 14px 0 10px;
  letter-spacing: -0.02em;
}

.desc {
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1.7;
  max-width: 520px;
}

.price-box {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 24px 0;
  padding: 18px 20px;
  background: var(--accent-soft);
  border-radius: var(--r-md);
}

.price {
  font-size: 34px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.02em;
}

.sales {
  font-size: 13px;
  color: var(--ink-2);
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.qty-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-2);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.fav-btn.is-fav {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-soft);
}

.service-list {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
}

.service-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.service-icon {
  color: var(--accent);
  font-weight: 800;
}

.detail-loading {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 48px;
}

.d-img {
  aspect-ratio: 1 / 1;
  border-radius: 24px;
}

.d-line {
  height: 22px;
  margin-bottom: 16px;
}

.detail-section {
  margin-top: 56px;
  padding-top: 34px;
  border-top: 1px solid var(--line);
}

.detail-title {
  font-size: 21px;
  font-weight: 800;
  margin-bottom: 18px;
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.spec-table th,
.spec-table td {
  padding: 13px 16px;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.spec-table tr:last-child th,
.spec-table tr:last-child td {
  border-bottom: none;
}

.spec-table th {
  width: 180px;
  background: var(--surface-2);
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-2);
}

.desc-body p {
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--ink-2);
  max-width: 860px;
}

.desc-note {
  margin-top: 10px;
  font-size: 12.5px !important;
  color: var(--ink-3) !important;
}

.desc-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
  max-width: 900px;
}

.desc-images img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
}

.related-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.more-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.more-link:hover {
  text-decoration: underline;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.price-hint {
  margin-top: 34px;
  font-size: 12px;
  color: var(--ink-3);
}

@media (max-width: 1024px) {
  .related-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .detail,
  .detail-loading {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .gallery {
    position: static;
  }

  .name {
    font-size: 24px;
  }

  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .service-list {
    grid-template-columns: 1fr;
  }

  .spec-table th {
    width: 120px;
  }

  .desc-images {
    grid-template-columns: 1fr;
  }
}
</style>

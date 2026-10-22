<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/types'
import { useCategoryStore } from '@/stores/categories'
import { formatPriceGrouped } from '@/utils/format'
import { addCartItem } from '@/api/cart'
import { useUserStore } from '@/stores/user'
import { toastSuccess, toastError, toastInfo } from '@/stores/toast'
import { humanizeError } from '@/utils/copy'

const props = defineProps<{
  product: Product
  /** 首屏前 4 张图设为高优先级，其余懒加载 */
  priority?: boolean
}>()

const router = useRouter()
const userStore = useUserStore()
const categoryStore = useCategoryStore()
const adding = ref(false)

const cover = () => props.product.images?.[0]?.url ?? ''

function fallbackUrl(e: Event) {
  const el = e.target as HTMLImageElement | null
  if (!el) return
  el.src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="26" fill="#6f6e66" text-anchor="middle" dominant-baseline="middle">图片加载失败</text></svg>',
    )
}

async function quickAdd() {
  if (!userStore.isLoggedIn) {
    toastInfo('请先登录')
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  if (adding.value) return
  adding.value = true
  try {
    await addCartItem(props.product.ID, 1)
    toastSuccess('已加入购物车')
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <article class="pcard">
    <RouterLink
      :to="{ name: 'product-detail', params: { id: product.ID } }"
      class="pcard-link"
    >
      <div class="cover">
        <img
          :src="cover()"
          :alt="product.name"
          width="600"
          height="600"
          :loading="priority ? 'eager' : 'lazy'"
          :fetchpriority="priority ? 'high' : 'auto'"
          decoding="async"
          @error="fallbackUrl"
        />
        <span v-if="product.status !== 'on_sale'" class="off-badge">已下架</span>
      </div>
      <div class="info">
        <div class="meta-row">
          <span class="cat">{{ categoryStore.labelOf(product.category_id) }}</span>
          <span class="stock">{{ product.stock > 0 ? '库存 ' + product.stock : '售罄' }}</span>
        </div>
        <h3 class="name">{{ product.name }}</h3>
        <div class="price-row">
          <span class="price">¥{{ formatPriceGrouped(product.price_cents) }}</span>
          <span v-if="product.sale_count > 0" class="sales">已售 {{ product.sale_count }}</span>
        </div>
      </div>
    </RouterLink>
    <div class="card-actions">
      <button class="quick-add" :disabled="adding || product.status !== 'on_sale'" @click="quickAdd">
        {{ adding ? '添加中…' : product.status === 'on_sale' ? '加入购物车' : '已下架' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.pcard {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  display: flex;
  flex-direction: column;
}

.pcard:hover,
.pcard:focus-within {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--line-strong);
}

.pcard-link {
  display: block;
}

.cover {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #efede6;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.pcard:hover .cover img {
  transform: scale(1.04);
}

.off-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(26, 26, 23, 0.78);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.info {
  padding: 14px 16px 10px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.cat {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 9px;
  border-radius: 999px;
}

.stock {
  font-size: 12px;
  color: var(--ink-2);
  white-space: nowrap;
}

.name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

.price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 8px;
}

.price {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
}

.sales {
  font-size: 12px;
  color: var(--ink-2);
}

/* 快捷加购：桌面 hover/focus 出现；触屏常显（审计：触屏看不到 hover 按钮） */
.card-actions {
  padding: 0 12px 14px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.pcard:hover .card-actions,
.pcard:focus-within .card-actions {
  opacity: 1;
  transform: none;
}

.quick-add {
  width: 100%;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  min-height: 40px;
  padding: 9px 0;
  transition: background 0.15s ease;
}

.quick-add:hover:not(:disabled) {
  background: var(--accent);
}

.quick-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (hover: none) {
  .card-actions {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 480px) {
  .info {
    padding: 10px 12px 8px;
  }

  .name {
    font-size: 14px;
  }

  .price {
    font-size: 16px;
  }
}
</style>

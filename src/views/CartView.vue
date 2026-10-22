<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCartItems, updateCartItem, deleteCartItem, clearCart, setItemChecked, setAllChecked } from '@/api/cart'
import type { CartItem } from '@/types'
import { formatPriceGrouped } from '@/utils/format'
import { useCartStore } from '@/stores/cart'
import { toastSuccess, toastError } from '@/stores/toast'
import QuantityStepper from '@/components/QuantityStepper.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const cartStore = useCartStore()
const items = ref<CartItem[]>([])
const loading = ref(true)
const clearing = ref(false)

const checkedItems = computed(() => items.value.filter((i) => i.checked))
const allChecked = computed(() => items.value.length > 0 && checkedItems.value.length === items.value.length)
const totalAmount = computed(() => checkedItems.value.reduce((sum, i) => sum + (i.product?.price_cents ?? 0) * i.quantity, 0))

function imageOf(item: CartItem) {
  return item.product?.images?.[0]?.url ?? ''
}

function fallbackUrl(e: Event) {
  ;(e.target as HTMLImageElement).src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#9c9a90" text-anchor="middle" dominant-baseline="middle">暂无图片</text></svg>`,
    )
}

async function load() {
  loading.value = true
  try {
    items.value = await listCartItems()
    cartStore.count = items.value.reduce((s, i) => s + i.quantity, 0)
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function toggleItem(item: CartItem) {
  const next = !item.checked
  item.checked = next
  try {
    await setItemChecked(item.product_id, next)
  } catch (e) {
    item.checked = !next
    toastError((e as Error).message)
  }
}

async function toggleAll() {
  const next = !allChecked.value
  try {
    await setAllChecked(next)
    items.value.forEach((i) => (i.checked = next))
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function changeQty(item: CartItem, qty: number) {
  const old = item.quantity
  item.quantity = qty
  cartStore.count = items.value.reduce((s, i) => s + i.quantity, 0)
  try {
    await updateCartItem(item.product_id, qty)
  } catch (e) {
    item.quantity = old
    toastError((e as Error).message)
  }
}

async function remove(item: CartItem) {
  try {
    await deleteCartItem(item.product_id)
    await load()
    toastSuccess('已移除')
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function clearAll() {
  if (clearing.value) return
  if (!window.confirm('确认清空购物车？清空后所有商品将被移除。')) return
  clearing.value = true
  try {
    await clearCart()
    items.value = []
    cartStore.count = 0
    toastSuccess('购物车已清空')
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    clearing.value = false
  }
}

function goCheckout() {
  if (!checkedItems.value.length) {
    toastError('请先勾选要结算的商品')
    return
  }
  router.push({ name: 'checkout', query: { source: 'cart' } })
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="section-title" style="margin-bottom: 24px">
      购物车 <span class="en">/ Cart</span>
      <span v-if="items.length" class="count">{{ items.length }} 种商品</span>
    </div>

    <div v-if="loading" class="card" style="padding: 60px">
      <div class="skeleton" style="height: 120px; border-radius: 16px"></div>
    </div>

    <EmptyState v-else-if="!items.length" icon="cart" title="购物车还是空的" desc="去挑几件喜欢的好东西吧。">
      <RouterLink to="/products" class="btn btn-primary">去逛逛</RouterLink>
    </EmptyState>

    <div v-else class="cart-layout">
      <div class="cart-list">
        <div class="select-all">
          <label class="check-label">
            <input type="checkbox" :checked="allChecked" @change="toggleAll" />
            <span>全选</span>
          </label>
          <button class="clear-cart" :disabled="clearing" @click="clearAll">
            {{ clearing ? '清空中…' : '清空购物车' }}
          </button>
        </div>

        <div v-for="item in items" :key="item.product_id" class="cart-item card">
          <label class="check-label">
            <input type="checkbox" :checked="item.checked" @change="toggleItem(item)" />
            <span></span>
          </label>
          <div class="item-img" @click="router.push({ name: 'product-detail', params: { id: item.product_id } })">
            <img :src="imageOf(item)" :alt="item.product?.name" @error="fallbackUrl" />
          </div>
          <div class="item-main">
            <div class="item-name" @click="router.push({ name: 'product-detail', params: { id: item.product_id } })">
              {{ item.product?.name ?? '商品 #' + item.product_id }}
            </div>
            <div class="item-price">¥{{ formatPriceGrouped(item.product?.price_cents ?? 0) }}</div>
          </div>
          <QuantityStepper :model-value="item.quantity" :min="1" :max="Math.max(1, item.product?.stock ?? 999)" @change="(v) => changeQty(item, v)" />
          <div class="item-subtotal">¥{{ formatPriceGrouped((item.product?.price_cents ?? 0) * item.quantity) }}</div>
          <button class="remove" aria-label="删除" @click="remove(item)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
            </svg>
          </button>
        </div>
      </div>

      <div class="cart-summary card">
        <h3 class="summary-title">订单摘要</h3>
        <div class="summary-row">
          <span>已选商品</span>
          <span>{{ checkedItems.length }} 种 / {{ checkedItems.reduce((s, i) => s + i.quantity, 0) }} 件</span>
        </div>
        <div class="summary-row total">
          <span>合计</span>
          <span class="total-price">¥{{ formatPriceGrouped(totalAmount) }}</span>
        </div>
        <button class="btn btn-primary btn-lg btn-block" @click="goCheckout">去结算</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.count {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
}

.cart-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.select-all {
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-cart {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-3);
  transition: color 0.12s ease;
}

.clear-cart:hover:not(:disabled) {
  color: var(--danger);
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.check-label input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
}

.item-img {
  width: 84px;
  height: 84px;
  border-radius: var(--r-md);
  overflow: hidden;
  flex-shrink: 0;
  background: #efede6;
  cursor: pointer;
}

.item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-name:hover {
  color: var(--accent);
}

.item-price {
  font-size: 13px;
  color: var(--ink-2);
  margin-top: 6px;
}

.item-subtotal {
  font-size: 16px;
  font-weight: 800;
  min-width: 90px;
  text-align: right;
}

.remove {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  transition: all 0.12s ease;
}

.remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.cart-summary {
  position: sticky;
  top: 88px;
  padding: 22px;
}

.summary-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--ink-2);
  padding: 8px 0;
}

.summary-row.total {
  border-top: 1px solid var(--line);
  margin-top: 8px;
  padding-top: 16px;
  align-items: baseline;
}

.total-price {
  font-size: 24px;
  font-weight: 900;
  color: var(--ink);
}

.cart-summary .btn {
  margin-top: 14px;
}

@media (max-width: 860px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }

  .item-subtotal {
    display: none;
  }
}
</style>

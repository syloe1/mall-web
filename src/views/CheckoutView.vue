<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listCheckedItems } from '@/api/cart'
import { getProduct } from '@/api/products'
import { listAddresses } from '@/api/addresses'
import { createOrderFromCart, buyNow } from '@/api/orders'
import type { Address, CartItem, Product } from '@/types'
import { formatPriceGrouped, fullAddress } from '@/utils/format'
import { useCartStore } from '@/stores/cart'
import { toastError, toastInfo } from '@/stores/toast'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const mode = computed(() => (route.query.buy === '1' ? 'buy' : 'cart'))

const cartItems = ref<CartItem[]>([])
const buyProduct = ref<Product | null>(null)
const buyQty = ref(1)
const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const loading = ref(true)
const placing = ref(false)

const totalAmount = computed(() => {
  if (mode.value === 'buy') {
    return (buyProduct.value?.price_cents ?? 0) * buyQty.value
  }
  return cartItems.value.reduce((s, i) => s + (i.product?.price_cents ?? 0) * i.quantity, 0)
})

const totalCount = computed(() => {
  if (mode.value === 'buy') return buyQty.value
  return cartItems.value.reduce((s, i) => s + i.quantity, 0)
})

const defaultAddress = computed(() => addresses.value.find((a) => a.is_default) ?? null)

function fallbackUrl(e: Event) {
  ;(e.target as HTMLImageElement).src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#9c9a90" text-anchor="middle" dominant-baseline="middle">暂无图片</text></svg>',
    )
}

async function load() {
  loading.value = true
  try {
    if (mode.value === 'cart') {
      cartItems.value = await listCheckedItems()
    } else {
      const pid = Number(route.query.product_id)
      buyQty.value = Number(route.query.quantity) || 1
      if (!pid) throw new Error('缺少商品参数')
      buyProduct.value = await getProduct(pid)
    }
    addresses.value = await listAddresses()
    selectedAddressId.value = defaultAddress.value?.ID ?? addresses.value[0]?.ID ?? null
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function placeOrder() {
  if (!selectedAddressId.value) {
    toastInfo('请先选择收货地址')
    return
  }
  placing.value = true
  try {
    const order =
      mode.value === 'cart'
        ? await createOrderFromCart(selectedAddressId.value)
        : await buyNow(buyProduct.value!.ID, buyQty.value, selectedAddressId.value)

    if (mode.value === 'cart') cartStore.refresh()
    router.replace({
      name: 'payment',
      query: { order_id: order.ID, order_no: order.order_no, amount: order.total_amount },
    })
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    placing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="section-title" style="margin-bottom: 24px">
      确认订单 <span class="en">/ Checkout</span>
    </div>

    <div v-if="loading" class="card" style="padding: 60px">
      <div class="skeleton" style="height: 120px; border-radius: 16px"></div>
    </div>

    <div v-else class="co-layout">
      <div class="co-main">
        <!-- 收货地址 -->
        <section class="card block">
          <div class="block-head">
            <h3>收货地址</h3>
            <RouterLink :to="{ name: 'addresses', query: { redirect: route.fullPath } }" class="manage">管理地址</RouterLink>
          </div>

          <EmptyState v-if="!addresses.length" icon="empty" title="还没有收货地址" desc="下单前需要至少一个收货地址。">
            <RouterLink :to="{ name: 'addresses', query: { redirect: route.fullPath } }" class="btn btn-primary btn-sm">去添加地址</RouterLink>
          </EmptyState>

          <div v-else class="addr-grid">
            <button
              v-for="addr in addresses"
              :key="addr.ID"
              class="addr-card"
              :class="{ active: addr.ID === selectedAddressId }"
              @click="selectedAddressId = addr.ID"
            >
              <div class="addr-top">
                <span class="addr-name">{{ addr.receiver_name }}</span>
                <span class="addr-phone">{{ addr.phone }}</span>
                <span v-if="addr.is_default" class="tag">默认</span>
              </div>
              <div class="addr-detail">{{ fullAddress(addr) }}</div>
            </button>
          </div>
        </section>

        <!-- 商品清单 -->
        <section class="card block">
          <h3 class="block-title">商品清单</h3>
          <template v-if="mode === 'cart'">
            <div v-for="item in cartItems" :key="item.product_id" class="co-item">
              <img class="co-img" :src="item.product?.images?.[0]?.url ?? ''" :alt="item.product?.name" @error="fallbackUrl" />
              <div class="co-item-name">{{ item.product?.name ?? '商品 #' + item.product_id }}</div>
              <div class="co-qty">×{{ item.quantity }}</div>
              <div class="co-price">¥{{ formatPriceGrouped((item.product?.price_cents ?? 0) * item.quantity) }}</div>
            </div>
          </template>
          <template v-else-if="buyProduct">
            <div class="co-item">
              <img class="co-img" :src="buyProduct.images?.[0]?.url ?? ''" :alt="buyProduct.name" @error="fallbackUrl" />
              <div class="co-item-name">{{ buyProduct.name }}</div>
              <div class="co-qty">×{{ buyQty }}</div>
              <div class="co-price">¥{{ formatPriceGrouped(buyProduct.price_cents * buyQty) }}</div>
            </div>
          </template>
        </section>
      </div>

      <div class="co-summary card">
        <h3 class="summary-title">订单摘要</h3>
        <div class="summary-row">
          <span>共 {{ totalCount }} 件</span>
          <span class="summary-amount">¥{{ formatPriceGrouped(totalAmount) }}</span>
        </div>
        <div class="summary-note">提交后将进入收银台支付。</div>
        <button class="btn btn-primary btn-lg btn-block" :disabled="placing || !selectedAddressId || (mode === 'cart' && !cartItems.length)" @click="placeOrder">
          {{ placing ? '提交中…' : '提交订单' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.co-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

.co-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block {
  padding: 22px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.block-head h3,
.block-title {
  font-size: 16px;
  font-weight: 800;
}

.manage {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.manage:hover {
  text-decoration: underline;
}

.addr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.addr-card {
  text-align: left;
  border: 1.5px solid var(--line);
  border-radius: var(--r-md);
  padding: 14px 16px;
  background: var(--surface-2);
  transition: all 0.15s ease;
}

.addr-card:hover {
  border-color: var(--line-strong);
}

.addr-card.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.addr-name {
  font-size: 15px;
  font-weight: 800;
}

.addr-phone {
  font-size: 13px;
  color: var(--ink-2);
}

.addr-detail {
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.6;
}

.co-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.co-item:last-child {
  border-bottom: none;
}

.co-img {
  width: 56px;
  height: 56px;
  border-radius: var(--r-sm);
  object-fit: cover;
  background: #efede6;
}

.co-item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.co-qty {
  font-size: 13px;
  color: var(--ink-2);
}

.co-price {
  font-size: 15px;
  font-weight: 800;
  min-width: 90px;
  text-align: right;
}

.co-summary {
  position: sticky;
  top: 88px;
  padding: 22px;
}

.summary-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 14px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  font-size: 14px;
  color: var(--ink-2);
  border-top: 1px solid var(--line);
}

.summary-amount {
  font-size: 22px;
  font-weight: 900;
  color: var(--ink);
}

.summary-note {
  font-size: 12px;
  color: var(--ink-3);
  margin: 8px 0 16px;
}

@media (max-width: 860px) {
  .co-layout {
    grid-template-columns: 1fr;
  }

  .co-summary {
    position: static;
  }

  .addr-grid {
    grid-template-columns: 1fr;
  }
}
</style>

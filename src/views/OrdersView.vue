<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listOrders } from '@/api/orders'
import { formatPriceGrouped, formatTime } from '@/utils/format'
import { ORDER_STATUS_LABELS } from '@/types'
import type { Order } from '@/types'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(true)

function statusLabel(s: string) {
  return ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS] ?? s
}

function isPending(s: string) {
  return s === 'pending_pay'
}

function itemCount(o: Order) {
  return o.items?.reduce((n, it) => n + it.quantity, 0) ?? 0
}

function fallbackImg(e: Event) {
  const el = e.target as HTMLImageElement
  el.src =
    'data:image/svg+xml;charset=utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="#ece9e0"/></svg>',
    )
}

async function load() {
  loading.value = true
  try {
    const data = await listOrders(1, 50)
    orders.value = data.items
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="section-title" style="margin-bottom: 24px">
      我的订单 <span class="en">/ Orders</span>
    </div>

    <div v-if="loading" class="card" style="padding: 60px">
      <div class="skeleton" style="height: 120px; border-radius: 16px"></div>
    </div>

    <EmptyState v-else-if="!orders.length" icon="empty" title="还没有订单" desc="下单后，订单会显示在这里。">
      <RouterLink to="/products" class="btn btn-primary">去逛逛</RouterLink>
    </EmptyState>

    <div v-else class="order-list">
      <div v-for="o in orders" :key="o.order_no" class="order card">
        <div class="order-head">
          <div>
            <div class="order-no">订单号 {{ o.order_no }}</div>
            <div class="order-time">{{ formatTime(o.CreatedAt) }}</div>
          </div>
          <span class="tag" :class="{ 'tag-danger': isPending(o.status) }">{{ statusLabel(o.status) }}</span>
        </div>

        <div class="order-items">
          <div v-for="it in o.items" :key="it.ID" class="order-item">
            <img class="item-img" :src="it.product_image" alt="" @error="fallbackImg" />
            <div class="item-info">
              <div class="item-name" @click="router.push({ name: 'product-detail', params: { id: it.product_id } })">{{ it.product_name }}</div>
              <div class="item-meta">¥{{ formatPriceGrouped(it.price_cents) }} × {{ it.quantity }}</div>
            </div>
          </div>
        </div>

        <div class="order-body">
          <span>共 {{ itemCount(o) }} 件商品</span>
          <span class="order-amount">¥{{ formatPriceGrouped(o.total_amount) }}</span>
        </div>
        <div class="order-actions">
          <button v-if="isPending(o.status)" class="btn btn-primary btn-sm" @click="router.push({ name: 'payment', query: { order_id: o.ID, order_no: o.order_no, amount: o.total_amount } })">
            去支付
          </button>
          <RouterLink :to="{ name: 'products' }" class="btn btn-ghost btn-sm">继续购物</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order {
  padding: 18px 20px;
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.order-no {
  font-size: 14px;
  font-weight: 800;
}

.order-time {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.order-items {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  background: #efede6;
}

.item-name {
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.item-name:hover {
  color: var(--accent);
}

.item-meta {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.order-body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  margin-top: 14px;
  padding-top: 12px;
  font-size: 13px;
  color: var(--ink-2);
}

.order-amount {
  font-size: 20px;
  font-weight: 900;
  color: var(--ink);
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatPriceGrouped } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const orderNo = computed(() => String(route.query.order_no ?? ''))
const amount = computed(() => Number(route.query.amount ?? 0))
</script>

<template>
  <div class="container page">
    <div class="success">
      <div class="check">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      </div>
      <h1 class="title">下单成功</h1>
      <p class="sub">感谢你的购买，我们会尽快处理订单。</p>

      <div class="meta card">
        <div class="meta-row">
          <span>订单号</span>
          <b>{{ orderNo }}</b>
        </div>
        <div class="meta-row">
          <span>支付金额</span>
          <b class="amount">¥{{ formatPriceGrouped(amount) }}</b>
        </div>
      </div>

      <div class="actions">
        <RouterLink to="/orders" class="btn btn-primary">查看订单</RouterLink>
        <RouterLink to="/products" class="btn btn-ghost">继续购物</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  padding: 48px 0;
}

.check {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.title {
  font-size: 26px;
  font-weight: 900;
}

.sub {
  color: var(--ink-2);
  font-size: 14px;
  margin: 8px 0 26px;
}

.meta {
  text-align: left;
  padding: 8px 18px;
  margin-bottom: 24px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  font-size: 14px;
  color: var(--ink-2);
}

.meta-row + .meta-row {
  border-top: 1px solid var(--line);
}

.meta-row b {
  color: var(--ink);
}

.meta-row .amount {
  font-size: 20px;
  font-weight: 900;
  color: var(--accent);
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>

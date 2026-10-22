<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPayment, getPayment, mockPaySuccess } from '@/api/payments'
import type { Payment } from '@/types'
import { PAYMENT_CHANNEL_LABELS } from '@/types'
import { formatPriceGrouped } from '@/utils/format'
import { toastError, toastSuccess } from '@/stores/toast'
import { fetchMeta } from '@/api/meta'
import { humanizeError } from '@/utils/copy'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => Number(route.query.order_id))
const orderNo = computed(() => String(route.query.order_no ?? ''))
const amount = computed(() => Number(route.query.amount ?? 0))

const channel = ref<'mock' | 'balance'>('mock')
const demoMode = ref(true)
const payPassword = ref('')
const payment = ref<Payment | null>(null)
const busy = ref(false)
const confirming = ref(false)

onMounted(async () => {
  const meta = await fetchMeta()
  demoMode.value = meta.demo_mode
  channel.value = meta.demo_mode ? 'mock' : 'balance'
})

async function pay() {
  if (busy.value) return
  busy.value = true
  try {
    const p = await createPayment(orderId.value, channel.value, channel.value === 'balance' ? payPassword.value : undefined)
    payment.value = p
    if (p.status === 'success') {
      toastSuccess('支付成功')
      goSuccess()
      return
    }
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    busy.value = false
  }
}

async function refreshPayment() {
  if (!payment.value) return
  try {
    payment.value = await getPayment(payment.value.payment_no)
    if (payment.value.status === 'success') goSuccess()
  } catch (e) {
    toastError(humanizeError(e))
  }
}

async function mockSuccess() {
  if (!payment.value || confirming.value) return
  confirming.value = true
  try {
    await mockPaySuccess(payment.value.payment_no)
    toastSuccess('支付成功')
    goSuccess()
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    confirming.value = false
  }
}

function goSuccess() {
  router.replace({ name: 'order-success', query: { order_no: orderNo.value, amount: amount.value } })
}
</script>

<template>
  <div class="container page">
    <div class="pay-wrap">
      <div class="pay-card card">
        <div class="pay-head">
          <div>
            <h1 class="pay-title">收银台</h1>
            <p class="pay-sub">订单号 {{ orderNo }}</p>
          </div>
          <span class="tag">待支付</span>
        </div>

        <div class="amount-box">
          <span class="amount-label">应付金额</span>
          <div class="amount">¥{{ formatPriceGrouped(amount) }}</div>
        </div>

        <template v-if="!payment">
          <h3 class="ch-title">选择支付方式</h3>
          <div class="channels">
            <button
              v-if="demoMode"
              class="channel"
              :class="{ active: channel === 'mock' }"
              @click="channel = 'mock'"
            >
              <span class="ch-name">{{ PAYMENT_CHANNEL_LABELS.mock }}</span>
              <span class="ch-desc">演示支付，不产生真实扣款</span>
            </button>
            <button class="channel" :class="{ active: channel === 'balance' }" @click="channel = 'balance'">
              <span class="ch-name">{{ PAYMENT_CHANNEL_LABELS.balance }}</span>
              <span class="ch-desc">使用账户余额支付</span>
            </button>
          </div>

          <div v-if="channel === 'balance'" class="field" style="margin-top: 16px">
            <label for="pay-password">支付密码</label>
            <input id="pay-password" v-model="payPassword" class="input" type="password" placeholder="输入支付密码（若未设置请先在个人中心设置）" autocomplete="off" />
          </div>

          <button class="btn btn-primary btn-lg btn-block" style="margin-top: 20px" :disabled="busy" @click="pay">
            {{ busy ? '支付中…' : `确认支付 ¥${formatPriceGrouped(amount)}` }}
          </button>
        </template>

        <template v-else>
          <div class="pay-status">
            <div class="status-line">
              <span>支付单号</span>
              <b>{{ payment.payment_no }}</b>
            </div>
            <div class="status-line">
              <span>支付状态</span>
              <b :class="payment.status === 'success' ? 'ok' : 'pending'">{{ payment.status === 'success' ? '支付成功' : '待支付' }}</b>
            </div>
          </div>
          <p v-if="demoMode" class="demo-note">演示模式：这是模拟支付，不会产生真实扣款。</p>
          <div class="btn-row">
            <button class="btn btn-ghost" :disabled="confirming" @click="refreshPayment">刷新状态</button>
            <button v-if="demoMode" class="btn btn-primary" :disabled="confirming" @click="mockSuccess">
              {{ confirming ? '处理中…' : '模拟支付成功' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-note {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--warn-soft);
  border: 1px solid color-mix(in srgb, var(--warn) 30%, var(--line));
  border-radius: var(--r-sm);
  padding: 9px 12px;
}

.pay-wrap {
  display: flex;
  justify-content: center;
}

.pay-card {
  width: 100%;
  max-width: 560px;
  padding: 30px;
}

.pay-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.pay-title {
  font-size: 24px;
  font-weight: 900;
}

.pay-sub {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: 4px;
}

.amount-box {
  background: var(--accent-soft);
  border-radius: var(--r-md);
  padding: 20px;
  margin: 22px 0;
  text-align: center;
}

.amount-label {
  font-size: 13px;
  color: var(--ink-2);
}

.amount {
  font-size: 40px;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -0.02em;
  margin-top: 4px;
}

.ch-title {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 10px;
}

.channels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.channel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1.5px solid var(--line);
  border-radius: var(--r-md);
  padding: 14px 16px;
  background: var(--surface-2);
  text-align: left;
  transition: all 0.15s ease;
}

.channel:hover {
  border-color: var(--line-strong);
}

.channel.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.ch-name {
  font-size: 15px;
  font-weight: 800;
}

.ch-desc {
  font-size: 12px;
  color: var(--ink-2);
}

.pay-status {
  background: var(--surface-2);
  border-radius: var(--r-md);
  padding: 16px 18px;
  margin: 8px 0 18px;
}

.status-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 6px 0;
  color: var(--ink-2);
}

.status-line b {
  color: var(--ink);
}

.status-line .ok {
  color: var(--accent);
}

.status-line .pending {
  color: var(--warn);
}

.btn-row {
  display: flex;
  gap: 10px;
}

.btn-row .btn {
  flex: 1;
}
</style>

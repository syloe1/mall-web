<script setup lang="ts">
import { toastState } from '@/stores/toast'
</script>

<template>
  <!-- 屏幕阅读器播报：成功后自动朗读，不打断用户 -->
  <div class="toast-host" role="status" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="item in toastState.items" :key="item.id" class="toast" :class="`toast-${item.type}`">
        <span class="dot" aria-hidden="true"></span>
        {{ item.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 999px;
  box-shadow: var(--shadow-lg);
  max-width: 84vw;
}

.toast .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.toast-success .dot {
  background: #4ade80;
}

.toast-error .dot {
  background: #f87171;
}

.toast-info .dot {
  background: #93c5fd;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>

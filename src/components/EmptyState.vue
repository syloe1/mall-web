<script setup lang="ts">
defineProps<{
  title?: string
  desc?: string
  icon?: 'empty' | 'search' | 'cart' | 'heart'
}>()
</script>

<template>
  <div class="empty">
    <div class="icon-wrap">
      <svg v-if="icon === 'search'" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <svg v-else-if="icon === 'cart'" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
        <path d="M4 5h2l2.2 11h9.6L21 8H7" />
        <circle cx="10" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
      <svg v-else-if="icon === 'heart'" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
        <path d="M12 20.3 4.7 13a5.2 5.2 0 1 1 7.3-7.3 5.2 5.2 0 1 1 7.3 7.3Z" />
      </svg>
      <svg v-else width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9h17" />
      </svg>
    </div>
    <div class="empty-title">{{ title ?? '暂无内容' }}</div>
    <p v-if="desc" class="empty-desc">{{ desc }}</p>
    <div class="empty-action">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.empty {
  text-align: center;
  padding: 64px 20px;
  color: var(--ink-3);
}

.icon-wrap {
  width: 76px;
  height: 76px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1.5px dashed var(--line-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
}

.empty-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: var(--ink-3);
  max-width: 420px;
  margin: 0 auto;
}

.empty-action {
  margin-top: 18px;
}
</style>

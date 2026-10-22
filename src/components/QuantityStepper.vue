<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const min = () => props.min ?? 1
const max = () => props.max ?? 999

function setValue(next: number) {
  const clamped = Math.min(Math.max(next, min()), max())
  if (clamped === props.modelValue) return
  emit('update:modelValue', clamped)
  emit('change', clamped)
}
</script>

<template>
  <div class="stepper" :class="{ disabled }">
    <button class="step-btn" :disabled="disabled || modelValue <= min()" aria-label="减少" @click="setValue(modelValue - 1)">−</button>
    <span class="value">{{ modelValue }}</span>
    <button class="step-btn" :disabled="disabled || modelValue >= max()" aria-label="增加" @click="setValue(modelValue + 1)">+</button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  overflow: hidden;
}

.step-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--ink);
  transition: background 0.12s ease;
}

.step-btn:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent);
}

.step-btn:disabled {
  color: var(--ink-3);
  cursor: not-allowed;
}

.value {
  min-width: 40px;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
}

.disabled {
  opacity: 0.6;
}
</style>

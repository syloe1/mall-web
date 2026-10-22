<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  width?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const dialogRef = ref<HTMLDivElement | null>(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`
let previousFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  // 焦点陷阱：Tab 循环限制在对话框内部
  const focusable = focusableElements()
  if (!focusable.length) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      const focusable = focusableElements()
      ;(focusable[0] ?? dialogRef.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      document.body.style.overflow = ''
      previousFocus?.focus()
      previousFocus = null
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-mask" @click.self="emit('close')">
        <div
          ref="dialogRef"
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : '对话框'"
          :style="{ maxWidth: width ?? '560px' }"
          tabindex="-1"
        >
          <div class="modal-head">
            <h3 :id="titleId" class="modal-title">{{ title }}</h3>
            <button class="close" aria-label="关闭对话框" @click="emit('close')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 23, 0.45);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  width: 100%;
  background: var(--surface);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  max-height: 86vh;
  overflow-y: auto;
}

.modal:focus {
  outline: none;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: var(--surface);
  border-radius: 20px 20px 0 0;
  z-index: 1;
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
}

.close {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  transition: background 0.12s ease;
}

.close:hover {
  background: var(--surface-2);
}

.modal-body {
  padding: 22px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 480px) {
  .modal-mask {
    padding: 10px;
    align-items: flex-end;
  }

  .modal {
    border-radius: 18px;
    max-height: 92vh;
  }

  .modal-head {
    padding: 14px 16px;
    border-radius: 18px 18px 0 0;
  }

  .modal-body {
    padding: 16px;
  }
}
</style>

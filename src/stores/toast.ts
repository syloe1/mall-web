import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  text: string
}

export const toastState = reactive<{ items: ToastItem[] }>({ items: [] })

let seed = 0

export function toast(text: string, type: ToastType = 'info', duration = 2600) {
  const id = ++seed
  toastState.items.push({ id, type, text })
  setTimeout(() => {
    const index = toastState.items.findIndex((t) => t.id === id)
    if (index >= 0) toastState.items.splice(index, 1)
  }, duration)
}

export const toastSuccess = (text: string) => toast(text, 'success')
export const toastError = (text: string) => toast(text, 'error')
export const toastInfo = (text: string) => toast(text, 'info')

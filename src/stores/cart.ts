import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listCartItems } from '@/api/cart'

export const useCartStore = defineStore('cart', () => {
  const count = ref(0)

  async function refresh() {
    try {
      const items = await listCartItems()
      count.value = items.reduce((sum, item) => sum + item.quantity, 0)
    } catch {
      count.value = 0
    }
  }

  function reset() {
    count.value = 0
  }

  return { count, refresh, reset }
})

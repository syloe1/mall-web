import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listCategories } from '@/api/categories'
import { CATEGORY_LABELS, type Category } from '@/types'

/**
 * 商品分类 store：分类字典由后端 GET /api/v1/categories 下发，
 * 前端不再维护硬编码映射（types 里的 CATEGORY_LABELS 只作为接口失败时的兜底）。
 */
export const useCategoryStore = defineStore('category', () => {
  const items = ref<Category[]>([])
  const loading = ref(false)
  let pending: Promise<void> | null = null

  const map = computed<Record<number, string>>(() => {
    const result: Record<number, string> = { ...CATEGORY_LABELS }
    for (const item of items.value) result[item.id] = item.name
    return result
  })

  function labelOf(id: number | undefined | null): string {
    if (!id) return '未分类'
    return map.value[id] ?? `分类 ${id}`
  }

  async function ensureLoaded() {
    if (items.value.length) return
    pending ??= listCategories()
      .then((list) => {
        items.value = Array.isArray(list) ? list : []
      })
      .catch(() => {
        // 接口失败时保留兜底映射，不影响页面渲染
      })
      .finally(() => {
        pending = null
      })
    await pending
  }

  return { items, loading, map, labelOf, ensureLoaded }
})

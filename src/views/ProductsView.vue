<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listProducts } from '@/api/products'
import type { Product } from '@/types'
import { useCategoryStore } from '@/stores/categories'
import { humanizeError, LABELS } from '@/utils/copy'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categoryId = computed(() => {
  const raw = route.query.category_id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
})

const pageTitle = computed(() =>
  categoryId.value ? categoryStore.labelOf(categoryId.value) : '全部商品',
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listProducts({
      page: page.value,
      page_size: pageSize,
      category_id: categoryId.value,
    })
    products.value = data.items
    total.value = data.total
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function goCategory(id?: number) {
  router.push({ name: 'products', query: id ? { category_id: id } : {} })
}

watch(categoryId, () => {
  page.value = 1
  load()
})

onMounted(async () => {
  categoryStore.ensureLoaded()
  await load()
})
</script>

<template>
  <div class="container page">
    <div class="list-head">
      <div class="section-title">
        {{ pageTitle }} <span class="en">/ {{ LABELS.en.shopAll }}</span>
        <span class="count">{{ total ? `共 ${total} 件` : '' }}</span>
      </div>
      <div class="chips">
        <button class="pill" :class="{ active: !categoryId }" @click="goCategory()">全部</button>
        <button
          v-for="c in categoryStore.items"
          :key="c.id"
          class="pill"
          :class="{ active: categoryId === c.id }"
          @click="goCategory(c.id)"
        >
          {{ c.name }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid" aria-busy="true" aria-label="商品加载中">
      <div v-for="i in 8" :key="i" class="sk-card" aria-hidden="true">
        <div class="skeleton sk-img"></div>
        <div class="skeleton sk-line" style="width: 70%"></div>
        <div class="skeleton sk-line" style="width: 40%"></div>
      </div>
    </div>

    <div v-else-if="error" class="empty">
      <div class="empty-title">加载失败</div>
      <p>{{ error }}</p>
      <div class="empty-action">
        <button class="btn btn-primary btn-sm" @click="load()">重试</button>
      </div>
    </div>

    <template v-else>
      <div v-if="products.length" class="grid">
        <ProductCard v-for="(p, index) in products" :key="p.ID" :product="p" :priority="index < 4" />
      </div>
      <EmptyState v-else icon="empty" title="该分类暂无商品" desc="换个分类看看，或者稍后再来。" />

      <div v-if="totalPages > 1" class="pager">
        <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="page--; load()">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.list-head {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.count {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.sk-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 14px;
}

.sk-img {
  aspect-ratio: 1 / 1;
  margin-bottom: 12px;
}

.sk-line {
  height: 14px;
  margin-bottom: 10px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 36px;
}

.page-info {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-2);
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .grid {
    gap: 12px;
  }

  .list-head {
    margin-bottom: 16px;
  }
}
</style>

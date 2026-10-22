<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchProducts } from '@/api/products'
import type { Product } from '@/types'
import { humanizeError, LABELS, SEARCH_EXAMPLES } from '@/utils/copy'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const products = ref<Product[]>([])
const loading = ref(false)
const searched = ref(false)
const keyword = ref('')
const total = ref(0)
const pageSize = 12

const q = computed(() => String(route.query.q ?? '').trim())

async function run() {
  keyword.value = q.value
  if (!q.value) {
    products.value = []
    searched.value = false
    return
  }
  loading.value = true
  try {
    const data = await searchProducts({ page: 1, page_size: pageSize, keyword: q.value })
    products.value = data.items
    total.value = data.total
    searched.value = true
  } catch {
    products.value = []
    searched.value = true
  } finally {
    loading.value = false
  }
}

// 加载下一页并追加（按 ID 去重）
const loadingMore = ref(false)
async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    const nextPage = Math.floor(products.value.length / pageSize) + 1
    const data = await searchProducts({ page: nextPage, page_size: pageSize, keyword: q.value })
    const existing = new Set(products.value.map((p) => p.ID))
    for (const p of data.items) {
      if (!existing.has(p.ID)) products.value.push(p)
    }
    total.value = data.total
  } catch {
    /* 忽略单次加载更多失败 */
  } finally {
    loadingMore.value = false
  }
}

watch(q, run, { immediate: true })

function submit() {
  const kw = keyword.value.trim()
  router.push({ name: 'search', query: kw ? { q: kw } : {} })
}

function useExample(example: string) {
  keyword.value = example
  submit()
}
</script>

<template>
  <div class="container page">
    <div class="search-head">
      <div class="section-title">
        搜索结果 <span class="en">/ {{ LABELS.en.search }}</span>
      </div>
      <form class="search-box" role="search" @submit.prevent="submit">
        <label class="sr-only" for="search-page-input">搜索商品关键词</label>
        <input
          id="search-page-input"
          v-model="keyword"
          class="input"
          type="search"
          placeholder="输入关键词，回车搜索"
          autocomplete="off"
        />
        <button class="btn btn-primary" type="submit">搜索</button>
      </form>
    </div>

    <p v-if="searched && !loading" class="summary">
      “{{ q }}” 找到 <b>{{ total }}</b> 件商品
    </p>

    <div v-if="loading" class="grid" aria-busy="true" aria-label="搜索中">
      <div v-for="i in 8" :key="i" class="skeleton sk-card" aria-hidden="true"></div>
    </div>

    <template v-else>
      <div v-if="products.length" class="grid">
        <ProductCard v-for="(p, index) in products" :key="p.ID" :product="p" :priority="index < 4" />
      </div>
      <EmptyState
        v-else-if="searched"
        icon="search"
        title="没有找到相关商品"
        :desc="`换个关键词试试，例如「${SEARCH_EXAMPLES[0]}」「${SEARCH_EXAMPLES[2]}」。商品搜索走 Meilisearch 索引，管理员新建商品会自动同步；历史数据缺失时可在后台「重建搜索索引」。`"
      />
      <div v-else class="search-guide">
        <EmptyState icon="search" title="搜索商品" desc="输入关键词开始搜索，试试这些在售商品的词：">
          <div class="examples">
            <button v-for="example in SEARCH_EXAMPLES" :key="example" class="pill" @click="useExample(example)">
              {{ example }}
            </button>
          </div>
        </EmptyState>
      </div>
    </template>

    <div v-if="total > products.length" class="more">
      <button class="btn btn-ghost btn-sm" :disabled="loadingMore" @click="loadMore()">
        {{ loadingMore ? '加载中…' : `加载更多（已显示 ${products.length} / ${total}）` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-head {
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  max-width: 560px;
}

.search-box .input {
  flex: 1;
}

.summary {
  font-size: 14px;
  color: var(--ink-2);
  margin-bottom: 18px;
}

.summary b {
  color: var(--ink);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.sk-card {
  aspect-ratio: 1 / 1.15;
}

.examples {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.more {
  text-align: center;
  margin-top: 32px;
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
}
</style>

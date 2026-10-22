<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  initSeckillStock,
  listDeadLetters,
  reindexProducts,
} from '@/api/admin'
import type { DeadLetter, Product } from '@/types'
import { PRODUCT_STATUS_LABELS, type ProductStatus } from '@/types'
import { useCategoryStore } from '@/stores/categories'
import { useUserStore } from '@/stores/user'
import { fetchMeta } from '@/api/meta'
import { humanizeError } from '@/utils/copy'
import { formatPriceGrouped, formatTime } from '@/utils/format'
import { toastSuccess, toastError } from '@/stores/toast'
import Modal from '@/components/Modal.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const categoryStore = useCategoryStore()
const userStore = useUserStore()

const tab = ref<'products' | 'seckill' | 'deadletters'>('products')
const demoMode = ref(false)
const isDemoAdmin = computed(() => demoMode.value && userStore.profile?.username === 'admin')

// ---------------- 商品管理 ----------------
const products = ref<Product[]>([])
const productsLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 10
const statusFilter = ref('')
const searchKeyword = ref('')

const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  price_yuan: '',
  description: '',
  stock: 0,
  category_id: 1,
  status: 'on_sale' as ProductStatus | 'draft' | 'off_sale',
  images_text: '',
})

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'on_sale', label: '在售' },
  { value: 'off_sale', label: '下架' },
  { value: 'draft', label: '草稿' },
]

function resetForm() {
  editingId.value = null
  form.name = ''
  form.price_yuan = ''
  form.description = ''
  form.stock = 0
  form.category_id = 1
  form.status = 'on_sale'
  form.images_text = ''
}

async function loadProducts() {
  productsLoading.value = true
  try {
    const data = await adminListProducts({
      page: page.value,
      page_size: pageSize,
      status: statusFilter.value || undefined,
      keyword: searchKeyword.value || undefined,
    })
    products.value = data.items
    total.value = data.total
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    productsLoading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function openCreate() {
  resetForm()
  editorOpen.value = true
}

function openEdit(p: Product) {
  editingId.value = p.ID
  form.name = p.name
  form.price_yuan = (p.price_cents / 100).toFixed(2)
  form.description = p.description
  form.stock = p.stock
  form.category_id = p.category_id
  form.status = p.status === 'sold_out' ? 'on_sale' : p.status
  form.images_text = p.images.map((i) => i.url).join('\n')
  editorOpen.value = true
}

function parseImages(): string[] {
  return form.images_text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function saveProduct() {
  if (!form.name.trim()) {
    toastError('请填写商品名称')
    return
  }
  const priceCents = Math.round(Number(form.price_yuan) * 100)
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    toastError('请填写正确的价格（元）')
    return
  }
  const images = parseImages()
  if (form.status === 'on_sale' && !images.length) {
    toastError('在售商品至少需要一张图片')
    return
  }
  const payload = {
    name: form.name.trim(),
    price_cents: priceCents,
    description: form.description.trim(),
    stock: form.stock,
    category_id: form.category_id,
    status: form.status,
    images,
  }
  try {
    if (editingId.value) {
      await adminUpdateProduct(editingId.value, payload)
      toastSuccess('商品已更新')
    } else {
      await adminCreateProduct(payload)
      toastSuccess('商品已创建')
    }
    editorOpen.value = false
    await loadProducts()
  } catch (e) {
    toastError(humanizeError(e))
  }
}

async function removeProduct(p: Product) {
  if (!window.confirm(`确认删除商品「${p.name}」（ID ${p.ID}）？此操作不可恢复。`)) return
  try {
    await adminDeleteProduct(p.ID)
    toastSuccess('已删除')
    await loadProducts()
  } catch (e) {
    toastError(humanizeError(e))
  }
}

function applySearch() {
  page.value = 1
  loadProducts()
}

function imageOf(p: Product) {
  return p.images?.[0]?.url ?? ''
}

function fallbackUrl(e: Event) {
  ;(e.target as HTMLImageElement).src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#ece9e0"/></svg>`,
    )
}

// ---------------- 搜索索引重建 ----------------
const reindexing = ref(false)

async function doReindex() {
  if (reindexing.value) return
  if (!window.confirm('将用数据库中的全部商品覆盖重建 Meilisearch 索引，确定继续？')) return
  reindexing.value = true
  try {
    const res = await reindexProducts()
    toastSuccess(`索引已重建，共 ${res.indexed} 个商品`)
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    reindexing.value = false
  }
}

// ---------------- 秒杀库存 ----------------
const seckillActivityId = ref<number | null>(null)
const seckillBusy = ref(false)

async function initStock() {
  if (!seckillActivityId.value || seckillActivityId.value <= 0) {
    toastError('请输入有效的活动 ID')
    return
  }
  seckillBusy.value = true
  try {
    await initSeckillStock(seckillActivityId.value)
    toastSuccess('库存初始化成功')
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    seckillBusy.value = false
  }
}

// ---------------- 死信队列 ----------------
const deadLetters = ref<DeadLetter[]>([])
const deadLoading = ref(false)

async function loadDeadLetters() {
  deadLoading.value = true
  try {
    const data = await listDeadLetters({ page: 1, page_size: 20 })
    deadLetters.value = data.items
  } catch (e) {
    toastError(humanizeError(e))
  } finally {
    deadLoading.value = false
  }
}

onMounted(async () => {
  categoryStore.ensureLoaded()
  fetchMeta().then((meta) => (demoMode.value = meta.demo_mode))
  await loadProducts()
})
</script>

<template>
  <div class="container page">
    <div class="head">
      <div class="section-title">
        管理后台 <span class="en">/ Admin</span>
      </div>
      <button class="btn btn-ghost btn-sm" @click="router.push({ name: 'home' })">返回前台</button>
    </div>

    <div v-if="isDemoAdmin" class="demo-banner" role="status">
      <b>演示管理员模式</b>
      <span>你可以体验商品管理、死信队列、重建搜索索引；演示数据每日 04:00 自动重置。模拟支付入口仅在 DEMO_MODE 下开放。</span>
    </div>

    <div class="tabs" role="tablist" aria-label="后台功能">
      <button class="tab" role="tab" :aria-selected="tab === 'products'" :class="{ active: tab === 'products' }" @click="tab = 'products'">商品管理</button>
      <button class="tab" role="tab" :aria-selected="tab === 'seckill'" :class="{ active: tab === 'seckill' }" @click="tab = 'seckill'">秒杀库存</button>
      <button class="tab" role="tab" :aria-selected="tab === 'deadletters'" :class="{ active: tab === 'deadletters' }" @click="tab = 'deadletters'; loadDeadLetters()">死信队列</button>
    </div>

    <!-- 商品管理 -->
    <div v-show="tab === 'products'">
      <div class="toolbar">
        <input v-model="searchKeyword" class="input toolbar-search" placeholder="搜索名称…" @keyup.enter="applySearch" />
        <select v-model="statusFilter" class="select toolbar-select" @change="applySearch">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="btn btn-ghost" @click="applySearch">查询</button>
        <button class="btn btn-primary" @click="openCreate">+ 新建商品</button>
        <button class="btn btn-ghost" :disabled="reindexing" @click="doReindex">
          {{ reindexing ? '重建中…' : '重建搜索索引' }}
        </button>
      </div>

      <div class="card table-card">
        <table class="table products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>图片</th>
              <th>名称</th>
              <th>分类</th>
              <th>价格</th>
              <th>库存</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="productsLoading">
              <td colspan="8" style="padding: 40px">
                <div class="skeleton" style="height: 40px; border-radius: 10px"></div>
              </td>
            </tr>
            <tr v-for="p in products" v-else :key="p.ID">
              <td class="dim" data-label="ID">#{{ p.ID }}</td>
              <td data-label="图片"><img class="t-img" :src="imageOf(p)" :alt="p.name" @error="fallbackUrl" /></td>
              <td class="t-name" data-label="名称">{{ p.name }}</td>
              <td data-label="分类">{{ categoryStore.labelOf(p.category_id) }}</td>
              <td class="t-price" data-label="价格">¥{{ formatPriceGrouped(p.price_cents) }}</td>
              <td data-label="库存">{{ p.stock }}</td>
              <td data-label="状态"><span class="tag" :class="{ 'tag-danger': p.status !== 'on_sale' }">{{ PRODUCT_STATUS_LABELS[p.status] ?? p.status }}</span></td>
              <td data-label="操作">
                <div class="row-actions">
                  <button class="link-btn" @click="openEdit(p)">编辑</button>
                  <button class="link-btn danger" @click="removeProduct(p)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <EmptyState v-if="!productsLoading && !products.length" icon="empty" title="没有符合条件的商品" />

        <div v-if="totalPages > 1" class="pager">
          <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="page--; loadProducts()">上一页</button>
          <span class="page-info">{{ page }} / {{ totalPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="page >= totalPages" @click="page++; loadProducts()">下一页</button>
        </div>
      </div>
    </div>

    <!-- 秒杀库存 -->
    <div v-show="tab === 'seckill'">
      <div class="card panel">
        <h3 class="panel-title">初始化秒杀库存</h3>
        <p class="panel-desc">将指定秒杀活动的商品库存加载到 Redis。活动 ID 需已在后端数据库中存在。</p>
        <div class="inline-form">
          <input v-model.number="seckillActivityId" class="input" type="number" min="1" placeholder="秒杀活动 ID" style="max-width: 220px" />
          <button class="btn btn-primary" :disabled="seckillBusy" @click="initStock">
            {{ seckillBusy ? '处理中…' : '初始化库存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 死信队列 -->
    <div v-show="tab === 'deadletters'">
      <div class="card table-card">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>事件 ID</th>
              <th>类型</th>
              <th>商品</th>
              <th>来源</th>
              <th>重试</th>
              <th>错误信息</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="deadLoading">
              <td colspan="8" style="padding: 40px">
                <div class="skeleton" style="height: 40px; border-radius: 10px"></div>
              </td>
            </tr>
            <tr v-for="d in deadLetters" v-else :key="d.ID">
              <td class="dim">#{{ d.ID }}</td>
              <td class="mono">{{ d.event_id }}</td>
              <td>{{ d.event_type }}</td>
              <td>#{{ d.product_id }}</td>
              <td>{{ d.source }}</td>
              <td>{{ d.retry_count }}</td>
              <td class="err">{{ d.error_message }}</td>
              <td class="dim">{{ formatTime(d.CreatedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!deadLoading && !deadLetters.length" icon="empty" title="没有死信记录" desc="商品事件同步正常时，这里为空。" />
      </div>
    </div>

    <!-- 商品编辑弹窗 -->
    <Modal :open="editorOpen" :title="editingId ? `编辑商品 #${editingId}` : '新建商品'" width="640px" @close="editorOpen = false">
      <div class="form-grid">
        <div class="field" style="grid-column: 1 / -1">
          <label>名称 *</label>
          <input v-model="form.name" class="input" placeholder="商品名称" />
        </div>
        <div class="field">
          <label>价格（元）*</label>
          <input v-model="form.price_yuan" class="input" type="number" step="0.01" min="0.01" placeholder="如：99.00" />
        </div>
        <div class="field">
          <label>库存</label>
          <input v-model.number="form.stock" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label for="admin-category">商品分类</label>
          <select id="admin-category" v-model.number="form.category_id" class="select">
            <option v-for="c in categoryStore.items" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>状态</label>
          <select v-model="form.status" class="select">
            <option value="on_sale">在售</option>
            <option value="off_sale">下架</option>
            <option value="draft">草稿</option>
          </select>
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label>描述</label>
          <textarea v-model="form.description" class="textarea" placeholder="商品描述"></textarea>
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label>图片 URL（每行一个，在售商品至少 1 张）</label>
          <textarea v-model="form.images_text" class="textarea" placeholder="https://…"></textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="editorOpen = false">取消</button>
        <button class="btn btn-primary" @click="saveProduct">保存</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.demo-banner {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: baseline;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
  border-radius: var(--r-md);
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.demo-banner b {
  color: var(--accent);
  flex-shrink: 0;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
}

.tab {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-2);
  transition: all 0.14s ease;
}

.tab:hover {
  color: var(--ink);
}

.tab.active {
  background: var(--ink);
  color: #fff;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-search {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.toolbar-select {
  width: auto;
  min-width: 130px;
}

.table-card {
  overflow-x: auto;
  padding: 6px 14px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.table th {
  text-align: left;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.table td {
  padding: 11px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}

.table tr:last-child td {
  border-bottom: none;
}

.t-img {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm);
  object-fit: cover;
  background: #efede6;
}

.t-name {
  font-weight: 700;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.t-price {
  font-weight: 800;
  white-space: nowrap;
}

.dim {
  color: var(--ink-3);
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  color: var(--ink-2);
  white-space: nowrap;
}

.err {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--danger);
}

.row-actions {
  display: flex;
  gap: 12px;
}

.link-btn {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.link-btn:hover {
  text-decoration: underline;
}

.link-btn.danger {
  color: var(--danger);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 0;
}

.page-info {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-2);
}

.panel {
  padding: 26px;
  max-width: 640px;
}

.panel-title {
  font-size: 17px;
  font-weight: 800;
}

.panel-desc {
  font-size: 13px;
  color: var(--ink-2);
  margin: 6px 0 18px;
}

.inline-form {
  display: flex;
  gap: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

/* ---------- 移动端 ---------- */
@media (max-width: 720px) {
  .head {
    flex-wrap: wrap;
    gap: 10px;
  }

  .tabs {
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 14px;
  }

  .tab {
    padding: 7px 12px;
    font-size: 13px;
  }

  .toolbar-search {
    flex: 1 1 100%;
    max-width: none;
  }

  .toolbar-select {
    flex: 1;
  }

  .table-card {
    padding: 4px 8px;
    margin: 0 -8px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .row-actions {
    gap: 8px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .inline-form {
    flex-wrap: wrap;
  }

  .inline-form .btn,
  .inline-form .input {
    flex: 1 1 100%;
  }

  .panel {
    padding: 18px;
  }

  .modal-actions {
    flex-wrap: wrap;
  }
}

/* 商品表格：窄屏转为卡片布局 */
@media (max-width: 720px) {
  .products-table thead {
    display: none;
  }

  .products-table tr {
    display: block;
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: 6px 12px;
    margin-bottom: 12px;
    background: var(--surface);
  }

  .products-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dashed var(--line);
    padding: 9px 2px;
    text-align: right;
  }

  .products-table tr td:last-child {
    border-bottom: none;
  }

  .products-table td::before {
    content: attr(data-label);
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-3);
    flex-shrink: 0;
  }

  .products-table .t-name {
    white-space: normal;
    text-align: right;
  }
}
</style>

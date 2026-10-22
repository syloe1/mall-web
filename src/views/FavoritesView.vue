<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listFolders, createFolder, updateFolder, deleteFolder, listFavoriteItems, deleteFavoriteItem } from '@/api/favorites'
import type { FavoriteFolder, FavoriteItem } from '@/types'
import { formatPriceGrouped } from '@/utils/format'
import { toastSuccess, toastError } from '@/stores/toast'
import Modal from '@/components/Modal.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const folders = ref<FavoriteFolder[]>([])
const activeFolder = ref<number | null>(null)
const items = ref<FavoriteItem[]>([])
const loading = ref(true)
const itemsLoading = ref(false)

const folderModalOpen = ref(false)
const folderName = ref('')
const editingFolderId = ref<number | null>(null)

function imageOf(item: FavoriteItem) {
  return item.product?.images?.[0]?.url ?? ''
}

function fallbackUrl(e: Event) {
  const el = e.target as HTMLImageElement | null
  if (!el) return
  el.src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#ece9e0"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#9c9a90" text-anchor="middle" dominant-baseline="middle">暂无图片</text></svg>',
    )
}

async function loadFolders(selectFirst = true) {
  loading.value = true
  try {
    folders.value = await listFolders()
    if (selectFirst) {
      activeFolder.value = folders.value[0]?.ID ?? null
      await loadItems()
    }
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function loadItems() {
  if (!activeFolder.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    const data = await listFavoriteItems(activeFolder.value, 1, 50)
    items.value = data.items
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    itemsLoading.value = false
  }
}

function selectFolder(id: number) {
  activeFolder.value = id
  loadItems()
}

function openCreateFolder() {
  editingFolderId.value = null
  folderName.value = ''
  folderModalOpen.value = true
}

function openEditFolder(f: FavoriteFolder) {
  editingFolderId.value = f.ID
  folderName.value = f.name
  folderModalOpen.value = true
}

async function saveFolder() {
  if (!folderName.value.trim()) {
    toastError('请输入收藏夹名称')
    return
  }
  try {
    if (editingFolderId.value) {
      await updateFolder(editingFolderId.value, folderName.value.trim())
      toastSuccess('已重命名')
    } else {
      await createFolder(folderName.value.trim())
      toastSuccess('已创建')
    }
    folderModalOpen.value = false
    await loadFolders()
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function removeFolder(f: FavoriteFolder) {
  if (!window.confirm(`确认删除收藏夹「${f.name}」及其中的收藏？`)) return
  try {
    await deleteFolder(f.ID)
    toastSuccess('已删除')
    await loadFolders()
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function removeItem(item: FavoriteItem) {
  if (!activeFolder.value) return
  try {
    await deleteFavoriteItem(activeFolder.value, item.product_id)
    items.value = items.value.filter((i) => i.product_id !== item.product_id)
    toastSuccess('已移除收藏')
  } catch (e) {
    toastError((e as Error).message)
  }
}

onMounted(() => loadFolders())
</script>

<template>
  <div class="container page">
    <div class="head">
      <div class="section-title">
        我的收藏 <span class="en">/ Favorites</span>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreateFolder">+ 新建收藏夹</button>
    </div>

    <div v-if="loading" class="card" style="padding: 60px">
      <div class="skeleton" style="height: 100px; border-radius: 16px"></div>
    </div>

    <EmptyState v-else-if="!folders.length" icon="heart" title="还没有收藏夹" desc="在商品详情页点「收藏」会放入默认收藏夹，也可以先新建一个。">
      <button class="btn btn-primary" @click="openCreateFolder">新建收藏夹</button>
    </EmptyState>

    <div v-else class="fav-layout">
      <aside class="folder-list card">
        <button
          v-for="f in folders"
          :key="f.ID"
          class="folder"
          :class="{ active: f.ID === activeFolder }"
          @click="selectFolder(f.ID)"
        >
          <span class="folder-name">{{ f.name }}</span>
          <span class="folder-count">{{ f.items?.length ?? items.length }}</span>
        </button>
        <div class="folder-tools">
          <button class="tool" @click="openCreateFolder">新建</button>
        </div>
      </aside>

      <div class="fav-main">
        <div v-if="itemsLoading" class="card" style="padding: 60px">
          <div class="skeleton" style="height: 120px; border-radius: 16px"></div>
        </div>

        <template v-else>
          <div v-if="items.length" class="fav-grid">
            <div v-for="item in items" :key="item.product_id" class="fav-item card">
              <div class="fav-img" @click="router.push({ name: 'product-detail', params: { id: item.product_id } })">
                <img :src="imageOf(item)" :alt="item.product?.name" @error="fallbackUrl" />
              </div>
              <div class="fav-body">
                <div class="fav-name" @click="router.push({ name: 'product-detail', params: { id: item.product_id } })">
                  {{ item.product?.name ?? '商品 #' + item.product_id }}
                </div>
                <div class="fav-price">¥{{ formatPriceGrouped(item.product?.price_cents ?? 0) }}</div>
              </div>
              <div class="fav-actions">
                <RouterLink :to="{ name: 'product-detail', params: { id: item.product_id } }" class="btn btn-ghost btn-sm">查看</RouterLink>
                <button class="btn btn-danger btn-sm" @click="removeItem(item)">移除</button>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="heart" title="这个收藏夹还是空的" desc="去商品详情页点击「收藏」添加商品。" />
        </template>
      </div>
    </div>

    <Modal :open="folderModalOpen" :title="editingFolderId ? '重命名收藏夹' : '新建收藏夹'" @close="folderModalOpen = false">
      <div class="field">
        <label>收藏夹名称</label>
        <input v-model="folderName" class="input" placeholder="如：想买的、送朋友的…" @keyup.enter="saveFolder" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="folderModalOpen = false">取消</button>
        <button class="btn btn-primary" @click="saveFolder">保存</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.fav-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  align-items: start;
}

.folder-list {
  padding: 10px;
  position: sticky;
  top: 88px;
}

.folder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: 11px 14px;
  border-radius: var(--r-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
  transition: all 0.12s ease;
  margin-bottom: 2px;
}

.folder:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.folder.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 800;
}

.folder-count {
  font-size: 12px;
  background: rgba(26, 26, 23, 0.07);
  border-radius: 999px;
  padding: 1px 8px;
}

.folder.active .folder-count {
  background: rgba(31, 122, 84, 0.14);
}

.folder-tools {
  border-top: 1px solid var(--line);
  margin-top: 8px;
  padding-top: 8px;
}

.tool {
  width: 100%;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  padding: 8px;
  border-radius: var(--r-sm);
}

.tool:hover {
  background: var(--accent-soft);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.fav-item {
  overflow: hidden;
}

.fav-img {
  aspect-ratio: 1 / 1;
  background: #efede6;
  cursor: pointer;
  overflow: hidden;
}

.fav-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.fav-item:hover .fav-img img {
  transform: scale(1.04);
}

.fav-body {
  padding: 12px 14px 4px;
}

.fav-name {
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-name:hover {
  color: var(--accent);
}

.fav-price {
  font-size: 16px;
  font-weight: 800;
  margin-top: 4px;
}

.fav-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px 14px;
}

.fav-actions .btn {
  flex: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 860px) {
  .fav-layout {
    grid-template-columns: 1fr;
  }

  .folder-list {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .folder {
    width: auto;
    margin-bottom: 0;
  }

  .fav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

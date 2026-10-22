<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/api/addresses'
import type { Address } from '@/types'
import { fullAddress } from '@/utils/format'
import { toastSuccess, toastError } from '@/stores/toast'
import Modal from '@/components/Modal.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const addresses = ref<Address[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  receiver_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  postal_code: '',
  is_default: false,
})

function resetForm() {
  editingId.value = null
  form.receiver_name = ''
  form.phone = ''
  form.province = ''
  form.city = ''
  form.district = ''
  form.detail = ''
  form.postal_code = ''
  form.is_default = false
}

async function load() {
  loading.value = true
  try {
    addresses.value = await listAddresses()
  } catch (e) {
    toastError((e as Error).message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

function openEdit(a: Address) {
  editingId.value = a.ID
  form.receiver_name = a.receiver_name
  form.phone = a.phone
  form.province = a.province
  form.city = a.city
  form.district = a.district
  form.detail = a.detail
  form.postal_code = a.postal_code
  form.is_default = a.is_default
  modalOpen.value = true
}

async function save() {
  if (!form.receiver_name.trim() || !form.phone.trim() || !form.province.trim() || !form.city.trim() || !form.district.trim() || !form.detail.trim()) {
    toastError('请完整填写收货信息')
    return
  }
  try {
    if (editingId.value) {
      await updateAddress(editingId.value, { ...form })
      toastSuccess('地址已更新')
    } else {
      await createAddress({ ...form })
      toastSuccess('地址已添加')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function remove(a: Address) {
  if (!window.confirm(`确认删除地址「${a.receiver_name} ${a.phone}」？`)) return
  try {
    await deleteAddress(a.ID)
    toastSuccess('已删除')
    await load()
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function makeDefault(a: Address) {
  try {
    await setDefaultAddress(a.ID)
    toastSuccess('已设为默认')
    await load()
  } catch (e) {
    toastError((e as Error).message)
  }
}

function backIfRedirect() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (redirect) router.replace(redirect)
  else router.replace({ name: 'profile' })
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="head">
      <div class="section-title">
        地址管理 <span class="en">/ Addresses</span>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreate">+ 新增地址</button>
    </div>

    <div v-if="loading" class="card" style="padding: 60px">
      <div class="skeleton" style="height: 100px; border-radius: 16px"></div>
    </div>

    <EmptyState v-else-if="!addresses.length" icon="empty" title="还没有收货地址" desc="添加地址后即可在结算时使用。">
      <button class="btn btn-primary" @click="openCreate">新增地址</button>
    </EmptyState>

    <div v-else class="addr-grid">
      <div v-for="a in addresses" :key="a.ID" class="addr card">
        <div class="addr-top">
          <div class="addr-name">{{ a.receiver_name }}</div>
          <div class="addr-phone">{{ a.phone }}</div>
          <span v-if="a.is_default" class="tag">默认</span>
        </div>
        <div class="addr-detail">{{ fullAddress(a) }}</div>
        <div v-if="a.postal_code" class="addr-post">邮编 {{ a.postal_code }}</div>
        <div class="addr-actions">
          <button v-if="!a.is_default" class="link-btn" @click="makeDefault(a)">设为默认</button>
          <button class="link-btn" @click="openEdit(a)">编辑</button>
          <button class="link-btn danger" @click="remove(a)">删除</button>
        </div>
      </div>
    </div>

    <div class="foot">
      <button class="btn btn-ghost btn-sm" @click="backIfRedirect">
        {{ route.query.redirect ? '返回结算' : '返回个人中心' }}
      </button>
    </div>

    <Modal :open="modalOpen" :title="editingId ? '编辑地址' : '新增地址'" @close="modalOpen = false">
      <div class="form-grid">
        <div class="field">
          <label>收货人 *</label>
          <input v-model="form.receiver_name" class="input" placeholder="姓名" />
        </div>
        <div class="field">
          <label>手机号 *</label>
          <input v-model="form.phone" class="input" placeholder="11 位手机号" />
        </div>
        <div class="field">
          <label>省份 *</label>
          <input v-model="form.province" class="input" placeholder="如：安徽省" />
        </div>
        <div class="field">
          <label>城市 *</label>
          <input v-model="form.city" class="input" placeholder="如：合肥市" />
        </div>
        <div class="field">
          <label>区/县 *</label>
          <input v-model="form.district" class="input" placeholder="如：蜀山区" />
        </div>
        <div class="field">
          <label>邮编</label>
          <input v-model="form.postal_code" class="input" placeholder="选填" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label>详细地址 *</label>
          <input v-model="form.detail" class="input" placeholder="街道、门牌号等" />
        </div>
      </div>
      <label class="default-check">
        <input v-model="form.is_default" type="checkbox" />
        <span>设为默认地址</span>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="modalOpen = false">取消</button>
        <button class="btn btn-primary" @click="save">保存</button>
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

.addr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.addr {
  padding: 18px 20px;
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.addr-name {
  font-size: 16px;
  font-weight: 800;
}

.addr-phone {
  font-size: 14px;
  color: var(--ink-2);
}

.addr-detail {
  font-size: 14px;
  color: var(--ink-2);
  margin-top: 8px;
  line-height: 1.6;
}

.addr-post {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 4px;
}

.addr-actions {
  display: flex;
  gap: 14px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.link-btn {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-2);
  transition: color 0.12s ease;
}

.link-btn:hover {
  color: var(--accent);
}

.link-btn.danger:hover {
  color: var(--danger);
}

.foot {
  margin-top: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}

.default-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin: 4px 0 18px;
}

.default-check input {
  width: 17px;
  height: 17px;
  accent-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 720px) {
  .addr-grid {
    grid-template-columns: 1fr;
  }
}
</style>

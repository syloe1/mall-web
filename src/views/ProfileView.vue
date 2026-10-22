<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getAmount, updateProfile, changePassword, setPayPassword } from '@/api/users'
import { toastSuccess, toastError } from '@/stores/toast'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const userStore = useUserStore()

const amount = ref<string | null>(null)
const avatar = computed(() => userStore.username ? `/static/imgs/avatar/default.png` : '')

// 资料
const profileOpen = ref(false)
const nickname = ref('')
const avatarUrl = ref('')

// 密码
const pwdOpen = ref(false)
const oldPassword = ref('')
const newPassword = ref('')

// 支付密码
const payOpen = ref(false)
const payPassword = ref('')

async function loadAmount() {
  try {
    const r = await getAmount()
    amount.value = r.amount
  } catch {
    amount.value = null
  }
}

function openProfile() {
  nickname.value = userStore.username
  avatarUrl.value = avatar.value
  profileOpen.value = true
}

async function saveProfile() {
  try {
    await updateProfile(nickname.value.trim() || 'mall_user', avatarUrl.value.trim() || avatar.value)
    toastSuccess('资料已更新')
    profileOpen.value = false
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function savePassword() {
  if (!oldPassword.value || newPassword.value.length < 6) {
    toastError('请填写旧密码，新密码至少 6 位')
    return
  }
  try {
    await changePassword(oldPassword.value, newPassword.value)
    toastSuccess('密码已修改')
    pwdOpen.value = false
    oldPassword.value = ''
    newPassword.value = ''
  } catch (e) {
    toastError((e as Error).message)
  }
}

async function savePayPassword() {
  if (payPassword.value.length < 6) {
    toastError('支付密码至少 6 位')
    return
  }
  try {
    await setPayPassword(payPassword.value)
    toastSuccess('支付密码已设置')
    payOpen.value = false
    payPassword.value = ''
  } catch (e) {
    toastError((e as Error).message)
  }
}

onMounted(loadAmount)
</script>

<template>
  <div class="container page">
    <div class="profile-head card">
      <div class="avatar">{{ userStore.username.slice(0, 1).toUpperCase() }}</div>
      <div class="who">
        <div class="name-row">
          <h1 class="uname">{{ userStore.username }}</h1>
          <span v-if="userStore.isAdmin" class="tag tag-danger">管理员</span>
          <span v-else class="tag">普通用户</span>
        </div>
        <p class="uid">用户 ID #{{ userStore.userId }}</p>
      </div>
      <div class="balance">
        <div class="balance-label">账户余额</div>
        <div class="balance-value">¥{{ amount ?? '—' }}</div>
      </div>
    </div>

    <div class="quick card">
      <h3 class="quick-title">我的服务</h3>
      <div class="quick-grid">
        <button class="quick-item" @click="router.push({ name: 'orders' })">
          <b>我的订单</b><span>查看历史订单 →</span>
        </button>
        <button class="quick-item" @click="router.push({ name: 'addresses' })">
          <b>地址管理</b><span>维护收货地址 →</span>
        </button>
        <button class="quick-item" @click="router.push({ name: 'favorites' })">
          <b>我的收藏</b><span>收藏夹与商品 →</span>
        </button>
        <button v-if="userStore.isAdmin" class="quick-item" @click="router.push({ name: 'admin' })">
          <b>管理后台</b><span>商品 / 秒杀 / 死信 →</span>
        </button>
      </div>
    </div>

    <div class="settings card">
      <h3 class="quick-title">账号设置</h3>
      <div class="settings-row">
        <div>
          <b>修改昵称 / 头像</b>
          <p>更新个人资料（PUT /users/me）</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="openProfile">去修改</button>
      </div>
      <div class="settings-row">
        <div>
          <b>修改登录密码</b>
          <p>需输入旧密码，新密码至少 6 位</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="pwdOpen = true">去修改</button>
      </div>
      <div class="settings-row">
        <div>
          <b>设置支付密码</b>
          <p>余额支付时需要（至少 6 位）</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="payOpen = true">去设置</button>
      </div>
    </div>

    <!-- 资料 -->
    <Modal :open="profileOpen" title="修改资料" @close="profileOpen = false">
      <div class="field">
        <label>昵称</label>
        <input v-model="nickname" class="input" type="text" placeholder="新昵称" />
      </div>
      <div class="field">
        <label>头像 URL</label>
        <input v-model="avatarUrl" class="input" type="text" placeholder="头像图片地址" />
      </div>
      <button class="btn btn-primary btn-block" @click="saveProfile">保存</button>
    </Modal>

    <!-- 密码 -->
    <Modal :open="pwdOpen" title="修改登录密码" @close="pwdOpen = false">
      <div class="field">
        <label>旧密码</label>
        <input v-model="oldPassword" class="input" type="password" autocomplete="current-password" />
      </div>
      <div class="field">
        <label>新密码（至少 6 位）</label>
        <input v-model="newPassword" class="input" type="password" autocomplete="new-password" />
      </div>
      <button class="btn btn-primary btn-block" @click="savePassword">确认修改</button>
    </Modal>

    <!-- 支付密码 -->
    <Modal :open="payOpen" title="设置支付密码" @close="payOpen = false">
      <div class="field">
        <label>支付密码（至少 6 位）</label>
        <input v-model="payPassword" class="input" type="password" autocomplete="new-password" />
      </div>
      <button class="btn btn-primary btn-block" @click="savePayPassword">保存</button>
    </Modal>
  </div>
</template>

<style scoped>
.profile-head {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 26px 28px;
  flex-wrap: wrap;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 28px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.who {
  flex: 1;
  min-width: 180px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.uname {
  font-size: 22px;
  font-weight: 900;
}

.uid {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: 4px;
}

.balance {
  background: var(--accent-soft);
  border-radius: var(--r-md);
  padding: 14px 22px;
  text-align: right;
}

.balance-label {
  font-size: 12px;
  color: var(--ink-2);
}

.balance-value {
  font-size: 26px;
  font-weight: 900;
  color: var(--accent);
  margin-top: 2px;
}

.quick {
  margin-top: 16px;
  padding: 22px;
}

.quick-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-item {
  text-align: left;
  border: 1.5px solid var(--line);
  border-radius: var(--r-md);
  padding: 16px;
  background: var(--surface-2);
  transition: all 0.15s ease;
}

.quick-item:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.quick-item b {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}

.quick-item span {
  font-size: 12px;
  color: var(--ink-2);
}

.settings {
  margin-top: 16px;
  padding: 22px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
}

.settings-row + .settings-row {
  border-top: 1px solid var(--line);
}

.settings-row b {
  font-size: 14px;
}

.settings-row p {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

@media (max-width: 860px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .balance {
    width: 100%;
    text-align: left;
  }
}
</style>

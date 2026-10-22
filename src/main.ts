import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 安全基线：access token 只在内存，刷新页面后靠 HttpOnly Cookie 静默恢复登录态
  const userStore = useUserStore(pinia)
  await userStore.restore()

  app.use(router)
  app.mount('#app')
}

void bootstrap()

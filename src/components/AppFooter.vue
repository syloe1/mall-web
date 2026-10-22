<script setup lang="ts">
import { AUTHOR, PROJECT } from '@/utils/copy'
</script>

<template>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="brand-col">
        <div class="wordmark">Mall<span class="dot">.</span></div>
        <p class="desc">
          暖纸底 + 墨色 + 翡翠绿的个人全栈项目：Vue 3 + TypeScript 前端，Go + Gin 后端，
          MySQL / Redis / RabbitMQ / Meilisearch 全链路实战。
        </p>
        <p class="stack">Go + Gin · MySQL · Redis · RabbitMQ · Meilisearch · Vue 3 · TypeScript · Vite</p>
      </div>

      <nav class="link-col" aria-label="站内导航">
        <h2 class="col-title">逛商城</h2>
        <RouterLink to="/products">全部商品</RouterLink>
        <RouterLink to="/seckill">限时秒杀</RouterLink>
        <RouterLink to="/favorites">我的收藏</RouterLink>
        <RouterLink to="/orders">我的订单</RouterLink>
      </nav>

      <nav class="link-col" aria-label="项目与作者">
        <h2 class="col-title">项目与作者</h2>
        <RouterLink to="/about">项目介绍</RouterLink>
        <a :href="AUTHOR.resume" target="_blank" rel="noopener noreferrer">简历 PDF ↗</a>
        <a :href="PROJECT.repoBackend" target="_blank" rel="noopener noreferrer">源码 GitHub ↗</a>
        <a :href="`mailto:${AUTHOR.email}`">邮箱 {{ AUTHOR.email }}</a>
        <a :href="AUTHOR.portfolio" target="_blank" rel="noopener noreferrer">作品集 syloe1.xyz ↗</a>
      </nav>
    </div>

    <div class="container footer-bottom">
      <span>© 2026 {{ PROJECT.name }} · {{ AUTHOR.name }} · MIT License</span>
      <span class="bottom-links">
        <RouterLink to="/about">关于项目</RouterLink>
        <a :href="PROJECT.repoFrontend" target="_blank" rel="noopener noreferrer">前端源码</a>
        <a :href="PROJECT.repoBackend" target="_blank" rel="noopener noreferrer">后端源码</a>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  background: var(--surface-2);
  padding: 44px 0 24px;
  margin-top: 56px;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.7fr) minmax(0, 0.9fr);
  gap: 36px;
}

.wordmark {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.wordmark .dot {
  color: var(--accent);
}

.desc {
  font-size: 13px;
  color: var(--ink-2);
  margin-top: 8px;
  max-width: 420px;
  line-height: 1.8;
}

.stack {
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-2);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  line-height: 1.8;
}

.link-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--ink-2);
}

.col-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--ink);
  text-transform: uppercase;
  margin-bottom: 2px;
}

.link-col a {
  color: var(--ink-2);
  line-height: 1.5;
}

.link-col a:hover {
  color: var(--accent);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--ink-2);
}

.bottom-links {
  display: flex;
  gap: 16px;
}

.bottom-links a:hover {
  color: var(--accent);
}

@media (max-width: 860px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }

  .brand-col {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>

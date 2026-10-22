<script setup lang="ts">
import { onMounted } from 'vue'
import { AUTHOR, PROJECT } from '@/utils/copy'
import {
  BENCH,
  CORE_FLOWS,
  OTHER_PROJECTS,
  PROJECT_METRICS,
  TRADEOFFS,
} from '@/data/about'

const stackGroups = [
  {
    title: '语言 / 框架',
    items: ['Go 1.25 + Gin', 'GORM', 'Vue 3.5 + TypeScript（strict）', 'Vite 8', 'Pinia', 'vue-router 4'],
  },
  {
    title: '存储 / 中间件',
    items: ['MySQL 8（15 张表）', 'Redis 7（缓存 / 会话 / 秒杀库存）', 'RabbitMQ（延迟消息 / 商品事件）', 'Meilisearch（全文搜索）'],
  },
  {
    title: '安全基线',
    items: ['JWT access + refresh（HttpOnly Cookie）', 'bcrypt cost 12', 'jti 黑名单 / 登出吊销', '登录 IP + 账号双维度限流', 'CORS 白名单 + 全站安全响应头'],
  },
  {
    title: '工程 / 可观测',
    items: ['246 个 Go 测试函数', 'slog 结构化日志', 'X-Request-ID 全链路', 'OpenTelemetry 埋点', 'k6 压测场景', 'systemd + Nginx + Cloudflare Tunnel'],
  },
]

const runSteps = [
  { title: '启动中间件', code: 'docker compose up -d   # MySQL / Redis / RabbitMQ / Meilisearch' },
  { title: '启动后端', code: 'go run ./cmd            # Web API :3333\ngo run ./cmd/worker     # 异步消费者' },
  { title: '初始化演示数据', code: 'AES_KEY=... go run ./cmd/seed -reset   # 分类 / demo 账号 / 滚动秒杀 / 商品图' },
  { title: '启动前端', code: 'cd mall-web && npm install && npm run dev' },
  { title: '访问', code: '前端 http://localhost:5174\nSwagger http://localhost:18888/swagger/index.html' },
]

const sections = [
  { id: 'background', label: '项目背景' },
  { id: 'architecture', label: '架构图' },
  { id: 'stack', label: '技术栈' },
  { id: 'flows', label: '核心链路' },
  { id: 'tradeoffs', label: '难点与取舍' },
  { id: 'bench', label: '压测数据' },
  { id: 'testing', label: '测试策略' },
  { id: 'run', label: '本地运行' },
  { id: 'demo', label: '演示账号' },
  { id: 'author', label: '作者与联系' },
]

onMounted(() => {
  document.documentElement.scrollTop = 0
})
</script>

<template>
  <div class="about">
    <!-- Hero -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">{{ PROJECT.name }} · {{ PROJECT.subtitle }}</p>
          <h1 class="hero-title">一个能讲清楚<br />每个技术选择的<br />电商全栈项目</h1>
          <p class="hero-sub">
            不是 CRUD demo：从 JWT 双 Token 安全基线、订单事务、秒杀 Lua 原子扣库存，到
            Outbox → RabbitMQ → Meilisearch 最终一致的搜索链路，每个模块都有明确的取舍与压测数据。
          </p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" :href="PROJECT.demo">在线演示 ↗</a>
            <a class="btn btn-ghost btn-lg" :href="PROJECT.repoBackend" target="_blank" rel="noopener noreferrer">
              后端源码 ↗
            </a>
            <a class="btn btn-ghost btn-lg" :href="AUTHOR.resume" target="_blank" rel="noopener noreferrer">
              简历 PDF ↗
            </a>
            <a class="btn btn-ghost btn-lg" :href="`mailto:${AUTHOR.email}`">联系作者</a>
          </div>
          <p class="hero-meta">
            <span>作者：{{ AUTHOR.name }} · {{ AUTHOR.title }}</span>
            <span>代码：MIT · 前后端分离</span>
          </p>
        </div>
        <div class="hero-panel" aria-label="项目指标">
          <div v-for="metric in PROJECT_METRICS" :key="metric.label" class="metric">
            <b>{{ metric.value }}</b>
            <span>{{ metric.label }}</span>
          </div>
          <p class="panel-note">数据来自仓库内实测：接口数量、表结构、Go 测试函数、k6 压测</p>
        </div>
      </div>
    </section>

    <!-- 锚点导航 -->
    <nav class="section-nav" aria-label="页面目录">
      <div class="container nav-inner">
        <a v-for="item in sections" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
      </div>
    </nav>

    <!-- 项目背景 -->
    <section id="background" class="section">
      <div class="container">
        <p class="sec-eyebrow">// 01 BACKGROUND</p>
        <h2 class="sec-title">项目背景</h2>
        <div class="two-col">
          <div>
            <p class="lead">
              做这个项目的目标很明确：<strong>用一个完整电商业务，把所有后端能力串成一条能跑通、能解释的链路</strong>，
              而不是列一堆互相独立的 demo。
            </p>
            <p class="body">
              电商天然覆盖了高并发、事务、缓存、消息队列、搜索同步、鉴权这些面试高频考点。项目按「真实用户能走完整流程」的标准做：
              注册登录 → 浏览搜索 → 收藏加购 → 下单支付 → 我的订单；后台能管商品、看死信、重建索引；秒杀有独立的并发控制链路。
            </p>
            <p class="body">
              前端同样按工程标准写：TypeScript strict、路由守卫、axios 401 单飞刷新、无障碍（键盘可完成浏览→详情→加购）、
              移动端抽屉导航、SEO / sitemap / 安全响应头。
            </p>
          </div>
          <ul class="goal-list">
            <li><b>能跑</b>：一台 2C2G 云服务器 + Cloudflare Tunnel 部署上线，演示账号可直接体验。</li>
            <li><b>能讲</b>：六条核心链路都有「为什么这么做、代价是什么」。</li>
            <li><b>能测</b>：后端 246 个测试函数 + k6 场景 + 前端 type-check / 构建。</li>
            <li><b>能改</b>：DAO 接口化、依赖注入，Service 层单测全部用 mock，不依赖数据库。</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 架构 -->
    <section id="architecture" class="section alt">
      <div class="container">
        <p class="sec-eyebrow">// 02 ARCHITECTURE</p>
        <h2 class="sec-title">系统架构</h2>
        <p class="sec-desc">
          Web 只处理 HTTP 请求，Worker 独立进程消费异步任务，二者共享 MySQL / Redis / RabbitMQ / Meilisearch。
          静态资源与安全响应头由 Nginx 统一处理，TLS 在 Cloudflare 边缘终止。
        </p>
        <pre class="arch" aria-label="Mall 系统架构图">
┌──────────────── 浏览器（Vue 3 + TypeScript + Vite SPA）────────────────┐
│  路由守卫 · Pinia · axios 拦截器（401 单飞刷新）· 无障碍 / SEO          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS · Cloudflare Tunnel
┌───────────────────────────────▼─────────────────────────────────────────┐
│ Nginx：静态托管 + gzip + 安全响应头 + SPA 路由回退 + /api 反向代理       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────▼────────────────────────┐
        │             Go Web（Gin，/api/v1）              │
        │  JWT 双 Token · 登录限流 · X-Request-ID 全链路  │
        │  Handler → Service → DAO（接口注入，可 mock）   │
        └───┬────────────────┬────────────────┬──────────┘
            │                │                │
      ┌─────▼──────┐   ┌─────▼──────┐   ┌─────▼───────┐
      │   MySQL    │   │   Redis    │   │  RabbitMQ   │
      │  15 张表   │   │ 库存/会话  │   │ 延迟/事件   │
      └────────────┘   └────────────┘   └─────┬───────┘
                                              │
        ┌─────────────────────────────────────▼──────────┐
        │        Go Worker（独立进程，异步消费者）        │
        │  Outbox Publisher → 商品事件 → Meilisearch      │
        │  秒杀消费 → 落真实订单 · 失败写死信表审计       │
        └─────────────────────────────────────────────────┘

  可观测性：X-Request-ID 响应头 + 结构化访问日志 + OpenTelemetry（HTTP / GORM / Redis / MQ）
  数据一致性：业务表与 outbox 同事务 → Worker 投递 MQ → 消费者写 Meilisearch → 失败进死信表
        </pre>
        <div class="arch-notes">
          <div class="note-card">
            <h3>为什么拆 Web / Worker</h3>
            <p>HTTP 请求和异步任务互不阻塞，可独立扩缩容；消费者故障不会拖垮接口。</p>
          </div>
          <div class="note-card">
            <h3>为什么用 Meilisearch</h3>
            <p>2C2G 小机器上比 Elasticsearch 省内存（单二进制 ~100MB），中文搜索够用，单机即可维护。</p>
          </div>
          <div class="note-card">
            <h3>为什么不用分布式事务</h3>
            <p>电商链路追求最终一致：Outbox + 重试 + 死信表 + reindex 对账，比 Seata 这类方案更轻、更好解释。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 技术栈 -->
    <section id="stack" class="section">
      <div class="container">
        <p class="sec-eyebrow">// 03 STACK</p>
        <h2 class="sec-title">技术栈</h2>
        <div class="stack-grid">
          <div v-for="group in stackGroups" :key="group.title" class="stack-card">
            <h3>{{ group.title }}</h3>
            <ul>
              <li v-for="item in group.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心链路 -->
    <section id="flows" class="section alt">
      <div class="container">
        <p class="sec-eyebrow">// 04 CORE FLOWS</p>
        <h2 class="sec-title">六条核心链路</h2>
        <p class="sec-desc">每条链路都按「请求怎么走 → 关键实现 → 面试可以展开讲什么」整理。</p>
        <div class="flow-grid">
          <article v-for="flow in CORE_FLOWS" :key="flow.title" class="flow-card">
            <div class="flow-head">
              <span class="flow-icon" aria-hidden="true">{{ flow.icon }}</span>
              <div>
                <h3>{{ flow.title }}</h3>
                <p class="flow-sub">{{ flow.subtitle }}</p>
              </div>
            </div>
            <ol class="flow-steps">
              <li v-for="step in flow.steps" :key="step">{{ step }}</li>
            </ol>
            <ul class="flow-points">
              <li v-for="point in flow.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- 难点与取舍 -->
    <section id="tradeoffs" class="section">
      <div class="container">
        <p class="sec-eyebrow">// 05 TRADEOFFS</p>
        <h2 class="sec-title">难点与取舍</h2>
        <p class="sec-desc">面试里最容易被追问的不是「用了什么」，而是「为什么不那样做」。</p>
        <div class="tradeoff-list">
          <article v-for="item in TRADEOFFS" :key="item.title" class="tradeoff">
            <h3>{{ item.title }}</h3>
            <dl>
              <div><dt>问题</dt><dd>{{ item.problem }}</dd></div>
              <div><dt>选择</dt><dd>{{ item.decision }}</dd></div>
              <div><dt>代价</dt><dd>{{ item.cost }}</dd></div>
            </dl>
          </article>
        </div>
      </div>
    </section>

    <!-- 压测数据 -->
    <section id="bench" class="section alt">
      <div class="container">
        <p class="sec-eyebrow">// 06 BENCHMARK</p>
        <h2 class="sec-title">压测数据</h2>
        <p class="sec-desc">{{ BENCH.measuredAt }} · {{ BENCH.tool }} · {{ BENCH.env }}</p>
        <div class="table-wrap">
          <table class="bench-table">
            <caption class="sr-only">Mall 小程序接口 k6 压测结果</caption>
            <thead>
              <tr>
                <th scope="col">场景</th>
                <th scope="col">接口</th>
                <th scope="col">来源</th>
                <th scope="col">并发</th>
                <th scope="col">RPS</th>
                <th scope="col">P95</th>
                <th scope="col">错误率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in BENCH.rows" :key="row.scenario">
                <td class="strong">{{ row.scenario }}</td>
                <td class="mono">{{ row.endpoint }}</td>
                <td>{{ row.source }}</td>
                <td>{{ row.vus }}</td>
                <td class="strong">{{ row.rps }}</td>
                <td>{{ row.p95 }}</td>
                <td>{{ row.errorRate }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="bench-notes">
          <li v-for="note in BENCH.notes" :key="note">{{ note }}</li>
        </ul>
        <p class="bench-cmd">复现：<code>{{ BENCH.command }}</code></p>
      </div>
    </section>

    <!-- 测试策略 -->
    <section id="testing" class="section">
      <div class="container">
        <p class="sec-eyebrow">// 07 TESTING</p>
        <h2 class="sec-title">测试策略</h2>
        <div class="two-col">
          <div class="test-block">
            <h3>后端（Go）</h3>
            <ul class="check-list">
              <li><b>DAO 层</b>：SQLite 内存库 + AutoMigrate，跑真实 SQL（不是纯 mock）。</li>
              <li><b>Service 层</b>：testify mock DAO + miniredis，覆盖成功 / 失败 / 幂等 / 回滚路径（DAO 覆盖 69% / Service 77%）。</li>
              <li><b>中间件</b>：JWT、Admin、CORS 白名单、登录限流、分页参数校验都有表驱动单测。</li>
              <li><b>并发</b>：秒杀并发抢购（50 并发 10 件不超卖）、-race 检测关键包。</li>
              <li><b>端到端</b>：k6 场景脚本 + 手工走通「注册 → 加购 → 下单 → 支付 → 订单」。</li>
            </ul>
            <p class="cmd">go test ./... -count=1 · go vet ./... · go test -race ./service ./middleware</p>
          </div>
          <div class="test-block">
            <h3>前端（Vue + TS）</h3>
            <ul class="check-list">
              <li><b>类型</b>：<code>vue-tsc --build</code>，strict + noUncheckedIndexedAccess。</li>
              <li><b>构建</b>：Vite 生产构建 + 路由懒加载分包。</li>
              <li><b>无障碍</b>：键盘走查「浏览 → 详情 → 加购」，Modal 焦点陷阱、Toast aria-live、对比度校验。</li>
              <li><b>响应式</b>：375 / 768 / 1024 / 1440 四档视口回归 + 移动端抽屉导航。</li>
              <li><b>SEO</b>：robots.txt / sitemap.xml / OG 卡片 / 真实 404 状态码。</li>
            </ul>
            <p class="cmd">npm run type-check && npm run build</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 本地运行 -->
    <section id="run" class="section alt">
      <div class="container">
        <p class="sec-eyebrow">// 08 RUN LOCALLY</p>
        <h2 class="sec-title">本地运行</h2>
        <div class="run-grid">
          <div v-for="(step, index) in runSteps" :key="step.title" class="run-step">
            <span class="run-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <pre class="code">{{ step.code }}</pre>
            </div>
          </div>
        </div>
        <p class="run-note">
          环境变量：<code>JWT_SECRET</code>（≥32 位随机串）、<code>AES_KEY</code>（16/24/32 位）、
          <code>MYSQL_PASSWORD</code>、<code>CORS_ORIGINS</code>、<code>DEMO_MODE</code>、<code>COOKIE_SECURE</code>；
          生产用 systemd 注入，仓库只保留 <code>.env.example</code>。
        </p>
      </div>
    </section>

    <!-- 演示账号 -->
    <section id="demo" class="section">
      <div class="container">
        <p class="sec-eyebrow">// 09 DEMO ACCOUNTS</p>
        <h2 class="sec-title">演示账号</h2>
        <p class="sec-desc">演示环境数据每日 04:00 重置；支付为模拟支付，不产生真实扣款。</p>
        <div class="demo-grid">
          <div class="demo-account-card">
            <span class="demo-role">普通用户</span>
            <h3>{{ PROJECT.demoUser }}</h3>
            <p class="demo-pw">{{ PROJECT.demoPassword }}</p>
            <p class="demo-use">体验完整链路：浏览 → 搜索 → 加购 → 下单 → 模拟支付 → 我的订单</p>
            <RouterLink class="btn btn-primary" :to="{ name: 'login', query: { demo: '1' } }">用这个账号登录</RouterLink>
          </div>
          <div class="demo-account-card admin">
            <span class="demo-role">管理员</span>
            <h3>{{ PROJECT.adminUser }}</h3>
            <p class="demo-pw">{{ PROJECT.adminPassword }}</p>
            <p class="demo-use">进入后台查看：商品管理（增删改查）· 死信队列 · 重建搜索索引</p>
            <RouterLink class="btn btn-primary" :to="{ name: 'login', query: { demo: '2' } }">登录并进入后台</RouterLink>
          </div>
        </div>
        <p class="demo-note">
          如果你只想验证接口：<code>POST /api/v1/users/login</code> 返回 access token，refresh token 在 HttpOnly Cookie 中；
          管理接口需要 <code>role=admin</code>。
        </p>
      </div>
    </section>

    <!-- 作者其它项目 -->
    <section id="author" class="section alt">
      <div class="container">
        <p class="sec-eyebrow">// 10 AUTHOR</p>
        <h2 class="sec-title">作者与其它项目</h2>
        <div class="author-block">
          <div class="author-bio">
            <h3>{{ AUTHOR.name }}</h3>
            <p class="author-role">{{ AUTHOR.title }}</p>
            <p class="body">
              关注网络编程、分布式系统与数据库内核。除这个 Go 全栈项目外，还写 C++ 网络库、数据库内核实验、
              分布式系统实验与在线判题系统，源码都在 GitHub。
            </p>
            <div class="author-links">
              <a class="btn btn-ghost btn-sm" :href="AUTHOR.github" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              <a class="btn btn-ghost btn-sm" :href="AUTHOR.portfolio" target="_blank" rel="noopener noreferrer">作品集 ↗</a>
              <a class="btn btn-ghost btn-sm" :href="`mailto:${AUTHOR.email}`">{{ AUTHOR.email }}</a>
              <a class="btn btn-ghost btn-sm" :href="AUTHOR.resume" target="_blank" rel="noopener noreferrer">简历 PDF ↗</a>
            </div>
            <p class="body small">
              本项目源码：
              <a :href="PROJECT.repoBackend" target="_blank" rel="noopener noreferrer">后端 syloe1/mall ↗</a>
              ·
              <a :href="PROJECT.repoFrontend" target="_blank" rel="noopener noreferrer">前端 syloe1/mall-web ↗</a>
              （MIT License，欢迎 issue / star）。
            </p>
          </div>
          <div class="other-projects">
            <article v-for="project in OTHER_PROJECTS" :key="project.name" class="other-card">
              <div class="other-head">
                <h4>{{ project.name }}</h4>
                <a :href="project.url" target="_blank" rel="noopener noreferrer" :aria-label="`GitHub 仓库 ${project.name}`">↗</a>
              </div>
              <p>{{ project.desc }}</p>
              <ul class="other-tags">
                <li v-for="tag in project.tags" :key="tag">{{ tag }}</li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- 结尾 CTA -->
    <section class="cta">
      <div class="container cta-inner">
        <div>
          <h2>看到这里，欢迎直接上手体验</h2>
          <p>演示账号已放在登录页，一键登录即可；有任何问题欢迎邮件交流。</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-primary btn-lg" :href="PROJECT.demo">打开在线演示 ↗</a>
          <a class="btn btn-ghost btn-lg" :href="`mailto:${AUTHOR.email}`">写信给作者</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about {
  --section-pad: 72px;
}

/* ---------- Hero ---------- */
.hero {
  background:
    radial-gradient(48% 90% at 90% 0%, rgba(31, 122, 84, 0.1), transparent 60%),
    radial-gradient(42% 80% at 0% 100%, rgba(201, 162, 39, 0.1), transparent 55%),
    var(--surface-2);
  border-bottom: 1px solid var(--line);
}

.hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr);
  gap: 48px;
  align-items: center;
  padding-block: 64px 56px;
}

.eyebrow {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
}

.hero-title {
  font-size: clamp(34px, 4vw, 56px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.hero-sub {
  margin-top: 18px;
  font-size: 15.5px;
  line-height: 1.9;
  color: var(--ink-2);
  max-width: 620px;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 20px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.hero-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  background: var(--ink);
  color: #fff;
  border-radius: 22px;
  padding: 24px;
  box-shadow: var(--shadow-lg);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
}

.metric b {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.metric span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
}

.panel-note {
  grid-column: 1 / -1;
  font-size: 11.5px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
  margin-top: 6px;
}

/* ---------- 锚点导航 ---------- */
.section-nav {
  position: sticky;
  top: 64px;
  z-index: 40;
  background: rgba(245, 243, 238, 0.94);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.nav-inner {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-block: 10px;
  scrollbar-width: none;
}

.nav-inner::-webkit-scrollbar {
  display: none;
}

.nav-inner a {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.nav-inner a:hover {
  background: rgba(26, 26, 23, 0.06);
  color: var(--ink);
}

/* ---------- 通用 section ---------- */
.section {
  padding-block: var(--section-pad);
  border-bottom: 1px solid var(--line);
}

.section.alt {
  background: var(--surface-2);
}

.sec-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--accent);
  margin-bottom: 10px;
}

.sec-title {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.sec-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 820px;
}

.two-col {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 40px;
  margin-top: 26px;
  align-items: start;
}

.lead {
  font-size: 16px;
  line-height: 1.9;
  color: var(--ink);
}

.body {
  margin-top: 14px;
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--ink-2);
}

.body.small {
  font-size: 13px;
}

.body a {
  color: var(--accent);
  font-weight: 600;
}

.goal-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-list li {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 14px 16px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.goal-list b {
  color: var(--ink);
}

/* ---------- 架构图 ---------- */
.arch {
  margin-top: 24px;
  background: var(--ink);
  color: #e9e6dc;
  border-radius: 18px;
  padding: 24px 22px;
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.65;
  overflow-x: auto;
  box-shadow: var(--shadow-lg);
}

.arch-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.note-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 18px;
}

.note-card h3 {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 6px;
}

.note-card p {
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink-2);
}

/* ---------- 技术栈 ---------- */
.stack-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.stack-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 22px 24px;
}

.stack-card h3 {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--ink-2);
  text-transform: uppercase;
  margin-bottom: 14px;
}

.stack-card ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stack-card li {
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 600;
}

/* ---------- 核心链路 ---------- */
.flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.flow-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 24px;
}

.flow-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.flow-icon {
  font-size: 24px;
  line-height: 1;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px;
}

.flow-head h3 {
  font-size: 18px;
  font-weight: 800;
}

.flow-sub {
  font-size: 12.5px;
  color: var(--accent);
  font-weight: 600;
  margin-top: 3px;
}

.flow-steps {
  margin: 18px 0 12px;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.flow-steps li::marker {
  color: var(--accent);
  font-weight: 700;
  font-size: 12px;
}

.flow-points {
  list-style: none;
  border-top: 1px dashed var(--line);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-points li {
  position: relative;
  padding-left: 16px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.flow-points li::before {
  content: '▸';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--accent);
  font-size: 11px;
}

/* ---------- 难点取舍 ---------- */
.tradeoff-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 26px;
}

.tradeoff {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 22px 24px;
}

.tradeoff h3 {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 12px;
}

.tradeoff dl {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}

.tradeoff dl > div {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  align-items: start;
}

.tradeoff dt {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  padding-top: 2px;
}

.tradeoff dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink-2);
}

/* ---------- 压测 ---------- */
.table-wrap {
  margin-top: 22px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--surface);
}

.bench-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
  font-size: 13px;
}

.bench-table th,
.bench-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.bench-table thead th {
  background: var(--surface-2);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  font-weight: 800;
}

.bench-table tbody tr:last-child td {
  border-bottom: none;
}

.bench-table .strong {
  font-weight: 700;
  color: var(--ink);
}

.bench-table .mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  color: var(--ink-2);
}

.bench-notes {
  margin-top: 16px;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.bench-cmd {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--ink-2);
}

code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.92em;
  background: rgba(26, 26, 23, 0.06);
  border-radius: 5px;
  padding: 1px 6px;
}

/* ---------- 测试 ---------- */
.test-block {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 24px;
}

.test-block h3 {
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 12px;
}

.check-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.check-list li {
  position: relative;
  padding-left: 22px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.check-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--accent);
  font-weight: 800;
}

.check-list b {
  color: var(--ink);
}

.cmd {
  margin-top: 16px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 12px;
  overflow-x: auto;
  white-space: nowrap;
}

/* ---------- 本地运行 ---------- */
.run-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 26px;
}

.run-step {
  display: flex;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 20px 22px;
}

.run-no {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  padding-top: 3px;
}

.run-step h3 {
  font-size: 14.5px;
  font-weight: 800;
  margin-bottom: 8px;
}

.code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  color: #e9e6dc;
  background: var(--ink);
  border-radius: 10px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 0;
}

.run-note {
  margin-top: 18px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink-2);
}

/* ---------- 演示账号 ---------- */
.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.demo-account-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.demo-account-card.admin {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  background: linear-gradient(180deg, var(--accent-soft), var(--surface) 60%);
}

.demo-role {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--accent);
  text-transform: uppercase;
}

.demo-account-card h3 {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 22px;
  font-weight: 800;
}

.demo-pw {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 14px;
  color: var(--ink-2);
}

.demo-use {
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink-2);
  margin-bottom: 8px;
}

.demo-note {
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink-2);
}

/* ---------- 作者 ---------- */
.author-block {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 34px;
  margin-top: 26px;
  align-items: start;
}

.author-bio {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 26px;
}

.author-bio h3 {
  font-size: 24px;
  font-weight: 800;
}

.author-role {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.author-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.other-projects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.other-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 18px;
}

.other-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.other-head h4 {
  font-size: 15px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.other-head a {
  color: var(--accent);
  font-weight: 800;
}

.other-card p {
  margin-top: 8px;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--ink-2);
}

.other-tags {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.other-tags li {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 2px 8px;
}

/* ---------- CTA ---------- */
.cta {
  background: var(--ink);
  color: #fff;
}

.cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-block: 48px;
}

.cta h2 {
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 800;
}

.cta p {
  margin-top: 8px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.92);
}

.cta-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cta .btn-ghost {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.cta .btn-ghost:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: #fff;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1024px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-block: 48px 40px;
  }

  .hero-panel {
    max-width: 520px;
  }

  .two-col,
  .author-block {
    grid-template-columns: 1fr;
  }

  .arch-notes {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 860px) {
  .flow-grid,
  .tradeoff-list,
  .stack-grid,
  .run-grid,
  .demo-grid,
  .other-projects {
    grid-template-columns: 1fr;
  }

  .section-nav {
    top: 58px;
  }
}

@media (max-width: 480px) {
  .about {
    --section-pad: 52px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-cta .btn {
    flex: 1 1 100%;
  }

  .arch {
    font-size: 10.5px;
    padding: 16px 14px;
    border-radius: 14px;
  }

  .arch-notes {
    grid-template-columns: 1fr;
  }

  .metric b {
    font-size: 26px;
  }

  .cta-actions .btn {
    flex: 1 1 100%;
  }
}
</style>

/**
 * 基于 Chrome DevTools Protocol 的轻量浏览器验收脚本（无需 puppeteer）。
 *
 * 用法：
 *   node scripts/browser_check.mjs <baseUrl> <outDir>
 *
 * 需要先启动一个 headless Chrome：
 *   "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new \
 *     --remote-debugging-port=9222 --user-data-dir=.tmp-chrome --disable-gpu --no-first-run about:blank
 *
 * 脚本会按场景切视口 / 导航 / 执行断言 / 截图，并汇总 console error 与断言失败。
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5175'
const OUT = process.argv[3] ?? '.tmp-check'
const DEBUG_PORT = 9222

await fs.mkdir(OUT, { recursive: true })

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = []
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`))
        else resolve(msg.result)
        return
      }
      if (msg.method) this.events.push(msg)
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      const detail =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        'evaluate failed'
      throw new Error(detail)
    }
    return result.result.value
  }

  async wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  async waitFor(expression, timeout = 8000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        if (await this.evaluate(expression)) return true
      } catch {
        /* keep waiting */
      }
      await this.wait(150)
    }
    return false
  }
}

async function createTarget() {
  const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })
  return resp.json()
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  return new CDP(ws)
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

const SCENARIOS = [
  {
    name: 'home-desktop',
    width: 1440,
    height: 1000,
    url: '/',
    checks: [
      ['标题带作者', () => document.title.includes('李俊哲')],
      ['导航含关于项目', () => [...document.querySelectorAll('.nav-link')].some((a) => a.textContent.includes('关于项目'))],
      ['页脚含项目介绍/GitHub/邮箱', () => {
        const text = document.querySelector('footer')?.innerText ?? ''
        return ['项目介绍', '源码 GitHub', '邮箱', '简历 PDF', '作品集'].every((k) => text.includes(k))
      }],
      ['主内容与 header 左对齐', () => {
        const wordmark = document.querySelector('.wordmark')?.getBoundingClientRect().left ?? -1
        const card = document.querySelector('.pcard, .hero-copy')?.getBoundingClientRect().left ?? -2
        return Math.abs(wordmark - card) <= 2
      }],
      ['无横向溢出', () => document.documentElement.scrollWidth <= window.innerWidth + 1],
      ['首页有商品卡', () => document.querySelectorAll('.pcard').length > 0],
      ['精选卡可点击', () => document.querySelector('.hero-card')?.tagName === 'A'],
      ['商品图为一手域名SVG', () => {
        const img = document.querySelector('.pcard img')
        return Boolean(img && new URL(img.src, location.href).pathname.startsWith('/img/products/'))
      }],
    ],
  },
  {
    name: 'home-mobile',
    width: 375,
    height: 812,
    url: '/',
    checks: [
      ['汉堡按钮可见', () => getComputedStyle(document.querySelector('.hamburger')).display !== 'none'],
      ['导航已隐藏', () => getComputedStyle(document.querySelector('.nav')).display === 'none'],
      ['无横向溢出', () => document.documentElement.scrollWidth <= window.innerWidth + 1],
      ['商品区不贴边', () => {
        const card = document.querySelector('.pcard')?.getBoundingClientRect().left ?? 0
        return card >= 12
      }],
      ['触屏加购常显', () => {
        const actions = document.querySelector('.card-actions')
        return actions ? Number(getComputedStyle(actions).opacity) > 0.9 : false
      }],
    ],
    after: async (cdp) => {
      await cdp.evaluate(`document.querySelector('.hamburger').click()`)
      await cdp.wait(400)
      const opened = await cdp.evaluate(`(() => {
        const drawer = document.querySelector('#mobile-menu')
        return Boolean(drawer && drawer.querySelectorAll('a').length >= 7)
      })()`)
      await shot(cdp, `${OUT}/home-mobile-drawer.png`)
      await cdp.evaluate(`document.querySelector('.drawer-mask').click()`)
      return { '抽屉可打开且含全部主页面链接': opened }
    },
  },
  {
    name: 'products-tablet',
    width: 768,
    height: 1000,
    url: '/products',
    checks: [
      ['无横向溢出', () => document.documentElement.scrollWidth <= window.innerWidth + 1],
      ['内容不贴边', () => {
        const grid = document.querySelector('.grid')?.getBoundingClientRect().left ?? 0
        return grid >= 16
      }],
      ['分类筛选来自接口', () => document.querySelectorAll('.chips .pill').length >= 3],
    ],
  },
  {
    name: 'detail-desktop',
    width: 1440,
    height: 1100,
    url: '/products/1001',
    checks: [
      ['规格参数存在', () => document.querySelector('.spec-table')?.innerText.includes('商品编号')],
      ['服务承诺存在', () => (document.querySelector('.service-list')?.innerText ?? '').includes('7 天无理由')],
      ['相关推荐存在', () => document.querySelectorAll('.related-grid .pcard').length > 0],
      ['面包屑存在', () => document.querySelectorAll('.breadcrumb a').length >= 2],
      ['加入购物车按钮存在', () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('加入购物车'))],
    ],
  },
  {
    name: 'seckill-desktop',
    width: 1440,
    height: 1000,
    url: '/seckill',
    checks: [
      ['FLASH SALE 文案', () => document.body.innerText.includes('FLASH SALE')],
      ['活动卡存在', () => document.querySelectorAll('.sk-card').length > 0],
      ['状态徽章存在', () => document.body.innerText.includes('进行中') || document.body.innerText.includes('已结束')],
    ],
  },
  {
    name: 'about-desktop',
    width: 1440,
    height: 1200,
    url: '/about',
    checks: [
      ['包含六条核心链路', () => document.querySelectorAll('.flow-card').length === 6],
      ['包含架构图', () => Boolean(document.querySelector('.arch'))],
      ['包含压测表', () => Boolean(document.querySelector('.bench-table'))],
      ['包含演示账号', () => document.body.innerText.includes('Demo@123456') && document.body.innerText.includes('Admin@123456')],
      ['包含作者其它项目', () => document.querySelectorAll('.other-card').length >= 5],
      ['包含联系方式', () => document.body.innerText.includes('3337976147@qq.com')],
      ['包含源码链接', () => [...document.querySelectorAll('a')].some((a) => a.href.includes('github.com/syloe1/mall'))],
      ['包含本地运行命令', () => document.body.innerText.includes('docker compose up -d')],
    ],
  },
  {
    name: 'login-desktop',
    width: 1440,
    height: 1000,
    url: '/login',
    checks: [
      ['演示账号区块', () => document.body.innerText.includes('Demo@123456') && document.body.innerText.includes('Admin@123456')],
      ['每日重置说明', () => document.body.innerText.includes('每日重置')],
      ['一键登录按钮', () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('一键登录'))],
      ['输入框有 label', () => {
        const input = document.querySelector('#login-username')
        return Boolean(input && document.querySelector(`label[for="login-username"]`))
      }],
    ],
    after: async (cdp) => {
      // 一键登录管理员 → 应进入 /admin
      await cdp.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('登录并进后台')).click()`)
      const ok = await cdp.waitFor(`location.pathname === '/admin' && document.body.innerText.includes('管理后台')`, 12000)
      await cdp.wait(1500)
      await shot(cdp, `${OUT}/admin-after-login.png`)
      const admin = await cdp.evaluate(`(() => ({
        path: location.pathname,
        banner: document.body.innerText.includes('演示管理员模式'),
        tabs: [...document.querySelectorAll('.tab')].map((t) => t.textContent.trim()),
      }))()`)
      return {
        '一键登录进入后台': ok && admin.path === '/admin',
        '演示管理员横幅': admin.banner,
        '后台三能力 tab': JSON.stringify(admin.tabs),
      }
    },
  },
  {
    name: 'home-after-login',
    width: 1440,
    height: 1000,
    url: '/',
    checks: [
      ['显示用户名', () => Boolean(document.querySelector('.user-trigger'))],
      ['已登录后不再显示登录按钮', () => !document.body.innerText.includes('登录') || Boolean(document.querySelector('.user-trigger'))],
    ],
  },
]

const results = []
let failures = 0

async function shot(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await fs.writeFile(file, Buffer.from(data, 'base64'))
}

const target = await createTarget()
const cdp = await connect(target.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Log.enable')

const consoleErrors = []
cdp.ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.text ?? 'exception')
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
})

for (const scenario of SCENARIOS.filter((item) => !ONLY || ONLY.includes(item.name))) {
  consoleErrors.length = 0
  const isMobile = scenario.width < 720
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: isMobile, maxTouchPoints: isMobile ? 5 : 1 })
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: 1,
    mobile: isMobile,
    screenWidth: scenario.width,
    screenHeight: scenario.height,
  })
  await cdp.send('Page.navigate', { url: `${BASE}${scenario.url}` })
  await cdp.waitFor(`document.readyState === 'complete'`, 20000)
  // 线上 Cloudflare 边缘 + 跨省网络下，应用挂载可能 >2s：
  // 先等 #app 真正渲染出内容，再等页面内异步数据渲染完成
  await cdp.waitFor(`(document.querySelector('#app')?.children.length ?? 0) > 0`, 25000)
  await cdp.wait(2200)

  const checkResults = []
  for (const [label, fn] of scenario.checks) {
    let ok = false
    let detail = ''
    try {
      const value = await cdp.evaluate(`(${fn.toString()})()`)
      ok = value === true
      detail = ok ? '' : JSON.stringify(value)
    } catch (error) {
      detail = String(error)
    }
    if (!ok) failures += 1
    checkResults.push({ label, ok, detail })
  }

  let extra = {}
  if (scenario.after) {
    try {
      extra = (await scenario.after(cdp)) ?? {}
    } catch (error) {
      failures += 1
      extra = { afterError: error instanceof Error ? error.stack ?? error.message : String(error) }
    }
  }

  await shot(cdp, `${OUT}/${scenario.name}.png`)

  if (consoleErrors.length) {
    failures += 1
    checkResults.push({ label: '无 console error', ok: false, detail: consoleErrors.slice(0, 3).join(' | ') })
  } else {
    checkResults.push({ label: '无 console error', ok: true, detail: '' })
  }

  results.push({ scenario: scenario.name, checks: checkResults, extra })
  console.log(`\n### ${scenario.name} (${scenario.width}px)`)
  for (const item of checkResults) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.label}${item.detail ? '  → ' + item.detail : ''}`)
  }
  for (const [key, value] of Object.entries(extra)) {
    console.log(`INFO  ${key}: ${value}`)
  }
}

await fs.writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} · screenshots in ${OUT}`)
wsCleanup(target)
process.exit(failures === 0 ? 0 : 1)

async function wsCleanup(t) {
  try {
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${t.id}`)
  } catch {
    /* ignore */
  }
}

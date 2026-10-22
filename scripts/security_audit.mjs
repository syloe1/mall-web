/**
 * 线上安全/存储审计：
 *  - 登录后 localStorage 不应出现 token
 *  - 页面图片不应出现第三方域名
 *  - 管理后台 Modal 的 dialog 语义 / ESC 关闭 / 焦点回位
 * 用法：node scripts/security_audit.mjs https://mall.syloe1.xyz
 */
const BASE = process.argv[2] ?? 'https://mall.syloe1.xyz'
const PORT = 9222

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let id = 0
const pending = new Map()
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.id || !pending.has(msg.id)) return
  const { resolve, reject, method } = pending.get(msg.id)
  pending.delete(msg.id)
  if (msg.error) reject(new Error(`${method}: ${msg.error.message}`))
  else resolve(msg.result)
})
function send(method, params = {}) {
  const reqId = ++id
  return new Promise((resolve, reject) => {
    pending.set(reqId, { resolve, reject, method })
    ws.send(JSON.stringify({ id: reqId, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const checks = []
function check(label, ok, detail = '') {
  checks.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' → ' + detail : ''}`)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

// 1. 登录（使用 Cookie 会话，走登录页一键登录前的接口也可以；这里用 fetch 调接口）
await send('Page.navigate', { url: `${BASE}/login` })
await wait(1200)
const tokenProbe = await evaluate(`(async () => {
  const res = await fetch('/api/v1/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username: 'admin', password: 'Admin@123456' })
  })
  const body = await res.json()
  return { status: res.status, hasAccess: Boolean(body.data?.access_token), bodyHasRefresh: Boolean(body.data?.refresh_token) }
})()`)
check('登录响应只返回 access token（refresh 不在 body）', tokenProbe.status === 200 && tokenProbe.hasAccess && !tokenProbe.bodyHasRefresh, JSON.stringify(tokenProbe))

// 2. localStorage 不应出现 token
const storage = await evaluate(`(() => {
  const keys = Object.keys(localStorage)
  return { keys, tokenKeys: keys.filter((k) => /token|jwt|auth/i.test(k)) }
})()`)
check('localStorage 不含 token', storage.tokenKeys.length === 0, JSON.stringify(storage))
check('Cookie 中的 refresh token JS 不可读', await evaluate(`document.cookie.includes('mall_refresh') === false`))

// 3. 图片域名审计
await send('Page.navigate', { url: `${BASE}/` })
await wait(2500)
const imageAudit = await evaluate(`(() => {
  const pageHost = location.host
  const images = [...document.querySelectorAll('img')].map((img) => ({ src: img.currentSrc || img.src, alt: img.alt }))
  const hosts = [...new Set(images.map((img) => { try { return new URL(img.src, location.href).host } catch { return 'invalid' } }))]
  return { pageHost, images, hosts }
})()`)
const { pageHost, images, hosts } = imageAudit
check('页面图片全部同源（无第三方图床）', hosts.every((h) => h === pageHost), JSON.stringify(hosts))
check('商品图 alt 与商品名一致（非空）', images.filter((i) => i.src.includes('/img/products/')).every((i) => i.alt.length > 0), `${images.length} 张图`)

// 4. 管理后台 Modal 无障碍
await send('Page.navigate', { url: `${BASE}/admin` })
await wait(3000)
const modalResult = await evaluate(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  await wait(800)
  const openBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建商品'))
  if (!openBtn) return { error: 'open button not found', text: document.body.innerText.slice(0, 200) }
  openBtn.focus()
  openBtn.click()
  await wait(500)
  const dialog = document.querySelector('[role="dialog"]')
  const activeInside = dialog ? dialog.contains(document.activeElement) : false
  const ariaModal = dialog?.getAttribute('aria-modal')
  const labelled = Boolean(dialog?.getAttribute('aria-labelledby') || dialog?.getAttribute('aria-label'))
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await wait(400)
  const closed = !document.querySelector('[role="dialog"]')
  const focusBack = document.activeElement === openBtn
  return { dialog: Boolean(dialog), activeInside, ariaModal, labelled, closed, focusBack }
})()`)
check('Modal 具备 role=dialog + aria-modal + 可访问标题', modalResult.dialog && modalResult.ariaModal === 'true' && modalResult.labelled, JSON.stringify(modalResult))
check('Modal 打开后焦点在对话框内', modalResult.activeInside === true)
check('ESC 关闭 Modal 且焦点回到触发按钮', modalResult.closed === true && modalResult.focusBack === true, JSON.stringify(modalResult))

console.log(`\n${checks.every((c) => c.ok) ? 'SECURITY AUDIT PASSED' : 'SECURITY AUDIT FAILED'}`)
try {
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
} catch {}
process.exit(checks.every((c) => c.ok) ? 0 : 1)

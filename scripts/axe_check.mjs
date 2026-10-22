/**
 * axe-core 无障碍审计（通过 CDP 注入，无需 puppeteer）。
 * 用法：node scripts/axe_check.mjs https://mall.syloe1.xyz
 */
import fs from 'node:fs/promises'

const BASE = process.argv[2] ?? 'https://mall.syloe1.xyz'
const PORT = 9222
const axeSource = await fs.readFile('node_modules/axe-core/axe.min.js', 'utf8')

const PAGES = [
  ['/', 1440, 1000],
  ['/products', 1440, 1000],
  ['/products/1001', 1440, 1000],
  ['/seckill', 1440, 1000],
  ['/about', 1440, 1000],
  ['/login', 1440, 1000],
  ['/', 375, 812],
]

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

await send('Page.enable')
await send('Runtime.enable')

let serious = 0
for (const [path, width, height] of PAGES) {
  const isMobile = width < 720
  await send('Emulation.setTouchEmulationEnabled', { enabled: isMobile, maxTouchPoints: isMobile ? 5 : 1 })
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: isMobile, screenWidth: width, screenHeight: height })
  await send('Page.navigate', { url: `${BASE}${path}` })
  await wait(600)
  for (let i = 0; i < 40; i++) {
    const mounted = await evaluate(`(document.querySelector('#app')?.children.length ?? 0) > 0`)
    if (mounted) break
    await wait(300)
  }
  await wait(1500)
  await evaluate(axeSource)
  const result = await evaluate(`axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
  }).then(r => ({
    violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 2).map(n => n.target), html: v.nodes.slice(0, 2).map(n => (n.html || '').slice(0, 200)) })),
    passes: r.passes.length,
    incomplete: r.incomplete.length
  }))`)
  const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  serious += bad.length
  console.log(`\n### ${path} @${width}px · violations=${result.violations.length} serious/critical=${bad.length}`)
  for (const v of result.violations) {
    console.log(` - [${v.impact}] ${v.id}: ${v.help} · nodes=${v.nodes} · ${JSON.stringify(v.targets)} · ${JSON.stringify(v.html)}`)
  }
}
console.log(`\n${serious === 0 ? 'AXE OK: no serious/critical violations' : `AXE FAILED: ${serious} serious/critical`}`)
try {
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
} catch {}
process.exit(serious === 0 ? 0 : 1)

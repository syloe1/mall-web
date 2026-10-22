/**
 * 线上页面诊断：通过 CDP 打开页面，收集路由/资源/控制台错误，并输出 #app 片段。
 * 用法：node scripts/probe.mjs <url> [waitMs]
 */
const url = process.argv[2]
const waitMs = Number(process.argv[3] ?? 6000)
const PORT = 9222

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let id = 0
const pending = new Map()
const logs = []
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject, method } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(`${method}: ${msg.error.message}`))
    else resolve(msg.result)
    return
  }
  if (msg.method === 'Log.entryAdded') logs.push(`[log:${msg.params.entry.level}] ${msg.params.entry.text}`)
  if (msg.method === 'Runtime.exceptionThrown') logs.push(`[exception] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`)
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    logs.push(`[console:${msg.params.type}] ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`)
  }
  if (msg.method === 'Network.loadingFailed') logs.push(`[network-failed] ${msg.params.errorText} ${msg.params.type}`)
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

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Page.navigate', { url })
await new Promise((resolve) => setTimeout(resolve, waitMs))
const info = await evaluate(`(() => ({
  url: location.href,
  title: document.title,
  readyState: document.readyState,
  appHtmlLength: document.querySelector('#app')?.innerHTML.length,
  appText: document.querySelector('#app')?.innerText.slice(0, 300),
  bodyText: document.body.innerText.slice(0, 300),
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src),
  styles: [...document.querySelectorAll('link[rel=stylesheet]')].map((s) => s.href),
  resources: performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/')).map((r) => r.name.split('/').pop()),
  vue: Boolean(window.__VUE__ || document.querySelector('#app')?.__vue_app__),
}))()`)
console.log(JSON.stringify(info, null, 2))
console.log('--- logs ---')
console.log(logs.join('\n') || '(no logs)')
try {
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
} catch {}
process.exit(0)

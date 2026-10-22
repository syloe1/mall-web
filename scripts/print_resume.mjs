/**
 * 用 CDP Page.printToPDF 把在线作品集打印成简历 PDF（printBackground=false，体积小）。
 * 用法：node scripts/print_resume.mjs <url> <out.pdf>
 */
import fs from 'node:fs/promises'

const url = process.argv[2] ?? 'https://syloe1.xyz/'
const out = process.argv[3] ?? '.tmp-resume.pdf'
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

await send('Page.enable')
await send('Page.navigate', { url })
await new Promise((resolve) => setTimeout(resolve, 6000))
const { data } = await send('Page.printToPDF', {
  printBackground: false,
  paperWidth: 8.27,
  paperHeight: 11.69,
  marginTop: 0.4,
  marginBottom: 0.4,
  marginLeft: 0.4,
  marginRight: 0.4,
  displayHeaderFooter: false,
  scale: 0.85,
})
await fs.writeFile(out, Buffer.from(data, 'base64'))
const size = (await fs.stat(out)).size
console.log(`[print] ${out} · ${(size / 1024).toFixed(1)} KB`)
try {
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
} catch {}
process.exit(0)

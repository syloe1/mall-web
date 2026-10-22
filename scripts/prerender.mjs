/**
 * /about 预渲染（可选构建步骤，用于爬虫 / 分享抓取真实标题与摘要）。
 *
 * 原理：本机起 `vite preview` 托管构建产物 → headless Chrome 打开 /about →
 * 等 Vue 挂载完成后 --dump-dom 输出完整 DOM → 写入 dist/about.html。
 * Nginx 的 try_files 会优先命中 /about.html，前端 JS 仍会正常接管路由。
 *
 * 依赖：本机 Chrome（可用 CHROME_PATH 覆盖路径）。
 * 用法：npm run build && npm run prerender
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const PORT = 4173
const PREVIEW_URL = `http://localhost:${PORT}/about`
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const resp = await fetch(PREVIEW_URL)
      if (resp.ok) return
    } catch {
      /* retry */
    }
    await wait(500)
  }
  throw new Error('vite preview 启动超时')
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => (stdout += data.toString()))
    child.stderr.on('data', (data) => (stderr += data.toString()))
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function main() {
  if (!(await fs.stat(CHROME).catch(() => null))) {
    console.error(`[prerender] 找不到 Chrome：${CHROME}，可用 CHROME_PATH 指定路径`)
    process.exitCode = 1
    return
  }

  const preview = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: process.env,
  })

  try {
    await waitForServer()
    const { code, stdout, stderr } = await run(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--virtual-time-budget=8000',
      '--dump-dom',
      PREVIEW_URL,
    ])
    if (code !== 0) throw new Error(`Chrome dump-dom 失败: ${stderr.slice(0, 500)}`)
    const html = stdout.trim()
    if (!html.toLowerCase().startsWith('<!doctype html>') || !html.includes('六条核心链路')) {
      throw new Error('预渲染结果不完整（可能 AboutView 未渲染完成）')
    }
    await fs.writeFile(path.join(DIST, 'about.html'), html)
    console.log(`[prerender] dist/about.html 已生成（${(html.length / 1024).toFixed(1)} KB）`)
  } finally {
    preview.kill()
  }
}

await main()

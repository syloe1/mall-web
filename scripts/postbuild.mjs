/**
 * 构建后处理：
 *  1. dist/index.html → dist/404.html（Nginx error_page 404 用，保留站内 404 页面）
 *  2. 校验 SEO 静态文件已进入产物（robots.txt / sitemap.xml / og-image.png / manifest）
 *  3. 可选：把 dist/about.html 做成预渲染页（scripts/prerender.mjs，可单独执行）
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')

async function main() {
  const indexPath = path.join(dist, 'index.html')
  const indexHtml = await fs.readFile(indexPath, 'utf8')
  await fs.writeFile(path.join(dist, '404.html'), indexHtml)

  const required = ['robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'og-image.png', 'apple-touch-icon.png']
  const missing = []
  for (const file of required) {
    try {
      await fs.access(path.join(dist, file))
    } catch {
      missing.push(file)
    }
  }
  if (missing.length) {
    console.error(`[postbuild] 缺少静态文件: ${missing.join(', ')}`)
    process.exitCode = 1
    return
  }
  console.log('[postbuild] 404.html 已生成；SEO 静态文件齐全')
}

await main()

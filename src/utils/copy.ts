/**
 * 全站文案表：统一英文标签、搜索示例、错误提示。
 *
 * 审计问题：
 *  - "SECOND KILL" 是中式直译 → 统一 FLASH SALE
 *  - 搜索空状态示例用「测试」「商品」等开发词 → 换成真实商品词
 *  - 首页 COLLECTION、商品页 PRODUCTS 同概念两种写法 → 统一 SHOP ALL
 *  - 错误 toast 直接显示后端英文/中文混杂 → 统一映射为用户可读中文
 */

export const BRAND = 'Mall 商城'

export const AUTHOR = {
  name: '李俊哲',
  title: '后端开发工程师 · Go / C++',
  email: '3337976147@qq.com',
  github: 'https://github.com/syloe1',
  portfolio: 'https://syloe1.xyz',
  resume: 'https://syloe1.xyz/resume.pdf',
}

export const PROJECT = {
  name: 'Mall 商城',
  subtitle: 'Go 全栈电商项目',
  repoBackend: 'https://github.com/syloe1/mall',
  repoFrontend: 'https://github.com/syloe1/mall-web',
  demo: 'https://mall.syloe1.xyz',
  demoUser: 'demo',
  demoPassword: 'Demo@123456',
  adminUser: 'admin',
  adminPassword: 'Admin@123456',
}

export const LABELS = {
  home: '首页',
  products: '全部商品',
  seckill: '秒杀',
  about: '关于项目',
  search: '搜索',
  cart: '购物车',
  favorites: '收藏',
  orders: '我的订单',
  // 英文装饰标签：同一概念只用一种写法
  en: {
    shopAll: 'SHOP ALL',
    flashSale: 'FLASH SALE',
    search: 'SEARCH',
    about: 'ABOUT',
    featured: 'EDITOR’S PICK',
  },
}

/** 搜索空状态示例：用真实在售商品词，不用「测试」「商品」 */
export const SEARCH_EXAMPLES = ['耳机', '咖啡', '台灯', '卫衣']

/** 后端错误/网络错误 → 用户可读文案（后端已基本中文化，这里是兜底） */
const ERROR_MAP: Record<string, string> = {
  'Invalid username or password': '用户名或密码错误',
  'username or password is incorrect': '用户名或密码错误',
  'user not found': '用户名或密码错误',
  'Request failed with status code 429': '操作过于频繁，请稍后再试',
  'Network Error': '网络连接失败，请检查网络后重试',
  'timeout of 20000ms exceeded': '请求超时，请稍后再试',
}

export function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const message = raw.trim()
  if (!message) return '操作失败，请稍后再试'
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value
  }
  // 后端 msg 已是中文时直接透传；英文兜底避免详情外泄
  if (/[\u4e00-\u9fa5]/.test(message)) return message
  return '操作失败，请稍后再试'
}

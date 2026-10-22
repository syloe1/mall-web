// 与后端 model/dto 对齐的类型定义（github.com/syloe1/mall）
// 注意：商品/订单等仍沿用 gorm.Model 序列化后的大写键 ID/CreatedAt（后续可切 DTO），
// 秒杀活动已改为后端 DTO 的小写 id。

export type ProductStatus = 'draft' | 'on_sale' | 'off_sale' | 'sold_out'
export type OrderStatus = 'pending_pay' | 'paid' | 'shipped' | 'completed' | 'canceled'
export type PaymentChannel = 'mock' | 'balance' | 'wechat' | 'alipay'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'closed'
export type Role = 'user' | 'admin' | 'superadmin'

export interface Timestamped {
  ID: number
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
}

export interface ApiEnvelope<T = unknown> {
  code: number
  msg: string
  request_id?: string
  data?: T
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface AuthTokens {
  access_token: string
  role: string
  // 浏览器模式下 refresh token 走 HttpOnly Cookie，响应体不再下发
  refresh_token?: string
}

export interface UserProfile {
  id: number
  username: string
  nickname: string
  avatar: string
  role: string
}

export interface UserAmount {
  amount: string
}

export interface MetaInfo {
  demo_mode: boolean
  version: string
}

export interface Category {
  id: number
  name: string
}

// ---------------- 商品 ----------------
export interface ProductImage extends Timestamped {
  product_id: number
  url: string
  sort_order: number
}

export interface Product extends Timestamped {
  name: string
  price_cents: number
  description: string
  stock: number
  category_id: number
  status: ProductStatus
  sale_count: number
  images: ProductImage[]
}

// ---------------- 地址 ----------------
export interface Address extends Timestamped {
  user_id: number
  receiver_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  postal_code: string
  is_default: boolean
}

// ---------------- 购物车 ----------------
export interface CartItem extends Timestamped {
  user_id: number
  product_id: number
  quantity: number
  checked: boolean
  product?: Product
}

// ---------------- 订单 ----------------
export interface OrderItem extends Timestamped {
  order_id: number
  product_id: number
  product_name: string
  product_image: string
  price_cents: number
  quantity: number
  subtotal: number
}

export interface Order extends Timestamped {
  order_no: string
  user_id: number
  status: OrderStatus
  total_amount: number
  receiver_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  postal_code: string
  items: OrderItem[]
}

// ---------------- 支付 ----------------
export interface Payment extends Timestamped {
  payment_no: string
  order_id: number
  order_no: string
  user_id: number
  channel: string
  amount: number
  status: PaymentStatus
  transaction_no: string
  paid_at: string | null
  order?: Order
}

// ---------------- 收藏 ----------------
export interface FavoriteFolder extends Timestamped {
  user_id: number
  name: string
  is_default: boolean
  items?: FavoriteItem[]
}

export interface FavoriteItem extends Timestamped {
  user_id: number
  folder_id: number
  product_id: number
  folder?: FavoriteFolder
  product?: Product
}

// ---------------- 秒杀 / 死信 ----------------
export interface SeckillBuyResult {
  status: 'queued'
}

export interface DeadLetter extends Timestamped {
  event_id: string
  event_type: string
  product_id: number
  source: string
  retry_count: number
  error_message: string
  payload: string
}

// 分类默认兜底（真实数据由 GET /api/v1/categories 下发，见 stores/categories.ts）
export const CATEGORY_LABELS: Record<number, string> = {
  1: '数码',
  2: '食品',
  3: '美妆',
  4: '服饰',
  5: '家电',
  6: '家居',
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: '草稿',
  on_sale: '在售',
  off_sale: '下架',
  sold_out: '售罄',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_pay: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  canceled: '已取消',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '待支付',
  success: '支付成功',
  failed: '支付失败',
  closed: '已关闭',
}

export const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  mock: '模拟支付',
  balance: '余额支付',
  wechat: '微信支付',
  alipay: '支付宝',
}

import { get, post, put, del } from './http'
import type { DeadLetter, Paged, Product } from '@/types'

export interface AdminProductListParams {
  page?: number
  page_size?: number
  status?: string
  category_id?: number
  keyword?: string
}

export function adminListProducts(params: AdminProductListParams) {
  // 后端 ListAdmin 通过 query 参数接收筛选/分页（GET 无法在浏览器携带 JSON body）
  return get<Paged<Product>>('/admin/products', params)
}

export interface ProductPayload {
  name: string
  price_cents: number
  description: string
  stock: number
  category_id: number
  status: string
  images: string[]
}

export function adminCreateProduct(payload: ProductPayload) {
  return post<null>('/admin/products', payload)
}

export function adminUpdateProduct(id: number, payload: ProductPayload) {
  return put<null>('/admin/products/detail', { id, ...payload })
}

export function adminDeleteProduct(id: number) {
  return del<null>('/admin/products/detail', { id })
}

export function initSeckillStock(activity_id: number) {
  return post<null>('/admin/seckill/activities/init-stock', { activity_id })
}

export function reindexProducts() {
  return post<{ indexed: number }>('/admin/products/reindex', {})
}

export function listDeadLetters(params: { page?: number; page_size?: number; source?: string; event_type?: string; product_id?: number }) {
  return get<Paged<DeadLetter>>('/admin/dead-letters/products', params)
}

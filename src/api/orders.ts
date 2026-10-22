import { get, post } from './http'
import type { Order, Paged } from '@/types'

/** 从购物车勾选商品创建订单 */
export function createOrderFromCart(address_id: number) {
  return post<Order>('/users/orders/cart', { address_id })
}

/** 立即购买 */
export function buyNow(product_id: number, quantity: number, address_id: number) {
  return post<Order>('/users/orders/buy-now', { product_id, quantity, address_id })
}

/** 我的订单列表（后端 GET /users/orders） */
export function listOrders(page = 1, page_size = 20, status?: string) {
  return get<Paged<Order>>('/users/orders', { page, page_size, status })
}

import { get, post, put, del } from './http'
import type { CartItem } from '@/types'

export function addCartItem(product_id: number, quantity: number) {
  return post<null>('/users/cart/items', { product_id, quantity })
}

export function listCartItems() {
  return get<CartItem[]>('/users/cart/items')
}

export function updateCartItem(product_id: number, quantity: number) {
  return put<null>('/users/cart/items', { product_id, quantity })
}

export function deleteCartItem(product_id: number) {
  return del<null>('/users/cart/items', { product_id })
}

export function clearCart() {
  return del<null>('/users/cart')
}

export function setItemChecked(product_id: number, checked: boolean) {
  return put<null>('/users/cart/items/checked', { product_id, checked })
}

export function setAllChecked(checked: boolean) {
  return put<null>('/users/cart/checked', { checked })
}

export function listCheckedItems() {
  return get<CartItem[]>('/users/cart/checked')
}

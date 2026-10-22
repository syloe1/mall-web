import { get } from './http'
import type { Paged, Product } from '@/types'

export interface ProductListParams {
  page?: number
  page_size?: number
  category_id?: number
  keyword?: string
}

export function listProducts(params: ProductListParams) {
  return get<Paged<Product>>('/products', params)
}

export function searchProducts(params: ProductListParams) {
  return get<Paged<Product>>('/products/search', params)
}

export function getProduct(id: number | string) {
  return get<Product>(`/products/${id}`)
}

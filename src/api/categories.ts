import { get } from './http'
import type { Category } from '@/types'

export function listCategories() {
  return get<Category[]>('/categories')
}

import { get, post, put, del } from './http'
import type { FavoriteFolder, FavoriteItem, Paged } from '@/types'

export function listFolders() {
  return get<FavoriteFolder[]>('/users/favorite/folders')
}

export function createFolder(name: string) {
  return post<null>('/users/favorite/folders', { name })
}

export function updateFolder(id: number, name: string) {
  return put<null>('/users/favorite/folders', { id, name })
}

export function deleteFolder(id: number) {
  return del<null>('/users/favorite/folders', { id })
}

export function listFavoriteItems(folder_id: number, page = 1, page_size = 50) {
  return get<Paged<FavoriteItem>>('/users/favorite/items', { folder_id, page, page_size })
}

export function addFavoriteItem(folder_id: number, product_id: number) {
  return post<null>('/users/favorite/items', { folder_id, product_id })
}

export function deleteFavoriteItem(folder_id: number, product_id: number) {
  return del<null>('/users/favorite/items', { folder_id, product_id })
}

export function checkFavorite(product_id: number) {
  return get<{ favorited: boolean }>('/users/favorite/check', { product_id })
}

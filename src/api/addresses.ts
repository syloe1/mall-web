import { get, post, put, del } from './http'
import type { Address } from '@/types'

export function listAddresses() {
  return get<Address[]>('/users/addresses')
}

export function getAddress(id: number) {
  return get<Address>('/users/addresses/detail', { id })
}

export interface AddressPayload {
  receiver_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  postal_code?: string
  is_default?: boolean
}

export function createAddress(payload: AddressPayload) {
  return post<null>('/users/addresses', payload)
}

export function updateAddress(id: number, payload: AddressPayload) {
  return put<null>('/users/addresses', { id, ...payload })
}

export function deleteAddress(id: number) {
  return del<null>('/users/addresses', { id })
}

export function setDefaultAddress(id: number) {
  return put<null>('/users/addresses/default', { id })
}

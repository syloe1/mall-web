import { get, put } from './http'
import type { UserAmount } from '@/types'

export function updateProfile(nickname: string, avatar: string) {
  return put<null>('/users/me', { nickname, avatar })
}

export function changePassword(old_password: string, new_password: string) {
  return put<null>('/users/me/password', { old_password, new_password })
}

export function setPayPassword(pay_password: string) {
  return put<null>('/users/me/pay-password', { pay_password })
}

export function getAmount() {
  return get<UserAmount>('/users/me/amount')
}

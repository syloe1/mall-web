import { get, post } from './http'
import type { Payment } from '@/types'

export function createPayment(order_id: number, channel: string, pay_password?: string) {
  return post<Payment>('/users/payments', { order_id, channel, pay_password })
}

export function getPayment(payment_no: string) {
  return get<Payment>('/users/payments/detail', { payment_no })
}

export function mockPaySuccess(payment_no: string) {
  return post<Payment>('/users/payments/mock/success', { payment_no })
}

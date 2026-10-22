import { get, post } from './http'
import type { SeckillBuyResult } from '@/types'

export type SeckillStatus = 'upcoming' | 'running' | 'ended' | 'draft' | 'closed'

export interface SeckillActivity {
  id: number
  activity_no: string
  name: string
  product_id: number
  product_name: string
  product_image: string
  original_price_cents: number
  seckill_price_cents: number
  total_stock: number
  available_stock: number
  per_limit: number
  start_at: string
  end_at: string
  /** 服务端按时间窗口实时派生 */
  status: SeckillStatus
}

// 公开：拉取进行中 / 未开始 / 最近结束的秒杀活动列表
export function listActivities() {
  return get<SeckillActivity[]>('/seckill/activities')
}

export interface SeckillPurchase {
  ID: number
  user_id: number
  seckill_activity_id: number
  product_id: number
  order_id: number
  status: string
}

// 登录后查询我在某活动的抢购结果（轮询用），未抢到返回 null
export function mySeckillResult(activity_id: number) {
  return get<SeckillPurchase | null>(`/seckill/activities/${activity_id}/my-result`)
}

export function seckillBuy(activity_id: number) {
  return post<SeckillBuyResult>(`/seckill/activities/${activity_id}/buy`)
}

import { get } from './http'
import type { MetaInfo } from '@/types'

let cached: MetaInfo | null = null
let pending: Promise<MetaInfo> | null = null

/** 运行时元信息（演示模式、版本），页面生命周期内只请求一次 */
export async function fetchMeta(): Promise<MetaInfo> {
  if (cached) return cached
  pending ??= get<MetaInfo>('/meta')
    .then((meta) => {
      cached = meta
      return meta
    })
    .catch(() => {
      cached = { demo_mode: false, version: 'unknown' }
      return cached
    })
    .finally(() => {
      pending = null
    })
  return pending
}

export function getCachedMeta(): MetaInfo | null {
  return cached
}

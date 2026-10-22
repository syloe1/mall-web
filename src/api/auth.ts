import { get, post } from './http'
import type { AuthTokens, UserProfile } from '@/types'

export function login(username: string, password: string) {
  return post<AuthTokens>('/users/login', { username, password })
}

export function register(username: string, password: string) {
  return post<null>('/users/register', { username, password })
}

export function fetchProfile() {
  return get<UserProfile>('/users/me')
}

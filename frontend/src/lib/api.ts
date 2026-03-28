import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Silent token refresh ────────────────────────────────────────────────────
// Tracks whether a refresh is already in flight and queues any concurrent
// requests that arrive while the refresh is happening so they all succeed
// once the new token arrives instead of all triggering separate refreshes.

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

function flushQueue(error: any, token: string | null = null) {
  refreshQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)))
  refreshQueue = []
}

function doLogout() {
  const { refreshToken, logout } = useAuthStore.getState()
  // Best-effort server invalidation — don't block on it
  if (refreshToken) {
    axios.post(`${API_URL}/api/auth/logout`, { refreshToken }).catch(() => {})
  }
  logout()
  window.location.href = '/login'
}

api.interceptors.response.use(
  response => response,
  async (error) => {
    const original = error.config

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Never try to refresh for auth endpoints themselves
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(error)
    }

    original._retry = true

    // Another request is already refreshing — queue this one
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    const { refreshToken } = useAuthStore.getState()
    if (!refreshToken) {
      doLogout()
      return Promise.reject(error)
    }

    isRefreshing = true
    try {
      const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken })
      const { token: newToken, refreshToken: newRefreshToken } = res.data

      useAuthStore.getState().setTokens(newToken, newRefreshToken)
      flushQueue(null, newToken)

      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshError) {
      flushQueue(refreshError)
      doLogout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

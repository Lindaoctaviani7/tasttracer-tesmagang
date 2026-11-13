import axios from 'axios'
import { clearAccessToken, getAccessToken } from './tokenStorage'
import { toApiError } from './errors'

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error('VITE_API_URL must be configured before starting the frontend.')
}

export const apiClient = axios.create({
  baseURL: apiUrl,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)

    if (apiError.status === 401) {
      clearAccessToken()
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }

    return Promise.reject(apiError)
  },
)

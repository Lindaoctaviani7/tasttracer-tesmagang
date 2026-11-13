import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, AUTH_UNAUTHORIZED_EVENT } from './client'
import { clearAccessToken, getAccessToken, saveAccessToken } from './tokenStorage'

const originalAdapter = apiClient.defaults.adapter

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('API client', () => {
  it('sends the stored bearer token with each request', async () => {
    let requestConfig: Parameters<AxiosAdapter>[0] | undefined
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config

      return {
        data: { status: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      }
    }
    apiClient.defaults.adapter = adapter
    saveAccessToken('test-access-token')

    await apiClient.get('/user')

    expect(requestConfig?.headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('clears authentication and emits an event when the API returns 401', async () => {
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError(
        'Request failed',
        AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        {
          data: { message: 'Unauthenticated.' },
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config,
        },
      )
    }
    const handleUnauthorized = vi.fn()
    apiClient.defaults.adapter = adapter
    saveAccessToken('expired-access-token')
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)

    await expect(apiClient.get('/user')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unauthenticated.',
      status: 401,
    })

    expect(getAccessToken()).toBeNull()
    expect(handleUnauthorized).toHaveBeenCalledOnce()
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  })

  it('normalizes network errors for callers', async () => {
    const adapter: AxiosAdapter = async () => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK)
    }
    apiClient.defaults.adapter = adapter

    await expect(apiClient.get('/user')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Tidak dapat terhubung ke server API.',
      status: null,
    })
  })
})

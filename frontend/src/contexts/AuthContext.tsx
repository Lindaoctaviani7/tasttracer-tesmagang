import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, getErrorMessage } from '../api/errors'
import { AUTH_UNAUTHORIZED_EVENT } from '../api/client'
import { clearAccessToken, getAccessToken, saveAccessToken } from '../api/tokenStorage'
import { authService, type LoginCredentials, type RegistrationData } from '../services/authService'
import type { User } from '../types/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => getAccessToken() !== null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAccessToken()
      setUser(null)
      setError('Sesi berakhir. Silakan masuk kembali.')
      setIsLoading(false)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)

    if (!getAccessToken()) {
      return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }

    let active = true

    void authService.getCurrentUser()
      .then((authenticatedUser) => {
        if (active) {
          setUser(authenticatedUser)
          setError(null)
        }
      })
      .catch((requestError: unknown) => {
        if (active && !(requestError instanceof ApiError && requestError.status === 401)) {
          setError(getErrorMessage(requestError))
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setError(null)
    const session = await authService.login(credentials)
    saveAccessToken(session.token)
    setUser(session.user)
  }, [])

  const register = useCallback(async (data: RegistrationData): Promise<void> => {
    setError(null)
    const session = await authService.register(data)
    saveAccessToken(session.token)
    setUser(session.user)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    setError(null)

    try {
      await authService.logout()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))

      throw requestError
    } finally {
      clearAccessToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, error, login, register, logout, clearError }),
    [user, isLoading, error, login, register, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { createContext } from 'react'
import type { LoginCredentials, RegistrationData } from '../services/authService'
import type { User } from '../types/api'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegistrationData) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

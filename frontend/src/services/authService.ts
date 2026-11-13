import { apiClient } from '../api/client'
import type { ApiResponse, AuthSession, User } from '../types/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationData extends LoginCredentials {
  name: string
  password_confirmation: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await apiClient.post<ApiResponse<AuthSession>>('/login', credentials)

    return response.data.data
  },

  async register(data: RegistrationData): Promise<AuthSession> {
    const response = await apiClient.post<ApiResponse<AuthSession>>('/register', data)

    return response.data.data
  },

  async logout(): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/logout')
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/user')

    return response.data.data.user
  },
}

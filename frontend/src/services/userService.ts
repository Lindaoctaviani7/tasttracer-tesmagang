import { apiClient } from '../api/client'
import type { ApiResponse, PaginatedCollection, User, UserRole } from '../types/api'

export interface UserFilters {
  search?: string
  page?: number
  per_page?: number
}

interface UserCollection extends PaginatedCollection {
  users: User[]
}

export const userService = {
  async list(filters: UserFilters = {}): Promise<UserCollection> {
    const response = await apiClient.get<ApiResponse<UserCollection>>('/admin/users', {
      params: filters,
    })

    return response.data.data
  },

  async show(userId: number): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(`/admin/users/${userId}`)

    return response.data.data.user
  },

  async updateRole(userId: number, role: UserRole): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      `/admin/users/${userId}/role`,
      { role },
    )

    return response.data.data.user
  },
}

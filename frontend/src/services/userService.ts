import { apiClient } from '../api/client'
import type {
  ApiResponse,
  AssigneeOption,
  PaginatedCollection,
  User,
  UserRole,
} from '../types/api'

export interface UserFilters {
  search?: string
  page?: number
  per_page?: number
}

interface UserCollection extends PaginatedCollection {
  users: User[]
}

export interface AssigneeOptionFilters {
  search?: string
  page?: number
  per_page?: number
}

interface AssigneeOptionCollection extends PaginatedCollection {
  users: AssigneeOption[]
}

export const userService = {
  async listAssigneeOptions(filters: AssigneeOptionFilters = {}): Promise<AssigneeOptionCollection> {
    const response = await apiClient.get<ApiResponse<AssigneeOptionCollection>>(
      '/users/assignee-options',
      { params: filters },
    )

    return response.data.data
  },

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

import { apiClient } from '../api/client'
import type {
  ApiResponse,
  PaginatedCollection,
  Tag,
  Task,
  User,
} from '../types/api'

export interface TaskFilters {
  status?: 'completed' | 'pending'
  search?: string
  page?: number
  per_page?: number
}

export interface CreateTaskData {
  title: string
  description?: string | null
  is_completed?: boolean
}

export interface UpdateTaskData {
  title?: string
  description?: string | null
  is_completed?: boolean
}

interface TaskCollection extends PaginatedCollection {
  tasks: Task[]
}

export const taskService = {
  async list(filters: TaskFilters = {}): Promise<TaskCollection> {
    const response = await apiClient.get<ApiResponse<TaskCollection>>('/tasks', {
      params: filters,
    })

    return response.data.data
  },

  async show(taskId: number): Promise<Task> {
    const response = await apiClient.get<ApiResponse<{ task: Task }>>(`/tasks/${taskId}`)

    return response.data.data.task
  },

  async create(data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post<ApiResponse<{ task: Task }>>('/tasks', data)

    return response.data.data.task
  },

  async update(taskId: number, data: UpdateTaskData): Promise<Task> {
    const response = await apiClient.put<ApiResponse<{ task: Task }>>(`/tasks/${taskId}`, data)

    return response.data.data.task
  },

  async remove(taskId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/tasks/${taskId}`)
  },

  async listAssignees(taskId: number): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<{ assignees: User[] }>>(
      `/tasks/${taskId}/assignees`,
    )

    return response.data.data.assignees
  },

  async addAssignees(taskId: number, userIds: number[]): Promise<User[]> {
    const response = await apiClient.post<ApiResponse<{ assignees: User[] }>>(
      `/tasks/${taskId}/assignees`,
      { user_ids: userIds },
    )

    return response.data.data.assignees
  },

  async syncAssignees(taskId: number, userIds: number[]): Promise<Task['assignees']> {
    const response = await apiClient.put<ApiResponse<{ assignees: Task['assignees'] }>>(
      `/tasks/${taskId}/assignees`,
      { user_ids: userIds },
    )

    return response.data.data.assignees
  },

  async removeAssignee(taskId: number, userId: number): Promise<User> {
    const response = await apiClient.delete<ApiResponse<{ assignee: User }>>(
      `/tasks/${taskId}/assignees/${userId}`,
    )

    return response.data.data.assignee
  },

  async addTags(taskId: number, tagIds: number[]): Promise<Tag[]> {
    const response = await apiClient.post<ApiResponse<{ tags: Tag[] }>>(
      `/tasks/${taskId}/tags`,
      { tag_ids: tagIds },
    )

    return response.data.data.tags
  },

  async removeTag(taskId: number, tagId: number): Promise<Tag> {
    const response = await apiClient.delete<ApiResponse<{ tag: Tag }>>(
      `/tasks/${taskId}/tags/${tagId}`,
    )

    return response.data.data.tag
  },
}

import { apiClient } from '../api/client'
import type { ApiResponse, PaginatedCollection, Tag } from '../types/api'

interface TagCollection extends PaginatedCollection {
  tags: Tag[]
}

export const tagService = {
  async list(page = 1): Promise<TagCollection> {
    const response = await apiClient.get<ApiResponse<TagCollection>>('/tags', {
      params: { page },
    })

    return response.data.data
  },

  async listAll(): Promise<Tag[]> {
    const firstPage = await this.list()
    const remainingPages = await Promise.all(
      Array.from(
        { length: Math.max(firstPage.pagination.last_page - 1, 0) },
        (_, index) => this.list(index + 2),
      ),
    )

    return [
      ...firstPage.tags,
      ...remainingPages.flatMap((page) => page.tags),
    ]
  },

  async create(name: string): Promise<Tag> {
    const response = await apiClient.post<ApiResponse<{ tag: Tag }>>('/tags', { name })

    return response.data.data.tag
  },

  async update(tagId: number, name: string): Promise<Tag> {
    const response = await apiClient.put<ApiResponse<{ tag: Tag }>>(`/tags/${tagId}`, { name })

    return response.data.data.tag
  },

  async remove(tagId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/tags/${tagId}`)
  },
}

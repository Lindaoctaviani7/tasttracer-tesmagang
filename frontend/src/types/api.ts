export interface ApiResponse<TData> {
  message: string
  data: TData
}

export interface Pagination {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface PaginatedCollection {
  pagination: Pagination
}

export type UserRole = 'admin' | 'member'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string | null
}

export interface AssigneeOption {
  id: number
  name: string
  email: string
}

export interface Tag {
  id: number
  name: string
  created_at: string | null
  updated_at: string | null
}

export interface TaskAssignee {
  id: number
  name: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  is_completed: boolean
  created_by: number
  creator: Pick<User, 'id' | 'name'>
  assignees: TaskAssignee[]
  tags: Tag[]
  created_at: string | null
  updated_at: string | null
}

export interface AuthSession {
  user: User
  token: string
  token_type: 'Bearer'
  expires_at: string | null
}

export interface ApiValidationErrors {
  [field: string]: string[]
}

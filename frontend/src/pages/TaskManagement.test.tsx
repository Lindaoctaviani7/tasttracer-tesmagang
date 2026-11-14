import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { apiClient } from '../api/client'
import { saveAccessToken } from '../api/tokenStorage'
import type { Task } from '../types/api'

const originalAdapter = apiClient.defaults.adapter
const currentUser = {
  id: 8,
  name: 'Rina Putri',
  email: 'rina@example.test',
  role: 'member' as const,
  created_at: '2026-11-14T00:00:00.000000Z',
}
const sampleTask: Task = {
  id: 21,
  title: 'Review sprint plan',
  description: 'Check the upcoming sprint tasks.',
  is_completed: false,
  created_by: 8,
  creator: { id: 8, name: currentUser.name },
  assignees: [{ id: 9, name: 'Maya Putri' }],
  tags: [{ id: 3, name: 'Planning', created_at: null, updated_at: null }],
  created_at: '2026-11-14T00:00:00.000000Z',
  updated_at: '2026-11-14T00:00:00.000000Z',
}

function response(
  config: Parameters<AxiosAdapter>[0],
  data: unknown,
  status = 200,
) {
  return {
    data,
    status,
    statusText: status === 201 ? 'Created' : 'OK',
    headers: new AxiosHeaders(),
    config,
  }
}

function taskResponse(config: Parameters<AxiosAdapter>[0], task: Task) {
  return response(config, {
    message: 'Task retrieved successfully.',
    data: { task },
  })
}

function taskListResponse(config: Parameters<AxiosAdapter>[0], tasks: Task[]) {
  return response(config, {
    message: 'Tasks retrieved successfully.',
    data: {
      tasks,
      pagination: { current_page: 1, per_page: 10, total: tasks.length, last_page: 1 },
    },
  })
}

function authenticatedUserResponse(config: Parameters<AxiosAdapter>[0]) {
  return response(config, {
    message: 'Authenticated user retrieved successfully.',
    data: { user: currentUser },
  })
}

function optionsResponse(config: Parameters<AxiosAdapter>[0]) {
  return response(config, {
    message: 'Assignee options retrieved successfully.',
    data: {
      users: [{ id: 9, name: 'Maya Putri', email: 'maya@example.test' }],
      pagination: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
    },
  })
}

function tagsResponse(config: Parameters<AxiosAdapter>[0]) {
  return response(config, {
    message: 'Tags retrieved successfully.',
    data: {
      tags: [{ id: 3, name: 'Planning', created_at: null, updated_at: null }],
      pagination: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
    },
  })
}

function createdTaskResponse(config: Parameters<AxiosAdapter>[0], task: Task) {
  return response(config, {
    message: 'Task created successfully.',
    data: { task },
  }, 201)
}

function unauthorizedPermissionError(config: Parameters<AxiosAdapter>[0]) {
  return new AxiosError(
    'Request failed',
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    {
      data: { message: 'Forbidden.' },
      status: 403,
      statusText: 'Forbidden',
      headers: new AxiosHeaders(),
      config,
    },
  )
}

function setup(path = '/tasks') {
  saveAccessToken('dashboard-test-token')
  window.history.replaceState({}, '', path)
  render(<App />)
}

afterEach(() => {
  cleanup()
  apiClient.defaults.adapter = originalAdapter
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.restoreAllMocks()
})

describe('task dashboard', () => {
  it('creates a task and connects selected assignees and tags', async () => {
    const relationRequests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      if (config.url?.includes('/tasks/21/')) {
        relationRequests.push(`${config.method}:${config.url}`)

        return response(config, { message: 'Relation saved.', data: { assignees: [], tags: [] } })
      }

      if (config.url?.endsWith('/users/assignee-options')) {
        return optionsResponse(config)
      }

      if (config.url?.endsWith('/tags')) {
        return tagsResponse(config)
      }

      if (config.url?.endsWith('/tasks') && config.method === 'post') {
        return createdTaskResponse(config, sampleTask)
      }

      if (config.url?.endsWith('/tasks')) {
        return taskListResponse(config, [sampleTask])
      }

      return response(config, { message: 'Relation saved.', data: { assignees: [], tags: [] } })
    }
    apiClient.defaults.adapter = adapter
    setup()
    const userActions = userEvent.setup()

    await userActions.click(await screen.findByRole('button', { name: /Tambah tugas/i }))
    await userActions.type(await screen.findByLabelText('Judul tugas'), 'Review sprint plan')
    await userActions.click(await screen.findByRole('checkbox', { name: /Maya Putri/ }))
    const planningTag = await screen.findByRole('checkbox', { name: 'Planning' })
    await userActions.click(planningTag)
    expect((planningTag as HTMLInputElement).checked).toBe(true)
    await userActions.click(screen.getByRole('button', { name: 'Buat tugas' }))

    expect(await screen.findByText('Tugas berhasil dibuat.')).toBeTruthy()
    expect((await screen.findAllByText('Review sprint plan')).length).toBeGreaterThan(0)
    expect(relationRequests).toContain('post:/tasks/21/assignees')
    expect(relationRequests).toContain('post:/tasks/21/tags')
  })

  it('filters tasks using the status and search query parameters', async () => {
    const requestQueries: Record<string, string | number>[] = []
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      if (config.url?.endsWith('/tasks')) {
        const params = config.params as Record<string, string | number>
        requestQueries.push(params)

        return response(config, {
          message: 'Tasks retrieved successfully.',
          data: {
            tasks: [sampleTask],
            pagination: {
              current_page: Number(params.page ?? 1),
              per_page: 10,
              total: 15,
              last_page: 2,
            },
          },
        })
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup()
    const userActions = userEvent.setup()

    await userActions.selectOptions(await screen.findByRole('combobox', { name: 'Filter status' }), 'completed')
    await userActions.type(screen.getByRole('searchbox', { name: 'Cari tugas berdasarkan judul' }), 'sprint')

    await waitFor(() => {
      expect(requestQueries.some((query) => query.status === 'completed')).toBe(true)
      expect(requestQueries.some((query) => query.search === 'sprint')).toBe(true)
    })

    await userActions.click(screen.getByRole('button', { name: 'Halaman berikutnya' }))

    await waitFor(() => {
      expect(requestQueries.some((query) => query.page === 2)).toBe(true)
    })
  })

  it('updates task details and removes a tag from an existing task', async () => {
    let updatedTask = sampleTask
    const relationRequests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      if (config.url?.endsWith('/users/assignee-options')) {
        return optionsResponse(config)
      }

      if (config.url?.endsWith('/tags')) {
        return tagsResponse(config)
      }

      if (config.url?.endsWith('/tasks/21') && config.method === 'put') {
        const requestBody = JSON.parse(String(config.data)) as Pick<Task, 'title' | 'description' | 'is_completed'>
        updatedTask = { ...updatedTask, ...requestBody }

        return taskResponse(config, updatedTask)
      }

      if (config.url?.endsWith('/tasks/21')) {
        return taskResponse(config, updatedTask)
      }

      if (config.url?.endsWith('/tasks/21/assignees')) {
        relationRequests.push(`${config.method}:${config.url}`)

        return response(config, { message: 'Assignees synchronized.', data: { assignees: sampleTask.assignees } })
      }

      if (config.url?.endsWith('/tasks/21/tags/3')) {
        relationRequests.push(`${config.method}:${config.url}`)

        return response(config, { message: 'Tag removed.', data: { tag: sampleTask.tags[0] } })
      }

      if (config.url?.endsWith('/tasks')) {
        return taskListResponse(config, [updatedTask])
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/tasks/21/edit')
    const userActions = userEvent.setup()

    await userActions.clear(await screen.findByLabelText('Judul tugas'))
    await userActions.type(screen.getByLabelText('Judul tugas'), 'Updated sprint plan')
    await userActions.click(await screen.findByRole('checkbox', { name: 'Planning' }))
    await userActions.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    expect(await screen.findByText('Tugas berhasil diperbarui.')).toBeTruthy()
    expect(updatedTask.title).toBe('Updated sprint plan')
    expect(relationRequests).toContain('put:/tasks/21/assignees')
    expect(relationRequests).toContain('delete:/tasks/21/tags/3')
  })

  it('deletes a task after confirmation and refreshes the list', async () => {
    let isDeleted = false
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      if (config.url?.endsWith('/tasks/21') && config.method === 'delete') {
        isDeleted = true

        return response(config, { message: 'Task deleted.', data: null })
      }

      if (config.url?.endsWith('/tasks')) {
        return taskListResponse(config, isDeleted ? [] : [sampleTask])
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup()
    const userActions = userEvent.setup()

    await userActions.click((await screen.findAllByRole('button', { name: 'Hapus Review sprint plan' }))[0])
    await userActions.click(screen.getByRole('button', { name: 'Ya, hapus tugas' }))

    expect(await screen.findByText('Tugas berhasil dihapus.')).toBeTruthy()
    expect(isDeleted).toBe(true)
    expect(await screen.findByText('Belum ada tugas')).toBeTruthy()
  })

  it('shows a clear authorization error when the API denies access', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      throw unauthorizedPermissionError(config)
    }
    apiClient.defaults.adapter = adapter
    setup()

    expect(await screen.findByText('Anda tidak memiliki izin untuk melakukan tindakan ini.')).toBeTruthy()
  })

  it('loads task details and updates its status through the task API', async () => {
    let updatedTask = sampleTask
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return authenticatedUserResponse(config)
      }

      if (config.url?.endsWith('/tasks/21') && config.method === 'put') {
        const requestBody = JSON.parse(String(config.data)) as { is_completed: boolean }
        updatedTask = { ...updatedTask, is_completed: requestBody.is_completed }

        return taskResponse(config, updatedTask)
      }

      if (config.url?.endsWith('/tasks/21')) {
        return taskResponse(config, updatedTask)
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/tasks/21')
    const userActions = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'Review sprint plan' })).toBeTruthy()
    await userActions.click(screen.getByRole('button', { name: 'Tandai selesai' }))

    expect((await screen.findByRole('status')).textContent).toContain('Tugas berhasil ditandai selesai.')
    expect(updatedTask.is_completed).toBe(true)
  })
})

import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { apiClient } from '../api/client'
import { saveAccessToken } from '../api/tokenStorage'
import type { User, UserRole } from '../types/api'

const originalAdapter = apiClient.defaults.adapter
const admin: User = {
  id: 1,
  name: 'Admin Utama',
  email: 'admin@example.test',
  role: 'admin',
  created_at: '2026-01-02T00:00:00.000000Z',
}
const member: User = {
  id: 2,
  name: 'Rina Putri',
  email: 'rina@example.test',
  role: 'member',
  created_at: '2026-02-03T00:00:00.000000Z',
}

function response(config: Parameters<AxiosAdapter>[0], data: unknown, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  }
}

function userResponse(config: Parameters<AxiosAdapter>[0], user: User) {
  return response(config, { message: 'User retrieved.', data: { user } })
}

function setup(path: string) {
  saveAccessToken('admin-test-token')
  window.history.replaceState({}, '', path)
  render(<App />)
}

afterEach(() => {
  cleanup()
  apiClient.defaults.adapter = originalAdapter
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('admin pages and access control', () => {
  it('displays statistics returned by the admin dashboard API', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return userResponse(config, admin)
      }

      if (config.url?.endsWith('/admin/dashboard/stats')) {
        return response(config, {
          message: 'Statistics retrieved.',
          data: { total_users: 14, total_tasks: 28, completed_tasks: 11, pending_tasks: 17 },
        })
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/admin')

    expect(await screen.findByText('Dashboard Admin')).toBeTruthy()
    expect(await screen.findByText('14')).toBeTruthy()
    expect(await screen.findByText('28')).toBeTruthy()
    expect(await screen.findByText('11')).toBeTruthy()
    expect(await screen.findByText('17')).toBeTruthy()
  })

  it('filters users by role and confirms role changes through the API', async () => {
    let updatedUser = member
    const userQueries: Array<Record<string, string | number>> = []
    let patchBody: { role: UserRole } | null = null
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return userResponse(config, admin)
      }

      if (config.url?.endsWith('/admin/users') && config.method === 'get') {
        const params = config.params as Record<string, string | number>
        userQueries.push(params)
        const filteredUsers = params.role
          ? [admin, updatedUser].filter((user) => user.role === params.role)
          : [admin, updatedUser]

        return response(config, {
          message: 'Users retrieved.',
          data: {
            users: filteredUsers,
            pagination: { current_page: 1, per_page: 10, total: filteredUsers.length, last_page: 1 },
          },
        })
      }

      if (config.url?.endsWith('/admin/users/2/role') && config.method === 'patch') {
        patchBody = JSON.parse(String(config.data)) as { role: UserRole }
        updatedUser = { ...updatedUser, role: patchBody.role }

        return userResponse(config, updatedUser)
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/admin/users')
    const userActions = userEvent.setup()

    expect((await screen.findAllByText('Rina Putri')).length).toBeGreaterThan(0)
    await userActions.type(screen.getByRole('searchbox', { name: 'Cari nama atau email' }), 'Rina')
    await waitFor(() => {
      expect(userQueries.some((query) => query.search === 'Rina')).toBe(true)
    })
    await userActions.selectOptions(screen.getByRole('combobox', { name: 'Filter role pengguna' }), 'member')
    await waitFor(() => {
      expect(userQueries.some((query) => query.role === 'member')).toBe(true)
    })

    await userActions.click(screen.getAllByRole('button', { name: 'Ubah role' })[0])
    await userActions.selectOptions(screen.getByRole('combobox', { name: 'Role baru' }), 'admin')
    await userActions.click(screen.getByRole('button', { name: 'Konfirmasi perubahan' }))

    expect(await screen.findByText('Role Rina Putri berhasil diubah menjadi admin.')).toBeTruthy()
    expect(patchBody).toEqual({ role: 'admin' })
  })

  it('loads the selected user detail from the admin API', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return userResponse(config, admin)
      }

      if (config.url?.endsWith('/admin/users/2')) {
        return userResponse(config, member)
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/admin/users/2')

    expect(await screen.findByText('Detail pengguna')).toBeTruthy()
    expect(await screen.findByText('rina@example.test')).toBeTruthy()
    expect(screen.getAllByText('member').length).toBeGreaterThan(0)
  })

  it('redirects members away from admin pages and hides admin navigation', async () => {
    const adminRequests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return userResponse(config, member)
      }

      if (config.url?.startsWith('/admin/')) {
        adminRequests.push(config.url)
      }

      if (config.url?.endsWith('/tasks')) {
        return response(config, {
          message: 'Tasks retrieved.',
          data: { tasks: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } },
        })
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/admin')

    expect(await screen.findByText('Tugas terbaru')).toBeTruthy()
    expect(screen.queryByText('Administrasi')).toBeNull()
    expect(adminRequests).toEqual([])
  })

  it('keeps the role dialog open and reports a backend 403 error', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if (config.url?.endsWith('/user')) {
        return userResponse(config, admin)
      }

      if (config.url?.endsWith('/admin/users')) {
        return response(config, {
          message: 'Users retrieved.',
          data: {
            users: [admin, member],
            pagination: { current_page: 1, per_page: 10, total: 2, last_page: 1 },
          },
        })
      }

      if (config.url?.endsWith('/admin/users/2/role')) {
        throw new AxiosError('Forbidden.', AxiosError.ERR_BAD_REQUEST, config, undefined, {
          data: { message: 'Anda tidak dapat mengubah role ini.' },
          status: 403,
          statusText: 'Forbidden',
          headers: new AxiosHeaders(),
          config,
        })
      }

      return response(config, { message: 'OK', data: {} })
    }
    apiClient.defaults.adapter = adapter
    setup('/admin/users')
    const userActions = userEvent.setup()

    await userActions.click((await screen.findAllByRole('button', { name: 'Ubah role' }))[0])
    await userActions.selectOptions(screen.getByRole('combobox', { name: 'Role baru' }), 'admin')
    await userActions.click(screen.getByRole('button', { name: 'Konfirmasi perubahan' }))

    expect(await screen.findByText('Anda tidak memiliki izin untuk melakukan tindakan ini.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

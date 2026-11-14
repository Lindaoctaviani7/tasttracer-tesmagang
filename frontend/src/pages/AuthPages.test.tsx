import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { apiClient } from '../api/client'
import { saveAccessToken } from '../api/tokenStorage'

const originalAdapter = apiClient.defaults.adapter
const user = {
  id: 8,
  name: 'Rina Putri',
  email: 'rina@example.test',
  role: 'member' as const,
  created_at: '2026-11-14T00:00:00.000000Z',
}
const token = 'sanctum-test-token'

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

function taskCollection(config: Parameters<AxiosAdapter>[0]) {
  return response(config, {
    message: 'Tasks retrieved successfully.',
    data: {
      tasks: [],
      pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
  })
}

function authSession(message: string) {
  return {
    message,
    data: {
      user,
      token,
      token_type: 'Bearer',
      expires_at: null,
    },
  }
}

afterEach(() => {
  cleanup()
  apiClient.defaults.adapter = originalAdapter
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.restoreAllMocks()
})

describe('authentication pages', () => {
  it('shows login validation errors without sending an invalid request', async () => {
    const adapter = vi.fn<AxiosAdapter>()
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/login')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Alamat email'), 'not-an-email')
    await userActions.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('Masukkan alamat email yang valid.')).toBeTruthy()
    expect(screen.getByText('Password wajib diisi.')).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('shows an API credential error beside the email field', async () => {
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, undefined, {
        data: {
          message: 'The provided credentials are incorrect.',
          errors: { email: ['The provided credentials are incorrect.'] },
        },
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new AxiosHeaders(),
        config,
      })
    }
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/login')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Alamat email'), 'rina@example.test')
    await userActions.type(screen.getByLabelText('Password'), 'WrongPassword1!')
    await userActions.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('The provided credentials are incorrect.')).toBeTruthy()
  })

  it('validates registration confirmation and password strength before submitting', async () => {
    const adapter = vi.fn<AxiosAdapter>()
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/register')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Nama lengkap'), 'Rina Putri')
    await userActions.type(screen.getByLabelText('Alamat email'), 'rina@example.test')
    await userActions.type(screen.getByLabelText('Password', { exact: true }), 'weak')
    await userActions.type(screen.getByLabelText('Konfirmasi password'), 'different')
    await userActions.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(await screen.findByText(/minimal 8 karakter dengan huruf besar/)).toBeTruthy()
    expect(screen.getByText('Konfirmasi password tidak sama.')).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('rejects a blank name and malformed email during registration', async () => {
    const adapter = vi.fn<AxiosAdapter>()
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/register')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Alamat email'), 'not-an-email')
    await userActions.type(screen.getByLabelText('Password', { exact: true }), 'SecurePass1!')
    await userActions.type(screen.getByLabelText('Konfirmasi password'), 'SecurePass1!')
    await userActions.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(await screen.findByText('Nama wajib diisi.')).toBeTruthy()
    expect(screen.getByText('Masukkan alamat email yang valid (maksimal 255 karakter).')).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('returns to login after registration without persisting its token or password', async () => {
    let submittedBody = ''
    const adapter: AxiosAdapter = async (config) => {
      submittedBody = String(config.data)

      return response(config, authSession('Registration successful.'), 201)
    }
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/register')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Nama lengkap'), 'Rina Putri')
    await userActions.type(screen.getByLabelText('Alamat email'), 'rina@example.test')
    await userActions.type(screen.getByLabelText('Password', { exact: true }), 'SecurePass1!')
    await userActions.type(screen.getByLabelText('Konfirmasi password'), 'SecurePass1!')
    await userActions.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(await screen.findByRole('heading', { name: 'Masuk ke ruang kerja Anda' })).toBeTruthy()
    expect(screen.getByText('Registrasi berhasil. Silakan masuk dengan akun baru Anda.')).toBeTruthy()
    expect(window.localStorage.getItem('task-management.access-token')).toBeNull()
    expect(Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.getItem(window.localStorage.key(index) ?? '')))
      .not.toContain('SecurePass1!')
    expect(submittedBody).toContain('"password":"SecurePass1!"')
    expect(JSON.parse(submittedBody)).not.toHaveProperty('role')
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
  })

  it('stores the access token but not the password after login and redirects to dashboard', async () => {
    let finishLogin: (() => void) | undefined
    const adapter: AxiosAdapter = (config) => config.url?.endsWith('/tasks')
      ? Promise.resolve(taskCollection(config))
      : new Promise((resolve) => {
        finishLogin = () => resolve(response(config, authSession('Login successful.')))
      })
    apiClient.defaults.adapter = adapter
    window.history.replaceState({}, '', '/login')
    render(<App />)
    const userActions = userEvent.setup()

    await userActions.type(screen.getByLabelText('Alamat email'), user.email)
    await userActions.type(screen.getByLabelText('Password'), 'SecurePass1!')
    await userActions.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(screen.getByRole('button', { name: 'Memeriksa akun...' }).hasAttribute('disabled')).toBe(true)
    finishLogin?.()

    expect(await screen.findByRole('heading', { name: 'Ringkasan kerja' })).toBeTruthy()
    expect(window.localStorage.getItem('task-management.access-token')).toBe(token)
    expect(Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.getItem(window.localStorage.key(index) ?? '')))
      .not.toContain('SecurePass1!')
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'))
  })

  it('redirects an unauthenticated visitor from dashboard to login', async () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Masuk ke ruang kerja Anda' })).toBeTruthy()
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
  })

  it('redirects an authenticated visitor from login to dashboard after restoring their session', async () => {
    const adapter: AxiosAdapter = async (config) => config.url?.endsWith('/tasks')
      ? taskCollection(config)
      : response(config, {
        message: 'Authenticated user retrieved successfully.',
        data: { user },
      })
    apiClient.defaults.adapter = adapter
    saveAccessToken(token)
    window.history.replaceState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ringkasan kerja' })).toBeTruthy()
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'))
  })
})

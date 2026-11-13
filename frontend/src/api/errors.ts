import axios from 'axios'
import type { ApiValidationErrors } from '../types/api'

interface ApiErrorResponse {
  message?: string
  errors?: ApiValidationErrors
}

export class ApiError extends Error {
  readonly status: number | null
  readonly errors: ApiValidationErrors

  constructor(
    message: string,
    status: number | null,
    errors: ApiValidationErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const response = error.response
    const message = response === undefined
      ? 'Tidak dapat terhubung ke server API.'
      : response.status >= 500
        ? 'Server API mengalami gangguan. Silakan coba lagi nanti.'
        : response.data?.message ?? 'Permintaan tidak dapat diproses.'

    return new ApiError(message, response?.status ?? null, response?.data?.errors ?? {})
  }

  if (error instanceof Error) {
    return new ApiError(error.message, null)
  }

  return new ApiError('Terjadi kesalahan yang tidak diketahui.', null)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : toApiError(error).message
}

export function getValidationMessage(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined
  }

  return error.errors[field]?.[0]
}

import type { ServiceResult } from './contracts'

export type DataMode = 'local' | 'api'

export const dataMode: DataMode = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'local'
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export const success = <T>(data: T): ServiceResult<T> => ({ data, error: null })

// API mode intentionally falls back to local services until backend adapters are added.
export async function runLocalService<T>(operation: () => T): Promise<ServiceResult<T>> {
  try {
    return success(operation())
  } catch {
    return { data: null, error: { code: 'LOCAL_SERVICE_ERROR', message: 'Unable to complete this request locally.' } }
  }
}

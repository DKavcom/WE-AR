/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'local' | 'api'
  readonly VITE_API_BASE_URL?: string
}

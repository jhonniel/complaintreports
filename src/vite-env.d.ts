/// <reference types="vite/client" />

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
  const src: string
  export default src
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TOMTOM_API_KEY: string
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

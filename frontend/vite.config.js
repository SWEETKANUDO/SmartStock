import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode === 'production' && !env.VITE_API_URL?.trim()) {
    throw new Error('VITE_API_URL must be set when building for production.')
  }

  return { plugins: [react()] }
})

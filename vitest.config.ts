import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // Specific module mock MUST come before the broad '@' alias so vite
      // matches it first (vite uses the first matching alias entry).
      '@/lib/prisma': path.resolve(__dirname, '__tests__/prisma-mock.ts'),
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
})

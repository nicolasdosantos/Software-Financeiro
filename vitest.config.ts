import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // lib/supabase.ts chama createClient() no carregamento do módulo, e
    // qualquer teste que importe o FinanceContext puxa esse arquivo junto.
    // Valores fictícios bastam: os testes só exercitam funções puras e
    // nunca fazem requisição, então `npm test` passa sem um .env real.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})

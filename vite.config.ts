import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // As páginas já são code-split por rota (App.tsx) e as duas dependências
    // realmente pesadas (xlsx-js-style, o núcleo do Recharts) só carregam
    // sob demanda — então os chunks que ainda passam de 500kb (o Recharts
    // interno e o xlsx-js-style em si) são grandes por natureza da lib, não
    // por estarem misturados com o resto do app. Sobe o limite só pra parar
    // de avisar sobre isso.
    chunkSizeWarningLimit: 900,
  },
})

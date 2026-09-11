import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Deixa o app instalável (ícone próprio, tela cheia sem a barra do
    // navegador) — não pretende funcionar offline de verdade, mas o
    // generateSW padrão já dá um shell cacheado "de graça", sem custo extra.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      // Habilita o manifest/SW também no `vite dev` (não só no build) —
      // sem isso só dá pra testar a instalação rodando `npm run build` +
      // `npm run preview`.
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Nexo — Controle Financeiro',
        short_name: 'Nexo',
        description: 'Controle financeiro pessoal: transações, orçamento, metas e investimentos.',
        // Mesma cor do fundo/navbar do app no tema escuro — a barra de
        // status/splash do sistema operacional fica visualmente contínua
        // com o app em vez de destoar.
        theme_color: '#080a13',
        background_color: '#080a13',
        display: 'standalone',
        start_url: '/dashboard',
        lang: 'pt-BR',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
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

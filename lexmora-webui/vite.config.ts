import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const basePath = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/'
  const baseNoSlash = basePath.replace(/\/$/, '') || ''
  const apiTarget = process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://localhost:8080'
  const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || 5173)

  return {
    base: basePath,
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Lexmora',
          short_name: 'Lexmora',
          description: 'Dark-themed Lexmora app for transforms, history, stats, and settings.',
          theme_color: '#0f1117',
          background_color: '#0f1117',
          display: 'standalone',
          start_url: basePath,
          scope: basePath,
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [{ urlPattern: /^\/api\/.*/i, handler: 'NetworkOnly' }],
        },
      }),
    ],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      hmr: { clientPort: hmrClientPort },
      proxy: {
        [`${baseNoSlash}/api`]: {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${baseNoSlash}/api`), '/api'),
        },
      },
    },
  }
})

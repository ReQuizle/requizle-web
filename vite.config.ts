import {defineConfig, type Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'

/** Must match `manifest.scope` / `start_url` and end with `/` (Vite convention). */
const APP_BASE = '/requizle-web/'

/** 308 redirect so `/requizle-web` and `/requizle-web?x=1` resolve like static hosts do for directory URLs. */
function canonicalBaseTrailingSlashRedirect(): Plugin {
  const bare = APP_BASE.replace(/\/$/, '')
  return {
    name: 'canonical-base-trailing-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? ''
        const path = raw.split('?')[0] ?? ''
        if (path === bare) {
          const qsAndHash = raw.slice(bare.length)
          res.statusCode = 308
          res.setHeader('Location', `${bare}/${qsAndHash}`)
          res.end()
          return
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    canonicalBaseTrailingSlashRedirect(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ReQuizle',
        short_name: 'ReQuizle',
        description: 'A modern quiz application for effective learning',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        scope: APP_BASE,
        start_url: APP_BASE,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  base: APP_BASE,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-katex': ['katex', 'react-katex'],
          'vendor-utils': ['zustand', 'clsx', 'canvas-confetti', 'lucide-react'],
        }
      }
    }
  }
})

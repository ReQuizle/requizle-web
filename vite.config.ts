import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
        scope: '/requizle-web/',
        start_url: '/requizle-web/',
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
  base: '/requizle-web/',
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

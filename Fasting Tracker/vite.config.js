import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',        // updates the app automatically
      includeAssets: [],                  // (icons are optional; see Step 3)
      manifest: {
        name: 'Fasting Tracker',
        short_name: 'Fasting',
        start_url: '/Webapps/',           // your Pages path
        scope: '/Webapps/',
        display: 'standalone',            // full-screen app look
        theme_color: '#111111',
        background_color: '#ffffff',
        icons: [
          // Add these ONLY after Step 3 (ok to leave empty for now)
          // { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          // { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  base: '/Webapps/',                      // already correct for your repo
})

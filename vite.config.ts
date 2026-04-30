import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        overlay: false,
      },
    },

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.svg',
          'favicon-32x32.png',
          'icons/apple-touch-icon.png',
          'offline.html',
        ],
        manifest: {
          name: 'Bepadah - Pelaporan Kerusakan Jalan dan Jembatan',
          short_name: 'Bepadah',
          description:
            'Sistem Informasi Pelaporan Kerusakan Jalan dan Jembatan Kota Banjarmasin',
          theme_color: '#1d4ed8',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          lang: 'id',
          categories: ['government', 'utilities'],
          icons: [
            { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          screenshots: [
            {
              src: 'screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Bepadah - Dashboard',
            },
            {
              src: 'screenshot-narrow.png',
              sizes: '390x844',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Bepadah - Mobile View',
            },
          ],
        },
        workbox: {
          // Naikkan limit dari default 2 MiB → 5 MiB (bundle masih besar sebelum code-splitting)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Pre-cache hanya critical assets yang dibutuhkan untuk initial load
          globPatterns: [
            '**/*.{html,ico,png,svg,woff2}',  // static assets
            '**/index-*.css',  // main CSS
            '**/index-*.js',   // main app JS
            '**/vendor-react-*.js',      // React (needed immediately)
            '**/vendor-supabase-*.js',   // Supabase (needed immediately)
            '**/vendor-recharts-*.js',   // recharts (used in initial Dashboard)
            '**/workbox-window*.js',     // PWA workbox
          ],
          // Jangan cache route supabase — selalu fresh dari network
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/rest\/v1/, /^\/auth\/v1/, /^\/storage\/v1/],
          runtimeCaching: [
            // Google Fonts — stale-while-revalidate
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // MapLibre tiles — cache first (tiles jarang berubah)
            {
              urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Supabase API — network first, fallback ke cache 5 menit
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Supabase Storage (gambar/foto laporan) — stale-while-revalidate
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-storage-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          // Fallback ke offline.html saat navigasi gagal dan tidak ada cache
          offlineGoogleAnalytics: false,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Charts
            'vendor-recharts': ['recharts'],
            // Map
            'vendor-map': ['maplibre-gl'],
            // Supabase
            'vendor-supabase': ['@supabase/supabase-js'],
            // Google AI
            'vendor-ai': ['@google/genai'],
            // Excel export
            'vendor-xlsx': ['xlsx'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
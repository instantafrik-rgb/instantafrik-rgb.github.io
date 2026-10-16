import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const base = '/';

  return {
    base,

    plugins: [
      react(),
      tailwindcss(),

      // Dev middleware to allow /stockfacture-pro/ routes in dev mode if needed
      {
        name: 'dev-stockfacture-rewrite',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/stockfacture-pro/')) {
              req.url = req.url.replace(/^\/stockfacture-pro/, '') || '/';
            }
            next();
          });
        },
      },

      VitePWA({
        registerType: 'autoUpdate',

        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-512x512-maskable.png',
          'favicon-32x32.png',
          'favicon-16x16.png',
        ],

        manifest: {
          id: './',
          name: 'StockFacture Pro',
          short_name: 'StockFacture',
          description:
            'Gestion commerciale simple et professionnelle - Stock, Factures, Devis, Paiements',

          theme_color: '#0f172a',
          background_color: '#0f172a',

          display: 'standalone',
          orientation: 'portrait',

          start_url: './',
          scope: './',

          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },

        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: isBuild ? '/stockfacture-pro/index.html' : '/index.html',
          navigateFallbackDenylist: [/^\/__/, /\/[^/?]+\.[^/]+$/],
          runtimeCaching: [
            {
              // Do NOT intercept or cache Firebase/Google APIs
              urlPattern: /^https:\/\/(.*\.googleapis\.com|.*\.firebaseio\.com|.*\.firebaseapp\.com|accounts\.google\.com)/i,
              handler: 'NetworkOnly',
            },
            {
              // Cache Google Fonts for offline UI fidelity
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },

        devOptions: {
          enabled: false,
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

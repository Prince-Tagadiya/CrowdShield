import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Custom plugin to inject environment variables into index.html.
 * Uses Vite's loadEnv to ensure VITE_* vars are available in both
 * dev mode and production build.
 */
function htmlEnvPlugin(): Plugin {
  let env: Record<string, string> = {};
  return {
    name: 'html-env-vars',
    configResolved(config) {
      // In Docker, .env.production is in the current dir; locally, .env is in parent
      const localEnv = loadEnv(config.mode, process.cwd(), 'VITE_');
      const parentEnv = loadEnv(config.mode, path.resolve(process.cwd(), '../'), 'VITE_');
      env = { ...parentEnv, ...localEnv };
    },
    transformIndexHtml(html) {
      return html.replace(/__VITE_(\w+)__/g, (_match, key) => {
        return env[`VITE_${key}`] ?? '';
      });
    },
  };
}

export default defineConfig({
  envDir: path.resolve(__dirname),
  plugins: [
    react(),
    htmlEnvPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'VenueFlow — Live Crowd Intelligence',
        short_name: 'VenueFlow',
        description: 'Real-time crowd management for Wankhede Stadium',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-maps',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});

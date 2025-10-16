import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [];

  const reactPlugin: any = react();
  if (Array.isArray(reactPlugin)) {
    plugins.push(...reactPlugin);
  } else {
    plugins.push(reactPlugin);
  }

  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      const tagger: any = componentTagger();
      if (Array.isArray(tagger)) {
        plugins.push(...tagger);
      } else {
        plugins.push(tagger);
      }
    } catch {
      // Plugin optional in CI/Pages
    }
  }

  plugins.push(
    ...VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Ежедневник Задач',
        short_name: 'Задачи',
        description: 'Простой и красивый ежедневник для управления вашими задачами',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: mode === "production" ? '/single-file-agenda/' : '/',
        start_url: mode === "production" ? '/single-file-agenda/' : '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  );

  return {
    base: mode === "production" ? "/single-file-agenda/" : "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

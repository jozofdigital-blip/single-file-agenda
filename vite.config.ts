import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

const APP_NAME = "Ежедневник Задач";
const APP_SHORT_NAME = "Задачи";
const APP_DESCRIPTION = "Простой и красивый ежедневник для управления вашими задачами";
const APP_LANG = "ru";
const APP_ID = "ru.lovable.singlefileagenda";

export default defineConfig(async ({ mode }) => {
  const isPagesBuild = mode === "pages";

  const base = isPagesBuild ? "/single-file-agenda/" : "/";
  const outDir = isPagesBuild ? "docs" : "dist";
  const startUrl = isPagesBuild ? "/single-file-agenda/" : "/";
  const scope = startUrl;

  const shortcutUrl = (targetPath: string) => {
    const normalizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

    if (isPagesBuild) {
      return `/single-file-agenda/#${normalizedPath}`;
    }

    return normalizedPath;
  };

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

  const pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt'],
    manifest: {
      id: APP_ID,
      name: APP_NAME,
      short_name: APP_SHORT_NAME,
      description: APP_DESCRIPTION,
      lang: APP_LANG,
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone'],
      orientation: 'portrait',
      scope,
      start_url: startUrl,
      categories: ['productivity', 'utilities'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ],
      shortcuts: [
        {
          name: 'Сегодня',
          short_name: 'Сегодня',
          url: shortcutUrl('/?view=today'),
          description: 'Быстрый переход к задачам на сегодня'
        },
        {
          name: 'Архив задач',
          short_name: 'Архив',
          url: shortcutUrl('/archive'),
          description: 'Перейти к архиву выполненных задач'
        }
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
  });

  if (Array.isArray(pwaPlugin)) {
    plugins.push(...pwaPlugin);
  } else {
    plugins.push(pwaPlugin);
  }

  return {
    base,
    build: {
      outDir,
      emptyOutDir: true,
    },
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

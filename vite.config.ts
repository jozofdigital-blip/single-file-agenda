import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const rawBase = env.VITE_APP_BASE ?? (mode === "development" ? "/" : "/single-file-agenda/");
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const outDir = env.VITE_OUTPUT_DIR ?? (base === "/" ? "dist" : "docs");
  const startUrl = env.VITE_PWA_START_URL ?? base;
  const scope = env.VITE_PWA_SCOPE ?? base;
  const appName = env.VITE_APP_NAME ?? "Ежедневник Задач";
  const shortName = env.VITE_APP_SHORT_NAME ?? "Задачи";
  const description = env.VITE_APP_DESCRIPTION ?? "Простой и красивый ежедневник для управления вашими задачами";
  const lang = env.VITE_APP_LANG ?? "ru";
  const appId = env.VITE_PWA_ID ?? "ru.lovable.singlefileagenda";

  const useHashRouter = env.VITE_USE_HASH_ROUTER === "true";
  const shortcutUrl = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (useHashRouter) {
      return `${base}#${normalizedPath}`;
    }

    const normalizedBase = base === "/" ? "" : base.slice(0, -1);
    return `${normalizedBase}${normalizedPath}` || "/";
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
      id: appId,
      name: appName,
      short_name: shortName,
      description,
      lang,
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

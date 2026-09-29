import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const sharedSrc = resolve(import.meta.dirname, '../shared/src');

/**
 * CORS для dev-сервера. Превью React-задач живёт в sandbox-iframe без allow-same-origin,
 * у него «непрозрачный» origin `null`, а module-скрипты грузятся с CORS-проверкой.
 * Поэтому к стандартному списку localhost добавлен `null`. Сервер слушает только
 * 127.0.0.1, так что это не открывает исходники наружу.
 */
const cors = {
  origin: [/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'null'],
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Подпути (`@jsskillup/shared/reactTesting`) — файлы из shared/src как есть.
      { find: /^@jsskillup\/shared\/(.+)$/, replacement: `${sharedSrc}/$1` },
      { find: '@jsskillup/shared', replacement: resolve(sharedSrc, 'index.ts') },
      // Исходники типов React — для Monaco, импортируются как `?raw`.
      { find: /^~types\/(.+)$/, replacement: `${resolve(import.meta.dirname, '../node_modules/@types')}/$1` },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  build: {
    // Monaco (~4 МБ) — отдельный чанк, который грузится лениво только на страницах с редактором.
    // Для локального приложения предупреждение о размере — шум.
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      // Две страницы: приложение и рантайм превью для iframe.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        preview: resolve(import.meta.dirname, 'preview.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    cors,
    proxy: {
      // API_PORT — чтобы поднять второй экземпляр фронта против другого бэкенда.
      '/api': { target: `http://127.0.0.1:${process.env.API_PORT ?? '3001'}`, changeOrigin: true },
    },
  },
  preview: { host: '127.0.0.1', cors },
});

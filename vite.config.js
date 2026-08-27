import { resolve } from 'path';
import { defineConfig } from 'vite';
import { readdirSync } from 'fs';

const projectPages = Object.fromEntries(
  readdirSync(resolve(__dirname, 'projects'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [`project-${f.replace('.html', '')}`, resolve(__dirname, 'projects', f)]),
);

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        work: resolve(__dirname, 'work.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        cv: resolve(__dirname, 'cv.html'),
        impressum: resolve(__dirname, 'impressum.html'),
        datenschutz: resolve(__dirname, 'datenschutz.html'),
        ...projectPages,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});

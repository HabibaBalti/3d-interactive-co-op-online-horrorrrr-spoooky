import { defineConfig } from 'vite';

const serverPort = Number(process.env.PORT ?? 8787);

export default defineConfig({
  // Relative asset paths so the build works from any folder (the Node server, or a hosted page).
  base: './',
  server: {
    port: 5173,
    // Lets you open the game from another device on your LAN (e.g. a phone/laptop for player 2).
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${serverPort}`, ws: true },
      '/health': { target: `http://localhost:${serverPort}` },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  },
});

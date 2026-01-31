import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 600, // Increased to accommodate players data (524 kB uncompressed, 50 kB gzipped)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate vendor libraries into their own chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('fuse.js')) {
              return 'vendor-fuse';
            }
            if (id.includes('canvas-confetti')) {
              return 'vendor-confetti';
            }
          }
          // Separate the large players.json data into its own chunk
          if (id.includes('data/players.json')) {
            return 'players-data';
          }
        },
      },
    },
  },
})

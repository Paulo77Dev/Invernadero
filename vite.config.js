// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< HEAD
    port: 5173
  }
});
=======
    port: 5173,
    // Proxy: redireciona chamadas do front para o mock-server sem expor IP no código do front
    proxy: {
      '/sensors': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/control': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/report/alert': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Se desejar mapear um prefixo para o proxy do server.js
      '/api': {
        target: 'http://localhost:4000', // caso você use o proxy node opcional
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
>>>>>>> a1baa8bdd60e2ad88517ade5900ba8fdd49ef31b

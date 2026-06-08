import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Genera la configuración de proxy para todas las rutas del backend.
 * Usa `bypass` para que las peticiones de navegación HTML (Accept: text/html)
 * NO se proxyen y sirvan index.html (SPA fallback).
 */
function buildProxyConfig() {
  const backendRoutes = [
    '/usuario', '/sucursal', '/buses', '/roles', '/canton',
    '/companiaasociada', '/tipoenvio', '/formapago', '/socios',
    '/rutas', '/sub_rutas', '/banco', '/alimentos', '/inventario',
    '/personal', '/cliente', '/provincia', '/lugares', '/destino',
    '/viajes', '/boleteria', '/boleto', '/guia', '/guias_companias',
    '/factura', '/caja', '/cajacomprobante', '/cobro', '/comprobante',
    '/tipo_cobros', '/configuracion', '/reportes', '/estadisticas',
    '/impresoras', '/dashboard', '/locacion', '/api',
  ];

  const proxy = {};
  for (const route of backendRoutes) {
    proxy[route] = {
      target: 'http://localhost:3000',
      changeOrigin: true,
      // Si el navegador pide HTML (navegación) y NO es PHP, NO proxy → sirve index.html (SPA)
      bypass: (req) => {
        if (req.headers['accept']?.includes('text/html') && !req.url?.includes('.php')) {
          return '/index.html';
        }
      },
    };
  }
  // PHP scripts → Apache (Laragon)
  proxy['/php'] = {
    target: 'http://localhost',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/php/, '/SistemaFlota/FrontReact/php'),
  };
  return proxy;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    port: 5173,
    proxy: buildProxyConfig(),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-hook-form')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/sweetalert2')) {
            return 'vendor-sweetalert';
          }
        }
      }
    }
  }
})

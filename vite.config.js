import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Branding: lee `branding.json` (fuente única del nombre/marca) e inyecta los
 * valores en index.html, de modo que el título de la pestaña y los íconos se
 * actualizan cambiando únicamente ese archivo.
 */
function brandingHtmlPlugin() {
  const branding = JSON.parse(readFileSync(resolve(__dirname, 'branding.json'), 'utf8'));
  const name = String(branding.name || 'Nexusplus');
  const vars = {
    BRAND_NAME: name,
    BRAND_NAME_UPPER: name.toUpperCase(),
    BRAND_LEGAL_NAME: String(branding.legalName || `${name} Solutions`),
    BRAND_TAGLINE: String(branding.tagline || ''),
    BRAND_LOGO: String(branding.logo || '/images/transpaeasy.png'),
    BRAND_LOGO_ICON: String(branding.logoIcon || '/images/transpaeasy_icon.png'),
  };
  return {
    name: 'branding-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Solo reemplaza claves conocidas para no alterar otro contenido con %...%
        return html.replace(/%([A-Z_]+)%/g, (match, key) => (key in vars ? vars[key] : match));
      },
    },
  };
}

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
    '/impresoras', '/dashboard', '/locacion', '/api', '/login',
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
  plugins: [react(), brandingHtmlPlugin()],
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

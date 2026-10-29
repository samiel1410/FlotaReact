import { api } from '../config/axios';

export const APARIENCIA_DEFAULT = { sidebar: '#0f172a', header: '#ffffff' };

const STORAGE_KEY = 'ui_apariencia';

const aRgb = (hex) => {
  const limpio = normalizarColor(hex, APARIENCIA_DEFAULT.sidebar).replace('#', '');
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  };
};

const aHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

const mezclar = (hex, otro, factor) => {
  const a = aRgb(hex);
  const b = aRgb(otro);
  return aHex({
    r: a.r + (b.r - a.r) * factor,
    g: a.g + (b.g - a.g) * factor,
    b: a.b + (b.b - a.b) * factor,
  });
};

const canalLineal = (valor) => {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const luminancia = (hex) => {
  const { r, g, b } = aRgb(hex);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
};

export const esColorClaro = (hex) => luminancia(hex) > 0.5;

export const normalizarColor = (valor, fallback = APARIENCIA_DEFAULT.sidebar) => {
  const v = String(valor || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  return fallback;
};

export const construirPaleta = (sidebarHex, headerHex) => {
  const sidebar = normalizarColor(sidebarHex, APARIENCIA_DEFAULT.sidebar);
  const header = normalizarColor(headerHex, APARIENCIA_DEFAULT.header);
  const sidebarClaro = esColorClaro(sidebar);
  const headerClaro = esColorClaro(header);

  return {
    sidebar: {
      bg: sidebar,
      brandBg: mezclar(sidebar, '#000000', sidebarClaro ? 0.06 : 0.4),
      fg: sidebarClaro ? '#0f172a' : '#f8fafc',
      fgMuted: sidebarClaro ? 'rgba(15, 23, 42, 0.70)' : 'rgba(226, 232, 240, 0.78)',
      hover: sidebarClaro ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.10)',
      border: sidebarClaro ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      accent: sidebarClaro ? '#1d4ed8' : '#60a5fa',
      activeBg: '#2563eb',
      activeFg: '#ffffff',
      activeSoftBg: sidebarClaro ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.28)',
    },
    header: {
      bg: header,
      fg: headerClaro ? '#0f172a' : '#f8fafc',
      fgMuted: headerClaro ? '#64748b' : 'rgba(248, 250, 252, 0.74)',
      hover: headerClaro ? '#f1f5f9' : 'rgba(255, 255, 255, 0.12)',
      border: headerClaro ? '#e2e8f0' : 'rgba(255, 255, 255, 0.16)',
    },
  };
};

export const aplicarApariencia = (colores = APARIENCIA_DEFAULT) => {
  const sidebar = normalizarColor(colores?.sidebar, APARIENCIA_DEFAULT.sidebar);
  const header = normalizarColor(colores?.header, APARIENCIA_DEFAULT.header);
  const paleta = construirPaleta(sidebar, header);

  if (typeof document !== 'undefined') {
    const variables = {
      '--ui-sidebar-bg': paleta.sidebar.bg,
      '--ui-sidebar-brand-bg': paleta.sidebar.brandBg,
      '--ui-sidebar-fg': paleta.sidebar.fg,
      '--ui-sidebar-fg-muted': paleta.sidebar.fgMuted,
      '--ui-sidebar-hover': paleta.sidebar.hover,
      '--ui-sidebar-border': paleta.sidebar.border,
      '--ui-sidebar-accent': paleta.sidebar.accent,
      '--ui-sidebar-active-bg': paleta.sidebar.activeBg,
      '--ui-sidebar-active-fg': paleta.sidebar.activeFg,
      '--ui-sidebar-active-soft-bg': paleta.sidebar.activeSoftBg,
      '--ui-header-bg': paleta.header.bg,
      '--ui-header-fg': paleta.header.fg,
      '--ui-header-fg-muted': paleta.header.fgMuted,
      '--ui-header-hover': paleta.header.hover,
      '--ui-header-border': paleta.header.border,
    };
    const root = document.documentElement;
    Object.entries(variables).forEach(([nombre, valor]) => root.style.setProperty(nombre, valor));
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebar, header }));
  } catch {
    /* almacenamiento no disponible */
  }

  return paleta;
};

export const leerAparienciaCache = () => {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!guardado) return null;
    return {
      sidebar: normalizarColor(guardado.sidebar, APARIENCIA_DEFAULT.sidebar),
      header: normalizarColor(guardado.header, APARIENCIA_DEFAULT.header),
    };
  } catch {
    return null;
  }
};

export const cargarApariencia = async (forzar = false) => {
  if (!forzar) {
    const cache = leerAparienciaCache();
    if (cache) {
      aplicarApariencia(cache);
      return cache;
    }
  }

  try {
    const res = await api.get('/configuracion/configuracionSeleccion');
    const conf = res.data?.data?.[0] || {};
    const colores = {
      sidebar: normalizarColor(conf.color_sidebar, APARIENCIA_DEFAULT.sidebar),
      header: normalizarColor(conf.color_header, APARIENCIA_DEFAULT.header),
    };
    aplicarApariencia(colores);
    return colores;
  } catch {
    aplicarApariencia(APARIENCIA_DEFAULT);
    return APARIENCIA_DEFAULT;
  }
};

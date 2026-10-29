export const COLORES_ASIENTOS_DEFAULT = {
  color_asiento_libre: '#ffffff',
  color_asiento_seleccionado: '#3b82f6',
  color_asiento_pendiente: '#8b5cf6',
  color_asiento_ocupado: '#ef4444',
  color_asiento_ocupado_parcial: '#f1c40f',
  color_asiento_libre_parada: '#27ae60',
};

// Estados que pinta el mapa de asientos y el campo de BD que los configura.
export const ESTADOS_ASIENTO = [
  {
    key: 'libre',
    campo: 'color_asiento_libre',
    label: 'Libre',
    descripcion: 'Asiento disponible en todo el recorrido',
  },
  {
    key: 'seleccionado',
    campo: 'color_asiento_seleccionado',
    label: 'Seleccionado (tú)',
    descripcion: 'Asiento que el usuario está vendiendo',
  },
  {
    key: 'pendiente',
    campo: 'color_asiento_pendiente',
    label: 'Seleccionado por otro',
    descripcion: 'Asiento bloqueado por otro usuario',
  },
  {
    key: 'ocupado-parcial',
    campo: 'color_asiento_ocupado_parcial',
    label: 'Ocupado parcial',
    descripcion: 'Vendido solo hasta una parada intermedia',
  },
  {
    key: 'libre-parada',
    campo: 'color_asiento_libre_parada',
    label: 'Libre en esta parada',
    descripcion: 'Ocupado antes, disponible desde la parada actual',
  },
  {
    key: 'ocupado',
    campo: 'color_asiento_ocupado',
    label: 'Ocupado fin',
    descripcion: 'Vendido para todo el recorrido',
  },
];

export const CAMPO_COLOR_POR_ESTADO = ESTADOS_ASIENTO.reduce((mapa, estado) => {
  mapa[estado.key] = estado.campo;
  return mapa;
}, {});

export const normalizarColorHex = (valor, fallback = '#ffffff') => {
  const v = String(valor || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  return fallback;
};

export const normalizarColoresAsientos = (raw = {}) => {
  const origen = raw && typeof raw === 'object' ? raw : {};
  const colores = {};
  for (const estado of ESTADOS_ASIENTO) {
    colores[estado.campo] = normalizarColorHex(
      origen[estado.campo] ?? origen[estado.key],
      COLORES_ASIENTOS_DEFAULT[estado.campo]
    );
  }
  return colores;
};

const aRgb = (hex) => {
  const limpio = normalizarColorHex(hex).slice(1);
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  };
};

const aHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export const oscurecerColor = (hex, factor = 0.2) => {
  const { r, g, b } = aRgb(hex);
  return aHex({ r: r * (1 - factor), g: g * (1 - factor), b: b * (1 - factor) });
};

export const esColorClaro = (hex) => {
  const { r, g, b } = aRgb(hex);
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b) > 0.5;
};

export const colorTextoAsiento = (hex) => (esColorClaro(hex) ? '#0f172a' : '#ffffff');

// Estilo inline listo para pintar un asiento con el color configurado.
export const estiloAsiento = (hex) => {
  const background = normalizarColorHex(hex);
  return {
    background,
    borderColor: oscurecerColor(background),
    color: colorTextoAsiento(background),
  };
};

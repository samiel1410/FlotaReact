export const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return String(f).split('T')[0] || String(f).split(' ')[0] || '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(f);
  }
};

export const TIPOS_MULTA = [
  'Uniforme',
  'Corbata',
  'Incumplimiento de frecuencia',
  'Incumplimiento de ruta',
  'Atraso en salida',
  'Exceso de velocidad',
  'Falta de aseo en unidad',
  'Maltrato al usuario',
  'Otra'
];

export const ESTADOS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'anulado', label: 'Anulado' }
];

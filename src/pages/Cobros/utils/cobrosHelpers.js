export const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export const getYears = () => {
  const y = new Date().getFullYear();
  return [{ value: '', label: 'Todos' }, ...Array.from({ length: 6 }, (_, i) => ({ value: String(y - i), label: String(y - i) }))];
};

export const MONTHS = [
  { value: '', label: 'Todos' }, { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' }, { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

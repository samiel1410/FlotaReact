export const TARIFAS = [
  { label: 'Normal', value: 1 },
  { label: '50% 3ra Edad', value: 2 },
  { label: '50% Menor', value: 3 },
  { label: '50% Discap.', value: 4 },
  { label: '50% Estudiante', value: 5 },
  { label: 'Gratis Cortesía', value: 6 },
];

export const getTarifaLabel = (val) => {
  const t = TARIFAS.find(t => t.value === val);
  return t ? t.label : 'Normal';
};

export const calcularValorConTarifa = (precio, tarifaTexto) => {
  if (tarifaTexto === 'Normal') return precio;
  if (tarifaTexto.includes('50%')) return precio / 2;
  return 0; // Gratis Cortesía
};

export const calcularDescuento = (precio, tarifaTexto) => {
  if (tarifaTexto === 'Normal') return 0;
  if (tarifaTexto.includes('50%')) return precio / 2;
  return precio; // Gratis Cortesía
};

export const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

export const tarifaDesdeEdad = (edad) => {
  if (edad === null || edad === undefined) return 1;
  if (edad < 17) return 3;
  if (edad >= 60) return 2;
  return 1;
};

export const horaAMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const [horas, minutos] = horaStr.split(':').map(Number);
  return horas * 60 + (minutos || 0);
};

export const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getSessionUser = () => {
  let user = {};
  try {
    const userData = sessionStorage.getItem('user_data');
    if (userData) user = { ...user, ...JSON.parse(userData) };
  } catch (e) { }
  try {
    const usuario = sessionStorage.getItem('usuario');
    if (usuario) user = { ...user, ...JSON.parse(usuario) };
  } catch (e) { }
  return user;
};

const pad = (n) => String(n).padStart(2, '0');

// Fecha/hora LOCAL del navegador para enviar al backend.
// No usar toISOString(): devuelve UTC y en Ecuador (UTC-5) el despacho
// quedaba registrado 5 horas en el futuro (incluso con fecha del día siguiente).
export const toLocalDateTime = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toLocalDateTimeInput = (date = new Date()) => toLocalDateTime(date).replace(' ', 'T');

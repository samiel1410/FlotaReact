/**
 * Iniciales para avatares locales.
 * Evita depender de ui-avatars.com (una petición externa por fila/avatar).
 */
export const getInitials = (name, max = 2) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, max)
    .map(p => p[0])
    .join('')
    .toUpperCase();
};

export default getInitials;

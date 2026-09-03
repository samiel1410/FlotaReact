/**
 * Garantiza que la URL de un PDF PHP incluya el identificador del tenant (tenantId) si es necesario,
 * manteniendo las URLs limpias sin exponer credenciales de base de datos en la URL.
 * 
 * @param {string} url - URL base del script PHP (ej. '/php/boletoFactura.php?id_boleto=10')
 * @returns {string} - URL limpia enriquecida con tenantId.
 */
export const buildPdfUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  // Blob URLs y Data URIs son URLs internas del navegador y nunca deben modificarse ni recibir query params
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('about:')) {
    return url;
  }

  let tenantId = '';
  const userDataStr = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');
  if (userDataStr) {
    try {
      const u = JSON.parse(userDataStr);
      tenantId = u.tenant_id || u.tenantId || '';
    } catch (e) {}
  }

  // Si la URL ya tiene tenantId o tenant_id, devolverla tal cual
  if (url.includes('tenantId=') || url.includes('tenant_id=')) {
    return url;
  }

  // Si disponemos del identificador de tenant, adjuntarlo limpiamente
  if (tenantId) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tenantId=${encodeURIComponent(tenantId)}`;
  }

  return url;
};

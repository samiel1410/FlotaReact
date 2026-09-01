/**
 * Adjunta automáticamente los parámetros de conexión BD y tenantId a las URLs de scripts PHP PDF.
 * Esto garantiza que al abrir PDFs en ventanas nuevas, modales o impresiones background, 
 * PHP disponga siempre de las credenciales desencriptables de la empresa activa.
 * 
 * @param {string} url - URL base del script PHP (ej. '/php/boletoFactura.php?id_boleto=10')
 * @returns {string} - URL enriquecida con parámetros multi-tenant.
 */
export const buildPdfUrl = (url) => {
  if (!url) return '';

  const dbName = sessionStorage.getItem('db_name') || localStorage.getItem('db_name') || '';
  const dbHost = sessionStorage.getItem('db_host') || localStorage.getItem('db_host') || '';
  const dbUser = sessionStorage.getItem('db_user') || localStorage.getItem('db_user') || '';
  const dbPass = sessionStorage.getItem('db_pass') || localStorage.getItem('db_pass') || '';

  let tenantId = '';
  const userDataStr = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');
  if (userDataStr) {
    try {
      const u = JSON.parse(userDataStr);
      tenantId = u.tenant_id || u.tenantId || '';
    } catch (e) {}
  }

  const separator = url.includes('?') ? '&' : '?';
  const params = [];

  if (dbName && !url.includes('db_name=')) {
    params.push(`db_name=${encodeURIComponent(dbName)}`);
    params.push(`db_host=${encodeURIComponent(dbHost)}`);
    params.push(`db_user=${encodeURIComponent(dbUser)}`);
    params.push(`db_pass=${encodeURIComponent(dbPass)}`);
  }

  if (tenantId && !url.includes('tenantId=') && !url.includes('tenant_id=')) {
    params.push(`tenantId=${encodeURIComponent(tenantId)}`);
  }

  return params.length > 0 ? `${url}${separator}${params.join('&')}` : url;
};

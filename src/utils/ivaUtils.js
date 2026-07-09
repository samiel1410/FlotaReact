/**
 * ivaUtils.js - Utilidades centralizadas de IVA para el módulo de Guías
 *
 * El campo `tipo_impuesto` en la tabla tipo_envio es un ÍNDICE numérico:
 *   0 → 0%  (sin IVA)
 *   1 → 12%
 *   2 → 13%
 *   3 → 14%
 *   4 → 15%
 *   5 → 16%
 *   N → (11 + N)%   ← fórmula dinámica, no requiere array
 *
 * Así, cualquier tasa futura se soporta automáticamente sin tocar este archivo.
 */

/**
 * Convierte el índice tipo_impuesto a tasa decimal.
 * @param {number|string} tipoImpuesto - Índice almacenado en BD
 * @returns {number} Tasa decimal (ej: 0.15 para 15%)
 */
export const indexToRate = (tipoImpuesto) => {
  const idx = parseInt(tipoImpuesto);
  if (isNaN(idx) || idx <= 0) return 0;   // 0 o inválido → sin IVA
  return (11 + idx) / 100;                 // 1→12%, 2→13%, ..., N→(11+N)%
};

/**
 * Obtiene la tasa IVA de un tipo de envío dado su ID.
 * @param {string|number} tipoEnvioId - ID del tipo de envío
 * @param {Array} tiposEnvio - Lista de tipos de envío
 * @returns {number} Tasa decimal
 */
export const getIvaRate = (tipoEnvioId, tiposEnvio = []) => {
  const te = tiposEnvio.find(
    t => String(t.id || t.id_tipo_envio) === String(tipoEnvioId)
  );
  return indexToRate(te?.tipo_impuesto);
};

/**
 * Calcula el IVA total de un arreglo de detalles (para guardar en backend).
 * Usa el precio ingresado como TOTAL (desglose: extrae el IVA del precio).
 *
 * @param {Array}   detalles       - Items del detalle de carga
 * @param {string}  descuentoTipo  - '0'=Convenio, '1'=50%, '2'=100%
 * @param {Array}   tiposEnvio     - Catálogo de tipos de envío
 * @param {boolean} cobrarIvaGuia  - Si false, devuelve 0
 * @returns {number} Total IVA
 */
export const calcGuardarIva = (detalles, descuentoTipo, tiposEnvio, cobrarIvaGuia) => {
  if (!cobrarIvaGuia) return 0;
  return detalles.reduce((sum, d) => {
    // El IVA ya está calculado por item en handleAdd/handleUpdateField del DetalleCargaGrid
    return sum + (d.iva || 0);
  }, 0);
};

/**
 * Calcula el desglose de IVA para un item individual
 * (el precio ingresado YA INCLUYE IVA).
 *
 * @param {number} precioIngresado - Precio total por unidad (con IVA)
 * @param {number} cantidad
 * @param {number} rate            - Tasa decimal (ej: 0.15)
 * @param {number} porcDescuento   - % de descuento por convenio (ej: 10 = 10%)
 * @returns {{ subtotal, descuento, iva, total }}
 */
export const desgloseItem = (precioIngresado, cantidad, rate, porcDescuento = 0) => {
  const totalBruto = cantidad * precioIngresado;
  const descuento   = totalBruto * (porcDescuento / 100);
  const totalNeto   = totalBruto - descuento;

  const subtotalBase = rate > 0 ? totalNeto / (1 + rate) : totalNeto;
  const iva          = totalNeto - subtotalBase;

  return {
    subtotal:  subtotalBase,
    descuento: descuento > 0 ? descuento / (1 + rate) : 0, // descuento sobre base
    iva,
    total: totalNeto
  };
};

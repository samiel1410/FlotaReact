/**
 * `estado_solicitud_anulacion` llega `null` cuando el boleto nunca tuvo una
 * solicitud de anulación. `Number(null)` es 0 (el estado PENDIENTE), así que
 * hay que distinguir el null antes de convertir el valor.
 */
export const tieneSolicitudAnulacionPendiente = (item) => {
  const estado = item?.estado_solicitud_anulacion;
  return estado !== null && estado !== undefined && estado !== '' && Number(estado) === 0;
};

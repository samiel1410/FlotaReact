import { api } from '../config/axios';

const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

// ─── FACTURAS ──────────────────────────────────────────────────────────────

export const anularFacturasTodas = async (motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/factura/anularfacturastodas', {
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const anularFacturasSeleccionadas = async (ids, motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/factura/anularfacturasseleccionadas', {
    id_factura: ids.join(', '),
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const cancelarAnulacionFactura = async (idFactura, motivo) => {
  const res = await api.post('/factura/cancelarAnulacion', {
    id_factura: idFactura,
    motivo: motivo,
  });
  return res.data;
};

// ─── GUIAS ─────────────────────────────────────────────────────────────────

export const anularGuiasTodas = async (motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/guia/anularguiastodas', {
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const anularGuiasSeleccionadas = async (ids, motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/guia/anularguiasseleccionadas', {
    id_guia: ids.join(', '),
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const cancelarAnulacionGuia = async (idGuia, motivo) => {
  const res = await api.post('/guia/cancelarAnulacion', {
    id_guia: idGuia,
    motivo: motivo,
  });
  return res.data;
};

// ─── COMPROBANTES ──────────────────────────────────────────────────────────

export const anularComprobantesTodas = async (motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/comprobantecobro/anularcomprobantestodas', {
    motivo: motivo,
    id_usuario: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const anularComprobantesSeleccionadas = async (ids, motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/comprobantecobro/anularcomprobantesseleccionadas', {
    id_comprobante: ids.join(', '),
    motivo: motivo,
    id_usuario: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const cancelarAnulacionComprobante = async (idComprobante, motivo) => {
  const res = await api.post('/comprobantecobro/cancelarAnulacion', {
    id_comprobante_cobro: idComprobante,
    motivo: motivo,
  });
  return res.data;
};

// ─── EGRESOS / INGRESOS ────────────────────────────────────────────────────

export const anularEgresosTodas = async (motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/caja/anularegresostodas', {
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const anularEgresosSeleccionadas = async (ids, motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/caja/anularegresosseleccionadas', {
    id_egreso: ids.join(', '),
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const cancelarAnulacionEgreso = async (idEgreso, motivo) => {
  const res = await api.post('/caja/cancelarAnulacion', {
    id_egreso: idEgreso,
    motivo: motivo,
  });
  return res.data;
};

// ─── BOLETOS ───────────────────────────────────────────────────────────────

export const anularBoletosTodas = async (motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/boleteria/anularboletostodas', {
    motivo_anulacion: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const anularBoletosSeleccionados = async (ids, motivo) => {
  const user = getCurrentUser();
  const res = await api.post('/boleteria/anularboletosseleccionados', {
    id_boleto: ids.join(', '),
    motivo: motivo,
    id_usuario_anulacion: user?.id_usuario || user?.id || '',
  });
  return res.data;
};

export const cancelarAnulacionBoleto = async (idBoleto, motivo) => {
  const res = await api.post('/boleteria/cancelarAnulacion', {
    id_boleto: idBoleto,
    motivo: motivo,
  });
  return res.data;
};

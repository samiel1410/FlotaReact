const IVA_RATES = [0, 0.12, 0.13, 0.14, 0.15];

const getIvaRate = (tipoEnvioId, tiposEnvio) => {
  const te = (tiposEnvio || []).find(t => String(t.id || t.id_tipo_envio) === String(tipoEnvioId));
  const tipoImpuesto = te?.tipo_impuesto;
  return (tipoImpuesto !== undefined && tipoImpuesto !== null && IVA_RATES[parseInt(tipoImpuesto)] !== undefined) ? IVA_RATES[parseInt(tipoImpuesto)] : 0;
};

/**
 * Panel de Totales - Equivalente a la sección de totales de NuevaGuia.js
 * Muestra: Subtotal12, Subtotal0, Subtotal, Descuento, Tarifa, IVA, Total
 * Incluye radio buttons de descuento: Normal, 50% Descuento, 100% Cortesía
 */
export const TotalesPanel = ({ detalles, descuentoTipo, onDescuentoChange, tiposEnvio = [], cobrarIvaGuia = true }) => {
  // Cálculos
  const subtotal12 = detalles.reduce((sum, d) => {
    const precioConIva = (d.precioUnitario || 0) * (d.cantidad || 1);
    return sum + precioConIva;
  }, 0);

  const subtotal0 = 0;
  
  const subtotal = subtotal12 + subtotal0;

  // Descuento según tipo seleccionado
  let descuentoCalculado = 0;
  if (descuentoTipo === '2') {
    descuentoCalculado = subtotal;
  } else if (descuentoTipo === '1') {
    descuentoCalculado = subtotal * 0.50;
  } else {
    descuentoCalculado = detalles.reduce((sum, d) => sum + (d.descuento || 0), 0);
  }

  const subtotalConDescuento = subtotal - descuentoCalculado;

  const totalTarifa = detalles.reduce((sum, d) => sum + (d.tarifa || 0), 0);

  // IVA calculado por item con su propio tipo_impuesto
  const iva = cobrarIvaGuia ? detalles.reduce((sum, d) => {
    const qty = d.cantidad || 1;
    const price = d.precioUnitario || 0;
    const sub = qty * price;
    let desc = 0;
    if (descuentoTipo === '2') desc = sub;
    else if (descuentoTipo === '1') desc = sub * 0.50;
    else desc = (sub / (subtotal || 1)) * descuentoCalculado;
    const rate = getIvaRate(d.tipoEnvioId, tiposEnvio);
    return sum + (sub - desc) * rate;
  }, 0) : 0;
  
  const total = subtotalConDescuento + iva + totalTarifa;

  const fmt = (val) => `$${(val || 0).toFixed(2)}`;

  return (
    <div style={{ 
      display: 'none',
      background: 'white', 
      borderRadius: '12px', 
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-calculator" style={{ color: '#3b82f6', fontSize: '12px' }}></i>
        </div>
        Resumen de Valores
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
        {/* Subtotal 12% */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Subtotal 12%</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(subtotal12)}</span>
        </div>

        {/* Subtotal 0% */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Subtotal 0%</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(subtotal0)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #e2e8f0', margin: '2px 0' }}></div>

        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#475569', fontWeight: 600 }}>Subtotal</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>{fmt(subtotal)}</span>
        </div>

        {/* Descuento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', color: descuentoCalculado > 0 ? '#16a34a' : '#64748b' }}>
          <span style={{ fontWeight: 500 }}>
            Descuento {descuentoTipo === '1' ? '(50%)' : descuentoTipo === '2' ? '(Cortesía)' : '(Convenio)'}
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>-{fmt(descuentoCalculado)}</span>
        </div>

        {/* Tarifa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Tarifa</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(totalTarifa)}</span>
        </div>

        {/* IVA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>IVA</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(iva)}</span>
        </div>

        <div style={{ borderTop: '2px solid #1e293b', margin: '4px 0' }}></div>

        {/* TOTAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>Total a Pagar</span>
          <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};
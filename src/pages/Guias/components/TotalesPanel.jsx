import { getIvaRate } from '../../../utils/ivaUtils';

/**
 * Panel de Totales - Equivalente a la sección de totales de NuevaGuia.js
 * Muestra: Subtotal12, Subtotal0, Subtotal, Descuento, Tarifa, IVA, Total
 * Incluye radio buttons de descuento: Normal, 50% Descuento, 100% Cortesía
 */
export const TotalesPanel = ({ detalles, descuentoTipo, tiposEnvio = [], cobrarIvaGuia = true }) => {
  // Desglose dinámico de subtotales e IVA por cada tasa
  const subtotalesPorTasa = {};
  let subtotal0 = 0;

  detalles.forEach(d => {
    const rate = cobrarIvaGuia ? getIvaRate(d.tipoEnvioId, tiposEnvio) : 0;
    const porc = Math.round(rate * 100);
    const sub = d.subtotal || 0;
    const ivaVal = d.iva || 0;

    if (porc === 0 || !cobrarIvaGuia) {
      subtotal0 += sub;
    } else {
      if (!subtotalesPorTasa[porc]) {
        subtotalesPorTasa[porc] = { porcentaje: porc, subtotal: 0, iva: 0 };
      }
      subtotalesPorTasa[porc].subtotal += sub;
      subtotalesPorTasa[porc].iva += ivaVal;
    }
  });

  const tasasIva = Object.values(subtotalesPorTasa).sort((a, b) => a.porcentaje - b.porcentaje);

  const subtotal = detalles.reduce((sum, d) => sum + (d.subtotal || 0), 0);

  // Descuento según tipo seleccionado
  const descuentoCalculado = descuentoTipo === '2'
    ? subtotal
    : descuentoTipo === '1'
      ? subtotal * 0.50
      : detalles.reduce((sum, d) => sum + (d.descuento || 0), 0);

  const subtotalConDescuento = subtotal - descuentoCalculado;
  const totalTarifa = detalles.reduce((sum, d) => sum + (d.tarifa || 0), 0);

  // IVA total
  const ivaTotal = cobrarIvaGuia ? detalles.reduce((sum, d) => sum + (d.iva || 0), 0) : 0;
  
  const total = subtotalConDescuento + ivaTotal + totalTarifa;

  const fmt = (val) => `$${(val || 0).toFixed(2)}`;

  return (
    <div style={{ 
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
        {/* Subtotales con IVA dinámicos (15%, 12%, etc.) */}
        {tasasIva.length > 0 ? (
          tasasIva.map(t => (
            <div key={t.porcentaje} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Subtotal {t.porcentaje}%</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(t.subtotal)}</span>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Subtotal IVA</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(0)}</span>
          </div>
        )}

        {/* Subtotal 0% */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Subtotal 0%</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(subtotal0)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #e2e8f0', margin: '2px 0' }}></div>

        {/* Subtotal Total */}
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

        {/* IVA dinámico */}
        {tasasIva.length > 0 ? (
          tasasIva.map(t => (
            <div key={t.porcentaje} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>IVA {t.porcentaje}%</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(t.iva)}</span>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>IVA</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{fmt(0)}</span>
          </div>
        )}

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
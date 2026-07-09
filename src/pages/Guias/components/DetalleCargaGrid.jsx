import { useState, useEffect } from 'react';
import { getIvaRate, desgloseItem } from '../../../utils/ivaUtils';

/**
 * Grid de detalles de carga - Equivalente al Ext.grid.Panel de NuevaGuia.js
 * Columnas: CANT | TIPO ENVÍO | CONTENIDO | PESO | Precio Unit | Subtotal | Descuento | Tarifa | IVA | Total
 */

export const DetalleCargaGrid = ({ detalles, onChange, convenio, onDescuentoGlobalChange, costoEnvioPorDefecto, tiposEnvio = [], tipoEnvioId, isEditing = false, error, cobrarIvaGuia = true }) => {
  const [nuevo, setNuevo] = useState({
    cantidad: 1,
    tipoEnvioId: tipoEnvioId || '',
    tipoEnvioNombre: '',
    contenido: '',
    peso: '',
    precioUnitario: costoEnvioPorDefecto || ''
  });

  // Sincronizar tipoEnvioId cuando cambia el combo principal
  useEffect(() => {
    if (tipoEnvioId) {
      const te = tiposEnvio.find(t => String(t.id || t.value || t.id_tipo_envio) === String(tipoEnvioId));
      setNuevo(prev => ({ ...prev, tipoEnvioId, tipoEnvioNombre: te?.nombre || te?.label || te?.text || '' }));
    }
  }, [tipoEnvioId, tiposEnvio]);

  // Cuando cambia el costoEnvioPorDefecto, actualizar precioUnitario en nuevo item
  useEffect(() => {
    if (costoEnvioPorDefecto) {
      setNuevo(prev => ({ ...prev, precioUnitario: costoEnvioPorDefecto }));
    }
  }, [costoEnvioPorDefecto]);

  const handleAdd = () => {
    if (!nuevo.contenido || !nuevo.precioUnitario) return;
    const cantidad = parseInt(nuevo.cantidad) || 1;
    const precioIngresado = parseFloat(nuevo.precioUnitario) || 0;
    const peso = parseFloat(nuevo.peso) || 0;
    const rate = cobrarIvaGuia ? getIvaRate(nuevo.tipoEnvioId, tiposEnvio) : 0;
    const porcDesc = convenio ? (convenio.porcentaje_descuento || convenio.descuento || 0) : 0;

    const { subtotal, descuento, iva, total } = desgloseItem(precioIngresado, cantidad, rate, porcDesc);

    const item = {
      id: Date.now(),
      cantidad,
      tipoEnvioId: nuevo.tipoEnvioId,
      tipoEnvio: nuevo.tipoEnvioNombre,
      contenido: nuevo.contenido,
      peso,
      precioUnitario: precioIngresado,
      subtotal,
      descuento,
      tarifa: 0,
      iva,
      total,
      editable: 0,
      id_guia: 0,
      tipo_descuento: 0
    };

    onChange([...detalles, item]);
    setNuevo({ cantidad: 1, tipoEnvioId: tipoEnvioId || '', tipoEnvioNombre: nuevo.tipoEnvioNombre || '', contenido: '', peso: '', precioUnitario: costoEnvioPorDefecto || '' });
  };

  const handleRemove = (id) => {
    onChange(detalles.filter(d => d.id !== id));
  };

  const handleUpdateField = (id, field, value) => {
    const updated = detalles.map(d => {
      if (d.id !== id) return d;
      const newD = { ...d, [field]: field === 'precioUnitario' ? (parseFloat(value) || 0) : value };
      const rate = cobrarIvaGuia ? getIvaRate(newD.tipoEnvioId, tiposEnvio) : 0;
      const porcDesc = convenio ? (convenio.porcentaje_descuento || convenio.descuento || 0) : 0;
      const { subtotal, descuento, iva, total } = desgloseItem(newD.precioUnitario, newD.cantidad || 1, rate, porcDesc);
      return { ...newD, subtotal, descuento, iva, total };
    });
    onChange(updated);
  };

  const inputClass = "w-full h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-slate-700 text-center";
  const inputClassRight = "w-full h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-slate-700 text-right font-mono";

  return (
    <div>
      {/* Fila de ingreso rápido (oculto en edición) */}
      {!isEditing && (
        <div className="quick-add-row" style={{ display: 'grid', gridTemplateColumns: '55px 1fr 75px 85px 85px 35px', gap: '6px', marginBottom: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Cant.</label>
            <input type="number" min="1" className={inputClass} value={nuevo.cantidad} onChange={(e) => setNuevo({...nuevo, cantidad: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Contenido / Descripción</label>
            <input type="text" className="w-full h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-slate-700" value={nuevo.contenido} onChange={(e) => setNuevo({...nuevo, contenido: e.target.value})} placeholder="Ej: Caja de zapatos" />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Peso (kg)</label>
            <input type="number" step="0.01" className={inputClassRight} value={nuevo.peso} onChange={(e) => setNuevo({...nuevo, peso: e.target.value})} placeholder="0.00" />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>P. Unitario</label>
            <input type="number" step="0.01" className={inputClassRight} value={nuevo.precioUnitario} onChange={(e) => setNuevo({...nuevo, precioUnitario: e.target.value})} placeholder="0.00" />
          </div>
          <div>
            <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Total</label>
            <input type="text" className={`${inputClassRight} bg-slate-50 text-slate-500`} readOnly value={`$${((parseInt(nuevo.cantidad) || 1) * (parseFloat(nuevo.precioUnitario) || 0)).toFixed(2)}`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" onClick={handleAdd} style={{ height: '28px', width: '28px', borderRadius: '50%', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Agregar bulto">
              <i className="fas fa-plus" style={{fontSize: '10px'}}></i>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de detalle */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', outline: error ? '2px solid #ef4444' : undefined, outlineOffset: '-1px' }}>
        <table className="guias-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>CANT</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>TIPO ENVÍO</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>CONTENIDO</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>PESO</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>P. UNITARIO</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>SUBTOTAL</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>DESCUENTO</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>IVA</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>TOTAL</th>
              <th style={{ padding: '6px 8px', width: '30px', borderBottom: '1px solid #e2e8f0' }}></th>
            </tr>
          </thead>
          <tbody>
            {detalles.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>No hay bultos agregados</td></tr>
            ) : (
              detalles.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' }}>{d.cantidad}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>{d.tipoEnvio}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'left' }}>{d.contenido}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{d.peso?.toFixed(2) || '0.00'}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>${d.precioUnitario?.toFixed(2)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>${d.subtotal?.toFixed(2)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace', color: d.descuento > 0 ? '#16a34a' : '#94a3b8' }}>
                    ${d.descuento?.toFixed(2)}
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>${d.iva?.toFixed(2)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>${d.total?.toFixed(2)}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button type="button" onClick={() => handleRemove(d.id)} 
                      disabled={isEditing}
                      style={{color: isEditing ? '#cbd5e1' : '#ef4444', background: 'none', border: 'none', cursor: isEditing ? 'not-allowed' : 'pointer', padding: '2px' }} 
                      title={isEditing ? 'No se puede eliminar en edición' : 'Eliminar'}>
                      <i className="fas fa-trash-alt" style={{fontSize: '10px'}}></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda de convenio */}
      {convenio && (
        <div style={{ marginTop: '6px', padding: '4px 8px', background: '#fef3c7', borderRadius: '4px', fontSize: '10px', color: '#92400e', fontWeight: 600 }}>
          <i className="fas fa-tag"></i> Convenio activo: {convenio.descripcion || convenio.nombre || 'Descuento aplicado'} - {convenio.porcentaje_descuento || convenio.descuento || 0}% descuento
        </div>
      )}
    </div>
  );
};
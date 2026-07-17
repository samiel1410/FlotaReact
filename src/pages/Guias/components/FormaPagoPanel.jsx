import { useState, useEffect, useRef } from 'react';
import { GuiaService } from '../../../services/guia.service';

/**
 * FormaPagoPanel - Equivalente a la sección "Forma de pago" del ExtJS
 * 
 * ExtJS original:
 * - Radio "Pagado por": Remitente(1) / Destinatario(2)
 * - Combo Forma de Pago
 * - Campo Monto, Detalle
 * - Botón "Agregar Pago"
 * - Grid de pagos con: Nombre, Monto, Acción(eliminar)
 * - Displays: A Pagar $, Pagado $, Diferencia $
 * 
 * Comportamiento automático:
 * - Cuando se agregan detalles de encomienda, se crea automáticamente
 *   un pago en la grilla con la forma de pago por defecto y el total
 * - El monto del pago automático se actualiza al cambiar el total
 */
export const FormaPagoPanel = ({ detalles, convenio, onPagosChange, pagadoPor, onPagadoPorChange, defaultFormaPagoId, configTipoTarifa }) => {
  const [formasPago, setFormasPago] = useState([]);
  const [pagos, setPagos] = useState([]);
  const autoDeletedRef = useRef(false);
  
  // Form
  const [formaPagoId, setFormaPagoId] = useState('');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');

  useEffect(() => {
    loadFormasPago();
  }, []);

  const loadFormasPago = async () => {
    try {
      const res = await GuiaService.getFormasPagoCombo();
      const raw = res?.data || [];
      setFormasPago(raw.map(fp => ({ ...fp, id: fp.id_forma_pago, nombre: fp.nombre_forma_pago })));
    } catch (e) {
      console.error('Error cargando formas de pago:', e);
    }
  };

  // Calcular totales
  const totalGeneral = detalles.reduce((sum, d) => {
    const sub = d.subtotal || d.sub_total || 0;
    const desc = d.descuento || 0;
    const tar = d.tarifa || 0;
    const iva = d.impuesto || d.iva || 0;
    return sum + (sub - desc) + iva + tar;
  }, 0);

  // ── Seleccionar forma de pago por defecto (SOLO UNA VEZ al iniciar) ──
  const formaPagoInitRef = useRef(false);
  useEffect(() => {
    if (defaultFormaPagoId && formasPago.length > 0 && !formaPagoInitRef.current) {
      setFormaPagoId(defaultFormaPagoId);
      formaPagoInitRef.current = true;
    }
  }, [defaultFormaPagoId, formasPago]);

  // ── Auto-agregar pago cuando hay detalles ──
  useEffect(() => {
    // No hay detalles o no hay forma de pago por defecto → no crear
    if (detalles.length === 0 || !defaultFormaPagoId || pagadoPor === '2') return;

    const autoPago = pagos.find(p => p._auto);

    if (autoPago && !autoDeletedRef.current) {
      // Actualizar monto del pago automático existente
      if (Math.abs(autoPago.monto - totalGeneral) > 0.01) {
        const newPagos = pagos.map(p =>
          p._auto ? { ...p, monto: totalGeneral } : p
        );
        setPagos(newPagos);
        onPagosChange?.(newPagos);
      }
    } else if (!autoPago && !autoDeletedRef.current && formasPago.length > 0) {
      // Crear pago automático (usa la forma de pago seleccionada por el usuario, no la default)
      const fp = formasPago.find(f => String(f.id || f.value || f.id_forma_pago) === String(formaPagoId || defaultFormaPagoId));
      const newPago = {
        id: 'auto_' + Date.now(),
        _auto: true,
        id_forma_pago: formaPagoId || defaultFormaPagoId,
        nombre: fp?.nombre || fp?.label || fp?.text || 'Pago',
        monto: totalGeneral,
        pagado_por: pagadoPor,
        detalle: ''
      };
      const newPagos = [...pagos, newPago];
      setPagos(newPagos);
      onPagosChange?.(newPagos);
      autoDeletedRef.current = false;
    }
  }, [detalles.length, totalGeneral, pagadoPor]);

  const totalPagado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const diferencia = totalPagado - totalGeneral;

  const sanitizeNum = (val) => typeof val === 'string' ? val.replace(/,/g, '.') : String(val || '');

  const handleAddPago = () => {
    if (!formaPagoId || !monto || parseFloat(sanitizeNum(monto)) <= 0) return;

    // Si hay un pago automático, eliminarlo al agregar uno manual
    let newPagos = [...pagos];
    if (pagos.some(p => p._auto)) {
      newPagos = pagos.filter(p => !p._auto);
    }

    const fp = formasPago.find(f => String(f.id || f.value || f.id_forma_pago) === String(formaPagoId));
    const newPago = {
      id: Date.now(),
      id_forma_pago: formaPagoId,
      nombre: fp?.nombre || fp?.label || fp?.text || 'Pago',
      monto: parseFloat(sanitizeNum(monto)),
      pagado_por: pagadoPor,
      detalle: detalle
    };

    newPagos = [...newPagos, newPago];
    setPagos(newPagos);
    onPagosChange?.(newPagos);
    
    // Limpiar
    setMonto('');
    setDetalle('');
  };

  const handleRemovePago = (id) => {
    const pago = pagos.find(p => p.id === id);
    if (pago?._auto) autoDeletedRef.current = true;
    const newPagos = pagos.filter(p => p.id !== id);
    setPagos(newPagos);
    onPagosChange?.(newPagos);
  };

  const fmt = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

  const inputClass = "w-full h-8 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-700";
  const labelClass = "block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1";

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80" style={{ padding: '16px' }}>
      <h3 style={sectionTitle}>
        <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
          <i className="fas fa-money-bill-wave" style={{ color: '#16a34a' }}></i>
        </div>
        Forma de Pago
      </h3>

      {/* Pagado por: Remitente / Destinatario */}
      <div style={{ marginBottom: '10px' }}>
        <label className={labelClass}>Pagado por</label>
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#475569' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="radio" name="pagadoPor" value="1" checked={pagadoPor === '1'} onChange={(e) => {
              onPagadoPorChange?.(e.target.value);
              autoDeletedRef.current = false;
            }} />
            Remitente
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="radio" name="pagadoPor" value="2" checked={pagadoPor === '2'} onChange={(e) => {
              onPagadoPorChange?.(e.target.value);
              setPagos([]);
              onPagosChange?.([]);
              autoDeletedRef.current = true;
            }} />
            Destinatario
          </label>
        </div>
      </div>

      {/* Forma de Pago + Monto + Detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: '6px', alignItems: 'end', marginBottom: '10px' }}>
        <div>
          <label className={labelClass}>Forma de Pago</label>
          <select className={inputClass} value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {formasPago.map(fp => (
              <option key={fp.id || fp.value || fp.id_forma_pago} value={fp.id || fp.value || fp.id_forma_pago}>
                {fp.nombre || fp.label || fp.text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Monto $</label>
          <input type="text" inputMode="decimal" className={inputClass} value={monto} onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Detalle</label>
          <input type="text" className={inputClass} value={detalle} onChange={(e) => setDetalle(e.target.value)}
            placeholder="Observación..." />
        </div>
        <button onClick={handleAddPago}
          className="h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm whitespace-nowrap"
          style={{ marginBottom: '0px' }}>
          <i className="fas fa-plus mr-1"></i> Agregar
        </button>
      </div>

      {/* Grid de pagos */}
      {pagos.length > 0 && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '10px' }}>Forma Pago</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '10px' }}>Pagado por</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '10px' }}>Monto</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '10px' }}>Detalle</th>
                <th style={{ padding: '6px 8px', width: '35px' }}></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px', color: '#1e293b' }}>{p.nombre}</td>
                  <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.pagado_por === '1' ? 'Remitente' : 'Destinatario'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{fmt(p.monto)}</td>
                  <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.detalle || '-'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button onClick={() => handleRemovePago(p.id)} className="text-red-400 hover:text-red-600">
                      <i className="fas fa-minus-circle text-sm"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Displays: A Pagar / Pagado / Diferencia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '8px 12px', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>A Pagar $</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0c4a6e' }}>{fmt(totalGeneral)}</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '8px 12px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagado $</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#14532d' }}>{fmt(totalPagado)}</div>
        </div>
        <div style={{ background: diferencia >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', padding: '8px 12px', border: `1px solid ${diferencia >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: diferencia >= 0 ? '#15803d' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diferencia $</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: diferencia >= 0 ? '#14532d' : '#991b1b' }}>{fmt(diferencia)}</div>
        </div>
      </div>
    </div>
  );
};
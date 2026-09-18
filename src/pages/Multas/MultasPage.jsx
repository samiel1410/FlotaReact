import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import SocioBusSelector from '../../components/common/SocioBusSelector';
import DateRangePicker from '../../components/common/DateRangePicker';
import SearchableSelect from '../../components/common/SearchableSelect';
import { cobrosService } from '../../services/cobros.service';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return String(f).split('T')[0] || String(f).split(' ')[0] || '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(f);
  }
};

const TIPOS_MULTA = [
  'Uniforme',
  'Corbata',
  'Incumplimiento de frecuencia',
  'Incumplimiento de ruta',
  'Atraso en salida',
  'Exceso de velocidad',
  'Falta de aseo en unidad',
  'Maltrato al usuario',
  'Otra'
];

const ESTADOS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'anulado', label: 'Anulado' }
];

// ─────────────────────────────────────────────────────────────
// MODAL: NUEVA MULTA
// ─────────────────────────────────────────────────────────────
const NuevaMultaModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ id_socio: '', id_bus: '', tipo_multa: '', valor: '10', observacion: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const { id_socio, id_bus, tipo_multa, valor } = form;
    if (!id_socio || !id_bus || !tipo_multa || !valor || parseFloat(valor) <= 0) {
      toast.error('Complete todos los campos obligatorios con un valor válido');
      return;
    }
    setLoading(true);
    try {
      const res = await cobrosService.agregarMulta({ ...form, concepto: `Multa por ${form.tipo_multa}` });
      if (res.success) {
        toast.success('Multa registrada exitosamente');
        if (res.notificacion?.telefono) {
          api.post('/whatsapp/enviar', { number: res.notificacion.telefono, message: res.notificacion.mensaje }).catch(() => {});
        }
        onSuccess();
      } else {
        toast.error(res.message || 'Error al registrar multa');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const tipoOptions = TIPOS_MULTA.map(t => ({ value: t, label: t }));

  return (
    <Modal isOpen={true} onClose={onClose} title="Registrar Nueva Multa" width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2.5">
          <i className="fas fa-exclamation-triangle text-rose-500 mt-0.5 shrink-0 text-sm"></i>
          <div>
            <p className="font-bold">Prioridad de Descuento (1° Máxima)</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Las multas tienen prioridad 1 y se deducirán automáticamente al 100% de la recaudación del próximo despacho del socio/unidad.
            </p>
          </div>
        </div>

        <SocioBusSelector
          idSocio={form.id_socio}
          idBus={form.id_bus}
          onSocioChange={v => handleChange('id_socio', v)}
          onBusChange={v => handleChange('id_bus', v)}
        />

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Tipo / Motivo de Multa <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={tipoOptions}
            value={tipoOptions.find(o => o.value === form.tipo_multa) || null}
            onChange={(opt) => handleChange('tipo_multa', opt?.value || '')}
            placeholder="Seleccione el motivo de la multa..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Valor de la Multa ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              value={form.valor}
              onChange={e => handleChange('valor', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Observación adicional</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            rows={2}
            value={form.observacion}
            onChange={e => handleChange('observacion', e.target.value)}
            placeholder="Detalles adicionales, ruta, reporte o causa..."
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
            ) : (
              <><i className="fas fa-save"></i> Guardar Multa</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL: ANULAR MULTA
// ─────────────────────────────────────────────────────────────
const AnularMultaModal = ({ multa, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnular = async (e) => {
    e?.preventDefault();
    if (!motivo.trim()) {
      toast.error('Debe ingresar el motivo de la anulación');
      return;
    }
    setLoading(true);
    try {
      const res = await cobrosService.anularDeuda({
        id_deuda: multa.id_deuda,
        fuente: 'deuda',
        motivo: motivo.trim()
      });

      if (res.success) {
        toast.success(res.message || 'Multa anulada correctamente');
        onSuccess();
      } else {
        toast.error(res.message || 'No se pudo anular la multa');
      }
    } catch (err) {
      toast.error(err.message || 'Error al anular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Anular Multa" width="max-w-md">
      <form onSubmit={handleAnular} className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <i className="fas fa-exclamation-triangle text-rose-600 text-sm"></i>
            <span>Confirmación de Anulación</span>
          </div>
          <p className="text-slate-700">
            Se anulará la multa <strong className="font-mono text-slate-900">#{multa?.id_deuda}</strong> por valor de{' '}
            <strong className="font-mono text-rose-700">{formatCurrency(multa?.valor_original)}</strong> asignada a{' '}
            <strong>{multa?.socio_nombre}</strong> (Bus {multa?.disco_buses || '-'}).
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Motivo de anulación <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describa el motivo de anulación (justificación requerida)..."
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !motivo.trim()}
            className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Anulando...</>
            ) : (
              <><i className="fas fa-ban"></i> Confirmar Anulación</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL: REGISTRAR PAGO EN VENTANILLA
// ─────────────────────────────────────────────────────────────
const PagarMultaModal = ({ multa, onClose, onSuccess }) => {
  const [monto, setMonto] = useState(String(multa.saldo_pendiente || multa.valor_original || ''));
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePagar = async (e) => {
    e?.preventDefault();
    const val = parseFloat(monto);
    if (!val || val <= 0) {
      toast.error('Ingrese un monto válido a pagar');
      return;
    }
    if (val > parseFloat(multa.saldo_pendiente || multa.valor_original)) {
      toast.error('El monto no puede superar el saldo pendiente');
      return;
    }

    setLoading(true);
    try {
      const res = await cobrosService.pagarDeuda({
        id_deuda: multa.id_deuda,
        monto: val,
        observacion: observacion.trim() || 'Cobro manual en ventanilla'
      });

      if (res.success) {
        toast.success(res.message || 'Pago registrado correctamente');
        onSuccess();
      } else {
        toast.error(res.message || 'Error al registrar pago');
      }
    } catch (err) {
      toast.error(err.message || 'Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Registrar Cobro en Ventanilla — Multa #${multa.id_deuda}`} width="max-w-md">
      <form onSubmit={handlePagar} className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Socio / Unidad:</span>
            <span className="font-bold text-slate-800">{multa.socio_nombre} (Bus {multa.disco_buses || '-'})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Saldo Pendiente:</span>
            <span className="font-mono font-black text-rose-600 text-sm">{formatCurrency(multa.saldo_pendiente)}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Monto a Cobrar ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={multa.saldo_pendiente}
              required
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Observación del Cobro</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Recibo manual en ventanilla, comprobante #..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
            ) : (
              <><i className="fas fa-dollar-sign"></i> Confirmar Cobro</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL: DETALLE E HISTORIAL DE RETENCIONES / COBRO
// ─────────────────────────────────────────────────────────────
const VerDetalleMultaModal = ({ idMulta, onClose, onVerComprobante }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/deuda/detallePago', { params: { id: idMulta, fuente: 'deuda' } })
      .then(res => {
        if (active && res.data?.success) {
          setDetalle(res.data.data);
        }
      })
      .catch(() => {
        if (active) toast.error('No se pudo cargar el detalle');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [idMulta]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Detalle de Multa #${idMulta}`} width="max-w-xl">
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-2 block text-rose-500"></i>
          <p className="text-xs font-medium">Cargando información...</p>
        </div>
      ) : !detalle ? (
        <div className="py-8 text-center text-slate-400">
          <i className="fas fa-inbox text-3xl mb-2 block"></i>
          <p className="text-xs">No se encontró el detalle de la multa</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen Financiero */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Multa</p>
              <p className="text-sm font-black text-slate-800 font-mono">{formatCurrency(detalle.valor_original)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Cobrado / Pagado</p>
              <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(detalle.valor_pagado)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-600 uppercase">Saldo Pendiente</p>
              <p className="text-sm font-black text-rose-600 font-mono">{formatCurrency(detalle.saldo_pendiente)}</p>
            </div>
          </div>

          {/* Datos del Socio y Bus */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <p><strong className="text-slate-500">Socio:</strong> <span className="font-semibold text-slate-800">{detalle.socio_nombre || '-'}</span></p>
              <p><strong className="text-slate-500">Cédula:</strong> <span className="font-mono">{detalle.socio_cedula || '-'}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p><strong className="text-slate-500">Bus / Unidad:</strong> <span className="font-bold text-slate-800">Bus {detalle.disco_buses || '-'} {detalle.placa_buses ? `(${detalle.placa_buses})` : ''}</span></p>
              <p>
                <strong className="text-slate-500">Estado:</strong>{' '}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  detalle.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' :
                  detalle.estado === 'parcial' ? 'bg-amber-100 text-amber-800' :
                  detalle.estado === 'anulado' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {detalle.estado}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <p><i className="far fa-calendar-plus mr-1"></i><strong>Registro:</strong> {formatFecha(detalle.fecha_creacion)}</p>
              <p><i className="far fa-check-circle mr-1 text-emerald-600"></i><strong>Último Pago:</strong> {formatFecha(detalle.fecha_ultimo_pago)}</p>
            </div>
            {detalle.concepto && (
              <p className="text-[11px] text-slate-700 border-t border-slate-100 pt-1.5 mt-1">
                <strong>Concepto:</strong> {detalle.concepto}
              </p>
            )}
            {detalle.observacion && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px] whitespace-pre-line">
                {detalle.observacion}
              </div>
            )}
          </div>

          {/* Historial de Retenciones en Despachos */}
          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i className="fas fa-file-invoice-dollar text-emerald-600"></i>
              Historial de Retenciones en Despachos
            </h4>

            {detalle.historial_retenciones && detalle.historial_retenciones.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-2">Viaje / Despacho</th>
                      <th className="px-3 py-2">Ruta</th>
                      <th className="px-3 py-2">Fecha Despacho</th>
                      <th className="px-3 py-2 text-right">Monto Retenido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {detalle.historial_retenciones.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/60">
                        <td className="px-3 py-2 font-bold text-indigo-700">
                          Viaje #{ret.id_viaje || ret.id_despacho_viaje || '-'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {ret.ruta || 'Despacho Operativo'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {formatFecha(ret.fecha)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(ret.monto_retenido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-slate-400 text-xs">
                <p>No registra retenciones en despachos aún (o fue pagada en ventanilla).</p>
              </div>
            )}
          </div>

          {/* Acciones del Modal */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onVerComprobante(detalle)}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <i className="fas fa-print"></i> Ver / Imprimir Comprobante
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL: COMPROBANTE DE PAGO / RECIBO DE MULTA
// ─────────────────────────────────────────────────────────────
const ComprobanteMultaModal = ({ multa, onClose }) => {
  const empresaData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('empresa_data') || '{}');
    } catch {
      return {};
    }
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Comprobante de Multa" width="max-w-lg">
      <div className="space-y-4">
        {/* Printable Voucher Area */}
        <div id="comprobante-multa-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-900">{empresaData.nombre || 'Comprobante de Multa'}</h2>
            {(empresaData.ruc || empresaData.direccion) && (
              <p className="text-[10px] text-slate-500 font-medium">
                {empresaData.ruc ? `RUC: ${empresaData.ruc}` : ''} {empresaData.direccion ? `— ${empresaData.direccion}` : ''}
              </p>
            )}
            <div className="inline-block bg-slate-100 px-3 py-1 rounded-full mt-1 border border-slate-200">
              <span className="text-[11px] font-black uppercase text-slate-800">
                COMPROBANTE DE MULTA #{multa.id || multa.id_deuda}
              </span>
            </div>
          </div>

          {/* Datos del Socio y Bus */}
          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">SOCIO</span>
              <span className="font-bold text-slate-800">{multa.socio_nombre || '-'}</span>
              <span className="block text-[11px] text-slate-500 font-mono">CI: {multa.socio_cedula || '-'}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">UNIDAD / BUS</span>
              <span className="font-bold text-slate-800 text-sm">Disco #{multa.disco_buses || '-'}</span>
              {multa.placa_buses && <span className="block text-[11px] text-slate-500 font-mono">Placa: {multa.placa_buses}</span>}
            </div>
          </div>

          {/* Concepto y Fechas */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Concepto:</span>
              <span className="font-bold text-slate-800 text-right">{multa.concepto || multa.tipo_nombre || 'Multa'}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Fecha Emisión:</span>
              <span className="font-mono text-slate-700">{formatFecha(multa.fecha_creacion)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Estado Actual:</span>
              <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                multa.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' :
                multa.estado === 'parcial' ? 'bg-amber-100 text-amber-800' :
                multa.estado === 'anulado' ? 'bg-rose-100 text-rose-800' : 'bg-rose-100 text-rose-700'
              }`}>
                {multa.estado}
              </span>
            </div>
          </div>

          {/* Desglose de Valores */}
          <div className="space-y-1.5 border-t border-b border-slate-200 py-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-600">Valor Original Multa:</span>
              <span className="font-mono font-bold text-slate-800">{formatCurrency(multa.valor_original)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>(-) Total Deducido / Pagado:</span>
              <span className="font-mono font-bold">-{formatCurrency(multa.valor_pagado)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-100 text-slate-900">
              <span>SALDO RESTANTE:</span>
              <span className={`font-mono ${parseFloat(multa.saldo_pendiente || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(multa.saldo_pendiente)}
              </span>
            </div>
          </div>

          {/* Observaciones */}
          {multa.observacion && (
            <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
              <strong>Observación:</strong> {multa.observacion}
            </div>
          )}

          {/* Footer Voucher */}
          <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300 pt-3">
            <p>Comprobante generado por Sistema de Control de Flota</p>
            <p className="font-mono text-[9px] mt-0.5">Fecha Impresión: {new Date().toLocaleString('es-EC')}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <i className="fas fa-print"></i> Imprimir Recibo
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: MULTAS PAGE
// ─────────────────────────────────────────────────────────────
export const MultasPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    id_socio: '',
    id_bus: '',
    estado: 'todos',
    fecha_desde: '',
    fecha_hasta: '',
    search: ''
  });

  // Modales React
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [anularRow, setAnularRow] = useState(null);
  const [pagarRow, setPagarRow] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [comprobanteRow, setComprobanteRow] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        page,
        id_tipo_deuda: 1 // Multas
      };
      if (filtros.estado && filtros.estado !== 'todos') params.estado = filtros.estado;
      if (filtros.fecha_desde && filtros.fecha_hasta) {
        params.fecha_desde = filtros.fecha_desde;
        params.fecha_hasta = filtros.fecha_hasta;
      }
      if (filtros.id_socio) params.id_socio = filtros.id_socio;
      if (filtros.id_bus) params.id_bus = filtros.id_bus;

      const res = await cobrosService.listarMultas(params);
      if (res.success) {
        let rows = res.data || [];
        if (filtros.search.trim()) {
          const s = filtros.search.toLowerCase();
          rows = rows.filter(r => 
            (r.socio_nombre || '').toLowerCase().includes(s) ||
            String(r.disco_buses || '').includes(s) ||
            (r.concepto || '').toLowerCase().includes(s) ||
            String(r.id_deuda || '').includes(s)
          );
        }
        setData(rows);
        setTotal(res.total || rows.length);
      }
    } catch {
      toast.error('Error al cargar multas');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos de tarjetas resumen
  const resumen = useMemo(() => {
    const totalOriginal = data.reduce((s, r) => s + parseFloat(r.valor_original || 0), 0);
    const totalPagado = data.reduce((s, r) => s + parseFloat(r.valor_pagado || 0), 0);
    const totalPendiente = data.reduce((s, r) => s + parseFloat(r.saldo_pendiente || 0), 0);
    return { totalOriginal, totalPagado, totalPendiente, count: total };
  }, [data, total]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <i className="fas fa-gavel text-lg"></i>
            </span>
            Gestión de Multas
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Registro, control de descuentos automáticos en despachos, comprobantes y anulación de multas.
          </p>
        </div>

        <button
          onClick={() => setShowNuevaModal(true)}
          className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus-circle text-sm"></i>
          <span>Nueva Multa</span>
        </button>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registrado</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
              <i className="fas fa-list-ol"></i>
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 font-mono mt-1">{formatCurrency(resumen.totalOriginal)}</p>
          <span className="text-[11px] text-slate-400 font-medium">{resumen.count} multa(s) en total</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Recaudado / Pagado</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono mt-1">{formatCurrency(resumen.totalPagado)}</p>
          <span className="text-[11px] text-slate-400 font-medium">Descontado en despacho y ventanilla</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Saldo Pendiente</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs">
              <i className="fas fa-exclamation-circle"></i>
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 font-mono mt-1">{formatCurrency(resumen.totalPendiente)}</p>
          <span className="text-[11px] text-slate-400 font-medium">Por descontar en próximos viajes</span>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Regla de Prioridad</span>
            <div className="w-7 h-7 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center text-xs">
              <i className="fas fa-bolt"></i>
            </div>
          </div>
          <p className="text-sm font-black text-rose-900 mt-1">100% de Recaudación</p>
          <span className="text-[11px] text-rose-700 font-medium">Deducción de 1° Orden automática</span>
        </div>
      </div>

      {/* ─── BARRA DE FILTROS ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Rango de Fechas Unificado */}
          <div className="md:col-span-4">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Rango de Fechas
            </label>
            <DateRangePicker
              startDate={filtros.fecha_desde}
              endDate={filtros.fecha_hasta}
              onChange={({ startDateStr, endDateStr }) => {
                setFiltros(f => ({ ...f, fecha_desde: startDateStr, fecha_hasta: endDateStr }));
                setPage(1);
              }}
              placeholder="Filtrar por rango de fechas..."
            />
          </div>

          {/* Estado con SearchableSelect */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Estado
            </label>
            <SearchableSelect
              options={ESTADOS_OPTIONS}
              value={ESTADOS_OPTIONS.find(o => o.value === filtros.estado) || ESTADOS_OPTIONS[0]}
              onChange={(opt) => {
                setFiltros(f => ({ ...f, estado: opt?.value || 'todos' }));
                setPage(1);
              }}
              placeholder="Estado..."
            />
          </div>

          {/* Buscador de texto */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Buscar Socio / Bus / Concepto
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs pointer-events-none"></i>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                placeholder="Nombre, disco, concepto..."
                value={filtros.search}
                onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              />
            </div>
          </div>

          {/* Botón Limpiar */}
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => {
                setFiltros({ id_socio: '', id_bus: '', estado: 'todos', fecha_desde: '', fecha_hasta: '', search: '' });
                setPage(1);
              }}
              className="w-full h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-eraser text-slate-500"></i>
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TABLA DE MULTAS ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-14">ID</th>
                <th className="px-3.5 py-3">Socio</th>
                <th className="px-3.5 py-3 text-center">Bus</th>
                <th className="px-3.5 py-3">Concepto / Motivo</th>
                <th className="px-3.5 py-3 text-right">Valor</th>
                <th className="px-3.5 py-3 text-right text-emerald-700">Pagado</th>
                <th className="px-3.5 py-3 text-right text-rose-600">Saldo</th>
                <th className="px-3.5 py-3 text-center">Estado</th>
                <th className="px-3.5 py-3 text-center">Fecha</th>
                <th className="px-3.5 py-3 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2 block text-rose-500"></i>
                    <span className="font-semibold text-xs">Cargando multas...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <i className="fas fa-inbox text-3xl mb-2 block text-slate-300"></i>
                    <p className="font-bold text-xs text-slate-600">No se encontraron multas</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No hay registros con los filtros seleccionados.</p>
                  </td>
                </tr>
              ) : (
                data.map((d) => {
                  const saldo = parseFloat(d.saldo_pendiente || 0);
                  const isPagado = d.estado === 'pagado' || saldo <= 0;
                  const isAnulado = d.estado === 'anulado';

                  return (
                    <tr key={d.id_deuda} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-500">
                        #{d.id_deuda}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-800">{d.socio_nombre || 'Socio no asignado'}</div>
                        {d.socio_cedula && <div className="text-[10px] text-slate-400 font-mono">CI: {d.socio_cedula}</div>}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200">
                          {d.disco_buses ? `Bus ${d.disco_buses}` : '-'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">{d.concepto || 'Multa'}</div>
                        {d.observacion && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs" title={d.observacion}>
                            {d.observacion}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(d.valor_original)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(d.valor_pagado)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-rose-600">
                        {formatCurrency(d.saldo_pendiente)}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          d.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          d.estado === 'parcial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          d.estado === 'anulado' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {d.estado === 'pagado' ? '✓ Pagado' :
                           d.estado === 'parcial' ? '⏳ Parcial' :
                           d.estado === 'anulado' ? '✕ Anulado' :
                           '● Pendiente'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono text-slate-500 text-[11px]">
                        {formatFecha(d.fecha_creacion)}
                      </td>

                      {/* ─── ACCIONES POR FILA ─── */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Ver Detalle e Historial de Despachos */}
                          <button
                            onClick={() => setDetalleId(d.id_deuda)}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Ver desglose e historial de retenciones"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>

                          {/* 2. Ver / Imprimir Comprobante */}
                          <button
                            onClick={() => setComprobanteRow(d)}
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Ver e imprimir comprobante"
                          >
                            <i className="fas fa-receipt text-xs"></i>
                          </button>

                          {/* 3. Pagar en Ventanilla (si no está pagado ni anulado) */}
                          {!isPagado && !isAnulado && (
                            <button
                              onClick={() => setPagarRow(d)}
                              className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                              title="Registrar cobro manual en ventanilla"
                            >
                              <i className="fas fa-dollar-sign text-xs"></i>
                            </button>
                          )}

                          {/* 4. Anular Multa (si no está anulada) */}
                          {!isAnulado && (
                            <button
                              onClick={() => setAnularRow(d)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                              title="Anular multa"
                            >
                              <i className="fas fa-ban text-xs"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>de {total} multas registradas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              <i className="fas fa-chevron-left mr-1"></i> Anterior
            </button>
            <span className="px-3 py-1.5 font-black text-slate-700 bg-white border border-slate-200 rounded-lg">
              Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              Siguiente <i className="fas fa-chevron-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALES DE ACCIÓN ────────────────────────────────────── */}
      {showNuevaModal && (
        <NuevaMultaModal
          onClose={() => setShowNuevaModal(false)}
          onSuccess={() => { setShowNuevaModal(false); loadData(); }}
        />
      )}

      {anularRow && (
        <AnularMultaModal
          multa={anularRow}
          onClose={() => setAnularRow(null)}
          onSuccess={() => { setAnularRow(null); loadData(); }}
        />
      )}

      {pagarRow && (
        <PagarMultaModal
          multa={pagarRow}
          onClose={() => setPagarRow(null)}
          onSuccess={() => { setPagarRow(null); loadData(); }}
        />
      )}

      {detalleId && (
        <VerDetalleMultaModal
          idMulta={detalleId}
          onClose={() => setDetalleId(null)}
          onVerComprobante={(det) => {
            setDetalleId(null);
            setComprobanteRow(det);
          }}
        />
      )}

      {comprobanteRow && (
        <ComprobanteMultaModal
          multa={comprobanteRow}
          onClose={() => setComprobanteRow(null)}
        />
      )}
    </div>
  );
};

export default MultasPage;

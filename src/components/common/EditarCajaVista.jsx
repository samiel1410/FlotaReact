import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../config/axios';

const DENOMINACIONES_APERTURA = [
  { key: 'apertura_100_caja', label: '$100', val: 100, type: 'billete' },
  { key: 'apertura_50_caja', label: '$50', val: 50, type: 'billete' },
  { key: 'apertura_20_caja', label: '$20', val: 20, type: 'billete' },
  { key: 'apertura_10_caja', label: '$10', val: 10, type: 'billete' },
  { key: 'apertura_5_caja', label: '$5', val: 5, type: 'billete' },
  { key: 'apertura_1_caja', label: '$1', val: 1, type: 'billete' },
  { key: 'apertura_moneda_caja', label: '$1.00', val: 1, type: 'moneda' },
  { key: 'apertura_moneda_50_caja', label: '50¢', val: 0.5, type: 'moneda' },
  { key: 'apertura_moneda_25_caja', label: '25¢', val: 0.25, type: 'moneda' },
  { key: 'apertura_moneda_10_caja', label: '10¢', val: 0.1, type: 'moneda' },
  { key: 'apertura_moneda_5_caja', label: '5¢', val: 0.05, type: 'moneda' },
  { key: 'apertura_moneda_1_caja', label: '1¢', val: 0.01, type: 'moneda' },
];

const DENOMINACIONES_CIERRE = [
  { key: 'cierre_100_caja', label: '$100', val: 100, type: 'billete' },
  { key: 'cierre_50_caja', label: '$50', val: 50, type: 'billete' },
  { key: 'cierre_20_caja', label: '$20', val: 20, type: 'billete' },
  { key: 'cierre_10_caja', label: '$10', val: 10, type: 'billete' },
  { key: 'cierre_5_caja', label: '$5', val: 5, type: 'billete' },
  { key: 'cierre_1_caja', label: '$1', val: 1, type: 'billete' },
  { key: 'cierre_moneda_caja', label: '$1.00', val: 1, type: 'moneda' },
  { key: 'cierre_moneda_50_caja', label: '50¢', val: 0.5, type: 'moneda' },
  { key: 'cierre_moneda_25_caja', label: '25¢', val: 0.25, type: 'moneda' },
  { key: 'cierre_moneda_10_caja', label: '10¢', val: 0.1, type: 'moneda' },
  { key: 'cierre_moneda_5_caja', label: '5¢', val: 0.05, type: 'moneda' },
  { key: 'cierre_moneda_1_caja', label: '1¢', val: 0.01, type: 'moneda' },
];

export default function EditarCajaVista({
  caja,
  onClose,
  onCancel,
  endpointEditar = '/caja/editarCaja',
  endpointDetalle = '/caja/detalleCaja',
  onSuccess,
  readOnly = false
}) {
  const handleBack = onClose || onCancel || (() => window.history.back());
  const idCaja = caja?.id_caja || caja?.id_caja_boleteria || caja?.id_caja_retenciones || '';

  // Estado Apertura
  const [aperturaValues, setAperturaValues] = useState({});
  const [totalApertura, setTotalApertura] = useState(0);

  // Estado Cierre
  const [cierreValues, setCierreValues] = useState({});
  const [fechaCierre, setFechaCierre] = useState(new Date().toISOString().split('T')[0]);
  const [horaCierre, setHoraCierre] = useState(new Date().toTimeString().split(' ')[0]);
  const [totalCierre, setTotalCierre] = useState(0);

  // Estado Detalle / Movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  // Formulario nuevo movimiento
  const [showAddMov, setShowAddMov] = useState(false);
  const [tipoMov, setTipoMov] = useState('INGRESO');
  const [montoMov, setMontoMov] = useState('');
  const [socioMov, setSocioMov] = useState('');
  const [docMov, setDocMov] = useState('');
  const [obsMov, setObsMov] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    if (caja) {
      const ap = {};
      DENOMINACIONES_APERTURA.forEach(d => { ap[d.key] = caja[d.key] || 0; });
      setAperturaValues(ap);

      const ci = {};
      DENOMINACIONES_CIERRE.forEach(d => { ci[d.key] = caja[d.key] || 0; });
      setCierreValues(ci);

      if (caja.fecha_hora_cierre) {
        const [f, h] = caja.fecha_hora_cierre.split(' ');
        if (f) setFechaCierre(f);
        if (h) setHoraCierre(h);
      }
    }
  }, [caja]);

  // Recalcular Total Apertura
  useEffect(() => {
    let tot = 0;
    DENOMINACIONES_APERTURA.forEach(d => {
      tot += (Number(aperturaValues[d.key]) || 0) * d.val;
    });
    setTotalApertura(tot);
  }, [aperturaValues]);

  // Recalcular Total Cierre
  useEffect(() => {
    let tot = 0;
    DENOMINACIONES_CIERRE.forEach(d => {
      tot += (Number(cierreValues[d.key]) || 0) * d.val;
    });
    setTotalCierre(tot);
  }, [cierreValues]);

  // Cargar lista de movimientos de detalle
  const loadMovimientos = async () => {
    if (!idCaja) return;
    setLoadingMovs(true);
    try {
      const res = await api.get(`/caja/listadoDetalleCaja?id_caja=${idCaja}`);
      if (res.data?.success) setMovimientos(res.data.data || []);
      else setMovimientos([]);
    } catch {
      setMovimientos([]);
    } finally {
      setLoadingMovs(false);
    }
  };

  useEffect(() => {
    loadMovimientos();
  }, [idCaja]);

  const handleAperturaChange = (key, val) => {
    setAperturaValues(p => ({ ...p, [key]: Math.max(0, parseInt(val) || 0) }));
  };

  const handleCierreChange = (key, val) => {
    setCierreValues(p => ({ ...p, [key]: Math.max(0, parseInt(val) || 0) }));
  };

  // Guardar Cambios Caja
  const handleSaveCaja = async () => {
    setLoadingSave(true);
    try {
      const payload = {
        id_caja: idCaja,
        id_caja_boleteria: idCaja,
        id_caja_retenciones: idCaja,
        ...aperturaValues,
        apertura_total_caja: totalApertura,
        ...cierreValues,
        cierre_total_caja: totalCierre,
        fecha_cierre: `${fechaCierre} ${horaCierre}`
      };

      const res = await api.post(endpointEditar || '/caja/editarCaja', payload);
      if (res.data?.success || res.data?.status === 'success' || res.status === 200) {
        toast.success('Caja actualizada correctamente');
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.data?.message || 'Error al guardar los cambios');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar los cambios');
    } finally {
      setLoadingSave(false);
    }
  };

  // Restablecer Cierre
  const handleRestablecerCierre = () => {
    const zeroed = {};
    DENOMINACIONES_CIERRE.forEach(d => { zeroed[d.key] = 0; });
    setCierreValues(zeroed);
    toast.success('Valores de cierre restablecidos a $0.00');
  };

  // Guardar Movimiento
  const handleAddMovimientoSubmit = async (e) => {
    e.preventDefault();
    if (!montoMov || parseFloat(montoMov) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    try {
      const payload = {
        id_fkcaja: idCaja,
        id_caja: idCaja,
        tipo_caja_detalle: tipoMov,
        monto_caja_detalle: parseFloat(montoMov),
        nombre_socio: socioMov,
        numero_documento: docMov,
        observacion_caja_detalle: obsMov
      };
      const res = await api.post(endpointDetalle, payload);
      if (res.data?.success || res.data?.status === 'success') {
        toast.success(`Movimiento (${tipoMov}) guardado`);
        setMontoMov(''); setSocioMov(''); setDocMov(''); setObsMov('');
        setShowAddMov(false);
        loadMovimientos();
      } else {
        toast.error(res.data?.message || 'Error al agregar movimiento');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    }
  };

  const totalIngresos = movimientos.filter(m => m.tipo_caja_detalle === 'INGRESO').reduce((s, m) => s + (parseFloat(m.monto_caja_detalle) || 0), 0);
  const totalEgresos = movimientos.filter(m => m.tipo_caja_detalle === 'EGRESO').reduce((s, m) => s + (parseFloat(m.monto_caja_detalle) || 0), 0);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-50 min-h-0 overflow-y-auto">
      {/* ── CABECERA DE NAVEGACIÓN MODERNA ── */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shadow-inner">
            <i className="fas fa-cash-register text-lg"></i>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide uppercase flex items-center gap-2">
              {readOnly ? 'Detalle de Movimientos / Caja' : 'Edición de Caja'} <span className="text-amber-400 font-mono">#{caja?.numero_caja || idCaja}</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Sucursal: {caja?.nombre_sucursal || 'Central'} &nbsp;•&nbsp; Usuario: {caja?.usuario || 'Administrador'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              onClick={handleSaveCaja}
              disabled={loadingSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20"
            >
              <i className={`fas ${loadingSave ? 'fa-spinner fa-spin' : 'fa-save'} text-sm`}></i>
              <span>Guardar Cambios</span>
            </button>
          )}
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-700 transition-all"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            <span>Atrás</span>
          </button>
        </div>
      </div>

      {/* ── TARJETAS DE APERTURA Y CIERRE (GRID 2 COLUMNAS PREMIUM) ── */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD APERTURA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-lock-open text-amber-100"></i>
              <span className="font-black text-xs uppercase tracking-wider">Apertura de Caja</span>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-700/40 px-2.5 py-1 rounded-md border border-amber-400/30">
              Total: ${totalApertura.toFixed(2)}
            </span>
          </div>

          <div className="p-5 flex-1 space-y-4">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Billetes</span>
              <div className="grid grid-cols-3 gap-2.5">
                {DENOMINACIONES_APERTURA.filter(d => d.type === 'billete').map(d => (
                  <div key={d.key} className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={readOnly}
                      value={aperturaValues[d.key] ?? 0}
                      onChange={e => handleAperturaChange(d.key, e.target.value)}
                      className="w-full text-right h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monedas</span>
              <div className="grid grid-cols-3 gap-2.5">
                {DENOMINACIONES_APERTURA.filter(d => d.type === 'moneda').map(d => (
                  <div key={d.key} className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={readOnly}
                      value={aperturaValues[d.key] ?? 0}
                      onChange={e => handleAperturaChange(d.key, e.target.value)}
                      className="w-full text-right h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CARD CIERRE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-lock text-emerald-100"></i>
              <span className="font-black text-xs uppercase tracking-wider">Cierre de Caja</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestablecerCierre}
                className="text-[10px] font-bold bg-emerald-800/50 hover:bg-emerald-800 px-2.5 py-1 rounded-md border border-emerald-400/30 transition-colors"
                title="Restablecer valores de cierre a 0"
              >
                <i className="fas fa-undo mr-1"></i> Reset
              </button>
              <span className="text-xs font-mono font-bold bg-emerald-800/60 px-2.5 py-1 rounded-md border border-emerald-400/30">
                Total: ${totalCierre.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-5 flex-1 space-y-4">
            {/* Fecha & Hora */}
            <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Fecha de Cierre</label>
                <input
                  type="date"
                  disabled={readOnly}
                  value={fechaCierre}
                  onChange={e => setFechaCierre(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-slate-700 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Hora de Cierre</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={horaCierre}
                  onChange={e => setHoraCierre(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-slate-700 text-center disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Billetes</span>
              <div className="grid grid-cols-3 gap-2.5">
                {DENOMINACIONES_CIERRE.filter(d => d.type === 'billete').map(d => (
                  <div key={d.key} className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={readOnly}
                      value={cierreValues[d.key] ?? 0}
                      onChange={e => handleCierreChange(d.key, e.target.value)}
                      className="w-full text-right h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monedas</span>
              <div className="grid grid-cols-3 gap-2.5">
                {DENOMINACIONES_CIERRE.filter(d => d.type === 'moneda').map(d => (
                  <div key={d.key} className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={readOnly}
                      value={cierreValues[d.key] ?? 0}
                      onChange={e => handleCierreChange(d.key, e.target.value)}
                      className="w-full text-right h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN MOVIMIENTOS OTROS INGRESOS/EGRESOS ── */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Top Bar Movimientos */}
          <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-exchange-alt text-amber-400"></i>
              <span className="font-black text-xs uppercase tracking-wider">Otros Ingresos y Egresos</span>
              <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {movimientos.length} Registros
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-emerald-400">Ingresos: +${totalIngresos.toFixed(2)}</span>
              <span className="text-rose-400">Egresos: -${totalEgresos.toFixed(2)}</span>
              {!readOnly && (
                <button
                  onClick={() => setShowAddMov(!showAddMov)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <i className="fas fa-plus-circle"></i> Nuevo Movimiento
                </button>
              )}
            </div>
          </div>

          {/* Formulario Agregar Movimiento */}
          {showAddMov && (
            <form onSubmit={handleAddMovimientoSubmit} className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tipo Movimiento</label>
                <select
                  value={tipoMov}
                  onChange={e => setTipoMov(e.target.value)}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="INGRESO">INGRESO (+)</option>
                  <option value="EGRESO">EGRESO (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoMov}
                  onChange={e => setMontoMov(e.target.value)}
                  className="w-full h-9 text-xs font-mono font-bold text-right border border-slate-300 rounded-lg px-3 bg-white focus:ring-2 focus:ring-amber-500/20"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Socio / Persona</label>
                <input
                  type="text"
                  value={socioMov}
                  onChange={e => setSocioMov(e.target.value)}
                  className="w-full h-9 text-xs border border-slate-300 rounded-lg px-3 bg-white focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Nombre del socio"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">N° Documento</label>
                <input
                  type="text"
                  value={docMov}
                  onChange={e => setDocMov(e.target.value)}
                  className="w-full h-9 text-xs border border-slate-300 rounded-lg px-3 bg-white focus:ring-2 focus:ring-amber-500/20"
                  placeholder="N° Comprobante"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex-1"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMov(false)}
                  className="h-9 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">#</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px]">FECHA Y HORA</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px]">TIPO</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px] text-right">MONTO</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px]">SOCIO</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px]"># DOCUMENTO</th>
                  <th className="py-2.5 px-3 font-black text-slate-500 uppercase tracking-widest text-[9px] text-center">ESTADO</th>
                  <th className="py-2.5 px-4 font-black text-slate-500 uppercase tracking-widest text-[9px]">OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingMovs ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <i className="fas fa-spinner fa-spin mr-2"></i> Cargando movimientos...
                    </td>
                  </tr>
                ) : movimientos.length > 0 ? (
                  movimientos.map((m, idx) => (
                    <tr key={m.id_caja_detalle || idx} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{m.numero_detalle_caja || idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.fecha_caja_detalle || '-'}</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          m.tipo_caja_detalle === 'INGRESO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                          {m.tipo_caja_detalle}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        ${parseFloat(m.monto_caja_detalle || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{m.nombre_socio_caja_detalle || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{m.numero_documento_caja_detalle || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          m.estado_caja_detalle === 'EMITIDO' ? 'bg-emerald-50 text-emerald-700' :
                          m.estado_caja_detalle === 'ANULADO' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.estado_caja_detalle || 'EMITIDO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{m.observacion_caja_detalle || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      No hay otros ingresos o egresos registrados en esta caja.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import { DateRangePicker } from '../../components/common/DateRangePicker';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return '-';
  try {
    const d = f.split('T')[0] || f.split(' ')[0];
    return d || '-';
  } catch {
    return String(f);
  }
};

const PagarDeudaModal = ({ deuda, onClose, onSuccess }) => {
  const [monto, setMonto] = useState(deuda?.saldo_pendiente || 0);
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePagar = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      Swal.fire('Validación', 'Ingrese un monto válido mayor a 0', 'warning');
      return;
    }
    if (parseFloat(monto) > parseFloat(deuda?.saldo_pendiente || 0)) {
      Swal.fire('Validación', 'El monto no puede superar el saldo pendiente', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/deuda/pagar', { id_deuda: deuda.id_deuda, monto, observacion });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Pago registrado correctamente', 'success');
        onSuccess();
      } else {
        Swal.fire('Error', res.data?.error || 'Error al procesar el pago', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pagar - ${deuda?.concepto || 'Cobro'}`} width="max-w-md">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-700">
          <p><span className="font-bold text-slate-500">Concepto:</span> <span className="font-semibold">{deuda?.concepto}</span></p>
          <p><span className="font-bold text-slate-500">Valor Original:</span> <span className="font-semibold">{formatCurrency(deuda?.valor_original)}</span></p>
          <p><span className="font-bold text-slate-500">Valor Pagado:</span> <span className="text-emerald-600 font-bold">{formatCurrency(deuda?.valor_pagado)}</span></p>
          <p><span className="font-bold text-slate-500">Saldo Pendiente:</span> <span className="text-amber-600 font-extrabold">{formatCurrency(deuda?.saldo_pendiente)}</span></p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Monto a pagar ($)</label>
          <input
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Observación</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            rows={3}
            placeholder="Detalle o número de comprobante..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePagar}
            disabled={loading}
            className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
          >
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Pagando...</> : <><i className="fas fa-check"></i> Registrar Pago</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const opcionesEstado = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'anulado', label: 'Anulado' },
];

const getColorForTipo = (prioridad, index) => {
  if (prioridad === 1) return 'bg-red-500';
  if (prioridad === 2) return 'bg-purple-500';
  if (prioridad === 3) return 'bg-blue-500';
  const palette = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-indigo-500'];
  return palette[index % palette.length];
};

export const CarteraSocioPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState('cedula');
  const [loading, setLoading] = useState(false);
  const [cartera, setCartera] = useState(null);
  const [pagarDeuda, setPagarDeuda] = useState(null);

  // Refs para mantener los IDs actuales sin problemas de stale closure
  const activeSocioIdRef = useRef(null);
  const activeBusIdRef = useRef(null);

  // Estado para render (UI reactivo)
  const [activeSocioId, setActiveSocioId] = useState(null);
  const [activeBusId, setActiveBusId] = useState(null);

  // Filters
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Función de carga de cartera — siempre recibe parámetros explícitos o usa los refs
  const cargarCartera = useCallback(async (sId, bId, fDesde, fHasta, fTipo, fEstado) => {
    // Usar refs para obtener valor más reciente, o los parámetros pasados explícitamente
    const targetSocio = sId !== undefined ? sId : activeSocioIdRef.current;
    const targetBus = bId !== undefined ? bId : activeBusIdRef.current;

    if (!targetSocio && !targetBus) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (targetSocio) params.id_socio = targetSocio;
      if (targetBus) params.id_bus = targetBus;

      if (fDesde !== undefined ? fDesde : filtroFechaDesde) params.fecha_desde = fDesde !== undefined ? fDesde : filtroFechaDesde;
      if (fHasta !== undefined ? fHasta : filtroFechaHasta) params.fecha_hasta = fHasta !== undefined ? fHasta : filtroFechaHasta;
      if (fTipo !== undefined ? fTipo : filtroTipo) params.id_tipo_deuda = fTipo !== undefined ? fTipo : filtroTipo;
      if (fEstado !== undefined ? fEstado : filtroEstado) params.estado = fEstado !== undefined ? fEstado : filtroEstado;

      const res = await api.get('/deuda/carteraSocio', { params });
      if (res.data?.success) {
        setCartera(res.data);
      } else {
        Swal.fire('Error', res.data?.error || 'Error al consultar cartera', 'error');
      }
    } catch (err) {
      console.error('Error cargando cartera:', err);
      Swal.fire('Error', err.response?.data?.error || err.message || 'Error al consultar cartera', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFechaDesde, filtroFechaHasta, filtroTipo, filtroEstado]);

  const handleBuscar = async () => {
    const q = busqueda ? busqueda.trim() : '';
    if (!q) {
      Swal.fire('Aviso', 'Ingrese un valor de búsqueda (Cédula o Disco de Bus)', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (tipoBusqueda === 'cedula') {
        const pRes = await api.get('/personal/personalSeleccionPaginado', {
          params: { per_cedula_personal: q, limit: 1 }
        });
        const socio = pRes.data?.data?.[0];
        if (!socio) {
          Swal.fire('No encontrado', `No se encontró ningún socio con la cédula "${q}"`, 'error');
          setLoading(false);
          return;
        }
        const sId = socio.id_personal;
        // Actualizar refs inmediatamente (antes del re-render de React)
        activeSocioIdRef.current = sId;
        activeBusIdRef.current = null;
        setActiveSocioId(sId);
        setActiveBusId(null);
        // Pasar IDs explícitamente — no depende del estado que aún no actualizó
        await cargarCartera(sId, null);
      } else {
        const bRes = await api.get('/buses/seleccionarBuses', {
          params: { disco_buses: q, limit: 1 }
        });
        const bus = bRes.data?.data?.[0];
        if (!bus) {
          Swal.fire('No encontrado', `No se encontró ningún bus con el número/disco "${q}"`, 'error');
          setLoading(false);
          return;
        }
        const bId = bus.id_buses;
        // Actualizar refs inmediatamente
        activeSocioIdRef.current = null;
        activeBusIdRef.current = bId;
        setActiveSocioId(null);
        setActiveBusId(bId);
        await cargarCartera(null, bId);
      }
    } catch (err) {
      console.error('Error en búsqueda:', err);
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
      setLoading(false);
    }
  };

  const handleDateChange = ({ startDateStr, endDateStr }) => {
    setFiltroFechaDesde(startDateStr || '');
    setFiltroFechaHasta(endDateStr || '');
    if (activeSocioId || activeBusId) {
      cargarCartera(activeSocioId, activeBusId, startDateStr || '', endDateStr || '', filtroTipo, filtroEstado);
    }
  };

  const handleTipoChange = (e) => {
    const val = e.target.value;
    setFiltroTipo(val);
    if (activeSocioId || activeBusId) {
      cargarCartera(activeSocioId, activeBusId, filtroFechaDesde, filtroFechaHasta, val, filtroEstado);
    }
  };

  const handleEstadoChange = (e) => {
    const val = e.target.value;
    setFiltroEstado(val);
    if (activeSocioId || activeBusId) {
      cargarCartera(activeSocioId, activeBusId, filtroFechaDesde, filtroFechaHasta, filtroTipo, val);
    }
  };

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTipo('');
    setFiltroEstado('');
    if (activeSocioId || activeBusId) {
      cargarCartera(activeSocioId, activeBusId, '', '', '', '');
    }
  };

  const cardsResumen = (cartera?.resumen || []).map((r, i) => ({
    id: r.id_tipo_cobros || r.id_tipo_deuda,
    label: r.tipo_nombre,
    valor: r.total_pendiente || 0,
    color: getColorForTipo(r.prioridad, i),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {pagarDeuda && (
        <PagarDeudaModal
          deuda={pagarDeuda}
          onClose={() => setPagarDeuda(null)}
          onSuccess={() => {
            setPagarDeuda(null);
            cargarCartera();
          }}
        />
      )}

      {/* ─── ENCABEZADO ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
              <i className="fas fa-wallet text-lg"></i>
            </span>
            Cartera del Socio
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Consulta de estado de cuenta, rubros de cobro acumulados y registro de pagos individuales por socio o bus.
          </p>
        </div>

        {cartera && (
          <button
            onClick={() => cargarCartera()}
            disabled={loading}
            className="self-start sm:self-auto h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt text-emerald-600 ${loading ? 'fa-spin' : ''}`}></i>
            <span>Actualizar</span>
          </button>
        )}
      </div>

      {/* ─── BARRA DE BÚSQUEDA ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBuscar();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar por</label>
            <select
              className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              value={tipoBusqueda}
              onChange={(e) => setTipoBusqueda(e.target.value)}
            >
              <option value="cedula">Cédula del Socio</option>
              <option value="bus">Número / Disco de Bus</option>
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {tipoBusqueda === 'cedula' ? 'Cédula de Identidad' : 'Número o Disco de Bus'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                <i className={tipoBusqueda === 'cedula' ? 'fas fa-id-card' : 'fas fa-bus'}></i>
              </span>
              <input
                type="text"
                className="w-full h-9 pl-9 pr-8 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={tipoBusqueda === 'cedula' ? 'Ej: 1801043181' : 'Ej: 17'}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-search text-xs"></i>}
            <span>{loading ? 'Consultando...' : 'Buscar'}</span>
          </button>
        </form>
      </div>

      {cartera && (
        <>
          {/* ─── TARJETA PERFIL DEL SOCIO ──────────────────────────────────── */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50/80 border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl shadow-xs shrink-0">
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {cartera.info?.socio || 'Socio'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ACTIVO
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-id-card text-slate-400"></i>
                    <strong>Cédula:</strong> {cartera.info?.cedula || '-'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-bus text-blue-500"></i>
                    <strong>Buses asignados:</strong> {cartera.info?.bus || 'Sin bus'}
                  </span>
                  {cartera.info?.celular && (
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-phone text-emerald-500"></i>
                      <strong>Tel:</strong> {cartera.info?.celular}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-emerald-200/80 rounded-xl px-5 py-3 text-right shrink-0 shadow-2xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Pendiente</p>
              <p className="text-2xl font-black text-rose-600 font-mono">
                {formatCurrency(cartera.total_pendiente)}
              </p>
            </div>
          </div>

          {/* ─── FILTROS UNIFICADOS (DateRangePicker + Tipo de Cobro + Estado) ───────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rango de Fechas
                </label>
                <DateRangePicker
                  startDate={filtroFechaDesde}
                  endDate={filtroFechaHasta}
                  onChange={handleDateChange}
                  placeholder="Todas las fechas..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Cobro / Rubro
                </label>
                <select
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={filtroTipo}
                  onChange={handleTipoChange}
                >
                  <option value="">Todos los rubros</option>
                  {(cartera?.resumen || []).map((t) => (
                    <option key={t.id_tipo_cobros || t.id_tipo_deuda} value={t.id_tipo_cobros || t.id_tipo_deuda}>
                      {t.tipo_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Estado
                </label>
                <select
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={filtroEstado}
                  onChange={handleEstadoChange}
                >
                  {opcionesEstado.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="w-full h-9 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  title="Restablecer filtros"
                >
                  <i className="fas fa-undo text-[10px] text-slate-400"></i>
                  <span>Limpiar Filtros</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── TARJETAS RESUMEN (Basadas en tipo_cobros) ────────────────────────────── */}
          {cardsResumen.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cardsResumen.map((card) => (
                <div
                  key={card.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${card.color}`}></div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-600 truncate">{card.label}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${card.color}`}></span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 font-mono">{formatCurrency(card.valor)}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Saldo pendiente</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── TABLA DE COBROS Y DEUDAS ──────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xs">
                  <i className="fas fa-list"></i>
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Registros de Cobros y Deudas</h3>
                  <p className="text-[10px] font-medium text-slate-400">Detalle individual de obligaciones y cobros</p>
                </div>
              </div>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {cartera.data?.length || 0} registro(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-center w-14">ID</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Pagado</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-center w-20">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartera.data?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-2 text-xl">
                          <i className="fas fa-check-circle"></i>
                        </div>
                        <p className="text-xs font-bold text-slate-600">Sin rubros pendientes ni deudas registradas</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">El socio no presenta valores pendientes bajo los filtros seleccionados</p>
                      </td>
                    </tr>
                  ) : (
                    cartera.data.map((d) => (
                      <tr key={`${d.fuente || 'd'}-${d.id_deuda}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600 text-center">
                          #{d.id_deuda}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                              d.prioridad === 1
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : d.prioridad === 2
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {d.tipo_nombre}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">
                          {d.concepto}
                          {d.observacion && (
                            <p className="text-[10px] text-slate-400 truncate">{d.observacion}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                          {formatCurrency(d.valor_original)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(d.valor_pagado)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-600">
                          {formatCurrency(d.saldo_pendiente)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              d.estado === 'pagado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.estado === 'parcial'
                                ? 'bg-amber-100 text-amber-800'
                                : d.estado === 'anulado'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {d.estado === 'pagado'
                              ? 'Pagado'
                              : d.estado === 'parcial'
                              ? 'Parcial'
                              : d.estado === 'anulado'
                              ? 'Anulado'
                              : capitalize(d.estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {formatFecha(d.fecha_creacion)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.estado !== 'pagado' && d.estado !== 'anulado' && (
                            <button
                              onClick={() => setPagarDeuda(d)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 mx-auto active:scale-95"
                              title="Registrar Pago"
                            >
                              <i className="fas fa-hand-holding-usd text-xs"></i>
                              <span>Pagar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { promesaPagoService } from '../../services/promesaPago.service';
import { dialog } from '../../components/common/dialog/dialog';
import { PromesasPorCobrarPanel } from './components/PromesasPorCobrarPanel';
import { NuevaPromesaModal } from './components/NuevaPromesaModal';
import { DetallePromesaModal } from './components/DetallePromesaModal';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatoFecha = (f) => {
  if (!f) return '-';
  const solo = String(f).slice(0, 10);
  const [y, m, d] = solo.split('-');
  return `${d}/${m}/${y}`;
};

const estadoBadge = (p) => {
  const estado = p.estado_calculado || p.estado;
  if (estado === 'CUMPLIDA') return { label: 'Cumplida', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (estado === 'ANULADA') return { label: 'Anulada', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (estado === 'VENCIDA') return { label: 'Vencida', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { label: 'Activa', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
};

const tabs = [
  { id: 'por-cobrar', label: 'Por cobrar', icon: 'fas fa-hand-holding-usd' },
  { id: 'promesas', label: 'Promesas', icon: 'fas fa-calendar-check' },
];

export const PromesasPagoPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('por-cobrar');
  const [resumen, setResumen] = useState({ vencidas: 0, hoy: 0, proximas: 0, cantidad: 0 });

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ texto: '', estado: '' });

  const [showNueva, setShowNueva] = useState(false);
  const [modoInicial, setModoInicial] = useState('masiva');
  const [itemParaCrear, setItemParaCrear] = useState(null);
  const [verDetalle, setVerDetalle] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const cargarListado = useCallback(async () => {
    setLoading(true);
    try {
      const res = await promesaPagoService.listar({
        limit: pageSize,
        page,
        texto: filtros.texto.trim(),
        estado: filtros.estado,
      });
      if (res.success) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        toast.error(res.message || 'Error al cargar promesas');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

  useEffect(() => {
    if (activeTab === 'promesas') cargarListado();
  }, [activeTab, cargarListado]);

  useEffect(() => {
    const item = location.state?.crearPara;
    if (item) {
      setItemParaCrear(item);
      setModoInicial('individual');
      setShowNueva(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const refrescarTodo = () => {
    setRefreshKey((k) => k + 1);
    if (activeTab === 'promesas') cargarListado();
  };

  const handleAnular = async (p) => {
    const { value: motivo } = await dialog.fire({
      title: 'Anular promesa de pago',
      text: `Se anulará la promesa de ${p.socio_nombre || 'el socio'} por ${formatCurrency(p.monto_total)}. La cuota administrativa volverá a estar sujeta a retención.`,
      input: 'text',
      inputPlaceholder: 'Motivo de anulación',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => (!value || !value.trim() ? 'Debe indicar el motivo' : null),
    });
    if (motivo === undefined) return;

    const res = await promesaPagoService.anular({ id_promesa_pago: p.id_promesa_pago, motivo: motivo.trim() });
    if (res.success) {
      toast.success(res.message || 'Promesa anulada');
      refrescarTodo();
    } else {
      toast.error(res.message || 'No se pudo anular');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resumenBadge = useMemo(() => {
    const pendientes = (resumen.vencidas || 0) + (resumen.hoy || 0);
    return pendientes > 0 ? pendientes : 0;
  }, [resumen]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-calendar-check" />
            </span>
            Promesas de Pago
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cuota administrativa de los socios: fechas prometidas, cobro anticipado y control de vencimientos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refrescarTodo}
            className="h-9 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1.5"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> Refrescar
          </button>
          <button
            type="button"
            onClick={() => {
              setItemParaCrear(null);
              setModoInicial('masiva');
              setShowNueva(true);
            }}
            className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus-circle" /> Nueva promesa
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className={`${tab.icon}`} />
            {tab.label}
            {tab.id === 'por-cobrar' && resumenBadge > 0 && (
              <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                {resumenBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[420px]">
        {activeTab === 'por-cobrar' && (
          <PromesasPorCobrarPanel
            key={refreshKey}
            onResumenChange={setResumen}
            onNuevaPromesa={() => {
              setItemParaCrear(null);
              setModoInicial('masiva');
              setShowNueva(true);
            }}
          />
        )}

        {activeTab === 'promesas' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Búsqueda</label>
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => { setFiltros((f) => ({ ...f, texto: e.target.value })); setPage(1); }}
                    placeholder="Buscar bus, socio, cédula o concepto..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="w-44">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => { setFiltros((f) => ({ ...f, estado: e.target.value })); setPage(1); }}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVA">Activas</option>
                  <option value="VENCIDA">Vencidas</option>
                  <option value="CUMPLIDA">Cumplidas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFiltros({ texto: '', estado: '' });
                  setPage(1);
                }}
                className="h-9 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200"
              >
                <i className="fas fa-undo mr-1" /> Limpiar
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-24">Creada</th>
                      <th className="px-4 py-3 text-center w-24">Bus</th>
                      <th className="px-4 py-3 text-left">Socio</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-right w-24">Monto</th>
                      <th className="px-4 py-3 text-right w-24">Pagado</th>
                      <th className="px-4 py-3 text-right w-24">Saldo</th>
                      <th className="px-4 py-3 text-center w-28">Próxima</th>
                      <th className="px-4 py-3 text-center w-28">Estado</th>
                      <th className="px-4 py-3 text-center w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-400">
                          <i className="fas fa-circle-notch fa-spin text-2xl text-blue-500" />
                          <p className="text-xs font-semibold mt-2">Cargando promesas...</p>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-400">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-3">
                            <i className="fas fa-calendar-times text-2xl" />
                          </div>
                          <p className="text-sm font-bold text-slate-600">No hay promesas registradas</p>
                          <p className="text-xs text-slate-400 mt-1">Cree una promesa individual o masiva para comenzar.</p>
                        </td>
                      </tr>
                    ) : (
                      data.map((p) => {
                        const st = estadoBadge(p);
                        const dias = p.dias_proxima;
                        return (
                          <tr key={p.id_promesa_pago} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-center font-mono text-slate-600">{formatoFecha(p.fecha_creacion)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-blue-50 text-blue-700 font-black font-mono text-[11px] px-2 py-0.5 rounded-md border border-blue-200">
                                {p.disco_buses || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800 truncate max-w-[220px]" title={p.socio_nombre}>
                                {p.socio_nombre || 'Socio sin asignar'}
                              </div>
                              <div className="text-[10px] text-slate-400">{p.per_cedula_personal || ''}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 truncate max-w-[230px]" title={p.concepto}>{p.concepto}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{formatCurrency(p.monto_total)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(p.monto_pagado)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">{formatCurrency(p.saldo)}</td>
                            <td className="px-4 py-3 text-center">
                              {p.proxima_fecha ? (
                                <div>
                                  <div className="font-mono font-bold text-slate-700">{formatoFecha(p.proxima_fecha)}</div>
                                  <div className={`text-[10px] font-semibold ${dias < 0 ? 'text-rose-600' : dias <= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {dias < 0 ? `vencida (${Math.abs(dias)}d)` : dias === 0 ? 'hoy' : `en ${dias}d`}
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                                {st.label}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {p.cuotas_pagadas || 0}/{p.cuotas_total || 0} cuotas
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setVerDetalle(p.id_promesa_pago)}
                                  className="h-7 w-7 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center"
                                  title="Ver detalle"
                                >
                                  <i className="fas fa-eye text-[10px]" />
                                </button>
                                {p.estado === 'ACTIVA' && (
                                  <button
                                    type="button"
                                    onClick={() => handleAnular(p)}
                                    className="h-7 w-7 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center"
                                    title="Anular promesa"
                                  >
                                    <i className="fas fa-ban text-[10px]" />
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

              <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Mostrando <b className="text-slate-700">{data.length}</b> de <b className="text-slate-700">{total}</b> promesas
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
                  >
                    <option value={10}>10 por pág.</option>
                    <option value={25}>25 por pág.</option>
                    <option value={50}>50 por pág.</option>
                    <option value={100}>100 por pág.</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="h-8 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40"
                  >
                    <i className="fas fa-chevron-left mr-1 text-[10px]" /> Anterior
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700 font-mono">Pág. {page} de {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages || loading}
                    className="h-8 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40"
                  >
                    Siguiente <i className="fas fa-chevron-right ml-1 text-[10px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNueva && (
        <NuevaPromesaModal
          initialItem={itemParaCrear}
          modoInicial={modoInicial}
          onClose={() => { setShowNueva(false); setItemParaCrear(null); }}
          onSuccess={() => {
            setShowNueva(false);
            setItemParaCrear(null);
            refrescarTodo();
          }}
        />
      )}

      {verDetalle && (
        <DetallePromesaModal
          idPromesa={verDetalle}
          onClose={() => setVerDetalle(null)}
          onSuccess={refrescarTodo}
        />
      )}
    </div>
  );
};

export default PromesasPagoPage;

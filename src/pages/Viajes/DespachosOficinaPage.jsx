import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../config/axios';
import ViajesService from '../../services/viajes.service';
import { useAuth } from '../../context/AuthContext';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';

const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

const money = (v) => `$${Number(v || 0).toFixed(2)}`;
const num = (v) => Number(v || 0);

const ESTADOS_VIAJE = {
  0: { label: 'No cumple', bg: 'bg-slate-200', text: 'text-slate-700' },
  1: { label: 'En curso', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  2: { label: 'Despachado', bg: 'bg-amber-100', text: 'text-amber-800' },
  3: { label: 'Realizado', bg: 'bg-blue-100', text: 'text-blue-800' },
};

const hoyLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const DespachosOficinaPage = () => {
  const { user } = useAuth();
  const today = useMemo(() => hoyLocal(), []);
  const isAdmin = user?.id_fkrol_usuario == 1 || user?.id_fkrol_usuario == 2 || user?.id_fkrol_usuario == 5
    || user?.id_rol == 1 || user?.id_rol == 2 || user?.id_rol == 5
    || user?.rol == 1 || user?.rol == 2 || user?.rol == 5
    || user?.rol_usuario == 1 || user?.rol_usuario == 2 || user?.rol_usuario == 5;

  const [tab, setTab] = useState('despachos');
  const [filtros, setFiltros] = useState({
    fecha_inicio: today,
    fecha_fin: today,
    id_sucursal: '',
    id_bus: '',
    q: '',
  });
  const [aplicados, setAplicados] = useState(filtros);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState({});
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const [buses, setBuses] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [bRes, sRes] = await Promise.all([
          ViajesService.getBuses(),
          isAdmin ? api.get('/sucursal/sucursalListar') : Promise.resolve(null),
        ]);
        if (bRes?.success) setBuses(bRes.data || []);
        if (sRes?.data) setSucursales(sRes.data.data || []);
      } catch (e) {
        console.error('Error cargando combos de despachos:', e);
      }
    };
    loadCombos();
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...aplicados, page, limit };
      Object.keys(params).forEach((k) => {
        if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
      });
      const res = tab === 'despachos'
        ? await ViajesService.getListadoDespachos(params)
        : await ViajesService.getVentasSinDespacho(params);

      if (res?.success) {
        setData(res.data || []);
        setTotal(res.total || 0);
        setTotales(res.totales || {});
        setConceptos(res.conceptos || []);
        setExpandido(null);
      } else {
        setData([]);
        setTotal(0);
        setTotales({});
        setConceptos([]);
        toast.error(res?.message || res?.error || 'No se pudo cargar el listado');
      }
    } catch (e) {
      console.error('Error cargando listado de despachos:', e);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [aplicados, limit, page, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBuscar = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setAplicados({ ...filtros });
  };

  const handleLimpiar = () => {
    const limpio = { fecha_inicio: today, fecha_fin: today, id_sucursal: '', id_bus: '', q: '' };
    setFiltros(limpio);
    setPage(1);
    setAplicados(limpio);
  };

  const cambiarTab = (nuevo) => {
    if (nuevo === tab) return;
    setTab(nuevo);
    setPage(1);
    setExpandido(null);
  };

  const totalPages = Math.ceil(total / limit);
  const conceptosColumnas = conceptos.map((c) => c.concepto);
  const totalColumnasDespachos = 12 + conceptosColumnas.length;

  const irPagina = (nueva) => {
    if (nueva < 1 || nueva > totalPages || nueva === page) return;
    setPage(nueva);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="h-11 w-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <i className="fas fa-clipboard-check text-lg"></i>
          </div>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Despachos de la Oficina</h1>
            <p className="text-xs font-medium text-slate-500">
              Control de los despachos realizados, con ventas, retenciones y entregas por oficina.
            </p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => cambiarTab('despachos')}
              className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'despachos' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <i className="fas fa-list-ul mr-1.5"></i> Despachos
            </button>
            <button
              type="button"
              onClick={() => cambiarTab('ventas')}
              className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'ventas' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <i className="fas fa-exclamation-triangle mr-1.5"></i> Ventas sin despacho
            </button>
          </div>
        </div>

        {/* Filtros */}
        <form onSubmit={handleBuscar} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <label className={labelCls}>Rango de Fechas</label>
              <DateRangePicker
                startDate={filtros.fecha_inicio}
                endDate={filtros.fecha_fin}
                onChange={({ startDateStr, endDateStr }) => {
                  setFiltros((f) => ({ ...f, fecha_inicio: startDateStr, fecha_fin: endDateStr }));
                }}
              />
            </div>
            {isAdmin && (
              <div className="lg:col-span-2">
                <label className={labelCls}>Oficina</label>
                <SearchableSelect
                  options={sucursales.map((s) => ({ value: String(s.id_sucursal), label: s.nombre_sucursal }))}
                  value={filtros.id_sucursal}
                  onChange={(val) => setFiltros((f) => ({ ...f, id_sucursal: val }))}
                  placeholder="Todas las oficinas"
                />
              </div>
            )}
            <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <label className={labelCls}>Bus</label>
              <SearchableSelect
                options={buses.map((b) => ({
                  value: String(b.id_buses || b.bus_id),
                  label: `${b.disco_buses || b.codigo_buses || ''} ${b.placa_buses ? `(${b.placa_buses})` : ''}`.trim(),
                }))}
                value={filtros.id_bus}
                onChange={(val) => setFiltros((f) => ({ ...f, id_bus: val }))}
                placeholder="Todos los buses"
              />
            </div>
            <div className="lg:col-span-3">
              <label className={labelCls}>{tab === 'despachos' ? 'N° Viaje / Despacho / Ruta / Usuario' : 'N° Viaje / Ruta / Bus / Oficina / Usuario'}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  value={filtros.q}
                  onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Escriba para buscar..."
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
            <div className="lg:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
              >
                <i className="fas fa-search text-xs"></i> BUSCAR
              </button>
              <button
                type="button"
                onClick={handleLimpiar}
                className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
              >
                <i className="fas fa-eraser text-xs"></i>
              </button>
            </div>
          </div>
        </form>

        {tab === 'ventas' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5"></i>
            <div className="text-xs text-amber-900">
              <div className="font-black uppercase tracking-wide text-[10px]">Control de ventas sin despacho</div>
              <div className="mt-0.5">
                Aquí aparecen los boletos vendidos por una oficina/usuario de un viaje en el que esa oficina
                <strong> no registró despacho</strong>. Es el control para detectar ventas de viajes que no salieron
                o que se despacharon desde otra oficina.
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {tab === 'despachos' ? (
            <>
              <ResumenCard label="Despachos" value={num(totales.despachos ?? total)} icon="fa-clipboard-check" color="indigo" />
              <ResumenCard label="Pasajeros" value={num(totales.pasajeros)} icon="fa-users" color="sky" />
              <ResumenCard label="Vendido (oficinas)" value={money(totales.vendido)} icon="fa-cash-register" color="emerald" />
              <ResumenCard label="Total retenido" value={money(totales.retenido)} icon="fa-hand-holding-usd" color="amber" />
              <ResumenCard label="Entrega" value={money(totales.entrega)} icon="fa-money-bill-wave" color="violet" />
            </>
          ) : (
            <>
              <ResumenCard label="Registros" value={num(totales.registros ?? total)} icon="fa-list" color="amber" />
              <ResumenCard label="Pasajeros" value={num(totales.pasajeros)} icon="fa-users" color="sky" />
              <ResumenCard label="Total vendido" value={money(totales.vendido)} icon="fa-cash-register" color="emerald" />
            </>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            {tab === 'despachos' ? (
              <table className="w-full text-left border-collapse min-w-[1500px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-3 py-3 text-center whitespace-nowrap">Fecha / Hora</th>
                    <th className="px-3 py-3 text-center">N° Viaje</th>
                    <th className="px-3 py-3 text-center">N° Despacho</th>
                    <th className="px-3 py-3 text-center">Bus</th>
                    <th className="px-3 py-3 text-left">Oficina</th>
                    <th className="px-3 py-3 text-left">Usuario</th>
                    <th className="px-3 py-3 text-center">Pasaj.</th>
                    <th className="px-3 py-3 text-right">Vendido oficina</th>
                    {conceptosColumnas.map((concepto) => (
                      <th key={concepto} className="px-3 py-3 text-right whitespace-nowrap" title={concepto}>
                        {concepto}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right">Total retenido</th>
                    <th className="px-3 py-3 text-right">Entrega</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-2 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={totalColumnasDespachos} className="text-center py-12 text-slate-400">
                        <i className="fas fa-spinner fa-spin mr-2"></i>Cargando despachos...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={totalColumnasDespachos} className="text-center py-12 text-slate-400 font-bold">
                        No hay despachos para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    data.map((d) => {
                      const abierto = expandido === d.id_despacho_viaje;
                      return (
                        <Fragment key={d.id_despacho_viaje}>
                          <tr className={`transition-colors ${abierto ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                              <div>{d.fecha_despacho || d.fecha_viaje || '-'}</div>
                              <div className="text-indigo-600 font-black">{d.hora_despacho || d.hora_viaje || ''}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700">#{d.id_viajes}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-bold text-amber-700 text-[11px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                #{d.id_despacho_viaje}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-700">
                              <div>{d.disco_buses || '-'}</div>
                              <div className="text-[9px] text-slate-400">{d.placa_buses || ''}</div>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700">
                              {d.oficina_nombre || <span className="text-slate-300">Sin oficina</span>}
                            </td>
                            <td className="px-3 py-2.5 text-[11px]">
                              <div className="font-semibold text-slate-700">{d.usuario_despacho || d.username_usuario || 'Sistema'}</div>
                              <div className="text-[9px] text-slate-400">{d.username_usuario || ''}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-black text-slate-700">{d.pasajeros}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-700">{money(d.total_vendido)}</td>
                            {conceptosColumnas.map((concepto) => (
                              <td key={concepto} className="px-3 py-2.5 text-right text-[11px] font-semibold text-rose-700">
                                {money(d.conceptos?.[concepto] || 0)}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-bold text-rose-700">{money(d.total_retenido)}</td>
                            <td className="px-3 py-2.5 text-right font-black text-emerald-700">{money(d.entrega)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800">
                                Despachado
                              </span>
                              {d.es_automatico && (
                                <span
                                  className="ml-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-800"
                                  title="Despacho generado automáticamente por el sistema"
                                >
                                  <i className="fas fa-robot mr-1" style={{ fontSize: 8 }}></i>Auto
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandido(abierto ? null : d.id_despacho_viaje)}
                                className="w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                                title={abierto ? 'Ocultar detalle' : 'Ver detalle'}
                              >
                                <i className={`fas ${abierto ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}></i>
                              </button>
                            </td>
                          </tr>
                          {abierto && (
                            <tr key={`${d.id_despacho_viaje}-detalle`} className="bg-indigo-50/40">
                              <td colSpan={totalColumnasDespachos} className="px-4 py-3">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-[11px] space-y-1">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Datos del despacho</div>
                                    <div className="text-[10px] text-slate-500 italic mb-1">Ventas de la oficina que realizó el despacho.</div>
                                    <div><span className="font-bold text-slate-500">Ruta:</span> {d.nombre_rutas || '-'}</div>
                                    <div><span className="font-bold text-slate-500">Chofer:</span> {d.chofer || 'Sin asignar'}</div>
                                    <div><span className="font-bold text-slate-500">Motivo:</span> {d.motivo_despacho_viaje || '-'}</div>
                                    <div>
                                      <span className="font-bold text-slate-500">Origen del despacho:</span>{' '}
                                      {d.es_automatico ? (
                                        <span className="font-bold text-sky-700">Automático (sistema)</span>
                                      ) : (
                                        <span className="font-semibold text-slate-600">Manual (oficinista)</span>
                                      )}
                                    </div>
                                    <div><span className="font-bold text-slate-500">Salida viaje:</span> {d.fecha_viaje || '-'} {d.hora_viaje || ''}</div>
                                    <div><span className="font-bold text-slate-500">Registro despacho:</span> {d.fecha_despacho || '-'} {d.hora_despacho || ''}</div>
                                  </div>
                                  <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                      Retenciones aplicadas
                                    </div>
                                    {Object.keys(d.conceptos || {}).length === 0 ? (
                                      <div className="px-3 py-4 text-[11px] text-slate-400 italic">Sin retenciones registradas para este despacho.</div>
                                    ) : (
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="text-slate-400 text-[9px] uppercase">
                                            <th className="text-left px-3 py-1.5">Concepto</th>
                                            <th className="text-right px-3 py-1.5">Monto</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {Object.entries(d.conceptos).map(([concepto, monto]) => (
                                            <tr key={concepto}>
                                              <td className="px-3 py-1.5 font-semibold text-slate-700">{concepto}</td>
                                              <td className="px-3 py-1.5 text-right font-bold text-rose-700">{money(monto)}</td>
                                            </tr>
                                          ))}
                                          <tr className="bg-slate-50">
                                            <td className="px-3 py-1.5 font-black text-slate-700">Total retenido</td>
                                            <td className="px-3 py-1.5 text-right font-black text-rose-700">{money(d.total_retenido)}</td>
                                          </tr>
                                          <tr className="bg-emerald-50">
                                            <td className="px-3 py-1.5 font-black text-emerald-800">Entrega</td>
                                            <td className="px-3 py-1.5 text-right font-black text-emerald-700">{money(d.entrega)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black">
                      <td colSpan={7} className="px-3 py-2.5 text-right uppercase tracking-widest">
                        Totales ({num(totales.despachos ?? total)} despachos)
                      </td>
                      <td className="px-3 py-2.5 text-right">{money(totales.vendido)}</td>
                      {conceptos.map((c) => (
                        <td key={c.concepto} className="px-3 py-2.5 text-right text-rose-700">{money(c.monto)}</td>
                      ))}
                      <td className="px-3 py-2.5 text-right text-rose-700">{money(totales.retenido)}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">{money(totales.entrega)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-3 py-3 text-center whitespace-nowrap">Fecha / Hora</th>
                    <th className="px-3 py-3 text-center">N° Viaje</th>
                    <th className="px-3 py-3 text-left">Ruta</th>
                    <th className="px-3 py-3 text-center">Bus</th>
                    <th className="px-3 py-3 text-left">Oficina</th>
                    <th className="px-3 py-3 text-left">Usuario(s)</th>
                    <th className="px-3 py-3 text-center">Pasaj.</th>
                    <th className="px-3 py-3 text-right">Total vendido</th>
                    <th className="px-3 py-3 text-center">Estado viaje</th>
                    <th className="px-3 py-3 text-center">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        <i className="fas fa-spinner fa-spin mr-2"></i>Cargando ventas...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400 font-bold">
                        No hay ventas sin despacho para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    data.map((v) => {
                      const estado = ESTADOS_VIAJE[Number(v.estado_viajes)] || { label: v.estado_viajes, bg: 'bg-slate-100', text: 'text-slate-600' };
                      return (
                        <tr key={`${v.id_viajes}-${v.oficina_id || 0}`} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                            <div>{v.fecha_viaje || '-'}</div>
                            <div className="text-indigo-600 font-black">{v.hora_viaje || ''}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">#{v.id_viajes}</td>
                          <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700">{v.nombre_rutas || '-'}</td>
                          <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-700">
                            <div>{v.disco_buses || '-'}</div>
                            <div className="text-[9px] text-slate-400">{v.placa_buses || ''}</div>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700">
                            {v.oficina_nombre || <span className="text-slate-300">Sin oficina</span>}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600">{v.usuarios || '-'}</td>
                          <td className="px-3 py-2.5 text-center font-black text-slate-700">{v.pasajeros}</td>
                          <td className="px-3 py-2.5 text-right font-black text-amber-700">{money(v.total_vendido)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black ${estado.bg} ${estado.text}`}>
                              {estado.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700">
                              <i className="fas fa-ban text-[8px]"></i> Sin despacho
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black">
                      <td colSpan={6} className="px-3 py-2.5 text-right uppercase tracking-widest">
                        Totales ({num(totales.registros ?? total)} registros)
                      </td>
                      <td className="px-3 py-2.5 text-center">{num(totales.pasajeros)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-700">{money(totales.vendido)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {total} registro(s) · página {page} de {Math.max(totalPages, 1)}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => irPagina(page - 1)}
                disabled={page <= 1}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40 hover:bg-slate-100"
              >
                <i className="fas fa-chevron-left mr-1"></i> Anterior
              </button>
              <button
                type="button"
                onClick={() => irPagina(page + 1)}
                disabled={page >= totalPages}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40 hover:bg-slate-100"
              >
                Siguiente <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const COLORES = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
};

const ResumenCard = ({ label, value, icon, color }) => (
  <div className={`rounded-2xl border px-4 py-3 shadow-sm ${COLORES[color] || COLORES.indigo}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
      <i className={`fas ${icon} text-xs opacity-70`}></i>
    </div>
    <div className="text-lg font-black mt-1">{value}</div>
  </div>
);

export default DespachosOficinaPage;

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../config/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2ecc71', '#e74c3c', '#f1c40f', '#95a5a6', '#34495e', '#1abc9c', '#9b59b6', '#f39c12', '#d35400'];
const CHART_COLORS = ['#3498db', '#e67e22'];

const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

export const EstadisticasPage = () => {
  const [modo, setModo] = useState('boletos');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return formatDate(d);
  });
  const [fechaHasta, setFechaHasta] = useState(() => formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/metricas', {
        params: { tipo: modo, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }
      });
      if (res.data.success) setData(res.data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  }, [modo, fechaDesde, fechaHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const btnCls = (activo) =>
    `px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all border ${activo ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`;

  return (
    <div className="flex flex-col h-full gap-0 bg-slate-100/50">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
              <i className="fas fa-chart-bar text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Estadísticas</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dashboard gerencial</p>
            </div>
          </div>
          <button onClick={cargar} disabled={loading}
            className="h-8 px-4 flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all text-[10px] font-bold">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            ACTUALIZAR
          </button>
        </div>
        {/* FILTROS + MODO */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Desde</span>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className="h-8 px-2 text-[11px] border border-slate-200 rounded-lg bg-white font-bold text-slate-700" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hasta</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className="h-8 px-2 text-[11px] border border-slate-200 rounded-lg bg-white font-bold text-slate-700" />
            </div>
            <button onClick={cargar} disabled={loading}
              className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 uppercase tracking-widest shadow-sm">
              <i className="fas fa-search"></i>CONSULTAR
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModo('boletos')} className={btnCls(modo === 'boletos')}>
              <i className="fas fa-ticket-alt mr-1.5"></i>PASAJES
            </button>
            <button onClick={() => setModo('guias')} className={btnCls(modo === 'guias')}>
              <i className="fas fa-shipping-fast mr-1.5"></i>ENCOMIENDAS
            </button>
          </div>
        </div>
      </div>

      {/* CUERPO */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* RESUMEN */}
            {data?.resumen && (
              <div className="flex gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <i className="fas fa-dollar-sign"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventas Hoy</p>
                    <p className="text-xl font-black text-slate-800">${parseFloat(data.resumen.ventas_hoy || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <i className="fas fa-ticket-alt"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tickets Hoy</p>
                    <p className="text-xl font-black text-slate-800">{data.resumen.tickets_hoy || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Evolución de Ingresos */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 col-span-1 xl:col-span-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">
                  <i className="fas fa-chart-line mr-2 text-blue-500"></i>
                  Evolución de Ingresos ($)
                </h3>
                <div className="h-72">
                  {data?.ventasSemana?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.ventasSemana} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={v => v?.split('-')[2] + '/' + v?.split('-')[1]} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => `$${parseFloat(v).toFixed(2)}`} />
                        <Bar dataKey="total" fill={CHART_COLORS[modo === 'boletos' ? 0 : 1]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">Sin datos</div>
                  )}
                </div>
              </div>

              {/* Distribución por Estado SRI */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">
                  <i className="fas fa-chart-pie mr-2 text-emerald-500"></i>
                  Distribución por Estado
                </h3>
                <div className="h-64">
                  {data?.estadosSri?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.estadosSri} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label={({ estado, percent }) => `${(percent * 100).toFixed(0)}%`}>
                          {data.estadosSri.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">Sin datos</div>
                  )}
                </div>
              </div>

              {/* Top Destinos */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">
                  <i className="fas fa-map-marker-alt mr-2 text-rose-500"></i>
                  Top {data?.ventasDestino?.length || 5} Destinos
                </h3>
                <div className="h-64">
                  {data?.ventasDestino?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.ventasDestino} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, percent }) => `${(percent * 100).toFixed(0)}%`}>
                          {data.ventasDestino.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `$${parseFloat(v).toFixed(2)}`} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">Sin datos</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../config/axios';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PALETTE = {
  blue: ['#3b82f6', '#1d4ed8'],
  emerald: ['#10b981', '#047857'],
  amber: ['#f59e0b', '#b45309'],
  rose: ['#f43f5e', '#be123c'],
  purple: ['#8b5cf6', '#6d28d9'],
  cyan: ['#06b6d4', '#0e7490'],
  indigo: ['#6366f1', '#4338ca'],
};

const DONUT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', 
  '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
];

const SRI_COLOR_MAP = {
  'AUTORIZADO': '#10b981',
  'EN PROCESO': '#3b82f6',
  'PROCESAMIENTO': '#3b82f6',
  'PENDIENTE': '#f59e0b',
  'DEVUELTA': '#f43f5e',
  'NO AUTORIZADO': '#ef4444',
  'RECHAZADO': '#dc2626',
  'DESCONOCIDO': '#94a3b8'
};

const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

// Custom Tooltip estilizado
const CustomTooltip = ({ active, payload, label, prefix = '$' }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/60 text-xs">
        <p className="text-slate-400 font-semibold text-[10px] mb-1">{label || data.name}</p>
        <p className="font-extrabold text-sm text-emerald-400 flex items-center gap-1">
          <span>{prefix}{parseFloat(data.value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  }
  return null;
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

  // Presets de fechas
  const setPreset = (dias) => {
    const d = new Date();
    if (dias === 'mes') {
      const primero = new Date(d.getFullYear(), d.getMonth(), 1);
      setFechaDesde(formatDate(primero));
      setFechaHasta(formatDate(d));
    } else {
      d.setDate(d.getDate() - dias);
      setFechaDesde(formatDate(d));
      setFechaHasta(formatDate(new Date()));
    }
  };

  // Métricas agregadas
  const metricasPeriodo = useMemo(() => {
    if (!data?.ventasSemana || data.ventasSemana.length === 0) {
      return { totalPeriodo: 0, promedioDiario: 0, diasActivos: 0, maxVentaDia: 0 };
    }
    const total = data.ventasSemana.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const dias = data.ventasSemana.filter(d => d.total > 0).length || 1;
    const max = Math.max(...data.ventasSemana.map(d => d.total || 0), 0);
    return {
      totalPeriodo: total,
      promedioDiario: total / dias,
      diasActivos: dias,
      maxVentaDia: max
    };
  }, [data]);

  const totalVentasDestinos = useMemo(() => {
    if (!data?.ventasDestino) return 0;
    return data.ventasDestino.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [data]);

  return (
    <div className="flex flex-col h-full gap-0 bg-slate-50/70 overflow-auto">
      {/* HEADER ELEGANTE */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs shrink-0 sticky top-0 z-20">
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <i className="fas fa-chart-line text-sm"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">Dashboard Estadístico</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {modo === 'boletos' ? 'Boletería' : 'Encomiendas'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Monitoreo de ingresos, volumen y rutas principales</p>
            </div>
          </div>

          {/* Selector de modo */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setModo('boletos')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                modo === 'boletos'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-ticket-alt text-[11px]"></i> Pasajes
            </button>
            <button
              onClick={() => setModo('guias')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                modo === 'guias'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-box text-[11px]"></i> Encomiendas
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS Y PRESETS */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-slate-50/70 border-t border-slate-100 text-xs gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Rango:</span>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[10px]">Desde</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="font-bold text-slate-700 bg-transparent outline-hidden text-[11px]"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 text-[10px]">Hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="font-bold text-slate-700 bg-transparent outline-hidden text-[11px]"
              />
            </div>
            <button
              onClick={cargar}
              disabled={loading}
              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer text-[11px]"
            >
              <i className={`fas fa-search text-[10px] ${loading ? 'fa-spin' : ''}`}></i> Consultar
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Preajustes:</span>
            <button
              onClick={() => setPreset(7)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
            >
              7 Días
            </button>
            <button
              onClick={() => setPreset(30)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
            >
              30 Días
            </button>
            <button
              onClick={() => setPreset('mes')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
            >
              Este Mes
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center h-80 gap-3">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-500">Cargando métricas y estadísticas...</span>
          </div>
        ) : (
          <>
            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ventas Hoy */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
                    <i className="fas fa-dollar-sign text-sm"></i>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas de Hoy</span>
                </div>
                <div className="relative z-10 flex items-baseline justify-between">
                  <h3 className="text-2xl font-black text-slate-800">
                    ${parseFloat(data?.resumen?.ventas_hoy || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    En vivo
                  </span>
                </div>
              </div>

              {/* Tickets / Boletos Hoy */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <i className="fas fa-ticket-alt text-sm"></i>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {modo === 'boletos' ? 'Pasajes Hoy' : 'Guías Hoy'}
                  </span>
                </div>
                <div className="relative z-10 flex items-baseline justify-between">
                  <h3 className="text-2xl font-black text-slate-800">
                    {(data?.resumen?.tickets_hoy || 0).toLocaleString()}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">comprobantes</span>
                </div>
              </div>

              {/* Total Período */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                    <i className="fas fa-coins text-sm"></i>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Período</span>
                </div>
                <div className="relative z-10 flex items-baseline justify-between">
                  <h3 className="text-2xl font-black text-slate-800">
                    ${metricasPeriodo.totalPeriodo.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {metricasPeriodo.diasActivos} días
                  </span>
                </div>
              </div>

              {/* Promedio Diario */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <i className="fas fa-calculator text-sm"></i>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promedio Diario</span>
                </div>
                <div className="relative z-10 flex items-baseline justify-between">
                  <h3 className="text-2xl font-black text-slate-800">
                    ${metricasPeriodo.promedioDiario.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">por día activo</span>
                </div>
              </div>
            </div>

            {/* GRÁFICO PRINCIPAL: EVOLUCIÓN DE INGRESOS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Evolución Diaria de Ventas ($)
                  </h3>
                  <p className="text-[11px] text-slate-400">Ingresos recaudados día a día en el período seleccionado</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400">Pico Máximo: </span>
                  <span className="text-xs font-black text-blue-600">
                    ${metricasPeriodo.maxVentaDia.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                {data?.ventasSemana && data.ventasSemana.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.ventasSemana} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        tickFormatter={v => {
                          if (!v) return '';
                          const parts = v.split('-');
                          return `${parts[2]}/${parts[1]}`;
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        tickFormatter={v => `$${v}`}
                      />
                      <Tooltip content={<CustomTooltip prefix="$" />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <i className="fas fa-chart-area text-3xl text-slate-300"></i>
                    <span className="text-xs font-semibold">Sin datos registrados en este rango de fechas</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN INFERIOR: TOP DESTINOS + ESTADO SRI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* TOP DESTINOS (7 COLUMNAS) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <i className="fas fa-map-marked-alt text-rose-500"></i>
                      Top Destinos Principales
                    </h3>
                    <p className="text-[11px] text-slate-400">Rutas con mayor volumen de recaudación</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Total: ${totalVentasDestinos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {data?.ventasDestino && data.ventasDestino.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
                    {/* Donut Chart */}
                    <div className="sm:col-span-5 h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.ventasDestino}
                            dataKey="total"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                          >
                            {data.ventasDestino.map((_, i) => (
                              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip prefix="$" />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Destinos</span>
                        <span className="text-base font-black text-slate-800">{data.ventasDestino.length}</span>
                      </div>
                    </div>

                    {/* Ranking List */}
                    <div className="sm:col-span-7 space-y-2.5">
                      {data.ventasDestino.map((item, idx) => {
                        const pct = totalVentasDestinos > 0 ? ((item.total / totalVentasDestinos) * 100) : 0;
                        const color = DONUT_COLORS[idx % DONUT_COLORS.length];
                        return (
                          <div key={idx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span className="flex items-center gap-2 text-slate-700 truncate max-w-[180px]">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                <span className="truncate">{item.label}</span>
                              </span>
                              <span className="text-slate-900 font-mono">
                                ${parseFloat(item.total).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-[10px] font-normal text-slate-400 ml-1">({pct.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400 gap-2">
                    <i className="fas fa-map-marker-alt text-3xl text-slate-300"></i>
                    <span className="text-xs font-semibold">Sin información de destinos en este período</span>
                  </div>
                )}
              </div>

              {/* ESTADO DE AUTORIZACIÓN SRI (5 COLUMNAS) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-shield-alt text-emerald-500"></i>
                    Estado SRI / Operativo
                  </h3>
                  <p className="text-[11px] text-slate-400">Distribución de documentos electrónicos</p>
                </div>

                {data?.estadosSri && data.estadosSri.length > 0 ? (
                  <div className="flex flex-col justify-between flex-1">
                    <div className="h-48 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.estadosSri}
                            dataKey="cantidad"
                            nameKey="estado"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {data.estadosSri.map((entry, i) => {
                              const color = SRI_COLOR_MAP[entry.estado?.toUpperCase()] || DONUT_COLORS[(i + 4) % DONUT_COLORS.length];
                              return <Cell key={i} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip content={<CustomTooltip prefix="" />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Leyenda y badges */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {data.estadosSri.map((item, idx) => {
                        const color = SRI_COLOR_MAP[item.estado?.toUpperCase()] || DONUT_COLORS[(idx + 4) % DONUT_COLORS.length];
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                            <span className="flex items-center gap-1.5 text-slate-600 truncate text-[11px] font-semibold">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                              <span className="truncate">{item.estado}</span>
                            </span>
                            <span className="font-bold text-slate-800 font-mono text-[11px]">{item.cantidad}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400 gap-2">
                    <i className="fas fa-file-invoice text-3xl text-slate-300"></i>
                    <span className="text-xs font-semibold">Sin datos de estado</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
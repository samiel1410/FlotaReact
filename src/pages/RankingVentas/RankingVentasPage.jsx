import { useState, useEffect, useCallback } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';

const MESES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i);

export const RankingVentasPage = () => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [sucursales, setSucursales] = useState([]);
  const [idSucursal, setIdSucursal] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Cargar sucursales para el filtro
  useEffect(() => {
    api.get('/sucursal/comboSucursal').then(res => {
      if (res.data?.success && res.data?.data) {
        setSucursales(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const cargarRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = { mes, anio };
      if (idSucursal) params.id_sucursal = idSucursal;

      const res = await api.get('/reportes/rankingVentas', { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        toast.error(res.data?.mensaje || 'Error al cargar ranking');
      }
    } catch (err) {
      console.error('Error cargando ranking:', err);
      toast.error('Error de conexión al cargar ranking');
    } finally {
      setLoading(false);
    }
  }, [mes, anio, idSucursal]);

  useEffect(() => {
    cargarRanking();
  }, [cargarRanking]);

  const abrirPDF = () => {
    const params = new URLSearchParams({ mes, anio });
    if (idSucursal) params.set('id_sucursal', idSucursal);
    window.open(`/reportes/rankingVentasPdf?${params.toString()}`, '_blank');
  };

  const formatMoney = (val) => {
    return `$${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Tabla de ranking
  const TablaRanking = ({ titulo, icono, datos, total, colorHeader, colorBg }) => {
    if (!datos || datos.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`px-5 py-4 flex items-center gap-3 ${colorHeader}`}>
            <span className="text-xl">{icono}</span>
            <h3 className="text-base font-black text-white uppercase tracking-tight">{titulo}</h3>
          </div>
          <div className="p-8 text-center text-slate-400">
            <i className="fas fa-inbox text-3xl mb-3 opacity-30"></i>
            <p className="font-medium">Sin datos para este período</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`px-5 py-4 flex items-center justify-between ${colorHeader}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{icono}</span>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">{titulo}</h3>
              <p className="text-[10px] text-white/70 font-medium">{datos.length} oficinistas</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-white">{formatMoney(total)}</p>
            <p className="text-[9px] text-white/70 uppercase tracking-wider font-bold">Total</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Oficinista</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Cantidad</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vendido</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.map((row, i) => {
                const porcentaje = total > 0 ? ((parseFloat(row.total_vendido) / total) * 100) : 0;
                return (
                  <tr key={row.id_usuario} className={`hover:bg-slate-50/50 transition-colors ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-100 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'text-slate-400'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          i === 0 ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {(row.nombre_usuario || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm ${i === 0 ? 'font-black text-amber-900' : 'font-semibold text-slate-700'}`}>
                            {row.nombre_usuario || 'Sin nombre'}
                            {i === 0 && <span className="ml-1.5 text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">LÍDER</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-slate-600">{row.cantidad}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-black ${i === 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                        {formatMoney(row.total_vendido)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              i === 0 ? 'bg-amber-500' : i <= 3 ? 'bg-blue-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                          {porcentaje.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan="2" className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                  {datos.reduce((s, r) => s + parseInt(r.cantidad), 0)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{formatMoney(total)}</td>
                <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-100/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <i className="fas fa-trophy text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Ranking de Ventas</h1>
              <p className="text-sm font-medium text-slate-500">
                Rendimiento de oficinistas por mes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro Mes */}
            <div className="relative">
              <i className="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro Año */}
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
            >
              {ANIOS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Filtro Sucursal */}
            <div className="relative">
              <i className="fas fa-building absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Todas las oficinas</option>
                {sucursales.map(s => (
                  <option key={s.suc_codigo_sucursal || s.id_sucursal} value={s.suc_codigo_sucursal || s.id_sucursal}>
                    {s.nombre_sucursal}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón PDF */}
            <button
              onClick={abrirPDF}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm font-bold rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all shadow-sm shadow-rose-200 flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-file-pdf"></i>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Info del período */}
      {data && (
        <div className="px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <i className="fas fa-calendar-check text-indigo-500"></i>
              <span className="font-medium">
                Período: <strong className="text-slate-700">{data.nombre_mes} {data.anio}</strong>
              </span>
              <span className="text-slate-300 mx-1">|</span>
              <i className="fas fa-map-marker-alt text-indigo-500"></i>
              <span className="font-medium">
                Oficina: <strong className="text-slate-700">{data.sucursal}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="fas fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
              <span className="text-slate-500 font-medium">Cargando ranking de ventas...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TablaRanking
                titulo="Boletería"
                icono="🎫"
                datos={data?.boleteria}
                total={data?.total_boleteria || 0}
                colorHeader="bg-gradient-to-r from-blue-600 to-blue-500"
                colorBg="blue"
              />
              <TablaRanking
                titulo="Encomiendas (Guías)"
                icono="📦"
                datos={data?.guias}
                total={data?.total_guias || 0}
                colorHeader="bg-gradient-to-r from-emerald-600 to-emerald-500"
                colorBg="emerald"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

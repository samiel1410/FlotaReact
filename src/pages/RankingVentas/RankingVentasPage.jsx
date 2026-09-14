import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import { reportesService } from '../../services/reportes.service';

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
  const [pdfGenerando, setPdfGenerando] = useState(false);
  const [data, setData] = useState(null);

  // Estado del Modal de Detalles
  const [modalData, setModalData] = useState({
    isOpen: false,
    tipo: '',
    titulo: '',
    subtitulo: '',
    colorHeader: '',
    itemData: null,
    detalles: [],
    loading: false,
    busqueda: ''
  });

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

  // Abrir modal y cargar los detalles
  const abrirModalDetalle = async (tipo, row, titulo, colorHeader) => {
    const nombreItem = row.nombre_usuario || row.nombre_destino || 'Seleccionado';
    setModalData({
      isOpen: true,
      tipo,
      titulo: `${titulo}: ${nombreItem}`,
      subtitulo: `Período: ${data?.nombre_mes || mes} ${anio} | ${data?.sucursal || 'Todas las oficinas'}`,
      colorHeader,
      itemData: row,
      detalles: [],
      loading: true,
      busqueda: ''
    });

    try {
      const params = {
        mes,
        anio,
        tipo,
        id_sucursal: idSucursal || undefined,
        id_usuario: row.id_usuario,
        nombre_destino: row.nombre_destino
      };

      const res = await api.get('/reportes/rankingDetalle', { params });
      if (res.data?.success) {
        setModalData(prev => ({
          ...prev,
          detalles: res.data.data || [],
          loading: false
        }));
      } else {
        toast.error(res.data?.mensaje || 'Error al obtener detalles');
        setModalData(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Error al cargar detalle del ranking:', err);
      toast.error('Error de conexión al obtener detalles');
      setModalData(prev => ({ ...prev, loading: false }));
    }
  };

  const cerrarModal = () => {
    setModalData(prev => ({ ...prev, isOpen: false }));
  };

  const descargarPDF = async () => {
    if (pdfGenerando) return;
    setPdfGenerando(true);
    const toastId = toast.loading('Generando PDF del ranking...');
    try {
      const params = { mes, anio };
      if (idSucursal) params.id_sucursal = idSucursal;

      const res = await api.get('/reportes/rankingVentasPdf', { params, responseType: 'text' });
      const html = typeof res.data === 'string' ? res.data : res.data?.data || '';

      if (!html) {
        toast.error('No se pudo obtener el reporte', { id: toastId });
        setPdfGenerando(false);
        return;
      }

      await reportesService.generatePdfFromHtml(html, `Ranking_Ventas_${mes}_${anio}`);
      toast.success('PDF descargado correctamente', { id: toastId });
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar PDF', { id: toastId });
    }
    setPdfGenerando(false);
  };

  const formatMoney = (val) => {
    return `$${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filtrado de registros en el modal
  const detallesFiltrados = useMemo(() => {
    if (!modalData.detalles || modalData.detalles.length === 0) return [];
    if (!modalData.busqueda.trim()) return modalData.detalles;

    const term = modalData.busqueda.toLowerCase().trim();
    return modalData.detalles.filter(item => {
      return (
        String(item.id_viaje || '').toLowerCase().includes(term) ||
        String(item.id_boleto || '').toLowerCase().includes(term) ||
        String(item.numero_guia || item.id_guia || '').toLowerCase().includes(term) ||
        String(item.cliente || item.clientes || '').toLowerCase().includes(term) ||
        String(item.remitente_guia || '').toLowerCase().includes(term) ||
        String(item.destinatario_guia || '').toLowerCase().includes(term) ||
        String(item.identificacion || '').toLowerCase().includes(term) ||
        String(item.asiento || item.asientos || '').toLowerCase().includes(term) ||
        String(item.destino || '').toLowerCase().includes(term) ||
        String(item.nombre_usuario || '').toLowerCase().includes(term) ||
        String(item.nombre_sucursal || '').toLowerCase().includes(term)
      );
    });
  }, [modalData.detalles, modalData.busqueda]);

  const totalFiltradoModal = useMemo(() => {
    return detallesFiltrados.reduce((s, r) => s + parseFloat(r.total || r.total_boleto || r.total_guia || 0), 0);
  }, [detallesFiltrados]);

  // Tabla de ranking
  const TablaRanking = ({ titulo, tipoRanking, datos, total, colorHeader, colName = "Oficinista" }) => {
    if (!datos || datos.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`px-5 py-4 flex items-center gap-3 ${colorHeader}`}>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className={`px-5 py-4 flex items-center justify-between ${colorHeader}`}>
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">{titulo}</h3>
                <p className="text-[10px] text-white/80 font-medium">{datos.length} {colName.toLowerCase()}s &bull; <span className="underline decoration-dotted cursor-default">Clic en una fila para ver detalles</span></p>
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
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{colName}</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Cantidad</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vendido</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">%</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((row, i) => {
                  const valorVendido = parseFloat(row.total_vendido || 0);
                  const porcentaje = total > 0 ? ((valorVendido / total) * 100) : 0;
                  return (
                    <tr
                      key={row.id_usuario || row.nombre_destino || i}
                      onClick={() => abrirModalDetalle(tipoRanking, row, titulo, colorHeader)}
                      className={`group hover:bg-indigo-50/70 cursor-pointer transition-all duration-150 ${i === 0 ? 'bg-amber-50/40' : ''}`}
                      title="Haga clic para ver el desglose completo de ventas"
                    >
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-slate-100 text-slate-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'text-slate-400'
                        }`}>
                          {i === 0 ? '1°' : i === 1 ? '2°' : i === 2 ? '3°' : i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-transform group-hover:scale-105 ${
                            i === 0 ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {(row.nombre_usuario || row.nombre_destino || '?')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className={`text-sm group-hover:text-indigo-600 transition-colors ${i === 0 ? 'font-black text-amber-900' : 'font-semibold text-slate-700'}`}>
                              {row.nombre_usuario || row.nombre_destino || 'Sin nombre'}
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
                      <td className="px-3 py-3 text-center">
                        <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <i className="fas fa-search-plus text-xs"></i>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan="2" className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                    {datos.reduce((s, r) => s + parseInt(r.cantidad || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{formatMoney(total)}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
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
                Rendimiento de oficinistas y destinos por mes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro Mes */}
            <div className="relative">
              <i className="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
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
              <i className="fas fa-building absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
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
              onClick={descargarPDF}
              disabled={loading || pdfGenerando}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm font-bold rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all shadow-sm shadow-rose-200 flex items-center gap-2 disabled:opacity-50"
            >
              {pdfGenerando ? (
                <><i className="fas fa-spinner fa-spin"></i> Generando PDF...</>
              ) : (
                <><i className="fas fa-file-pdf"></i> PDF</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info del período */}
      {data && (
        <div className="px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
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
            <div className="text-xs text-slate-400 font-medium italic">
              * Haz clic sobre cualquier fila para ver el listado detallado de boletos o guías
            </div>
          </div>
        </div>
      )}

      {/* Contenido de Rankings */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="fas fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
              <span className="text-slate-500 font-medium">Cargando ranking de ventas...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TablaRanking
                  titulo="Boletería"
                  tipoRanking="boleteria_usuario"
                  datos={data?.boleteria}
                  total={data?.total_boleteria || 0}
                  colorHeader="bg-gradient-to-r from-blue-600 to-blue-500"
                  colName="Oficinista"
                />
                <TablaRanking
                  titulo="Encomiendas (Guías)"
                  tipoRanking="guias_usuario"
                  datos={data?.guias}
                  total={data?.total_guias || 0}
                  colorHeader="bg-gradient-to-r from-emerald-600 to-emerald-500"
                  colName="Oficinista"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TablaRanking
                  titulo="Ranking Destinos Boletería"
                  tipoRanking="destinos_boleteria"
                  datos={data?.destinosBoleteria}
                  total={data?.total_boleteria || 0}
                  colorHeader="bg-gradient-to-r from-indigo-600 to-indigo-500"
                  colName="Destino"
                />
                <TablaRanking
                  titulo="Ranking Destinos Guías"
                  tipoRanking="destinos_guias"
                  datos={data?.destinosGuias}
                  total={data?.total_guias || 0}
                  colorHeader="bg-gradient-to-r from-cyan-600 to-cyan-500"
                  colName="Destino"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {modalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className={`px-6 py-4 flex items-center justify-between text-white ${modalData.colorHeader}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/20 rounded-lg text-sm">
                    <i className="fas fa-list-alt"></i>
                  </span>
                  <h3 className="text-lg font-black tracking-tight">{modalData.titulo}</h3>
                </div>
                <p className="text-xs text-white/80 mt-1">{modalData.subtitulo}</p>
              </div>
              <button
                onClick={cerrarModal}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Subheader / Search and KPIs */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Buscar por N° Viaje, Boleto, Guía, Pasajero, Asiento, Cédula..."
                  value={modalData.busqueda}
                  onChange={(e) => setModalData(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
                {modalData.busqueda && (
                  <button
                    onClick={() => setModalData(prev => ({ ...prev, busqueda: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-500 font-medium">Registros: </span>
                  <strong className="text-slate-800 font-bold">{detallesFiltrados.length}</strong>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs text-emerald-800">
                  <span className="font-medium">Total Filtrado: </span>
                  <strong className="font-black">{formatMoney(totalFiltradoModal)}</strong>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalData.loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-3"></i>
                  <p className="text-sm font-medium">Cargando registros detallados...</p>
                </div>
              ) : detallesFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <i className="fas fa-search text-3xl mb-3 opacity-30"></i>
                  <p className="font-medium text-sm">No se encontraron registros para la búsqueda</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2.5 text-center w-10">#</th>
                        <th className="px-3 py-2.5">Fecha</th>
                        {modalData.tipo.includes('boleteria') && (
                          <>
                            <th className="px-3 py-2.5">N° Boleto</th>
                            <th className="px-3 py-2.5">N° VIAJE</th>
                            <th className="px-3 py-2.5">Asiento(s)</th>
                            <th className="px-3 py-2.5">Pasajero / Cliente</th>
                            <th className="px-3 py-2.5">Destino</th>
                          </>
                        )}
                        {modalData.tipo.includes('guias') && (
                          <>
                            <th className="px-3 py-2.5">N° Guía</th>
                            <th className="px-3 py-2.5">Remitente</th>
                            <th className="px-3 py-2.5">Destinatario</th>
                            <th className="px-3 py-2.5">Destino</th>
                          </>
                        )}
                        <th className="px-3 py-2.5">Oficinista / Sucursal</th>
                        <th className="px-3 py-2.5 text-right font-black">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detallesFiltrados.map((item, idx) => (
                        <tr key={item.id_boleto_detalle || item.id_boleto || item.id_guia || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-600 font-medium whitespace-nowrap">
                            {item.fecha_boleto || item.fecha_guia || '-'}
                          </td>

                          {/* Columnas de Boletería */}
                          {modalData.tipo.includes('boleteria') && (
                            <>
                              <td className="px-3 py-2 font-bold text-slate-800">
                                #{item.id_boleto}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-black text-[11px]">
                                  {item.id_viaje ? `Viaje #${item.id_viaje}` : '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-bold text-blue-600">
                                {item.asiento || item.asientos || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                <span className="font-semibold block">{item.cliente || item.clientes || 'Cliente General'}</span>
                                {item.identificacion && <span className="text-[10px] text-slate-400 font-normal">C.I: {item.identificacion}</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {item.destino || item.nombre_origen || '-'}
                              </td>
                            </>
                          )}

                          {/* Columnas de Guías */}
                          {modalData.tipo.includes('guias') && (
                            <>
                              <td className="px-3 py-2 font-bold text-slate-800">
                                #{item.numero_guia || item.id_guia}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {item.remitente_guia || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {item.destinatario_guia || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {item.destino || '-'}
                              </td>
                            </>
                          )}

                          <td className="px-3 py-2 text-slate-500 text-[11px]">
                            <span className="font-medium text-slate-700 block">{item.nombre_usuario || '-'}</span>
                            <span className="text-[10px] text-slate-400">{item.nombre_sucursal || ''}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-800">
                            {formatMoney(item.total || item.total_boleto || item.total_guia || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                        <td colSpan={modalData.tipo.includes('boleteria') ? 7 : 6} className="px-4 py-2.5 text-right uppercase text-slate-600">
                          Total ({detallesFiltrados.length} registros)
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-600 text-sm">
                          {formatMoney(totalFiltradoModal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Mostrando datos actualizados del sistema de transporte
              </span>
              <button
                onClick={cerrarModal}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


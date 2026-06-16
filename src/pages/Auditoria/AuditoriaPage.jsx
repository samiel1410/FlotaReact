import { useState, useEffect, useCallback } from 'react';
import { api } from '../../config/axios';

const ACCIONES = [
  { value: '', label: 'Todas' },
  { value: 'INSERT', label: 'Inserción', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'UPDATE', label: 'Actualización', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'DELETE', label: 'Eliminación', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'LOGIN', label: 'Login', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'SELECT', label: 'Consulta', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'PDF', label: 'PDF/Reporte', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'ERROR', label: 'Error', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const RESULTADOS = [
  { value: '', label: 'Todos' },
  { value: 'success', label: '✓ Éxito', color: 'text-emerald-600' },
  { value: 'error', label: '✗ Error', color: 'text-red-600' },
];

export const AuditoriaPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [estadisticas, setEstadisticas] = useState(null);

  // Filtros
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [detalleData, setDetalleData] = useState(null);

  const cargarLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit, page };
      if (filtroAccion) params.accion = filtroAccion;
      if (filtroResultado) params.resultado = filtroResultado;
      if (filtroBusqueda) params.busqueda = filtroBusqueda;
      if (filtroDesde) params.desde = filtroDesde;
      if (filtroHasta) params.hasta = filtroHasta;

      const res = await api.get('/auditoria/listado', { params });
      if (res.data?.success) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filtroAccion, filtroResultado, filtroBusqueda, filtroDesde, filtroHasta]);

  const cargarEstadisticas = useCallback(async () => {
    try {
      const res = await api.get('/auditoria/estadisticas');
      if (res.data?.success) {
        setEstadisticas(res.data.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    cargarLogs();
  }, [cargarLogs]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  const abrirDetalle = async (id) => {
    setDetalleId(id);
    setDetalleData(null);
    try {
      const res = await api.get(`/auditoria/detalle/${id}`);
      if (res.data?.success) {
        setDetalleData(res.data.data);
      }
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  const aplicarFiltros = () => {
    setPage(1);
    cargarLogs();
  };

  const totalPaginas = Math.ceil(total / limit);

  // Colores de badges según acción
  const getAccionBadge = (accion) => {
    const found = ACCIONES.find(a => a.value === accion);
    return found?.color || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-100/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
              <i className="fas fa-history text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Auditoría del Sistema</h1>
              <p className="text-sm font-medium text-slate-500">
                Registro detallado de todas las acciones realizadas en el sistema
              </p>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          {estadisticas && (
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-800">{estadisticas.total?.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registros</p>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{estadisticas.hoy}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoy</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Buscar por usuario, detalle o endpoint..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            />
          </div>

          <select
            value={filtroAccion}
            onChange={(e) => { setFiltroAccion(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          >
            {ACCIONES.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <select
            value={filtroResultado}
            onChange={(e) => { setFiltroResultado(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          >
            {RESULTADOS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            title="Desde"
          />

          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            title="Hasta"
          />

          <button
            onClick={aplicarFiltros}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-filter text-xs"></i>
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
              <span className="text-slate-500 font-medium">Cargando registros de auditoría...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <i className="fas fa-inbox text-5xl mb-4 opacity-30"></i>
              <p className="text-lg font-semibold">No hay registros con los filtros actuales</p>
              <p className="text-sm mt-1">Los registros comenzarán a aparecer cuando se realicen acciones en el sistema</p>
            </div>
          ) : (
            <>
              {/* Información de resultados */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">
                  Mostrando <span className="font-bold text-slate-700">{logs.length}</span> de{' '}
                  <span className="font-bold text-slate-700">{total.toLocaleString()}</span> registros
                </p>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Módulo</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endpoint</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resultado</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duración</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map(log => (
                        <tr key={log.id_auditoria} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                            {formatFecha(log.fecha_creacion)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                {(log.nombre_usuario || 'S')[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-700">{log.nombre_usuario || 'Sistema'}</p>
                                {log.username_usuario && (
                                  <p className="text-[9px] text-slate-400 font-mono">@{log.username_usuario}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAccionBadge(log.accion)}`}>
                              <i className={`fas fa-${
                                log.accion === 'INSERT' ? 'plus-circle' :
                                log.accion === 'UPDATE' ? 'edit' :
                                log.accion === 'DELETE' ? 'trash-alt' :
                                log.accion === 'LOGIN' ? 'sign-in-alt' :
                                log.accion === 'PDF' ? 'file-pdf' :
                                log.accion === 'ERROR' ? 'exclamation-circle' :
                                'search'
                              }`}></i>
                              {log.accion}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-slate-600">{log.tabla || '-'}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[250px]">
                            <p className="text-xs text-slate-500 font-mono truncate" title={log.endpoint}>
                              {log.endpoint || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold ${log.resultado === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {log.resultado === 'success' ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[10px] font-mono text-slate-400">
                              {log.tiempo_ejecucion_ms != null ? `${log.tiempo_ejecucion_ms}ms` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => abrirDetalle(log.id_auditoria)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[10px] font-medium text-slate-500">
                      Página {page} de {totalPaginas}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                        let pageNum;
                        if (totalPaginas <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPaginas - 2) {
                          pageNum = totalPaginas - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                              page === pageNum
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                        disabled={page === totalPaginas}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalle */}
      {detalleId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetalleId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-500"></i>
                Detalle de Auditoría #{detalleId}
              </h3>
              <button onClick={() => setDetalleId(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {!detalleData ? (
              <div className="flex justify-center py-10">
                <i className="fas fa-spinner fa-spin text-2xl text-blue-500"></i>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Auditoría</p>
                    <p className="text-sm font-bold text-slate-800">{detalleData.id_auditoria}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</p>
                    <p className="text-sm font-bold text-slate-800">{formatFecha(detalleData.fecha_creacion)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Usuario</p>
                    <p className="text-sm font-bold text-slate-800">{detalleData.nombre_usuario || 'Sistema'}</p>
                    {detalleData.username_usuario && (
                      <p className="text-[10px] text-slate-400 font-mono">@{detalleData.username_usuario}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">IP</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{detalleData.ip_address || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Acción</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getAccionBadge(detalleData.accion)}`}>
                      {detalleData.accion}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resultado</p>
                    <span className={`text-sm font-bold ${detalleData.resultado === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {detalleData.resultado === 'success' ? '✓ Éxito' : '✗ Error'}
                    </span>
                    {detalleData.tiempo_ejecucion_ms != null && (
                      <p className="text-[10px] text-slate-400 mt-1">{detalleData.tiempo_ejecucion_ms}ms de ejecución</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Endpoint</p>
                  <p className="text-xs font-mono text-blue-800 break-all">{detalleData.endpoint || '-'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detalle</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{detalleData.detalle || '-'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Módulo / Tabla</p>
                  <p className="text-sm font-semibold text-slate-700">{detalleData.tabla || '-'}</p>
                  {detalleData.id_registro && (
                    <p className="text-[10px] text-slate-400 mt-0.5">ID Registro: {detalleData.id_registro}</p>
                  )}
                </div>

                {detalleData.datos_solicitud && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Datos de la Solicitud</p>
                    <pre className="text-[10px] font-mono text-amber-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {typeof detalleData.datos_solicitud === 'string'
                        ? JSON.stringify(JSON.parse(detalleData.datos_solicitud), null, 2)
                        : JSON.stringify(detalleData.datos_solicitud, null, 2)}
                    </pre>
                  </div>
                )}

                {detalleData.user_agent && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">User-Agent</p>
                    <p className="text-[10px] text-slate-500 break-all font-mono">{detalleData.user_agent}</p>
                  </div>
                )}

                {detalleData.id_sucursal && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sucursal ID</p>
                    <p className="text-sm font-bold text-slate-700">{detalleData.id_sucursal}</p>
                  </div>
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setDetalleId(null)} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

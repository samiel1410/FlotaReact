import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../config/axios';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const PAGE_SIZE = 25;
const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

export const ReagendamientosPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    startDate: null,
    endDate: null,
    startDateStr: '',
    endDateStr: ''
  });

  // Modal de Detalle
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchReagendamientos = useCallback(async (targetPage = 1, currentFilters = filtros) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: PAGE_SIZE,
        busqueda: currentFilters.busqueda || undefined,
        desde: currentFilters.startDateStr || undefined,
        hasta: currentFilters.endDateStr || undefined
      };

      const res = await api.get('/boleto/listarReagendados', { params });
      if (res.data?.success) {
        setData(Array.isArray(res.data.data) ? res.data.data : []);
        setTotal(res.data.total || 0);
        setPage(targetPage);
      } else {
        setData([]);
        setTotal(0);
        toast.error(res.data?.message || 'Error al cargar historial de reagendamientos');
      }
    } catch (e) {
      console.error('Error cargando reagendamientos:', e);
      toast.error('Error de conexión al cargar historial de reagendamientos');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchReagendamientos(1);
  }, []);

  const handleBuscar = (e) => {
    e?.preventDefault?.();
    fetchReagendamientos(1, filtros);
  };

  const handleLimpiar = () => {
    const limpio = {
      busqueda: '',
      startDate: null,
      endDate: null,
      startDateStr: '',
      endDateStr: ''
    };
    setFiltros(limpio);
    fetchReagendamientos(1, limpio);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchReagendamientos(newPage, filtros);
  };

  const handleVerDetalle = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    return String(dateStr).substring(0, 10);
  };

  const formatTimeOnly = (timeStr) => {
    if (!timeStr) return '';
    return String(timeStr).substring(0, 5);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 pb-32">
        {/* ─── HEADER ─── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-history text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Historial de Boletos Reagendados</h1>
              <p className="text-xs font-medium text-slate-500">
                {total} registro{total !== 1 ? 's' : ''} de reubicación y cambio de fecha de viajes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReagendamientos(page, filtros)}
              disabled={loading}
              className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
              title="Actualizar listado"
            >
              <i className={`fas fa-sync-alt text-xs ${loading ? 'fa-spin text-indigo-600' : ''}`}></i>
              <span>ACTUALIZAR</span>
            </button>
          </div>
        </div>

        {/* ─── FILTROS DE BÚSQUEDA ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {/* Rango de Fechas Unificado */}
            <div>
              <label className={labelCls}>Rango de Fechas (Reagendamiento)</label>
              <DateRangePicker
                startDate={filtros.startDate}
                endDate={filtros.endDate}
                onChange={({ startDate, endDate, startDateStr, endDateStr }) => {
                  setFiltros(f => ({
                    ...f,
                    startDate,
                    endDate,
                    startDateStr,
                    endDateStr
                  }));
                }}
                placeholder="Seleccione desde y hasta..."
              />
            </div>

            {/* Criterio / Búsqueda */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className={labelCls}>Criterio de Búsqueda</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  value={filtros.busqueda}
                  placeholder="N° boleto, pasajero, cédula, ruta, motivo o usuario..."
                  onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleBuscar}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
            >
              <i className="fas fa-search text-xs"></i> BUSCAR
            </button>
            <button
              onClick={handleLimpiar}
              className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
            >
              <i className="fas fa-eraser text-xs"></i> LIMPIAR
            </button>
          </div>
        </div>

        {/* ─── TABLA DE REAGENDAMIENTOS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-28">N° BOLETO</th>
                  <th className="px-4 py-3 text-left">PASAJERO / C.I.</th>
                  <th className="px-4 py-3 text-left">VIAJE ANTERIOR</th>
                  <th className="px-4 py-3 text-left">VIAJE NUEVO</th>
                  <th className="px-4 py-3 text-left">MOTIVO</th>
                  <th className="px-4 py-3 text-center w-36">FECHA CAMBIO</th>
                  <th className="px-4 py-3 text-left w-36">USUARIO</th>
                  <th className="px-4 py-3 text-center w-20">DETALLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin text-indigo-600 text-lg"></i>
                        <span className="font-semibold text-slate-500">Cargando historial de reagendamientos...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      <i className="fas fa-exchange-alt text-4xl mb-3 block text-slate-300"></i>
                      <p className="font-bold text-slate-600 text-sm">No se encontraron registros de reagendamientos</p>
                      <p className="text-xs text-slate-400 mt-0.5">Los boletos que hayan sido reubicados o cambiados de fecha aparecerán aquí</p>
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id_reagendado} className="hover:bg-slate-50 transition-colors">
                      {/* N° BOLETO */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          <i className="fas fa-ticket-alt text-[9px]"></i> #{item.numero_boleto || item.id_fkboleto}
                        </span>
                        {item.total_boleto && (
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                            ${Number(item.total_boleto).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* PASAJERO */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <i className="far fa-user text-[10px] text-slate-400"></i>
                          {item.nombres_boleto || 'Pasajero no registrado'}
                        </div>
                        {item.identificacion_boleto && (
                          <div className="text-[10px] text-slate-400 font-mono pl-4">
                            C.I: {item.identificacion_boleto}
                          </div>
                        )}
                      </td>

                      {/* VIAJE ANTERIOR */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200/60 font-mono">
                            N° VIAJE #{item.id_fkviaje_anterior || '-'}
                          </span>
                          {item.disco_bus_anterior && (
                            <span className="text-[10px] font-bold text-slate-600">
                              Bus #{item.disco_bus_anterior}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                          {item.ruta_anterior || 'Ruta anterior no especificada'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatDateOnly(item.dia_viaje_anterior)} {formatTimeOnly(item.hora_salida_anterior)}
                        </div>
                      </td>

                      {/* VIAJE NUEVO */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
                            N° VIAJE #{item.id_fkviaje_nuevo || '-'}
                          </span>
                          {item.disco_bus_nuevo && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              Bus #{item.disco_bus_nuevo}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">
                          {item.ruta_nueva || 'Ruta nueva'}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono font-medium">
                          {formatDateOnly(item.dia_viaje_nuevo || item.fecha_uso)} {formatTimeOnly(item.hora_salida_nueva)}
                        </div>
                      </td>

                      {/* MOTIVO */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="max-w-[200px] truncate text-xs text-slate-700 font-medium" title={item.motivo}>
                          {item.motivo || 'Reubicación / Reagendamiento'}
                        </div>
                      </td>

                      {/* FECHA REAGENDADO */}
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(item.fecha_registro)}
                        </div>
                      </td>

                      {/* USUARIO */}
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                          <i className="fas fa-user-shield text-[10px] text-indigo-500"></i>
                          <span>{item.usuario_nombre?.trim() || 'Sistema'}</span>
                        </div>
                      </td>

                      {/* DETALLE */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleVerDetalle(item)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Ver detalle de reagendamiento"
                        >
                          <i className="fas fa-eye text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── PAGINACIÓN ─── */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Página <span className="font-bold text-slate-700">{page}</span> de <span className="font-bold text-slate-700">{totalPages}</span> ({total} registros)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <i className="fas fa-chevron-left mr-1"></i> Anterior
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── MODAL DETALLE DE REAGENDAMIENTO ─── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedItem(null); }}
          title={selectedItem ? `Detalle de Reagendamiento #${selectedItem.id_reagendado}` : 'Detalle de Reagendamiento'}
          width="max-w-3xl"
        >
          {selectedItem && (
            <div className="space-y-4 text-xs">
              {/* Resumen del Boleto y Pasajero */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Información del Boleto</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">N° DE BOLETO</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      #{selectedItem.numero_boleto || selectedItem.id_fkboleto}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">PASAJERO</span>
                    <span className="font-bold text-slate-800">
                      {selectedItem.nombres_boleto || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">IDENTIFICACIÓN</span>
                    <span className="font-mono font-bold text-slate-700">
                      {selectedItem.identificacion_boleto || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparativa Viaje Anterior vs Nuevo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Viaje Original */}
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider flex items-center gap-1">
                      <i className="fas fa-undo text-rose-600"></i> VIAJE ORIGINAL
                    </span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-black text-[10px]">
                      N° VIAJE #{selectedItem.id_fkviaje_anterior || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-900/60 block text-[10px] font-semibold">RUTA</span>
                    <span className="font-bold text-slate-800">{selectedItem.ruta_anterior || 'No especificada'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-rose-900/60 block text-[10px] font-semibold">FECHA VIAJE</span>
                      <span className="font-mono font-semibold text-slate-700">{formatDateOnly(selectedItem.dia_viaje_anterior)}</span>
                    </div>
                    <div>
                      <span className="text-rose-900/60 block text-[10px] font-semibold">HORA SALIDA</span>
                      <span className="font-mono font-semibold text-slate-700">{formatTimeOnly(selectedItem.hora_salida_anterior)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-rose-900/60 block text-[10px] font-semibold">UNIDAD / BUS</span>
                    <span className="font-semibold text-slate-700">
                      {selectedItem.disco_bus_anterior ? `Disco #${selectedItem.disco_bus_anterior}` : 'N/A'} {selectedItem.placa_bus_anterior ? `(${selectedItem.placa_bus_anterior})` : ''}
                    </span>
                  </div>
                </div>

                {/* Viaje Reagendado */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <i className="fas fa-check-circle text-emerald-600"></i> VIAJE REAGENDADO
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-black text-[10px]">
                      N° VIAJE #{selectedItem.id_fkviaje_nuevo || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-900/60 block text-[10px] font-semibold">RUTA</span>
                    <span className="font-bold text-slate-800">{selectedItem.ruta_nueva || 'No especificada'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-emerald-900/60 block text-[10px] font-semibold">FECHA VIAJE / USO</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {formatDateOnly(selectedItem.dia_viaje_nuevo || selectedItem.fecha_uso)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-900/60 block text-[10px] font-semibold">HORA SALIDA</span>
                      <span className="font-mono font-semibold text-slate-700">{formatTimeOnly(selectedItem.hora_salida_nueva)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-emerald-900/60 block text-[10px] font-semibold">UNIDAD / BUS</span>
                    <span className="font-semibold text-slate-700">
                      {selectedItem.disco_bus_nuevo ? `Disco #${selectedItem.disco_bus_nuevo}` : 'N/A'} {selectedItem.placa_bus_nueva ? `(${selectedItem.placa_bus_nueva})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Motivo y Auditoría */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo & Registro de Auditoría</div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">MOTIVO DEL CAMBIO</span>
                  <p className="font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 mt-0.5">
                    {selectedItem.motivo || 'Reubicación de viaje solicitada por pasajero'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">RESPONSABLE DEL CAMBIO</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <i className="fas fa-user-shield text-indigo-500"></i>
                      {selectedItem.usuario_nombre?.trim() || 'Sistema / Oficinista'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">FECHA Y HORA DE REGISTRO</span>
                    <span className="font-mono font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <i className="far fa-clock text-slate-400"></i>
                      {formatDateTime(selectedItem.fecha_registro)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setSelectedItem(null); }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ReagendamientosPage;

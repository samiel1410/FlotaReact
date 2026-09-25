import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { despachoService } from '../../services/despacho.service';
import ViajesService from '../../services/viajes.service';
import { NuevoDespachoModal } from './components/NuevoDespachoModal';
import { EditarDespachoModal } from './components/EditarDespachoModal';
import { BusquedaGuiaDespachoModal } from './components/BusquedaGuiaDespachoModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { CONFIG } from '../../config/env';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';

const PAGE_SIZE = 25;
const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

export const DespachoPage = () => {
  // ─── Estado Principal ──────────────────────────────────────
  const [despachos, setDespachos] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ─── Filtros Unificados ────────────────────────────────────
  const [filtros, setFiltros] = useState({
    id_bus: '',
    desde: '',
    hasta: '',
    numero: '',
    tipo_despacho: ''
  });

  // ─── Modales ───────────────────────────────────────────────
  const [showNuevo, setShowNuevo] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showAgregarGuia, setShowAgregarGuia] = useState(false);
  const [selectedDespacho, setSelectedDespacho] = useState(null);

  // ─── Modal PDF ─────────────────────────────────────────────
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');

  // ─── Cargar Buses para Filtro ──────────────────────────────
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await ViajesService.getBuses();
        if (res.success) {
          setBuses(res.data || []);
        }
      } catch (err) {
        console.error('Error cargando buses para filtro:', err);
      }
    };
    fetchBuses();
  }, []);

  // ─── Cargar despachos ──────────────────────────────────────
  const cargarDespachos = useCallback(async (pageNum = 1, filtrosActuales = null) => {
    setLoading(true);
    try {
      const f = filtrosActuales || filtros;
      const params = {
        limit: PAGE_SIZE,
        page: pageNum,
        id_bus: f.id_bus || '',
        desde: f.desde || '',
        hasta: f.hasta || '',
        numero: f.numero || '',
        tipo_despacho: f.tipo_despacho || ''
      };
      const res = await despachoService.listar(params);
      if (res?.success) {
        setDespachos(res.data || []);
        setTotal(res.total || 0);
        setPage(pageNum);
      } else {
        setDespachos([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error cargando despachos:', error);
      toast.error('Error al cargar despachos');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargarDespachos(1); }, []);

  // ─── Handlers filtros ──────────────────────────────────────
  const handleBuscar = (e) => {
    e?.preventDefault?.();
    cargarDespachos(1, filtros);
  };

  const handleLimpiar = () => {
    const limpio = { id_bus: '', desde: '', hasta: '', numero: '', tipo_despacho: '' };
    setFiltros(limpio);
    cargarDespachos(1, limpio);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    cargarDespachos(newPage);
  };

  // ─── Acción: Nuevo Despacho ───────────────────────────────
  const handleNuevoSuccess = () => {
    cargarDespachos(1);
  };

  // ─── Acción: Editar Despacho ──────────────────────────────
  const handleEditarDespacho = async (despacho) => {
    try {
      const res = await despachoService.verificarGuia({ id_despacho_maestro: despacho.id_despacho_maestro });
      if (res?.success) {
        if (res.tipo === 0) {
          if (String(despacho.estado_despacho_maestro) === '1') {
            setSelectedDespacho(despacho);
            setShowEditar(true);
          } else {
            toast.error('Este despacho ya está finalizado');
          }
        } else {
          toast.error('Este despacho ya tiene una guía que finalizó');
        }
      }
    } catch (err) {
      console.error('Error verificando despacho:', err);
      toast.error('Error al verificar despacho');
    }
  };

  // ─── Acción: Agregar Guía ─────────────────────────────────
  const handleAgregarGuia = async (despacho) => {
    try {
      const res = await despachoService.verificarGuia({ id_despacho_maestro: despacho.id_despacho_maestro });
      if (res?.success) {
        if (res.tipo === 0) {
          if (String(despacho.estado_despacho_maestro) === '1') {
            setSelectedDespacho(despacho);
            setShowAgregarGuia(true);
          } else {
            toast.error('Este despacho ya está finalizado');
          }
        } else {
          toast.error('Este despacho ya tiene una guía que finalizó');
        }
      }
    } catch (err) {
      console.error('Error verificando despacho:', err);
      toast.error('Error al verificar despacho');
    }
  };

  // ─── Acción: PDF ──────────────────────────────────────────
  const handlePdf = (despacho) => {
    try {
      const url = `${CONFIG.PHP_URL}/despachoPdf.php?id_maestro=${despacho.id_despacho_maestro}`;
      setPdfUrl(url);
      setPdfTitle(`Despacho N° ${despacho.numero_despacho_maestro || despacho.id_despacho_maestro}`);
      setPdfModalOpen(true);
    } catch (err) {
      console.error('Error PDF:', err);
      toast.error('Error al abrir PDF');
    }
  };

  // ─── Cálculos ─────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr.split(' ')[0];
  };

  const renderEstado = (estado) => {
    if (String(estado) === '1')
      return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">ACTIVO</span>;
    if (String(estado) === '2')
      return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">FINALIZADO</span>;
    return <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500">N/A</span>;
  };

  const renderTipoDespacho = (tipo) => {
    const t = (tipo || 'BUS').toUpperCase();
    if (t === 'VEHICULO' || t === 'VEHÍCULO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <i className="fas fa-truck-moving text-[9px]"></i> VEHÍCULO
        </span>
      );
    }
    if (t === 'CONVENIO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/60">
          <i className="fas fa-handshake text-[9px]"></i> CONVENIO
        </span>
      );
    }
    if (t === 'OFICINA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/60">
          <i className="fas fa-building text-[9px]"></i> OFICINA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/60">
        <i className="fas fa-bus text-[9px]"></i> BUS
      </span>
    );
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 pb-32">
        {/* ─── HEADER ─── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-truck-loading text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Despacho General</h1>
              <p className="text-xs font-medium text-slate-500">{total} despacho{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNuevo(true)}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
            >
              <i className="fas fa-plus-circle text-xs"></i> NUEVO DESPACHO
            </button>
            <button
              onClick={() => cargarDespachos(page)}
              disabled={loading}
              className="h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all flex items-center justify-center shadow-sm"
              title="Actualizar listado"
            >
              <i className={`fas fa-sync-alt text-xs ${loading ? 'fa-spin text-indigo-600' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* ─── FILTROS DE BÚSQUEDA ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          
          {/* Fila 1: 3 Selectores Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {/* Rango de Fechas Unificado */}
            <div>
              <label className={labelCls}>Rango de Fechas (Desde - Hasta)</label>
              <DateRangePicker
                startDate={filtros.desde}
                endDate={filtros.hasta}
                onChange={({ startDateStr, endDateStr }) => {
                  setFiltros(f => ({ ...f, desde: startDateStr, hasta: endDateStr }));
                }}
              />
            </div>

            {/* Bus con Buscador Integrado */}
            <div>
              <label className={labelCls}>Bus</label>
              <SearchableSelect
                options={buses.map(b => ({
                  value: String(b.id_buses || b.bus_id || b.id_bus),
                  label: `${b.disco_buses || b.codigo_buses || b.numero_bus || ''} ${b.placa_buses ? `(${b.placa_buses})` : ''}`.trim()
                }))}
                value={filtros.id_bus}
                onChange={val => setFiltros(f => ({ ...f, id_bus: val }))}
                placeholder="Todos los buses"
              />
            </div>

            {/* Tipo de Despacho con Buscador Integrado */}
            <div>
              <label className={labelCls}>Tipo de Despacho</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Todos los tipos' },
                  { value: 'BUS', label: 'BUS' },
                  { value: 'VEHICULO', label: 'VEHÍCULO' },
                  { value: 'CONVENIO', label: 'CONVENIO' },
                  { value: 'OFICINA', label: 'OFICINA' }
                ]}
                value={filtros.tipo_despacho}
                onChange={val => setFiltros(f => ({ ...f, tipo_despacho: val }))}
                placeholder="Todos los tipos"
              />
            </div>
          </div>

          {/* Fila 2: N° Despacho / Criterio + Botones Buscar / Limpiar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-9">
              <label className={labelCls}>N° Despacho o Criterio</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  value={filtros.numero}
                  placeholder="Escriba el N° de despacho o criterio de búsqueda..."
                  onChange={e => setFiltros(f => ({ ...f, numero: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <button
                onClick={handleBuscar}
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
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
        </div>

        {/* ─── GRID DE DESPACHOS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-24">N° DESPACHO</th>
                  <th className="px-4 py-3 text-center w-28">TIPO</th>
                  <th className="px-4 py-3 text-center w-28">FECHA</th>
                  <th className="px-4 py-3 text-left">TRANSPORTE / DETALLE</th>
                  <th className="px-4 py-3 text-left">RUTA / DESTINO</th>
                  <th className="px-4 py-3 text-left">OFICINISTA</th>
                  <th className="px-4 py-3 text-center w-20"># ENCOM.</th>
                  <th className="px-4 py-3 text-center w-24">ESTADO</th>
                  <th className="px-4 py-3 text-center w-28">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-16 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin text-indigo-600 text-lg"></i>
                        <span className="font-semibold text-slate-500">Cargando despachos...</span>
                      </div>
                    </td>
                  </tr>
                ) : despachos.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-16 text-slate-400">
                      <i className="fas fa-truck-loading text-4xl mb-3 block text-slate-300"></i>
                      <p className="font-bold text-slate-600 text-sm">No se encontraron despachos</p>
                      <p className="text-xs text-slate-400 mt-0.5">Cree un nuevo despacho o ajuste los filtros de búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  despachos.map((d, idx) => {
                    const tipoU = (d.tipo_despacho || 'BUS').toUpperCase();
                    const esVehiculo = tipoU === 'VEHICULO' || tipoU === 'VEHÍCULO';
                    const esConvenio = tipoU === 'CONVENIO';
                    const esOficina = tipoU === 'OFICINA';

                    return (
                      <tr key={d.id_despacho_maestro || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-700 font-mono">
                          #{d.numero_despacho_maestro || d.id_despacho_maestro || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderTipoDespacho(d.tipo_despacho)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap font-medium">
                          {formatDate(d.fecha_despacho_maestro)}
                        </td>
                        <td className="px-4 py-3">
                          {esVehiculo ? (
                            <div>
                              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <i className="fas fa-truck text-indigo-500 text-[11px]"></i>
                                {d.tipo_vehiculo || 'Vehículo'} {d.numero_vehiculo ? `#${d.numero_vehiculo}` : ''}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                {d.placa_vehiculo && <span className="font-semibold text-slate-700">Placa: {d.placa_vehiculo}</span>}
                                {(d.responsable_despacho || d.nombre_busero) && (
                                  <span>• Resp: {d.responsable_despacho || d.nombre_busero}</span>
                                )}
                              </div>
                            </div>
                          ) : esConvenio ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <i className="fas fa-handshake text-emerald-600 text-[11px]"></i>
                                Cía. Convenio: {d.nombre_destino || 'Compañía Asociada'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Resp: {d.responsable_despacho || d.nombre_oficinista || '-'}
                              </div>
                            </div>
                          ) : esOficina ? (
                            <div>
                              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                <i className="fas fa-building text-amber-500 text-[11px]"></i>
                                Traspaso Interno
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Resp: {d.responsable_despacho || d.nombre_oficinista || '-'}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                <i className="fas fa-bus text-blue-500 text-[11px]"></i>
                                {d.nombre_bus || '-'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Conductor: {d.nombre_busero || '-'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {d.nombre_origen ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-600 font-semibold">{d.nombre_origen}</span>
                              <i className="fas fa-arrow-right text-[10px] text-slate-400"></i>
                              <span className="text-slate-900 font-bold">{d.nombre_destino || '-'}</span>
                            </div>
                          ) : (
                            <span className="text-xs">{d.nombre_destino || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {d.nombre_oficinista || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                            {d.encomiendas || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderEstado(d.estado_despacho_maestro)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver / Imprimir PDF */}
                            <button
                              onClick={() => handlePdf(d)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Ver / Imprimir PDF"
                            >
                              <i className="fas fa-file-pdf text-sm"></i>
                            </button>
                            {/* Editar */}
                            <button
                              onClick={() => handleEditarDespacho(d)}
                              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                              title="Editar Despacho"
                            >
                              <i className="fas fa-edit text-sm"></i>
                            </button>
                            {/* Agregar Guía */}
                            <button
                              onClick={() => handleAgregarGuia(d)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Agregar Guías al Despacho"
                            >
                              <i className="fas fa-plus-circle text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── PAGINACIÓN ESTÁNDAR ─── */}
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

        {/* ─── MODALES DE DESPACHO ─── */}
        {showNuevo && (
          <NuevoDespachoModal
            onClose={() => setShowNuevo(false)}
            onSuccess={handleNuevoSuccess}
          />
        )}

        {showEditar && selectedDespacho && (
          <EditarDespachoModal
            despacho={selectedDespacho}
            onClose={() => { setShowEditar(false); setSelectedDespacho(null); }}
            onSuccess={() => cargarDespachos(page)}
          />
        )}

        {showAgregarGuia && selectedDespacho && (
          <BusquedaGuiaDespachoModal
            idDespachoMaestro={selectedDespacho.id_despacho_maestro}
            bus={selectedDespacho.id_fkbus_despacho_maestro || ''}
            onClose={() => { setShowAgregarGuia(false); setSelectedDespacho(null); }}
            onSelect={() => cargarDespachos(page)}
          />
        )}

        {/* ─── MODAL VISOR PDF ─── */}
        <PdfViewerModal
          open={pdfModalOpen}
          url={pdfUrl}
          title={pdfTitle}
          onClose={() => setPdfModalOpen(false)}
          showPrintButton={true}
        />
      </div>
    </div>
  );
};

export default DespachoPage;

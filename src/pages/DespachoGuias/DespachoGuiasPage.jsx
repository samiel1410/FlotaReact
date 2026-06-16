import { useState, useEffect, useCallback, memo } from 'react';
import { despachoConvenioService } from '../../services/despachoConvenio.service';
import { NuevoDespachoGuiaCompaniaModal } from './components/NuevoDespachoGuiaCompaniaModal';
import { BusquedaGuiaDespachoModal } from './components/BusquedaGuiaDespachoModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// 🔷 Fila memoizada de la tabla principal
const DespachoRow = memo(({ despacho, onPdf, onEditar, onAgregarGuiaClick, formatDate, renderEstado }) => (
  <tr className="hover:bg-slate-50/70 transition-colors">
    <td className="px-4 py-3 text-sm font-bold text-slate-700">
      {despacho.numero_despacho_maestro_convenios || '-'}
    </td>
    <td className="px-4 py-3 text-sm text-slate-600">
      {formatDate(despacho.fecha_despacho_maestro_convenios)}
    </td>
    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
      {despacho.nombre_bus || '-'}
    </td>
    <td className="px-4 py-3 text-sm text-slate-600">
      {despacho.nombre_busero || '-'}
    </td>
    <td className="px-4 py-3 text-sm text-slate-600">
      {despacho.nombre_destino || '-'}
    </td>
    <td className="px-4 py-3 text-center">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
        {despacho.encomiendas || 0}
      </span>
    </td>
    <td className="px-4 py-3 text-center">
      {renderEstado(despacho.estado_despacho_maestro_convenios)}
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onPdf(despacho)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="PDF">
          <i className="fas fa-file-pdf text-sm"></i>
        </button>
        <button onClick={() => onEditar(despacho)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Editar Despacho">
          <i className="fas fa-edit text-sm"></i>
        </button>
        <button onClick={() => onAgregarGuiaClick(despacho)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Agregar Guía">
          <i className="fas fa-plus-circle text-sm"></i>
        </button>
      </div>
    </td>
  </tr>
));

// 🔷 Fila memoizada de la tabla de detalles (guías del despacho)
const DetalleRow = memo(({ detalle, onQuitarGuia }) => (
  <tr className="hover:bg-slate-50">
    <td className="px-4 py-2 text-sm font-medium text-slate-800">
      {detalle.numero_guia_formateado || detalle.numero_guia || '-'}
    </td>
    <td className="px-4 py-2 text-sm text-slate-600">
      {detalle.destino_guia || '-'}
    </td>
    <td className="px-4 py-2 text-sm">
      {String(detalle.estado_despacho_detalle_convenios) === '1'
        ? <i className="fas fa-circle text-green-500 text-xs" title="Activo"></i>
        : <i className="fas fa-circle text-red-500 text-xs" title="Finalizado"></i>}
    </td>
    <td className="px-4 py-2 text-center">
      <button onClick={() => onQuitarGuia(detalle.id_despacho_detalle_convenios)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all" title="Quitar guía del despacho">
        <i className="fas fa-trash mr-1"></i>Quitar
      </button>
    </td>
  </tr>
));

export const DespachoGuiasPage = () => {
  // ─── Estado Principal ───
  const [despachos, setDespachos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // ─── Filtros ───
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    numero: ''
  });

  // ─── Modales ───
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showBusquedaModal, setShowBusquedaModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [selectedDespacho, setSelectedDespacho] = useState(null);

  const [editarBusId, setEditarBusId] = useState('');
  const [editarBusNombre, setEditarBusNombre] = useState('');

  // ─── Cargar despachos ───
  const cargarDespachos = useCallback(async (pageNum = 1, filtrosActuales = null) => {
    setLoading(true);
    try {
      const f = filtrosActuales || filtros;
      const params = {
        limit,
        page: pageNum,
        desde: f.fecha_desde || '',
        hasta: f.fecha_hasta || '',
        numero: f.numero || ''
      };
      const res = await despachoConvenioService.listar(params);
      if (res.success) {
        setDespachos(res.data || []);
        setTotal(res.total || 0);
        setPage(pageNum);
      } else {
        toast.error(res.mensaje || 'Error al cargar despachos');
      }
    } catch (error) {
      console.error('Error cargando despachos:', error);
      toast.error('Error al cargar despachos');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarDespachos(1);
  }, []);

  // ─── Formatear fecha ───
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr.split(' ')[0];
  };

  // ─── Estado del despacho ───
  const renderEstado = (estado) => {
    if (String(estado) === '1') {
      return <i className="fas fa-circle text-green-500 text-xs" title="Activo"></i>;
    } else if (String(estado) === '2') {
      return <i className="fas fa-circle text-red-500 text-xs" title="Finalizado"></i>;
    }
    return <i className="fas fa-circle text-gray-300 text-xs"></i>;
  };

  // ─── Abrir edición de despacho ───
  const handleEditarDespacho = async (despacho) => {
    try {
      const res = await despachoConvenioService.verificarGuia({ id_despacho_maestro: despacho.id_despacho_maestro_convenios });
      if (res.success) {
        if (res.tipo === 0) {
          if (String(despacho.estado_despacho_maestro_convenios) === '1') {
            setSelectedDespacho(despacho);
            setEditarBusId(despacho.id_fkbus_despacho_maestro_convenios || '');
            setEditarBusNombre(despacho.nombre_bus || '');
            setShowEditarModal(true);
            // Load details
            cargarDetalles(despacho.id_despacho_maestro_convenios);
          } else {
            toast.error('Este despacho ya está finalizado');
          }
        } else {
          toast.error('Este despacho ya tiene una guía que ya finalizó');
        }
      }
    } catch (error) {
      console.error('Error verificando despacho:', error);
      toast.error('Error al verificar despacho');
    }
  };

  // ─── Cargar detalles (guías del despacho) ───
  const cargarDetalles = async (idMaestro) => {
    try {
      const params = { id_maestro: idMaestro, limit: 50, page: 1 };
      const res = await despachoConvenioService.listarDetalle(params);
      if (res.success) {
        setDetalles(res.data || []);
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
    }
  };

  // ─── Guardar edición de despacho ───
  const handleGuardarEdicion = async () => {
    if (!selectedDespacho) return;
    try {
      const res = await despachoConvenioService.editar({
        id_maestro: selectedDespacho.id_despacho_maestro_convenios,
        id_bus: editarBusId,
        nombre_bus: editarBusNombre,
        id_oficina: selectedDespacho.id_fkdestino_despacho || '',
        nombre_oficina: selectedDespacho.nombre_destino || ''
      });
      if (res.success) {
        toast.success('Despacho actualizado correctamente');
        setShowEditarModal(false);
        setSelectedDespacho(null);
        setDetalles([]);
        cargarDespachos(page);
      } else {
        toast.error(res.mensaje || 'Error al actualizar despacho');
      }
    } catch (error) {
      console.error('Error editando despacho:', error);
      toast.error('Error al editar despacho');
    }
  };

  // ─── Quitar guía del despacho (sin pedir motivo) ───
  const handleQuitarGuia = async (idDetalle) => {
    const confirmQuitar = await Swal.fire({ title: '¿Quitar guía?', text: '¿Está seguro que desea quitar esta guía del despacho?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar' });
    if (!confirmQuitar.isConfirmed) return;
    try {
      const res = await despachoConvenioService.eliminar({
        id_despacho_detalle: idDetalle,
        motivo: 'Eliminado por usuario'
      });
      if (res.success) {
        toast.success('Guía eliminada del despacho');
        cargarDetalles(selectedDespacho?.id_despacho_maestro_convenios);
        cargarDespachos(page);
      } else {
        toast.error(res.mensaje || 'Error al eliminar guía');
      }
    } catch (error) {
      console.error('Error eliminando guía:', error);
      toast.error('Error al eliminar guía');
    }
  };

  // ─── Agregar guía al despacho ───
  const handleAgregarGuia = (guia) => {
    if (!selectedDespacho) return;
    setShowBusquedaModal(false);
    // Confirm and add
    const nombreOficina = selectedDespacho.nombre_destino || '';
    agregarGuia(guia);
  };

  const agregarGuia = async (guia) => {
    try {
      const res = await despachoConvenioService.agregarGuia({
        id_guia: guia.id_guia,
        id_despacho_maestro: selectedDespacho.id_despacho_maestro_convenios,
        destino_guia: guia.destino_guia || selectedDespacho.nombre_destino || '',
        bus: guia.bus || selectedDespacho.id_fkbus_despacho_maestro_convenios || '',
        nombre_oficina: selectedDespacho.nombre_destino || ''
      });
      if (res.success) {
        if (res.tipo === 1) {
          toast.success('Guía agregada al despacho');
        } else if (res.tipo === 0) {
          toast.error('Esta guía ya está agregada a este despacho');
        }
        cargarDetalles(selectedDespacho.id_despacho_maestro_convenios);
        cargarDespachos(page);
      } else {
        toast.error(res.mensaje || 'Error al agregar guía');
      }
    } catch (error) {
      console.error('Error agregando guía:', error);
      toast.error('Error al agregar guía');
    }
  };

  // ─── Abrir búsqueda de guías para agregar ───
  const handleAgregarGuiaClick = async (despacho) => {
    try {
      const res = await despachoConvenioService.verificarGuia({ id_despacho_maestro: despacho.id_despacho_maestro_convenios });
      if (res.success) {
        if (res.tipo === 0) {
          if (String(despacho.estado_despacho_maestro_convenios) === '1') {
            setSelectedDespacho(despacho);
            setShowBusquedaModal(true);
            cargarDetalles(despacho.id_despacho_maestro_convenios);
          } else {
            toast.error('Este despacho ya está finalizado');
          }
        } else {
          toast.error('Este despacho ya tiene una guía que ya finalizó');
        }
      }
    } catch (error) {
      console.error('Error verificando despacho:', error);
      toast.error('Error al verificar despacho');
    }
  };

  // ─── PDF ───
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handlePdf = (despacho) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const url = `${baseUrl}/php/convenios/pdfDespachoConvenios.php?id_maestro=${despacho.id_despacho_maestro_convenios}&inline=1`;
    setPdfUrl(url);
    setPdfModalOpen(true);
  };

  // ─── Paginación ───
  const totalPages = Math.ceil(total / limit);
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    cargarDespachos(newPage);
  };

  // ─── Buscar con filtros ───
  const handleBuscar = () => {
    setPage(1);
    cargarDespachos(1, filtros);
  };

  const handleLimpiar = () => {
    setFiltros({ fecha_desde: '', fecha_hasta: '', numero: '' });
    setPage(1);
    cargarDespachos(1, { fecha_desde: '', fecha_hasta: '', numero: '' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      {/* ─── CABECERA ─── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-truck-moving text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Despacho de Guías Compañías</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asignación de guías a buses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cargarDespachos(page)}
              disabled={loading}
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
              title="Actualizar"
            >
              <i className={`fas fa-sync-alt text-[11px] ${loading ? 'fa-spin text-blue-500' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* ─── FILTROS ─── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">N° Despacho Guía</label>
              <input
                type="text"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Buscar por número..."
                value={filtros.numero}
                onChange={e => setFiltros({ ...filtros, numero: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Desde</label>
              <input
                type="date"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={filtros.fecha_desde}
                onChange={e => setFiltros({ ...filtros, fecha_desde: e.target.value })}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Hasta</label>
              <input
                type="date"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={filtros.fecha_hasta}
                onChange={e => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleBuscar}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all"
              >
                <i className="fas fa-search mr-1"></i>Buscar
              </button>
              <button
                onClick={handleLimpiar}
                className="h-9 px-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-sm font-bold transition-all"
              >
                <i className="fas fa-eraser mr-1"></i>Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* ─── BOTÓN NUEVO ─── */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowNuevoModal(true)}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
          >
            <i className="fas fa-plus-circle mr-2"></i>Nuevo Despacho de Guía
          </button>
          <span className="text-xs text-slate-500 font-medium">
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ─── GRID PRINCIPAL ─── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-sm text-slate-500 font-medium">Cargando despachos...</span>
            </div>
          ) : despachos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-truck-moving text-5xl mb-4"></i>
              <p className="text-base font-semibold">No se encontraron despachos</p>
              <p className="text-sm mt-1">Cree un nuevo despacho o ajuste los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bus</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Busero</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Destino</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"># Guías</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {despachos.map((d, idx) => (
                    <DespachoRow
                      key={d.id_despacho_maestro_convenios || idx}
                      despacho={d}
                      onPdf={handlePdf}
                      onEditar={handleEditarDespacho}
                      onAgregarGuiaClick={handleAgregarGuiaClick}
                      formatDate={formatDate}
                      renderEstado={renderEstado}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <i className="fas fa-chevron-left mr-1"></i>Anterior
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente<i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── MODAL: Editar Despacho ─── */}
        {showEditarModal && selectedDespacho && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
              <div className="bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold text-white">
                  <i className="fas fa-edit text-amber-400 mr-2"></i>
                  DESPACHO N° {selectedDespacho.numero_despacho_maestro_convenios}
                </h3>
                <button onClick={() => { setShowEditarModal(false); setSelectedDespacho(null); setDetalles([]); }} className="text-slate-400 hover:text-white transition-colors">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Datos del despacho */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bus</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                      value={editarBusNombre}
                      onChange={e => setEditarBusNombre(e.target.value)}
                      placeholder="Nombre del bus"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID Bus</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                      value={editarBusId}
                      onChange={e => setEditarBusId(e.target.value)}
                      placeholder="ID del bus"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGuardarEdicion}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    <i className="fas fa-save mr-2"></i>Guardar Cambios
                  </button>
                </div>

                {/* Lista de guías del despacho */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-list-alt text-blue-500"></i>
                    Guías en este despacho ({detalles.length})
                  </h3>

                  {detalles.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-sm">
                      <i className="fas fa-inbox mr-2"></i>
                      No hay guías en este despacho
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">N° Guía</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Destino Guía</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Estado</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 w-20">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detalles.map((det, idx) => (
                            <DetalleRow
                              key={det.id_despacho_detalle_convenios || idx}
                              detalle={det}
                              onQuitarGuia={handleQuitarGuia}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ─── MODAL: Nuevo Despacho ─── */}
        {showNuevoModal && (
          <NuevoDespachoGuiaCompaniaModal
            onClose={() => setShowNuevoModal(false)}
            onSuccess={() => cargarDespachos(1)}
          />
        )}

        {/* ─── MODAL: Búsqueda de Guías para Agregar ─── */}
        {showBusquedaModal && selectedDespacho && (
          <BusquedaGuiaDespachoModal
            idDespachoMaestro={selectedDespacho.id_despacho_maestro_convenios}
            bus={selectedDespacho.id_fkbus_despacho_maestro_convenios}
            onClose={() => { setShowBusquedaModal(false); setSelectedDespacho(null); setDetalles([]); }}
            onSelect={handleAgregarGuia}
          />
        )}

        {/* ─── MODAL: Visor PDF ─── */}
        <PdfViewerModal
          open={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          url={pdfUrl}
          title="Despacho de Guías Compañías"
          showPrintButton={true}
        />
      </div>
    </div>
  );
};

export default DespachoGuiasPage;

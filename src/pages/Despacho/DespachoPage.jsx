import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { despachoService } from '../../services/despacho.service';
import { BusquedaBusModal } from './components/BusquedaBusModal';
import { NuevoDespachoModal } from './components/NuevoDespachoModal';
import { EditarDespachoModal } from './components/EditarDespachoModal';
import { BusquedaGuiaDespachoModal } from './components/BusquedaGuiaDespachoModal';
import { CONFIG } from '../../config/env';

const PAGE_SIZE = 25;

export const DespachoPage = () => {
  // ─── Estado Principal ──────────────────────────────────────
  const [despachos, setDespachos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ─── Filtros (fiel al ExtJS: bus, rango fechas, número) ───
  const [filtros, setFiltros] = useState({
    id_bus: '',
    bus_placa: '',
    desde: '',
    hasta: '',
    numero: ''
  });

  // ─── Modales ───────────────────────────────────────────────
  const [showNuevo, setShowNuevo] = useState(false);
  const [showBusSearch, setShowBusSearch] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showAgregarGuia, setShowAgregarGuia] = useState(false);
  const [selectedDespacho, setSelectedDespacho] = useState(null);

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
        numero: f.numero || ''
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
  const handleBuscar = () => cargarDespachos(1, filtros);

  const handleLimpiar = () => {
    const limpio = { id_bus: '', bus_placa: '', desde: '', hasta: '', numero: '' };
    setFiltros(limpio);
    cargarDespachos(1, limpio);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    cargarDespachos(newPage);
  };

  const handleBusSelectForFilter = (busId, placa) => {
    const newFiltros = { ...filtros, id_bus: busId, bus_placa: placa };
    setFiltros(newFiltros);
    setShowBusSearch(false);
    cargarDespachos(1, newFiltros);
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
  const handlePdf = async (despacho) => {
    try {
      const url = `${CONFIG.PHP_URL}/despachoPdf.php?id_maestro=${despacho.id_despacho_maestro}`;
      window.open(url, 'PDF_Despacho', 'width=800,height=600');
    } catch (err) {
      console.error('Error PDF:', err);
      toast.error('Error al generar PDF');
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
      return <i className="fas fa-circle text-green-500 text-xs" title="ESTADO ACTIVO"></i>;
    if (String(estado) === '2')
      return <i className="fas fa-circle text-red-500 text-xs" title="ESTADO FINALIZADO"></i>;
    return <i className="fas fa-circle text-gray-300 text-xs"></i>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── TITLE ─── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <i className="fas fa-truck-loading text-blue-500"></i>
          DESPACHO GENERAL
          <span className="text-sm font-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {total} registro{total !== 1 ? 's' : ''}
          </span>
        </h1>
        <button
          onClick={() => cargarDespachos(page)}
          disabled={loading}
          className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
          title="Actualizar"
        >
          <i className={`fas fa-sync-alt text-[11px] ${loading ? 'fa-spin text-blue-500' : ''}`}></i>
        </button>
      </div>

      {/* ─── FILTROS (Bus, Rango Fechas, N° Despacho, Buscar/Limpiar) ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-search text-blue-500 text-xs"></i>
            Búsqueda de Despachos
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Bus */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bus</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filtros.bus_placa}
                  readOnly
                  placeholder="Seleccionar..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-600"
                />
                <button
                  onClick={() => setShowBusSearch(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  title="Buscar bus"
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* Rango Desde */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
              <input
                type="date"
                value={filtros.desde}
                onChange={e => setFiltros(p => ({ ...p, desde: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Rango Hasta */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={e => setFiltros(p => ({ ...p, hasta: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* N° Despacho */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1"># Despacho</label>
              <input
                type="text"
                value={filtros.numero}
                onChange={e => setFiltros(p => ({ ...p, numero: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                placeholder="Número de despacho"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2 col-span-full">
              <button onClick={handleBuscar}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm text-sm">
                <i className="fas fa-search"></i> Buscar
              </button>
              <button onClick={() => setShowBusSearch(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
                <i className="fas fa-bus"></i> Buscar Bus
              </button>
              <button onClick={() => {
                  const nuevosFiltros = { ...filtros, desde: '', hasta: '' };
                  setFiltros(nuevosFiltros);
                  cargarDespachos(1, nuevosFiltros);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
                <i className="fas fa-calendar-week"></i> Ver Rango
              </button>
              <button onClick={handleLimpiar}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
                <i className="fas fa-eraser"></i> Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTÓN NUEVO ─── */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowNuevo(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2"
        >
          <i className="fas fa-plus-circle"></i> Nuevo Despacho
        </button>
      </div>

      {/* ─── GRID ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-sm text-slate-500 font-medium">Cargando despachos...</span>
          </div>
        ) : despachos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-truck-loading text-5xl mb-4"></i>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Oficinista</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Busero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Destino</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"># Encom.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {despachos.map((d, idx) => (
                  <tr key={d.id_despacho_maestro || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">
                      {d.numero_despacho_maestro || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(d.fecha_despacho_maestro)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {d.nombre_oficinista || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {d.nombre_bus || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {d.nombre_busero || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {d.nombre_destino || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {d.encomiendas || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderEstado(d.estado_despacho_maestro)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* PDF */}
                        <button
                          onClick={() => handlePdf(d)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="PDF"
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
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          title="Agregar Guía"
                        >
                          <i className="fas fa-plus-circle text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── PAGINACIÓN ─── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <i className="fas fa-chevron-left mr-1"></i>Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Siguiente<i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALES ─── */}
      {showNuevo && (
        <NuevoDespachoModal
          onClose={() => setShowNuevo(false)}
          onSuccess={handleNuevoSuccess}
        />
      )}

      {showBusSearch && (
        <BusquedaBusModal
          filterMode={true}
          onSelect={handleBusSelectForFilter}
          onClose={() => setShowBusSearch(false)}
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
    </div>
  );
};

export default DespachoPage;

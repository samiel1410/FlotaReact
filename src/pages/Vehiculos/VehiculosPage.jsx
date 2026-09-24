import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../config/axios';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import Modal from '../../components/common/Modal';
import { VehiculoForm } from './components/VehiculoForm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const PAGE_SIZE = 25;
const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

const TIPOS_VEHICULO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'Camión', label: 'Camión' },
  { value: 'Camioneta', label: 'Camioneta' },
  { value: 'Automóvil', label: 'Automóvil' }
];

const ESTADOS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: '1', label: 'Activo' },
  { value: '0', label: 'Inactivo' }
];

export const VehiculosPage = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: '',
    busqueda: '',
    estado: ''
  });

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  // Cargar listado de vehículos
  const fetchVehiculos = useCallback(async (targetPage = 1, currentFilters = filtros) => {
    setLoading(true);
    try {
      const params = {
        numero_bloque: targetPage,
        tamanio_bloque: PAGE_SIZE,
        tipo: currentFilters.tipo || '',
        busqueda: currentFilters.busqueda || '',
        estado: currentFilters.estado !== '' && currentFilters.estado !== null ? currentFilters.estado : undefined
      };

      const res = await api.get('/vehiculo/seleccionarVehiculos', { params });
      if (res.data?.success) {
        setVehiculos(Array.isArray(res.data.data) ? res.data.data : []);
        setTotal(res.data.total || 0);
        setPage(targetPage);
      } else {
        setVehiculos([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error cargando vehículos:', error);
      toast.error('Error al cargar vehículos');
      setVehiculos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchVehiculos(1);
  }, []);

  const handleBuscar = (e) => {
    e?.preventDefault?.();
    fetchVehiculos(1, filtros);
  };

  const handleLimpiar = () => {
    const limpio = { tipo: '', busqueda: '', estado: '' };
    setFiltros(limpio);
    fetchVehiculos(1, limpio);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchVehiculos(newPage, filtros);
  };

  // Crear / Editar
  const handleOpenCrear = () => {
    setSelectedVehiculo(null);
    setModalOpen(true);
  };

  const handleOpenEditar = (veh) => {
    setSelectedVehiculo(veh);
    setModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      const res = await api.post('/vehiculo/insertarActualizarVehiculo', formData);
      if (res.data?.success) {
        toast.success(selectedVehiculo ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente');
        setModalOpen(false);
        setSelectedVehiculo(null);
        fetchVehiculos(page, filtros);
      } else {
        toast.error(res.data?.mensaje || res.data?.error || 'Error al guardar vehículo');
      }
    } catch (err) {
      console.error('Error guardando vehículo:', err);
      toast.error(err.response?.data?.mensaje || 'Error al guardar vehículo');
    }
  };

  // Eliminar vehículo
  const handleEliminar = async (veh) => {
    const result = await Swal.fire({
      title: '¿Eliminar vehículo?',
      text: `¿Está seguro de eliminar el ${veh.tipo_vehiculo || 'vehículo'} #${veh.numero_vehiculo || ''} (${veh.placa_vehiculo || ''})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post('/vehiculo/eliminarVehiculo', { id_vehiculo: veh.id_vehiculo });
        if (res.data?.success) {
          toast.success('Vehículo eliminado correctamente');
          fetchVehiculos(page, filtros);
        } else {
          toast.error(res.data?.mensaje || 'Error al eliminar vehículo');
        }
      } catch (err) {
        console.error('Error eliminando vehículo:', err);
        toast.error('Error al eliminar vehículo');
      }
    }
  };

  // Resumen de estadísticas rápidas
  const stats = useMemo(() => {
    const camiones = vehiculos.filter(v => (v.tipo_vehiculo || '').toLowerCase().includes('camión') || (v.tipo_vehiculo || '').toLowerCase().includes('camion')).length;
    const camionetas = vehiculos.filter(v => (v.tipo_vehiculo || '').toLowerCase().includes('camioneta')).length;
    const autos = vehiculos.filter(v => (v.tipo_vehiculo || '').toLowerCase().includes('auto')).length;
    const activos = vehiculos.filter(v => Number(v.estado_vehiculo) === 1).length;
    return { camiones, camionetas, autos, activos };
  }, [vehiculos]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const renderBadgeTipo = (tipo) => {
    const t = (tipo || 'Camión').toUpperCase();
    if (t === 'CAMIÓN' || t === 'CAMION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <i className="fas fa-truck text-[9px]"></i> CAMIÓN
        </span>
      );
    }
    if (t === 'CAMIONETA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200/60">
          <i className="fas fa-truck-pickup text-[9px]"></i> CAMIONETA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/60">
        <i className="fas fa-car text-[9px]"></i> AUTOMÓVIL
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
              <i className="fas fa-truck-pickup text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Vehículos de la Cooperativa</h1>
              <p className="text-xs font-medium text-slate-500">
                {total} vehículo{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} (Camiones, Camionetas y Autos)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCrear}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
            >
              <i className="fas fa-plus-circle text-xs"></i> NUEVO VEHÍCULO
            </button>
            <button
              onClick={() => fetchVehiculos(page, filtros)}
              disabled={loading}
              className="h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all flex items-center justify-center shadow-sm"
              title="Actualizar listado"
            >
              <i className={`fas fa-sync-alt text-xs ${loading ? 'fa-spin text-indigo-600' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* ─── MINI DASHBOARD / STATS CARDS ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <i className="fas fa-truck"></i>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Camiones</div>
              <div className="text-base font-black text-slate-800">{stats.camiones}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-black">
              <i className="fas fa-truck-pickup"></i>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Camionetas</div>
              <div className="text-base font-black text-slate-800">{stats.camionetas}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <i className="fas fa-car"></i>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Automóviles</div>
              <div className="text-base font-black text-slate-800">{stats.autos}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Activos en Lista</div>
              <div className="text-base font-black text-slate-800">{stats.activos}</div>
            </div>
          </div>
        </div>

        {/* ─── FILTROS DE BÚSQUEDA ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {/* Tipo de Vehículo */}
            <div>
              <label className={labelCls}>Tipo de Vehículo</label>
              <SearchableSelect
                options={TIPOS_VEHICULO_OPTIONS}
                value={filtros.tipo}
                onChange={val => setFiltros(f => ({ ...f, tipo: val }))}
                placeholder="Todos los tipos"
              />
            </div>

            {/* Estado */}
            <div>
              <label className={labelCls}>Estado</label>
              <SearchableSelect
                options={ESTADOS_OPTIONS}
                value={filtros.estado}
                onChange={val => setFiltros(f => ({ ...f, estado: val }))}
                placeholder="Todos los estados"
              />
            </div>

            {/* Criterio / Búsqueda */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelCls}>Criterio de Búsqueda</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  value={filtros.busqueda}
                  placeholder="Número, placa, marca o responsable..."
                  onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
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

        {/* ─── TABLA DE VEHÍCULOS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-24">N° VEHÍCULO</th>
                  <th className="px-4 py-3 text-center w-32">TIPO</th>
                  <th className="px-4 py-3 text-center w-28">PLACA</th>
                  <th className="px-4 py-3 text-left">MARCA / MODELO</th>
                  <th className="px-4 py-3 text-left">RESPONSABLE / CONDUCTOR</th>
                  <th className="px-4 py-3 text-center w-28">TELÉFONO</th>
                  <th className="px-4 py-3 text-center w-24">ESTADO</th>
                  <th className="px-4 py-3 text-center w-24">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin text-indigo-600 text-lg"></i>
                        <span className="font-semibold text-slate-500">Cargando vehículos...</span>
                      </div>
                    </td>
                  </tr>
                ) : vehiculos.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      <i className="fas fa-truck-pickup text-4xl mb-3 block text-slate-300"></i>
                      <p className="font-bold text-slate-600 text-sm">No se encontraron vehículos</p>
                      <p className="text-xs text-slate-400 mt-0.5">Registre un nuevo vehículo o ajuste los filtros de búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  vehiculos.map((v, idx) => (
                    <tr key={v.id_vehiculo || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-800 font-mono text-sm">
                        #{v.numero_vehiculo || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderBadgeTipo(v.tipo_vehiculo)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">
                        {v.placa_vehiculo || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-bold text-slate-800">{v.marca_vehiculo || '-'}</div>
                        <div className="text-[11px] text-slate-400">{v.modelo_vehiculo || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold text-slate-800">
                          {v.personal_nombre || v.nombre_responsable || 'Sin asignar'}
                        </div>
                        {v.per_cedula_personal && (
                          <div className="text-[10px] text-slate-400 font-mono">C.I: {v.per_cedula_personal}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {v.per_celular_personal || v.telefono_responsable || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {Number(v.estado_vehiculo) === 1 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">ACTIVO</span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">INACTIVO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditar(v)}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                            title="Editar Vehículo"
                          >
                            <i className="fas fa-edit text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleEliminar(v)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Eliminar Vehículo"
                          >
                            <i className="fas fa-trash-alt text-sm"></i>
                          </button>
                        </div>
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

        {/* ─── MODAL CREAR / EDITAR VEHÍCULO ─── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedVehiculo(null); }}
          title={selectedVehiculo ? `Editar Vehículo #${selectedVehiculo.numero_vehiculo || ''}` : 'Nuevo Vehículo'}
          width="max-w-2xl"
        >
          <VehiculoForm
            initialData={selectedVehiculo}
            onSubmit={handleFormSubmit}
            onCancel={() => { setModalOpen(false); setSelectedVehiculo(null); }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default VehiculosPage;

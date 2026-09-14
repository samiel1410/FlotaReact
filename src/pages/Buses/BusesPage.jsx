import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../config/axios';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import Modal from '../../components/common/Modal';
import { BusForm } from './components/BusForm';
import MapaAsientosModal from './components/MapaAsientosModal';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export const BusesPage = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filtros
  const [filtros, setFiltros] = useState({
    disco_busqueda: '',
    id_socio: '',
    placa_busqueda: '',
    id_personal: '',
    estado_busqueda: '',
    anio_busqueda: '',
    codigo_busqueda: '',
  });

  // Combos para SearchableSelect
  const [sociosOptions, setSociosOptions] = useState([]);
  const [conductoresOptions, setConductoresOptions] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(false);

  // Modales
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [mapaBus, setMapaBus] = useState(null);
  const [mapaOpen, setMapaOpen] = useState(false);

  // Cargar combos de socios y conductores
  useEffect(() => {
    const fetchCombos = async () => {
      setLoadingCombos(true);
      try {
        const [socRes, condRes] = await Promise.all([
          api.get('/personal/socioSelectCombo'),
          api.get('/personal/personalSelectCombo')
        ]);

        if (socRes.data?.data) {
          const uniqueSocios = Array.from(
            new Map(socRes.data.data.map(s => [s.id_personal, s])).values()
          );
          const socOpts = uniqueSocios.map(s => ({
            value: String(s.id_personal),
            label: `${s.per_cedula_personal ? s.per_cedula_personal + ' - ' : ''}${s.per_nombres_persona || ''} ${s.per_apellidos_personal || ''}`.trim()
          }));
          setSociosOptions(socOpts);
        }

        if (condRes.data?.data) {
          const uniqueCond = Array.from(
            new Map(condRes.data.data.map(c => [c.id_personal, c])).values()
          );
          const condOpts = uniqueCond.map(c => ({
            value: String(c.id_personal),
            label: `${c.per_cedula_personal ? c.per_cedula_personal + ' - ' : ''}${c.per_nombres_persona || ''} ${c.per_apellidos_personal || ''}`.trim()
          }));
          setConductoresOptions(condOpts);
        }
      } catch (err) {
        console.error('Error cargando combos para filtros de buses:', err);
      } finally {
        setLoadingCombos(false);
      }
    };

    fetchCombos();
  }, []);

  // Cargar listado de buses
  const fetchBuses = useCallback(async (targetPage = 1, currentFilters = filtros) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: pageSize,
        disco_busqueda: currentFilters.disco_busqueda || '',
        id_socio: currentFilters.id_socio || '',
        placa_busqueda: currentFilters.placa_busqueda || '',
        id_personal: currentFilters.id_personal || '',
        estado_busqueda: currentFilters.estado_busqueda || '',
        anio_busqueda: currentFilters.anio_busqueda || '',
        codigo_busqueda: currentFilters.codigo_busqueda || '',
      };

      const res = await api.get('/buses/seleccionarBuses', { params });
      if (res.data?.success) {
        setBuses(Array.isArray(res.data.data) ? res.data.data : []);
        setTotal(res.data.total || 0);
        setPage(targetPage);
      } else {
        toast.error(res.data?.mensaje || 'Error al obtener listado de buses');
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast.error('Error de conexión al cargar buses');
    } finally {
      setLoading(false);
    }
  }, [filtros, pageSize]);

  useEffect(() => {
    fetchBuses(1, filtros);
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchBuses(1, filtros);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      disco_busqueda: '',
      id_socio: '',
      placa_busqueda: '',
      id_personal: '',
      estado_busqueda: '',
      anio_busqueda: '',
      codigo_busqueda: '',
    };
    setFiltros(emptyFilters);
    fetchBuses(1, emptyFilters);
  };

  const handleDescargarPlantilla = async () => {
    try {
      toast.loading('Descargando plantilla...', { id: 'download-plantilla' });
      const response = await api.get('/buses/descargarPlantilla', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_buses.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Plantilla descargada con éxito', { id: 'download-plantilla' });
    } catch (err) {
      console.error('Error descargando plantilla:', err);
      toast.error('Error al descargar la plantilla de buses', { id: 'download-plantilla' });
    }
  };

  const handleCreate = () => {
    setSelectedBus(null);
    setModalFormOpen(true);
  };

  const handleEdit = (bus) => {
    setSelectedBus(bus);
    setModalFormOpen(true);
  };

  const handleFormSaved = () => {
    setModalFormOpen(false);
    setSelectedBus(null);
    fetchBuses(page, filtros);
  };

  const handleMapaClick = (bus) => {
    setMapaBus(bus);
    setMapaOpen(true);
  };

  const handleMapaSaved = (nuevoMapaAsientos) => {
    if (mapaBus) {
      setMapaBus({ ...mapaBus, mapa_asientos: nuevoMapaAsientos });
    }
    setMapaOpen(false);
    fetchBuses(page, filtros);
  };

  const handleDelete = async (bus) => {
    const result = await Swal.fire({
      title: '¿Eliminar Bus?',
      html: `¿Está seguro de eliminar la unidad <b>N° ${bus.disco_buses || bus.codigo_buses || ''}</b> (Placa: <b>${bus.placa_buses || '-'}</b>)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-trash mr-1"></i> Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl text-xs px-4 py-2 font-bold',
        cancelButton: 'rounded-xl text-xs px-4 py-2 font-bold',
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post('/buses/eliminarBus', { id_bus: bus.id_buses });
        if (res.data?.success && res.data.tipo === 1) {
          toast.success(res.data.mensaje || 'Bus eliminado');
          fetchBuses(page, filtros);
        } else {
          Swal.fire({
            title: 'No se puede eliminar',
            text: res.data?.mensaje || 'El bus tiene registros asociados',
            icon: 'info',
            confirmButtonColor: '#4f46e5',
            customClass: { popup: 'rounded-2xl' }
          });
        }
      } catch (err) {
        console.error('Error eliminando bus:', err);
        toast.error('Error al intentar eliminar el bus');
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Métricas rápidas
  const stats = useMemo(() => {
    const activos = buses.filter(b => b.estado_buses == 1 || b.estado_buses === '1').length;
    const inactivos = buses.length - activos;
    return { activos, inactivos };
  }, [buses]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* ── HEADER SUPERIOR ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <i className="fas fa-bus text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">
                Flota de Buses
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100/80 text-blue-700 tracking-wide border border-blue-200">
                {total} {total === 1 ? 'UNIDAD' : 'UNIDADES'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Control, asignación de socios y configuración técnica de la flota
            </p>
          </div>
        </div>

        {/* Acciones Globales */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDescargarPlantilla}
            className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            title="Descargar plantilla Excel para importación masiva"
          >
            <i className="fas fa-file-excel text-emerald-600"></i>
            <span className="hidden sm:inline uppercase">Plantilla</span>
          </button>

          <button
            onClick={() => fetchBuses(page, filtros)}
            disabled={loading}
            className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Actualizar datos"
          >
            <i className={`fas fa-sync-alt text-slate-500 ${loading ? 'fa-spin' : ''}`}></i>
            <span className="hidden sm:inline uppercase">Actualizar</span>
          </button>

          <button
            onClick={handleCreate}
            className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all active:scale-95"
          >
            <i className="fas fa-plus"></i>
            <span>Nuevo Bus</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS AVANZADA (N° Bus, Socio, Placa, Conductor, Estado, Año) ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs shrink-0">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 items-end">
          
          {/* 1. N° Bus / Disco */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
              <i className="fas fa-hashtag text-indigo-500 mr-1"></i>N° Bus / Disco
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: 05, 12..."
                value={filtros.disco_busqueda}
                onChange={(e) => setFiltros({ ...filtros, disco_busqueda: e.target.value })}
                className="w-full h-8 pl-7 pr-2 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              />
              <i className="fas fa-bus-simple text-[10px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
            </div>
          </div>

          {/* 2. Socio (SearchableSelect) */}
          <div className="lg:col-span-2">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
              <i className="fas fa-handshake text-indigo-500 mr-1"></i>Socio Propietario
            </label>
            <SearchableSelect
              options={sociosOptions}
              value={filtros.id_socio}
              onChange={(val) => setFiltros({ ...filtros, id_socio: val || '' })}
              placeholder={loadingCombos ? "Cargando socios..." : "Buscar socio por nombre o cédula..."}
              isClearable={true}
              isLoading={loadingCombos}
              className="text-xs"
            />
          </div>

          {/* 3. Placa */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
              <i className="fas fa-id-card text-indigo-500 mr-1"></i>Placa
            </label>
            <input
              type="text"
              placeholder="Ej: TAA-1234..."
              value={filtros.placa_busqueda}
              onChange={(e) => setFiltros({ ...filtros, placa_busqueda: e.target.value })}
              className="w-full h-8 px-2.5 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase placeholder:text-slate-300"
            />
          </div>

          {/* 4. Conductor (SearchableSelect) */}
          <div className="lg:col-span-1 xl:col-span-1">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
              <i className="fas fa-user-tie text-indigo-500 mr-1"></i>Conductor
            </label>
            <SearchableSelect
              options={conductoresOptions}
              value={filtros.id_personal}
              onChange={(val) => setFiltros({ ...filtros, id_personal: val || '' })}
              placeholder="Todos los conductores"
              isClearable={true}
              className="text-xs"
            />
          </div>

          {/* 5. Estado */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
              <i className="fas fa-toggle-on text-indigo-500 mr-1"></i>Estado
            </label>
            <select
              value={filtros.estado_busqueda}
              onChange={(e) => setFiltros({ ...filtros, estado_busqueda: e.target.value })}
              className="w-full h-8 px-2 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
          </div>

          {/* 6. Botones Buscar y Limpiar */}
          <div className="flex items-center gap-1.5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-8 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-70"
            >
              <i className="fas fa-search text-[9px]"></i>
              <span>Filtrar</span>
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading}
              className="h-8 px-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all active:scale-95"
              title="Limpiar todos los filtros"
            >
              <i className="fas fa-rotate-left"></i>
            </button>
          </div>
        </form>
      </div>

      {/* ── CUERPO PRINCIPAL / TABLA DE BUSES ─────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden min-h-0 relative">
        <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8 text-center">#</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Código</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">N° Bus / Disco</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Placa</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Marca / Modelo</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Año</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Capacidad</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Pisos</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Conductor Asignado</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Auxiliar</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">Socios Propietarios</th>
                <th className="py-2.5 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(12).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-2 px-2 text-center"><Skeleton width={16} height={12} /></td>
                    <td className="py-2 px-2"><Skeleton width={50} height={12} /></td>
                    <td className="py-2 px-2"><Skeleton width={60} height={18} /></td>
                    <td className="py-2 px-2"><Skeleton width={70} height={14} /></td>
                    <td className="py-2 px-2"><Skeleton width={110} height={12} /></td>
                    <td className="py-2 px-2 text-center"><Skeleton width={35} height={12} /></td>
                    <td className="py-2 px-2 text-center"><Skeleton width={40} height={12} /></td>
                    <td className="py-2 px-2"><Skeleton width={50} height={14} /></td>
                    <td className="py-2 px-2"><Skeleton width={120} height={12} /></td>
                    <td className="py-2 px-2"><Skeleton width={100} height={12} /></td>
                    <td className="py-2 px-2"><Skeleton width={140} height={14} /></td>
                    <td className="py-2 px-2 text-center"><Skeleton width={50} height={14} /></td>
                    <td className="py-2 px-3 text-right"><Skeleton width={70} height={20} /></td>
                  </tr>
                ))
              ) : buses.length > 0 ? (
                buses.map((bus, idx) => {
                  const numFila = (page - 1) * pageSize + idx + 1;
                  const esActivo = bus.estado_buses == 1 || bus.estado_buses === '1' || bus.estado == 1;
                  
                  // Formatear socios
                  const sociosList = bus.socios || bus.socios_nombres || [];
                  const tieneSociosArray = Array.isArray(sociosList) && sociosList.length > 0;

                  return (
                    <tr key={bus.id_buses || idx} className="group hover:bg-indigo-50/25 transition-colors">
                      {/* # */}
                      <td className="py-2 px-2 text-slate-400 font-mono text-[10px] text-center font-bold">
                        {numFila}
                      </td>

                      {/* Código */}
                      <td className="py-2 px-2 text-slate-600 font-mono text-[10px] font-bold">
                        {bus.codigo_buses || '-'}
                      </td>

                      {/* N° Bus / Disco */}
                      <td className="py-2 px-2">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs shadow-2xs">
                          <i className="fas fa-bus text-[9px]"></i>
                          <span>Bus #{bus.disco_buses || bus.codigo_buses || '-'}</span>
                        </div>
                      </td>

                      {/* Placa */}
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800 font-mono font-black text-[11px] uppercase tracking-wider">
                          {bus.placa_buses || '-'}
                        </span>
                      </td>

                      {/* Marca / Modelo */}
                      <td className="py-2 px-2 text-slate-700 font-bold text-[11px]">
                        <div>{bus.marca_buses || '-'}</div>
                        {bus.modelo_buses && (
                          <div className="text-[9px] font-semibold text-slate-400">{bus.modelo_buses}</div>
                        )}
                      </td>

                      {/* Año */}
                      <td className="py-2 px-2 text-center text-slate-600 font-bold text-[11px]">
                        {bus.anio_buses || '-'}
                      </td>

                      {/* Capacidad */}
                      <td className="py-2 px-2 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-[11px]">
                          <i className="fas fa-chair text-[9px] text-slate-400"></i>
                          {bus.capacidad_buses || 0}
                        </span>
                      </td>

                      {/* Pisos */}
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${bus.pisos_buses == 2 ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {bus.pisos_buses == 2 ? '2 Pisos' : '1 Piso'}
                        </span>
                      </td>

                      {/* Conductor */}
                      <td className="py-2 px-2 text-slate-700 text-[10px]">
                        {bus.per_nombres_persona || bus.per_apellidos_personal ? (
                          <div className="flex items-center gap-1.5">
                            <i className="fas fa-user-tie text-slate-400 text-xs shrink-0"></i>
                            <div>
                              <div className="font-bold text-slate-800 leading-tight">
                                {`${bus.per_nombres_persona || ''} ${bus.per_apellidos_personal || ''}`.trim()}
                              </div>
                              {bus.per_cedula_personal && (
                                <div className="text-[9px] font-mono text-slate-400 leading-none">
                                  CI: {bus.per_cedula_personal}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Auxiliar */}
                      <td className="py-2 px-2 text-slate-700 text-[10px]">
                        {bus.auxiliar_nombres || bus.auxiliar_apellidos ? (
                          <div className="flex items-center gap-1.5">
                            <i className="fas fa-user text-slate-400 text-xs shrink-0"></i>
                            <div>
                              <div className="font-semibold text-slate-700 leading-tight">
                                {`${bus.auxiliar_nombres || ''} ${bus.auxiliar_apellidos || ''}`.trim()}
                              </div>
                              {bus.auxiliar_cedula && (
                                <div className="text-[9px] font-mono text-slate-400 leading-none">
                                  CI: {bus.auxiliar_cedula}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Socios Propietarios */}
                      <td className="py-2 px-2">
                        {tieneSociosArray ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {sociosList.map((s, sIdx) => {
                              const nombreSocio = typeof s === 'object'
                                ? `${s.per_nombres_persona || ''} ${s.per_apellidos_personal || ''}`.trim() || s.per_cedula_personal || `Socio #${s.id_socio}`
                                : String(s);
                              const cedulaSocio = typeof s === 'object' ? s.per_cedula_personal : '';

                              return (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[9px] leading-tight"
                                  title={cedulaSocio ? `Cédula: ${cedulaSocio}` : ''}
                                >
                                  <i className="fas fa-user-check text-[8px] text-amber-600"></i>
                                  <span className="truncate max-w-[150px]">{nombreSocio}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : bus.id_fksocio_buses ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[9px]">
                            <i className="fas fa-user-check text-[8px] text-amber-600"></i>
                            <span>Socio #{bus.id_fksocio_buses}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${esActivo ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${esActivo ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {esActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Configurar Mapa de Asientos */}
                          <button
                            onClick={() => handleMapaClick(bus)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                            title="Configurar Mapa de Asientos"
                          >
                            <i className="fas fa-chair text-[10px]"></i>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleEdit(bus)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                            title="Editar Datos del Bus"
                          >
                            <i className="fas fa-pen text-[10px]"></i>
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDelete(bus)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                            title="Eliminar Bus"
                          >
                            <i className="fas fa-trash text-[10px]"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <i className="fas fa-bus text-xl"></i>
                      </div>
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        No se encontraron buses
                      </h3>
                      <p className="text-[11px] font-medium text-slate-400 mt-1">
                        Intente ajustar o limpiar los filtros de búsqueda (N° Bus, Socio, Placa, Conductor, Estado).
                      </p>
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        <i className="fas fa-rotate-left mr-1"></i>Limpiar Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER / PAGINACIÓN ─────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            {total > 0 ? (
              <span>
                Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} unidades
              </span>
            ) : (
              <span>0 Unidades</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => page > 1 && fetchBuses(page - 1, filtros)}
              disabled={page <= 1 || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
              title="Página anterior"
            >
              <i className="fas fa-chevron-left text-[8px]"></i>
            </button>

            <div className="px-3 h-7 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-tight shadow-2xs">
              Página {page} de {totalPages}
            </div>

            <button
              onClick={() => page < totalPages && fetchBuses(page + 1, filtros)}
              disabled={page >= totalPages || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
              title="Página siguiente"
            >
              <i className="fas fa-chevron-right text-[8px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: NUEVO / EDITAR BUS ────────────────────────────────────────── */}
      {modalFormOpen && (
        <Modal
          isOpen={modalFormOpen}
          onClose={() => setModalFormOpen(false)}
          title={selectedBus ? `EDITAR BUS N° ${selectedBus.disco_buses || selectedBus.codigo_buses || ''}` : 'NUEVO BUS'}
          width="max-w-4xl"
        >
          <BusForm
            initialData={selectedBus}
            onSubmit={handleFormSaved}
            onCancel={() => setModalFormOpen(false)}
          />
        </Modal>
      )}

      {/* ── MODAL: MAPA DE ASIENTOS ─────────────────────────────────────────── */}
      {mapaOpen && (
        <MapaAsientosModal
          bus={mapaBus}
          isOpen={mapaOpen}
          onClose={() => setMapaOpen(false)}
          onSaved={handleMapaSaved}
        />
      )}
    </div>
  );
};

export default BusesPage;

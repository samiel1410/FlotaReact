import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { SubRutaModal } from './components/SubRutaModal';
import { TiemposParadasModal } from './components/TiemposParadasModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';

const fw = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
const fl = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
const ci = "w-full h-9 px-3 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white";
const cs = "w-full h-9 px-3 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white";

export const ConfigRutasPage = () => {
  const [refTab, setRefTab] = useState('provincias');
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [subrutas, setSubrutas] = useState([]);
  const [itinerarios, setItinerarios] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [catalogoCantones, setCatalogoCantones] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [saving, setSaving] = useState({});
  const [showSubRutaModal, setShowSubRutaModal] = useState(false);
  const [showTiemposModal, setShowTiemposModal] = useState(false);
  const [editingSubRutaIdx, setEditingSubRutaIdx] = useState(null);
  const [savingSubRuta, setSavingSubRuta] = useState(false);
  const detailRef = useRef(null);

  const { register, handleSubmit, reset, control, getValues, setValue } = useForm({
    defaultValues: { nombre_rutas: '', id_fkorigen_rutas: '', id_fkdestino_rutas: '', piso_rutas: '', andes_rutas: '', descripcion_rutas: '', estado_ruta: true }
  });

  useEffect(() => {
    api.get('/canton/cantonSeleccionarCombo').then(r => setCatalogoCantones(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
  }, []);

  const getCantonNombre = (id) => {
    const c = catalogoCantones.find(c => c.id_canton == id);
    return c ? c.nombre_canton : id;
  };

  const toArr = (data) => Array.isArray(data) ? data : [];

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await api.get('/rutas/rutasSeleccionPaginado?limit=500&page=1');
      setRoutes(toArr(res.data?.data));
    } catch { toast.error('Error al cargar rutas'); }
  }, []);

  const fetchSubrutas = useCallback(async (idRuta) => {
    if (!idRuta) { setSubrutas([]); return; }
    try {
      const res = await api.get(`/sub_rutas/rutasSeleccionPaginadoRuta?id_rutas=${idRuta}&limit=500`);
      setSubrutas(toArr(res.data?.data));
    } catch {}
  }, []);

  const fetchHorariosRuta = useCallback(async (idRuta) => {
    if (!idRuta) { setItinerarios([]); return; }
    try {
      const res = await api.get(`/rutas/horariosRuta?id_ruta=${idRuta}`);
      const data = res.data?.data;
      setItinerarios(Array.isArray(data) ? data : []);
    } catch { setItinerarios([]); }
  }, []);
  const fetchProvincias = useCallback(async () => {
    try { const r = await api.get('/provincia/provinciaSeleccionPaginado?limit=500&page=1'); setProvincias(toArr(r.data?.data)); } catch {}
  }, []);
  const fetchCiudades = useCallback(async () => {
    try { const r = await api.get('/canton/cantonSeleccionPaginado?limit=500&page=1'); setCiudades(toArr(r.data?.data)); } catch {}
  }, []);
  const fetchLugares = useCallback(async () => {
    try { const r = await api.get('/lugares/seleccionLugarCombo'); setLugares(toArr(r.data?.data)); } catch {}
  }, []);
  const fetchSucursales = useCallback(async () => {
    try { const r = await api.get('/sucursal/sucursalselect'); setSucursales(toArr(r.data?.data)); } catch {}
  }, []);

  const fetchViajes = useCallback(async (idRuta) => {
    if (!idRuta) { setViajes([]); return; }
    setLoadingViajes(true);
    try {
      const res = await api.get(`/viajes/listado?id_ruta=${idRuta}&limit=50`);
      setViajes(toArr(res.data?.data));
    } catch { setViajes([]); }
    finally { setLoadingViajes(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchRoutes(), fetchProvincias(), fetchCiudades(), fetchLugares(), fetchSucursales()]);
      setLoading(false);
    })();
  }, [fetchRoutes, fetchProvincias, fetchCiudades, fetchLugares, fetchSucursales]);

  useEffect(() => {
    if (selectedRoute) {
      fetchSubrutas(selectedRoute.id_rutas);
      fetchHorariosRuta(selectedRoute.id_rutas);
      const idRuta = selectedRoute.id_rutas;
      setLoadingViajes(true);
      api.get(`/viajes/listado?id_ruta=${idRuta}&limit=9999`).then(r => setViajes(toArr(r.data?.data))).catch(() => setViajes([])).finally(() => setLoadingViajes(false));
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } else { setSubrutas([]); setItinerarios([]); setViajes([]); }
  }, [selectedRoute, fetchSubrutas, fetchHorariosRuta]);

  const handleSelectRoute = (route) => setSelectedRoute(route);

  const openNewRoute = () => {
    setEditingRoute(null);
    reset({ nombre_rutas: '', id_fkorigen_rutas: '', id_fkdestino_rutas: '', piso_rutas: '', andes_rutas: '', descripcion_rutas: '', estado_ruta: true });
    setShowModal(true);
  };

  const openEditRoute = (route) => {
    setEditingRoute(route);
    reset({
      nombre_rutas: route.nombre_rutas || '',
      id_fkorigen_rutas: route.id_fkorigen_rutas || '',
      id_fkdestino_rutas: route.id_fkdestino_rutas || '',
      piso_rutas: route.piso_rutas || '',
      andes_rutas: route.andes_rutas || '',
      descripcion_rutas: route.descripcion_rutas || '',
      estado_ruta: route.estado_rutas == 1 || route.estado_rutas === '1',
    });
    setShowModal(true);
  };

  const onRouteSubmit = async (data) => {
    setSaving(p => ({ ...p, route: true }));
    try {
      const payload = {
        ...data, estado_ruta: data.estado_ruta ? 1 : 0, valor_rutas: data.valor_rutas || 0,
        nombre_rutas: data.nombre_rutas || (getCantonNombre(data.id_fkorigen_rutas) + ' - ' + getCantonNombre(data.id_fkdestino_rutas)),
      };
      if (editingRoute) payload.id_rutas = editingRoute.id_rutas;
      const res = await api.post('/rutas/insertarActualizarRutas', payload);
      
      let resData = res.data;
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData); } catch(e) {}
      }
      if (Array.isArray(resData)) {
        resData = resData[0];
      }

      if (resData?.success) {
        toast.success(editingRoute ? 'Ruta actualizada' : 'Ruta creada');
        setShowModal(false); setEditingRoute(null);
        await fetchRoutes();
      } else {
        toast.error(resData?.mensaje || (typeof res.data === 'object' ? JSON.stringify(res.data) : 'Error al guardar'));
      }
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.mensaje || err.message));
    } finally { setSaving(p => ({ ...p, route: false })); }
  };

  const handleDeleteRoute = async (route) => {
    const confirmDel = await Swal.fire({ title: '¿Eliminar ruta?', text: `¿Eliminar la ruta "${route.nombre_rutas || route.rut_nombre}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if (!confirmDel.isConfirmed) return;
    try {
      const res = await api.post('/rutas/eliminarRuta', { id_rutas: route.id_rutas });
      if (res.data?.success) {
        toast.success('Ruta eliminada');
        if (selectedRoute?.id_rutas === route.id_rutas) setSelectedRoute(null);
        await fetchRoutes();
      }
    } catch { toast.error('Error al eliminar'); }
  };

  const handleNewSubruta = () => {
    if (!selectedRoute) { toast.error('Seleccione una ruta'); return; }
    setEditingSubRutaIdx(null);
    setShowSubRutaModal(true);
  };
  const handleEditSubruta = (idx) => {
    setEditingSubRutaIdx(idx);
    setShowSubRutaModal(true);
  };
  const handleSaveSubrutaFromModal = async (data) => {
    const sr = {
      ...data,
      id_fkruta_sub_rutas: selectedRoute.id_rutas,
    };
    
    // Si es edición, usamos el ID existente; si no, cadena vacía
    const isEdit = editingSubRutaIdx !== null;
    if (isEdit) {
      sr.id_sub_rutas = subrutas[editingSubRutaIdx].id_sub_rutas;
    } else {
      sr.id_sub_rutas = '';
    }

    const payload = {
      ...(isEdit ? subrutas[editingSubRutaIdx] : {}),
      id_sub_rutas: sr.id_sub_rutas,
      id_fkruta_sub_rutas: sr.id_fkruta_sub_rutas,
      nombre_sub_rutas: sr.nombre_sub_rutas || (getCantonNombre(sr.id_fkorigen_sub_rutas) + ' - ' + getCantonNombre(sr.id_fkdestino_sub_rutas)),
      valor_sub_rutas: sr.valor_sub_rutas || 0,
      id_fkorigen_sub_rutas: sr.id_fkorigen_sub_rutas || '',
      id_fkdestino_sub_rutas: sr.id_fkdestino_sub_rutas || '',
      estado_sub_rutas: sr.estado_sub_rutas || '1',
      orden_sub_rutas: sr.orden_sub_rutas || 0,
      fecha_salida: sr.fecha_salida || new Date().toISOString().split('T')[0],
      hora_salida: sr.hora_salida || new Date().toTimeString().split(' ')[0],
    };

    setSavingSubRuta(true);
    try {
      const res = await api.post('/sub_rutas/insertarActualizarSubRutas', payload);
      if (res.data?.success) {
        toast.success(isEdit ? 'Subruta actualizada' : 'Subruta creada');
        await fetchSubrutas(selectedRoute.id_rutas);
        setShowSubRutaModal(false);
        setEditingSubRutaIdx(null);
      } else {
        toast.error('Error: ' + res.data?.error);
      }
    } catch (error) {
      console.error('Error guardando subruta desde el modal:', error);
      toast.error('Error al guardar la subruta en la base de datos');
    } finally {
      setSavingSubRuta(false);
    }
  };
  const handleDeleteSubruta = async (i) => {
    const confirmDel = await Swal.fire({ title: '¿Eliminar sub ruta?', text: '¿Eliminar esta sub ruta?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if (!confirmDel.isConfirmed) return;
    setSubrutas(prev => prev.filter((_, idx) => idx !== i));
  };
  const handleMoveUp = async (idx) => {
    if (idx <= 0) return;
    const u = [...subrutas];
    [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]];
    // Recalcular ordenes según posición
    const withOrden = u.map((sr, i) => ({ ...sr, orden_sub_rutas: i + 1 }));
    setSubrutas(withOrden);
    await _guardarOrden(withOrden);
  };
  const handleMoveDown = async (idx) => {
    if (idx >= subrutas.length - 1) return;
    const u = [...subrutas];
    [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]];
    const withOrden = u.map((sr, i) => ({ ...sr, orden_sub_rutas: i + 1 }));
    setSubrutas(withOrden);
    await _guardarOrden(withOrden);
  };
  const _guardarOrden = async (lista) => {
    try {
      const detalles = lista.map(sr => ({ id_sub_ruta: sr.id_sub_rutas, orden: sr.orden_sub_rutas }));
      await api.post('/sub_rutas/ActualizarOrdenSubRutas', { detalles_sub_ruta: JSON.stringify(detalles) });
    } catch (e) {
      console.error('Error actualizando orden de subrutas:', e);
      toast.error('Error al actualizar el orden');
    }
  };

  const handleSaveSubrutas = async () => {
    if (!selectedRoute) return;
    setSaving(p => ({ ...p, subrutas: true }));
    try {
      console.log('Enviando petición para guardar subrutas:', subrutas);
      for (const sr of subrutas) {
        const res = await api.post('/sub_rutas/insertarActualizarSubRutas', {
          id_sub_rutas: sr.id_sub_rutas?.toString().startsWith('nuevo') ? '' : sr.id_sub_rutas,
          id_fkruta_sub_rutas: selectedRoute.id_rutas,
          nombre_sub_rutas: sr.nombre_sub_rutas || (getCantonNombre(sr.id_fkorigen_sub_rutas) + ' - ' + getCantonNombre(sr.id_fkdestino_sub_rutas)),
          valor_sub_rutas: sr.valor_sub_rutas || 0, id_fkorigen_sub_rutas: sr.id_fkorigen_sub_rutas || '',
          id_fkdestino_sub_rutas: sr.id_fkdestino_sub_rutas || '',
          estado_sub_rutas: sr.estado_sub_rutas || '1', orden_sub_rutas: sr.orden_sub_rutas || 0,
          fecha_salida: sr.fecha_salida || new Date().toISOString().split('T')[0],
          hora_salida: sr.hora_salida || new Date().toTimeString().split(' ')[0],
        });
        console.log(`Respuesta de guardar subruta ${sr.nombre_sub_rutas}:`, res.data);
      }
      toast.success('Subrutas guardadas');
      await fetchSubrutas(selectedRoute.id_rutas);
    } catch (error) { 
      console.error('Error al guardar subrutas en el POST:', error?.response?.data || error);
      toast.error('Error al guardar subrutas'); 
    }
    finally { setSaving(p => ({ ...p, subrutas: false })); }
  };

  const handleSaveTiempos = async (tiemposMapped) => {
    if (!selectedRoute) return;
    setSaving(p => ({ ...p, tiempos: true }));
    try {
      const res = await api.post('/rutas/actualizarTiemposRuta', {
        id_rutas: selectedRoute.id_rutas,
        tiempos_paradas: tiemposMapped
      });
      if (res.data?.success) {
        toast.success('Tiempos de paradas actualizados');
        setSelectedRoute(prev => ({ ...prev, tiempos_paradas_rutas: JSON.stringify(tiemposMapped) }));
        setShowTiemposModal(false);
      } else {
        toast.error('Error: ' + res.data?.error);
      }
    } catch {
      toast.error('Error al guardar tiempos de paradas');
    } finally {
      setSaving(p => ({ ...p, tiempos: false }));
    }
  };

  const handleItinerarioChange = (i, f, v) => setItinerarios(prev => { const u = [...prev]; u[i] = { ...u[i], [f]: v }; return u; });
  const handleNewItinerario = () => {
    if (!selectedRoute) { toast.error('Seleccione una ruta'); return; }
    setItinerarios(prev => [...prev, {
      id_itinerario: 'nuevo-' + Date.now(), id_ruta: selectedRoute.id_rutas, hora: '06:00',
      activo: 'S', lunes: 'S', martes: 'S', miercoles: 'S', jueves: 'S', viernes: 'S', sabado: 'N', domingo: 'N',
    }]);
  };
  const handleDeleteItinerario = (i) => setItinerarios(prev => prev.filter((_, idx) => idx !== i));

  const handleSaveItinerarios = async () => {
    console.log('[handleSaveItinerarios] INICIO');
    if (!selectedRoute) { console.log('[handleSaveItinerarios] sin ruta'); return; }
    setSaving(p => ({ ...p, itinerarios: true }));
    try {
      const horarios = itinerarios.map(it => ({
        id_itinerario: it.id_itinerario?.toString().startsWith('nuevo') ? null : it.id_itinerario,
        hora: it.hora, activo: it.activo,
        lunes: it.lunes, martes: it.martes, miercoles: it.miercoles,
        jueves: it.jueves, viernes: it.viernes, sabado: it.sabado, domingo: it.domingo,
      }));
      console.log('[handleSaveItinerarios] horarios:', JSON.stringify(horarios));
      const res = await api.post('/rutas/actualizarHorarioRuta', { id_rutas: selectedRoute.id_rutas, horarios: JSON.stringify(horarios), fecha_inicio: '', fecha_fin: '' });
      console.log('[handleSaveItinerarios] respuesta:', res.data);
      if (res.data?.success !== false) {
        console.log('[handleSaveItinerarios] SUCCESS');
        toast.success('Itinerarios guardados');
        await fetchHorariosRuta(selectedRoute.id_rutas);
        const refreshRes = await api.get('/rutas/rutasSeleccionPaginado?limit=500&page=1');
        setRoutes(toArr(refreshRes.data?.data));
      } else {
        console.log('[handleSaveItinerarios] ERROR en respuesta:', res.data?.mensaje);
        toast.error(res.data?.mensaje || 'Error al guardar');
      }
    } catch (e) {
      console.error('[handleSaveItinerarios] EXCEPCION:', e);
      toast.error('Error al guardar itinerarios');
    }
    finally { console.log('[handleSaveItinerarios] FIN'); setSaving(p => ({ ...p, itinerarios: false })); }
  };

  const handleCancelForm = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  const handleDeleteLugar = async (l) => {
    const confirmDel = await Swal.fire({ title: '¿Eliminar lugar?', text: `¿Eliminar "${l.nombre_lugar}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if (!confirmDel.isConfirmed) return;
    try { const r = await api.post('/lugares/eliminarLugar', { id_lugar: l.id_lugar }); if (r.data?.success) { toast.success('Lugar eliminado'); await fetchLugares(); } } catch { toast.error('Error'); }
  };

  if (loading) return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500" />
        <span className="text-slate-500 font-medium">Cargando...</span>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50">
      <div className="p-4 lg:p-6 space-y-4 pb-24 max-w-full">

        {/* HEADER */}
        <div className="bg-white rounded-xl px-5 py-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-800 text-white rounded-lg flex items-center justify-center shrink-0">
              <i className="fas fa-cogs text-sm" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Configuración de Rutas</h1>
              <p className="text-xs text-slate-500">Gestión de rutas, subrutas, tarifas, horarios y localidades</p>
            </div>
          </div>
        </div>

        {/* RUTA SELECCIONADA — BANNER */}
        {selectedRoute && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <i className="fas fa-route text-indigo-600" />
              <span className="font-semibold text-indigo-800">{selectedRoute.nombre_rutas || selectedRoute.rut_nombre}</span>
              <span className="text-indigo-500">|</span>
              <span className="text-indigo-600">{selectedRoute.origen_nombre || selectedRoute.rut_origen} → {selectedRoute.destino_nombre || selectedRoute.rut_destino}</span>
              <span className="text-indigo-400 text-xs">${parseFloat(selectedRoute.valor_rutas || 0).toFixed(2)}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600">{subrutas.length} subrutas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">{itinerarios.length} horarios</span>
            </div>
            <button onClick={() => setSelectedRoute(null)} className="text-indigo-400 hover:text-indigo-600 text-sm" title="Deseleccionar">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* FILA 1: GRID DE RUTAS (full width) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <i className="fas fa-list text-slate-400 text-sm" />
              <span className="font-bold text-sm text-slate-700">RUTAS</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{routes.length}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={openNewRoute} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                <i className="fas fa-plus" />Nueva Ruta
              </button>
              <button onClick={fetchRoutes} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all">
                <i className="fas fa-sync" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Origen</th>
                  <th className="text-left px-4 py-2.5">Destino</th>
                  <th className="text-left px-4 py-2.5">Nombre Ruta</th>
                  <th className="text-right px-4 py-2.5">Valor</th>
                  <th className="text-center px-4 py-2.5 w-12">Act</th>
                  <th className="text-center px-4 py-2.5 w-12">Piso</th>
                  <th className="text-center px-4 py-2.5 w-12">Andén</th>
                  <th className="text-center px-4 py-2.5 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">No hay rutas registradas</td></tr>
                )}
                {routes.map((r, idx) => (
                  <tr key={r.id_rutas || idx}
                    onClick={() => handleSelectRoute(r)}
                    className={`border-t border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 text-sm ${selectedRoute?.id_rutas === r.id_rutas ? 'bg-indigo-50/70' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r.origen_nombre || r.rut_origen}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r.destino_nombre || r.rut_destino}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.nombre_rutas || r.rut_nombre}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">${parseFloat(r.valor_rutas || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {(r.estado_rutas == 1 || r.estado_ruta == 1)
                        ? <i className="fas fa-check-circle text-emerald-500 text-sm" />
                        : <i className="fas fa-times-circle text-red-400 text-sm" />
                      }
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{r.piso_rutas || '-'}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{r.andes_rutas || '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={e => { e.stopPropagation(); openEditRoute(r); }} className="text-indigo-500 hover:text-indigo-700" title="Editar">
                          <i className="fas fa-edit text-xs" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteRoute(r); }} className="text-red-400 hover:text-red-600" title="Eliminar">
                          <i className="fas fa-trash-alt text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FILA 2: SUBRUTAS + ITINERARIOS en 2 columnas iguales */}
        <div ref={detailRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SUBRUTAS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-code-branch text-slate-400 text-sm" />
                <span className="font-bold text-sm text-slate-700">SUBRUTAS</span>
                {selectedRoute && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{subrutas.length}</span>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowTiemposModal(true)} disabled={!selectedRoute} className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1">
                  <i className="fas fa-clock" />Tiempos Paradas
                </button>
                <button onClick={handleNewSubruta} disabled={!selectedRoute} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1">
                  <i className="fas fa-plus" />Agregar Sub Ruta
                </button>
                <button onClick={handleSaveSubrutas} disabled={!selectedRoute || saving.subrutas} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1">
                  {saving.subrutas ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}Guardar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[260px] overflow-y-auto flex-1">
              {!selectedRoute ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                  <i className="fas fa-hand-pointer mr-2" />Seleccione una ruta
                </div>
              ) : subrutas.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                  <i className="fas fa-plus-circle mr-2" />Presione "Agregar Sub Ruta" para agregar
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-2 py-2 w-10">Ord</th>
                      <th className="px-2 py-2">Origen</th>
                      <th className="px-2 py-2">Destino</th>
                      <th className="px-2 py-2 w-10">Act</th>
                      <th className="px-2 py-2 w-14">T.Serv</th>
                      <th className="px-2 py-2 w-20">Valor</th>
                      <th className="px-2 py-2 w-10">Min</th>
                      <th className="px-2 py-2 w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subrutas.map((sr, idx) => (
                      <tr key={sr.id_sub_rutas || idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-2 text-center font-bold text-slate-700">{sr.orden_sub_rutas || idx + 1}</td>
                        <td className="px-2 py-2 text-slate-700">{getCantonNombre(sr.id_fkorigen_sub_rutas)}</td>
                        <td className="px-2 py-2 text-slate-700">{getCantonNombre(sr.id_fkdestino_sub_rutas)}</td>
                        <td className="px-2 py-2 text-center">
                          {(sr.estado_sub_rutas == 1 || sr.estado_sub_rutas === '1')
                            ? <span className="text-emerald-600"><i className="fas fa-check-circle" /></span>
                            : <span className="text-red-400"><i className="fas fa-times-circle" /></span>
                          }
                        </td>
                        <td className="px-2 py-2 text-slate-600 text-center">{sr.tipo_servicio || '-'}</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-slate-700">${parseFloat(sr.valor_sub_rutas || 0).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center text-slate-600">{sr.minutos_sub_rutas || '-'}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 p-0.5" title="Subir"><i className="fas fa-chevron-up text-[10px]" /></button>
                            <button onClick={() => handleMoveDown(idx)} disabled={idx === subrutas.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 p-0.5" title="Bajar"><i className="fas fa-chevron-down text-[10px]" /></button>
                            <button onClick={() => handleEditSubruta(idx)} className="text-indigo-500 hover:text-indigo-700 p-0.5" title="Editar"><i className="fas fa-edit text-xs" /></button>
                            <button onClick={() => handleDeleteSubruta(idx)} className="text-red-400 hover:text-red-600 p-0.5" title="Eliminar"><i className="fas fa-trash-alt text-xs" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ITINERARIOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-clock text-slate-400 text-sm" />
                <span className="font-bold text-sm text-slate-700">ITINERARIOS</span>
                {selectedRoute && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{itinerarios.length}</span>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleNewItinerario} disabled={!selectedRoute} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1">
                  <i className="fas fa-plus" />
                </button>
                <button onClick={() => selectedRoute && fetchHorariosRuta(selectedRoute.id_rutas)} disabled={!selectedRoute} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold disabled:opacity-40 transition-all">
                  <i className="fas fa-sync" />
                </button>
                <button onClick={handleSaveItinerarios} disabled={!selectedRoute || saving.itinerarios} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1">
                  {saving.itinerarios ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}Guardar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[260px] overflow-y-auto flex-1">
              {!selectedRoute ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                  <i className="fas fa-hand-pointer mr-2" />Seleccione una ruta
                </div>
              ) : itinerarios.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                  <i className="fas fa-plus-circle mr-2" />Presione + para agregar horario
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-2 py-2 w-16">Hora</th>
                      <th className="px-2 py-2 w-10">Act</th>
                      <th className="px-2 py-2 w-8">L</th>
                      <th className="px-2 py-2 w-8">M</th>
                      <th className="px-2 py-2 w-8">X</th>
                      <th className="px-2 py-2 w-8">J</th>
                      <th className="px-2 py-2 w-8">V</th>
                      <th className="px-2 py-2 w-8">S</th>
                      <th className="px-2 py-2 w-8">D</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itinerarios.map((it, idx) => (
                      <tr key={it.id_itinerario || idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-1"><input type="time" value={it.hora ? it.hora.substring(0, 5) : '06:00'} onChange={e => handleItinerarioChange(idx, 'hora', e.target.value)} className={ci} /></td>
                        <td className="px-2 py-1">
                          <select value={it.activo || 'S'} onChange={e => handleItinerarioChange(idx, 'activo', e.target.value)} className={cs}>
                            <option value="S">S</option><option value="N">N</option>
                          </select>
                        </td>
                        {['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(d => (
                          <td key={d} className="px-1 py-1">
                            <select value={it[d] || 'N'} onChange={e => handleItinerarioChange(idx, d, e.target.value)} className={cs}>
                              <option value="S">S</option><option value="N">N</option>
                            </select>
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={() => handleDeleteItinerario(idx)} className="text-red-400 hover:text-red-600"><i className="fas fa-minus-circle" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* FILA 2.5: VIAJES GENERADOS */}
        {selectedRoute && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-bus text-slate-400 text-sm" />
                <span className="font-bold text-sm text-slate-700">VIAJES GENERADOS</span>
                {viajes.length > 0 && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{viajes.length}</span>}
              </div>
            </div>
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              {loadingViajes ? (
                <div className="flex items-center justify-center h-16 text-slate-400 text-xs"><i className="fas fa-spinner fa-spin mr-2" />Cargando...</div>
              ) : viajes.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-slate-400 text-xs">
                  <i className="fas fa-info-circle mr-2" />No hay viajes generados. Guarde los itinerarios para generar viajes automáticamente.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Hora Salida</th>
                      <th className="text-left px-3 py-2">Bus</th>
                      <th className="text-left px-3 py-2">Conductor</th>
                      <th className="text-center px-3 py-2 w-20">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajes.map((v, idx) => (
                      <tr key={v.id_viajes || idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 font-medium">{v.fecha_viaje || (v.fecha_cierre ? new Date(v.fecha_cierre).toLocaleDateString('es-EC') : '-')}</td>
                        <td className="px-3 py-2 text-slate-700">{v.hora_salida ? v.hora_salida.substring(0, 5) : (v.hora_origen_estimado ? v.hora_origen_estimado.substring(0, 5) : '-')}</td>
                        <td className="px-3 py-2 text-slate-600">{v.nombre_bus || v.placa_bus || v.bus_placa || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{v.chofer_viaje || v.chofer_viajes || v.conductor_nombre || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          {v.estado_viajes == 1 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Programado</span>}
                          {v.estado_viajes == 2 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Despachado</span>}
                          {v.estado_viajes == 3 && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Realizado</span>}
                          {v.estado_viajes == 4 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Cancelado</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* FILA 3: REFERENCIA (tabs compactos) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-1 px-5 pt-3 pb-0 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Referencia:</span>
            {[
              { key: 'provincias', label: 'Provincias', icon: 'fa-map' },
              { key: 'ciudades', label: 'Ciudades', icon: 'fa-city' },
              { key: 'lugares', label: 'Lugares', icon: 'fa-map-marker-alt' },
              { key: 'sucursales', label: 'Sucursales', icon: 'fa-store' },
            ].map(t => (
              <button key={t.key} onClick={() => setRefTab(t.key)}
                className={`py-2 px-3 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  refTab === t.key ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              ><i className={`fas ${t.icon}`} />{t.label}</button>
            ))}
          </div>
          <div className="p-0 overflow-x-auto max-h-[220px] overflow-y-auto">
            {/* PROVINCIAS */}
            {refTab === 'provincias' && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="text-left px-4 py-2 w-16">ID</th>
                    <th className="text-left px-4 py-2">Provincia</th>
                  </tr>
                </thead>
                <tbody>
                  {provincias.length === 0 ? (
                    <tr><td colSpan={2} className="text-center py-6 text-slate-400">Sin datos</td></tr>
                  ) : provincias.map((p, i) => (
                    <tr key={p.id_provincia || i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-400">{p.id_provincia}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{p.nombre_provincia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* CIUDADES */}
            {refTab === 'ciudades' && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="text-left px-4 py-2 w-16">ID</th>
                    <th className="text-left px-4 py-2">Ciudad / Cantón</th>
                    <th className="text-left px-4 py-2">Provincia</th>
                  </tr>
                </thead>
                <tbody>
                  {ciudades.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-6 text-slate-400">Sin datos</td></tr>
                  ) : ciudades.map((c, i) => (
                    <tr key={c.id_canton || i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-400">{c.id_canton}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{c.nombre_canton}</td>
                      <td className="px-4 py-2 text-slate-500">{c.nombre_provincia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* LUGARES */}
            {refTab === 'lugares' && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="text-left px-4 py-2 w-16">ID</th>
                    <th className="text-left px-4 py-2">Nombre</th>
                    <th className="text-left px-4 py-2">Ciudad</th>
                    <th className="text-left px-4 py-2">Provincia</th>
                    <th className="text-center px-4 py-2 w-14">Estado</th>
                    <th className="text-center px-4 py-2 w-16">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lugares.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-400">Sin datos</td></tr>
                  ) : lugares.map((l, i) => (
                    <tr key={l.id_lugar || i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-400">{l.id_lugar}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{l.nombre_lugar}</td>
                      <td className="px-4 py-2 text-slate-500">{l.nombre_canton}</td>
                      <td className="px-4 py-2 text-slate-500">{l.nombre_provincia}</td>
                      <td className="px-4 py-2 text-center">
                        {l.estado_lugar == 1 ? <span className="text-emerald-600 font-bold text-xs">Activo</span> : <span className="text-red-400 text-xs">Inactivo</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => handleDeleteLugar(l)} className="text-red-400 hover:text-red-600" title="Eliminar"><i className="fas fa-trash-alt text-xs" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* SUCURSALES */}
            {refTab === 'sucursales' && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Código</th>
                    <th className="text-left px-4 py-2">Nombre</th>
                    <th className="text-left px-4 py-2">Ciudad</th>
                    <th className="text-left px-4 py-2">Dirección</th>
                    <th className="text-left px-4 py-2">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {sucursales.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400">Sin datos</td></tr>
                  ) : sucursales.map((s, i) => (
                    <tr key={s.id_sucursal || s.suc_codigo_sucursal || i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-400">{s.suc_codigo_sucursal || s.codigo || '-'}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{s.nombre_sucursal}</td>
                      <td className="px-4 py-2 text-slate-500">{s.ciudad_sucursal}</td>
                      <td className="px-4 py-2 text-slate-500">{s.direccion_sucursal}</td>
                      <td className="px-4 py-2 text-slate-500">{s.telefono_sucursal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: Nueva / Editar Ruta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleCancelForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <i className="fas fa-route text-blue-400" />
                {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
              </h2>
              <button onClick={handleCancelForm} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleSubmit(onRouteSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={fl}>Origen</label>
                  <Controller
                    name="id_fkorigen_rutas"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={catalogoCantones.map(c => ({
                          value: c.id_canton,
                          label: c.nombre_canton,
                        }))}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          const o = catalogoCantones.find(c => c.id_canton == val)?.nombre_canton || '';
                          const d = catalogoCantones.find(c => c.id_canton == getValues('id_fkdestino_rutas'))?.nombre_canton || '';
                          if (o && d) setValue('nombre_rutas', o + ' - ' + d);
                        }}
                        placeholder="Buscar origen..."
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={fl}>Destino</label>
                  <Controller
                    name="id_fkdestino_rutas"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={catalogoCantones.map(c => ({
                          value: c.id_canton,
                          label: c.nombre_canton,
                        }))}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          const d = catalogoCantones.find(c => c.id_canton == val)?.nombre_canton || '';
                          const o = catalogoCantones.find(c => c.id_canton == getValues('id_fkorigen_rutas'))?.nombre_canton || '';
                          if (o && d) setValue('nombre_rutas', o + ' - ' + d);
                        }}
                        placeholder="Buscar destino..."
                      />
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <label className={fl}>Nombre de la Ruta</label>
                  <input type="text" {...register('nombre_rutas')} className={fw} placeholder="Ej: Pelileo - Ambato" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={fl}>Piso</label><input type="number" {...register('piso_rutas')} className={fw} /></div>
                <div><label className={fl}>Andén</label><input type="number" {...register('andes_rutas')} className={fw} /></div>
                <div className="flex items-end pb-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" {...register('estado_ruta')} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
                  </label>
                </div>
              </div>
              <div>
                <label className={fl}>Recorrido / Descripción</label>
                <textarea {...register('descripcion_rutas')} readOnly rows={2} className={`${fw} bg-slate-50 text-slate-500`} placeholder="Se genera automáticamente" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={handleCancelForm} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-bold transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving.route} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-60 flex items-center gap-2">
                  {saving.route ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : <><i className="fas fa-save" />Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva / Editar Sub Ruta */}
      <SubRutaModal
        open={showSubRutaModal}
        onClose={() => { setShowSubRutaModal(false); setEditingSubRutaIdx(null); }}
        onSave={handleSaveSubrutaFromModal}
        subruta={editingSubRutaIdx !== null ? subrutas[editingSubRutaIdx] : null}
        catalogoCantones={catalogoCantones}
        nextOrden={subrutas.length + 1}
        saving={savingSubRuta}
      />

      {/* MODAL: Tiempos de Paradas */}
      <TiemposParadasModal
        open={showTiemposModal}
        onClose={() => setShowTiemposModal(false)}
        route={selectedRoute}
        sucursales={sucursales}
        subrutas={subrutas}
        catalogoCantones={catalogoCantones}
        onSave={handleSaveTiempos}
        saving={saving.tiempos}
      />
    </div>
  );
};


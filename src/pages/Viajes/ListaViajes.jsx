import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ViajesService from '../../services/viajes.service';
import { DespachoViajeModal } from './components/DespachoViajeModal';
import { ItinerarioViajeModal } from './components/ItinerarioViajeModal';
import { ConfigurarAlimentosModal } from './components/ConfigurarAlimentosModal';
import { useAuth } from '../../context/AuthContext';

const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

const ESTADOS = [
  { id: '0', nombre: 'Todos' },
  { id: '1', nombre: 'En Curso' },
  { id: '2', nombre: 'Despachado' },
  { id: '3', nombre: 'Cancelado' },
  { id: '4', nombre: 'Automático' },
];

export const ListaViajes = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const isAdmin = user?.id_fkrol_usuario == 1 || user?.id_fkrol_usuario == 2 || user?.id_rol == 1 || user?.id_rol == 2 || user?.rol == 1 || user?.rol == 2;
  const localDate = new Date();
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  const today = localDate.toISOString().split('T')[0];

  // Filtros
  const [filtros, setFiltros] = useState({
    fecha_inicio: today,
    fecha_fin: today,
    id_bus: '',
    id_chofer: '',
    estado_viaje: '2',
    criterio_busqueda: '',
  });

  // Combos
  const [buses, setBuses] = useState([]);
  const [choferes, setChoferes] = useState([]);

  // Modales
  const [modalDespacho, setModalDespacho] = useState(null);
  const [modalItinerario, setModalItinerario] = useState(null);
  const [modalAlimentos, setModalAlimentos] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(null);

  // Cargar combos
  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          ViajesService.getBuses(),
          ViajesService.getPersonal({ limit: 9999 }),
        ]);
        if (bRes.success) setBuses(bRes.data);
        if (pRes.success) setChoferes(pRes.data);
      } catch (e) { console.error('Error loading combos:', e); }
    };
    loadCombos();
  }, []);

  // Cargar viajes
  const fetchTrips = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { ...filtros, page: pageNum, limit, id_sucursal: user?.id_sucursal || user?.sucursal };
      Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k]; });
      const response = await ViajesService.getTrips(params);
      if (response.success) {
        setTrips(response.data);
        setTotal(response.total);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, [filtros, limit, searchTrigger, user]);

  useEffect(() => { fetchTrips(page); }, [page, searchTrigger]);

  const handleBuscar = () => {
    setPage(1);
    setSearchTrigger(t => t + 1);
  };
  const handleLimpiar = () => {
    const localDate = new Date();
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const today = localDate.toISOString().split('T')[0];
    setFiltros({ fecha_inicio: today, fecha_fin: today, id_bus: '', id_chofer: '', estado_viaje: '2', criterio_busqueda: '' });
    setPage(1);
    setSearchTrigger(t => t + 1);
  };

  const totalPages = Math.ceil(total / limit);

  // ─── ACCIONES ──────────────────────────────────────────────────────────
  const handleDespachar = (trip) => {
    setMenuAbierto(null);
    setModalDespacho(trip);
  };

  const handlePdfDespacho = async (trip) => {
    setMenuAbierto(null);
    if (trip.estado_viajes != 2) {
      toast.error('El viaje debe estar despachado para generar PDF');
      return;
    }
    window.open(`php/despachoViajePdf.php?id_viajes=${trip.id_viajes}`, '_blank');
  };

  const handleImprimirPasajeros = (trip) => {
    setMenuAbierto(null);
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const url = `${baseUrl}/php/imprimirPasajeros.php?inline=1&id_viaje=${trip.id_viajes}`;
    Swal.fire({
      title: `Pasajeros — Viaje #${trip.id_viajes}`,
      html: `<iframe src="${url}" style="width:100%;height:80vh;border:0;border-radius:8px;"></iframe>`,
      width: '900px', showConfirmButton: false, showCloseButton: true,
      customClass: { popup: 'rounded-2xl' }
    });
  };



  const handleAlimentos = (trip) => {
    setMenuAbierto(null);
    setModalAlimentos(trip);
  };

  const handleReversarDespacho = async (trip) => {
    setMenuAbierto(null);
    const result = await Swal.fire({
      title: '¿Reversar Despacho?',
      text: 'El viaje volverá a estar "En Curso". Se eliminará el registro del despacho y los cobros relacionados volverán a estar pendientes. ¿Está seguro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, reversar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await ViajesService.reversarDespacho(trip.id_viajes);
        if (response.success) {
          toast.success('Despacho reversado correctamente');
          fetchTrips(page);
        } else {
          toast.error(response.message || 'Error al reversar el despacho');
        }
      } catch (error) {
        toast.error('Error de red al intentar reversar el despacho');
      }
    }
  };

  const handleTiempoExtra = async (trip) => {
    setMenuAbierto(null);
    const result = await Swal.fire({
      title: 'Habilitar Tiempo Extra',
      html: `
        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
          Ingresa los minutos extras que deseas habilitar para permitir la venta de boletos en este viaje despachado:
        </p>
        <input type="number" id="swal-input-minutos" class="swal2-input" placeholder="Ej. 30" value="30" min="1" step="1">
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Habilitar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const input = document.getElementById('swal-input-minutos');
        if (!input || !input.value || parseInt(input.value) <= 0) {
          Swal.showValidationMessage('Debes ingresar un número válido de minutos mayor a 0');
          return false;
        }
        return parseInt(input.value);
      }
    });

    if (result.isConfirmed) {
      const minutos = result.value;
      try {
        const response = await ViajesService.habilitarTiempoExtra(trip.id_viajes, minutos);
        if (response.success) {
          toast.success(`Tiempo extra habilitado correctamente. (${minutos} min)`);
          fetchTrips(page);
        } else {
          toast.error(response.message || 'Error al habilitar tiempo extra');
        }
      } catch (error) {
        toast.error('Error de red al intentar habilitar tiempo extra');
      }
    }
  };

  // ─── RENDER ESTADO ────────────────────────────────────────────────────
  const renderEstado = (value) => {
    const map = {
      1: { label: 'En Curso', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      2: { label: 'Despachado', bg: 'bg-amber-100', text: 'text-amber-800' },
      3: { label: 'Cancelado', bg: 'bg-rose-100', text: 'text-rose-800' },
      4: { label: 'Automático', bg: 'bg-blue-100', text: 'text-blue-800' },
    };
    const e = map[value] || { label: value || '?', bg: 'bg-slate-100', text: 'text-slate-600' };
    return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${e.bg} ${e.text}`}>{e.label}</span>;
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 pb-32">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="h-11 w-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <i className="fas fa-bus text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Listado de Viajes</h1>
            <p className="text-xs font-medium text-slate-500">{total} viajes encontrados</p>
          </div>
        </div>

        {/* Filtros (como ExtJS) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bus</label>
              <select value={filtros.id_bus} onChange={e => setFiltros(f => ({ ...f, id_bus: e.target.value }))}
                className={inputCls}>
                <option value="">Todos los buses</option>
                {buses.map(b => (
                  <option key={b.id_buses || b.bus_id} value={b.id_buses || b.bus_id}>
                    {b.disco_buses || b.codigo_buses} - {b.placa_buses || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Chofer</label>
              <select value={filtros.id_chofer} onChange={e => setFiltros(f => ({ ...f, id_chofer: e.target.value }))}
                className={inputCls}>
                <option value="">Todos los choferes</option>
                {choferes.map(c => (
                  <option key={c.id_personal || c.per_codigo_personal} value={c.id_personal || c.per_codigo_personal}>
                    {c.per_nombres_persona || c.nombre_personal}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={filtros.estado_viaje} onChange={e => setFiltros(f => ({ ...f, estado_viaje: e.target.value }))}
                className={inputCls}>
                {ESTADOS.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Viaje / Ruta</label>
              <input type="text" value={filtros.criterio_busqueda} placeholder="Buscar..."
                onChange={e => setFiltros(f => ({ ...f, criterio_busqueda: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleBuscar}
              className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
              <i className="fas fa-search text-xs"></i> BUSCAR
            </button>
            <button onClick={handleLimpiar}
              className="h-8 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest">
              <i className="fas fa-eraser text-xs"></i> LIMPIAR
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
          <div className="overflow-visible">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-3 py-3 text-center w-14">ID</th>
                  <th className="px-3 py-3 text-center w-20">BUS</th>
                  <th className="px-3 py-3 text-left">CHOFER</th>
                  <th className="px-3 py-3 text-left">AUXILIAR</th>
                  <th className="px-3 py-3 text-left">RUTA</th>
                  <th className="px-3 py-3 text-center w-20">PASAJ</th>
                  <th className="px-3 py-3 text-center w-24">ESTADO</th>
                  <th className="px-3 py-3 text-right w-24">TOTAL</th>
                  <th className="px-3 py-3 text-center w-24">FECHA</th>
                  <th className="px-3 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="10" className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Cargando viajes...
                  </td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-12 text-slate-400 font-bold">No hay viajes para mostrar</td></tr>
                ) : trips.map((t, idx) => (
                  <tr key={t.id_viajes || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">{t.id_viajes}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">{t.nombre_bus || '-'}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-[10px] leading-tight">
                        <div className="font-semibold text-slate-700">{t.chofer_viaje || 'Sin asignar'}</div>
                        <div className="text-slate-400">{t.cedula_chofer || ''}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[10px] leading-tight">
                        <div className="font-semibold text-slate-700">{t.auxiliar_viaje || 'Sin asignar'}</div>
                        <div className="text-slate-400">{t.cedula_auxiliar || ''}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{t.nombre_ruta || '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-black ${parseInt(t.cantidad_boletos) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {t.cantidad_boletos || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{renderEstado(t.estado_viajes)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                      ${parseFloat(t.total_recaudado || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{t.fecha_viaje || '-'}</td>
                    <td className="px-3 py-2.5 text-center relative">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setMenuAbierto(menuAbierto === t.id_viajes ? null : t.id_viajes);
                      }}
                        className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all relative">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      {menuAbierto === t.id_viajes && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(null)} />
                          <div className={`absolute right-10 ${idx >= trips.length - 2 && trips.length > 3 ? 'bottom-0 mb-1' : 'top-0 mt-1'} z-[9999] w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden`}>
                            {[
                              { icon: 'fa-eye', label: 'Despachar Viaje', action: () => handleDespachar(t), color: 'text-emerald-600', show: t.estado_viajes == 1 },
                              { icon: 'fa-undo', label: 'Reversar Despacho', action: () => handleReversarDespacho(t), color: 'text-rose-600', show: t.estado_viajes == 2 && isAdmin },
                              { icon: 'fa-clock', label: 'Habilitar Tiempo Extra', action: () => handleTiempoExtra(t), color: 'text-blue-600', show: t.estado_viajes == 2 },
                              { icon: 'fa-file-pdf', label: 'PDF Despacho', action: () => handlePdfDespacho(t), color: 'text-rose-600', show: t.estado_viajes == 2 },
                              { icon: 'fa-print', label: 'Imprimir Pasajeros', action: () => handleImprimirPasajeros(t), color: 'text-blue-600', show: true },
                              { icon: 'fa-utensils', label: 'Configurar Alimentos', action: () => handleAlimentos(t), color: 'text-orange-600', show: true },
                            ].filter(item => item.show !== false).map((item, i) => (
                              <button key={i} onClick={item.action}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors text-left">
                                <i className={`fas ${item.icon} ${item.color} w-4 text-center`}></i>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500">
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
              </span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="h-7 px-3 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? (
                    <button key={p} onClick={() => setPage(p)}
                      className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-all ${p === page ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      {p}
                    </button>
                  ) : null;
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="h-7 px-3 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {modalDespacho && (
        <DespachoViajeModal
          trip={modalDespacho}
          onClose={() => { setModalDespacho(null); fetchTrips(page); }}
        />
      )}
      {modalItinerario && (
        <ItinerarioViajeModal
          trip={modalItinerario}
          onClose={() => setModalItinerario(null)}
        />
      )}
      {modalAlimentos && (
        <ConfigurarAlimentosModal
          trip={modalAlimentos}
          onClose={() => setModalAlimentos(null)}
        />
      )}
    </div>
  );
};

export default ListaViajes;

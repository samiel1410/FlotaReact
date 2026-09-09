import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ViajesService from '../../services/viajes.service';
import { DespachoViajeModal } from './components/DespachoViajeModal';
import { ItinerarioViajeModal } from './components/ItinerarioViajeModal';
import { ConfigurarAlimentosModal } from './components/ConfigurarAlimentosModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';
import { useAuth } from '../../context/AuthContext';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';

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

  // Modal PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');

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
      } catch (e) {
        console.error('Error loading combos:', e);
      }
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
      console.error('Error cargando viajes:', error);
      toast.error('Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, [filtros, limit, user]);

  useEffect(() => {
    fetchTrips(1);
  }, [searchTrigger]);

  const handleBuscar = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setSearchTrigger(prev => prev + 1);
  };

  const handleLimpiar = () => {
    const localDate = new Date();
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const today = localDate.toISOString().split('T')[0];
    setFiltros({
      fecha_inicio: today,
      fecha_fin: today,
      id_bus: '',
      id_chofer: '',
      estado_viaje: '2',
      criterio_busqueda: '',
    });
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
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const nombreUsuario = user?.nombre_usuario || user?.nombre || user?.username || '';

    // Si tiene múltiples despachos registrados, permitir seleccionar cuál imprimir
    if (trip.despachos && trip.despachos.length > 1) {
      const inputOptions = {};
      trip.despachos.forEach(d => {
        const oficina = d.nombre_sucursal || `Oficina #${d.id_fksucursal_usuario || ''}`;
        const motivo = d.motivo_despacho_viaje || 'Despacho';
        const hora = d.hora_salida_despacho_viaje ? ` (${String(d.hora_salida_despacho_viaje).substring(0, 5)})` : '';
        const userTxt = d.usuario_despacho ? ` - ${d.usuario_despacho}` : '';
        inputOptions[d.id_despacho_viaje] = `Despacho #${d.id_despacho_viaje}: ${oficina} [${motivo}]${hora}${userTxt}`;
      });

      const { value: selectedDespacho } = await Swal.fire({
        title: 'Seleccionar Despacho de Oficina',
        text: `Este viaje cuenta con ${trip.despachos.length} despachos de oficina. Elija cuál desea imprimir:`,
        input: 'radio',
        inputOptions: inputOptions,
        inputValue: String(trip.despachos[trip.despachos.length - 1].id_despacho_viaje),
        showCancelButton: true,
        confirmButtonText: 'Ver PDF',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5'
      });

      if (!selectedDespacho) return;

      setPdfUrl(baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?id_despacho=${selectedDespacho}&usuario=${encodeURIComponent(nombreUsuario)}`));
      setPdfTitle(`Despacho #${selectedDespacho} — Viaje #${trip.id_viajes}`);
      setPdfModalOpen(true);
      return;
    }

    const idDesp = trip.despachos && trip.despachos.length === 1 ? trip.despachos[0].id_despacho_viaje : (trip.id_despacho_viaje || '');
    const urlParam = idDesp ? `id_despacho=${idDesp}&id_viajes=${trip.id_viajes}` : `id_viajes=${trip.id_viajes}`;
    setPdfUrl(baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?${urlParam}&usuario=${encodeURIComponent(nombreUsuario)}`));
    setPdfTitle(`Despacho — Viaje #${trip.id_viajes}`);
    setPdfModalOpen(true);
  };

  const handleImprimirPasajeros = (trip) => {
    setMenuAbierto(null);
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const nombreUsuario = user?.nombre_usuario || user?.nombre || user?.username || '';
    setPdfUrl(baseUrl + buildPdfUrl(`/php/imprimirPasajeros.php?inline=1&id_viaje=${trip.id_viajes}&usuario=${encodeURIComponent(nombreUsuario)}`));
    setPdfTitle(`Lista de Pasajeros — Viaje #${trip.id_viajes}`);
    setPdfModalOpen(true);
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

        {/* Filtros de Búsqueda */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros de Búsqueda</div>
          
          {/* Fila 1: 4 Selectores / Controles Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* Rango de Fechas Unificado */}
            <div>
              <label className={labelCls}>Rango de Fechas (Desde - Hasta)</label>
              <DateRangePicker
                startDate={filtros.fecha_inicio}
                endDate={filtros.fecha_fin}
                onChange={({ startDateStr, endDateStr }) => {
                  setFiltros(f => ({ ...f, fecha_inicio: startDateStr, fecha_fin: endDateStr }));
                }}
              />
            </div>

            {/* Bus con Buscador Integrado */}
            <div>
              <label className={labelCls}>Bus</label>
              <SearchableSelect
                options={buses.map(b => ({
                  value: String(b.id_buses || b.bus_id),
                  label: `${b.disco_buses || b.codigo_buses || ''} ${b.placa_buses ? `(${b.placa_buses})` : ''}`.trim()
                }))}
                value={filtros.id_bus}
                onChange={val => setFiltros(f => ({ ...f, id_bus: val }))}
                placeholder="Todos los buses"
              />
            </div>

            {/* Chofer con Buscador Integrado */}
            <div>
              <label className={labelCls}>Chofer</label>
              <SearchableSelect
                options={choferes.map(c => ({
                  value: String(c.id_personal || c.per_codigo_personal),
                  label: `${c.per_nombres_persona || c.nombre_personal || ''} ${c.per_apellidos_personal || ''}`.trim()
                }))}
                value={filtros.id_chofer}
                onChange={val => setFiltros(f => ({ ...f, id_chofer: val }))}
                placeholder="Todos los choferes"
              />
            </div>

            {/* Estado con Buscador Integrado */}
            <div>
              <label className={labelCls}>Estado</label>
              <SearchableSelect
                options={ESTADOS.map(e => ({ value: e.id, label: e.nombre }))}
                value={filtros.estado_viaje}
                onChange={val => setFiltros(f => ({ ...f, estado_viaje: val }))}
                placeholder="Seleccionar estado"
                isClearable={false}
              />
            </div>
          </div>

          {/* Fila 2: Criterio de Búsqueda + Botones de Acción */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-9">
              <label className={labelCls}>Ruta / Criterio de Búsqueda (N° Viaje, N° Despacho o Ruta)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  value={filtros.criterio_busqueda}
                  placeholder="Escriba el N° de viaje, N° de despacho o nombre de la ruta..."
                  onChange={e => setFiltros(f => ({ ...f, criterio_busqueda: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <button onClick={handleBuscar}
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm">
                <i className="fas fa-search text-xs"></i> BUSCAR
              </button>
              <button onClick={handleLimpiar}
                className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                <i className="fas fa-eraser text-xs"></i> LIMPIAR
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
          <div className="overflow-visible">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-3 py-3 text-center w-24">N° VIAJE</th>
                  <th className="px-3 py-3 text-center w-24">N° DESPACHO</th>
                  <th className="px-3 py-3 text-center w-20">BUS</th>
                  <th className="px-3 py-3 text-left">CHOFER</th>
                  <th className="px-3 py-3 text-left">AUXILIAR</th>
                  <th className="px-3 py-3 text-left">RUTA</th>
                  <th className="px-3 py-3 text-center w-20">PASAJ</th>
                  <th className="px-3 py-3 text-center w-24">ESTADO</th>
                  <th className="px-3 py-3 text-left">DATOS DESPACHO</th>
                  <th className="px-3 py-3 text-right w-24">TOTAL</th>
                  <th className="px-3 py-3 text-center w-28">FECHA / HORA</th>
                  <th className="px-3 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="12" className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Cargando viajes...
                  </td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan="12" className="text-center py-12 text-slate-400 font-bold">No hay viajes para mostrar</td></tr>
                ) : trips.map((t, idx) => (
                  <tr key={t.id_viajes || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-700">#{t.id_viajes}</td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {t.despachos && t.despachos.length > 1 ? (
                        <span className="font-bold text-amber-700 text-[11px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          #{t.despachos.map(d => d.id_despacho_viaje).join(', #')}
                        </span>
                      ) : (t.id_despacho_viaje || (t.despachos && t.despachos[0]?.id_despacho_viaje)) ? (
                        <span className="font-bold text-amber-700 text-[11px] bg-amber-50/50 px-1.5 py-0.5 rounded">
                          #{t.id_despacho_viaje || t.despachos[0]?.id_despacho_viaje}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-semibold">-</span>
                      )}
                    </td>
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
                    <td className="px-3 py-2.5">
                      {t.estado_viajes == 2 || t.hora_despacho || (t.despachos && t.despachos.length > 0) ? (
                        <div className="text-[10px] leading-tight">
                          <div className="font-bold text-amber-700 flex items-center gap-1">
                            <i className="far fa-clock text-amber-500"></i> Desp: {t.hora_despacho ? String(t.hora_despacho).substring(0, 5) : (t.fecha_despacho ? t.fecha_despacho.split(' ')[1]?.substring(0, 5) : '-')}
                          </div>
                          <div className="text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <i className="far fa-user text-slate-400"></i>
                            <span className="truncate max-w-[120px]">{t.usuario_despacho || 'Sistema'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {t.nombre_sucursal_despacho && (
                              <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{t.nombre_sucursal_despacho}</span>
                            )}
                            {t.despachos && t.despachos.length > 1 && (
                              <span className="text-[8px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                                {t.despachos.length} oficinas
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sin despacho</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                      ${parseFloat(t.total_recaudado || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      <div className="font-bold text-slate-700">{t.fecha_viaje || '-'}</div>
                      {t.hora_salida && (
                        <div className="text-[11px] font-extrabold text-indigo-600 flex items-center justify-center gap-1 mt-0.5">
                          <i className="far fa-clock"></i> {t.hora_salida}
                        </div>
                      )}
                    </td>
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
      <PdfViewerModal
        open={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setPdfUrl(null);
        }}
        url={pdfUrl}
        title={pdfTitle}
      />
    </div>
  );
};

export default ListaViajes;

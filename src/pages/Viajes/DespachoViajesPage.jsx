import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ViajesService from '../../services/viajes.service';
import { api } from '../../config/axios';

/**
 * DespachoViajesPage — Split-panel layout replicando ExtJS V2
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────┐
 * │  HEADER: [icon] Despacho de Viajes  [Solo Mi Oficina ☐] [⟳] │
 * ├──────────────────────┬───────────────────────────────────────┤
 * │  LEFT (350px)        │  RIGHT (flex)                        │
 * │  Viajes agrupados    │  Detalle del viaje seleccionado      │
 * │  por ruta            │  Header → Ocupación → Tabs → Valores │
 * │  [hora] [fecha]      │  → Botón DESPACHAR VIAJE             │
 * │  [asientos] [→]      │                                       │
 * └──────────────────────┴───────────────────────────────────────┘
 */
export const DespachoViajesPage = () => {
  // ── Estado ──────────────────────────────────────────────────
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [misOrigenes, setMisOrigenes] = useState(false);
  const [despachando, setDespachando] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0=Unidad/Conductor, 1=Asientos

  // Combos para modales de cambio
  const [buses, setBuses] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Modales de cambio
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [showConductorModal, setShowConductorModal] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  // Ref para evitar doble fetch
  const fetchRef = useRef(false);

  // ── Cargar viajes ────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (misOrigenes) params.mis_origenes = '1';
      const response = await ViajesService.getTripsToDispatch(params);
      if (response.success) {
        setTrips(response.data || []);
      } else {
        toast.error(response.message || 'Error al cargar viajes');
      }
    } catch (error) {
      toast.error('Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, [misOrigenes]);

  // Cargar combos una sola vez
  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    const loadCombos = async () => {
      const [bRes, pRes] = await Promise.all([
        ViajesService.getBuses(),
        ViajesService.getPersonal({ limit: 9999 }),
      ]);
      if (bRes.success) setBuses(bRes.data);
      if (pRes.success) setPersonal(pRes.data);
    };
    loadCombos();
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // ── Seleccionar viaje (cargar detalle en panel derecho) ──────
  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await ViajesService.getTripDetail(trip.id_viajes || trip.id_viaje);
      if (res.success && res.data) {
        // Cargar CxC de la unidad si existe
        if (res.data.unidad && res.data.unidad.id) {
          try {
            const cxcRes = await ViajesService.getCxCUnidad(res.data.unidad.id);
            if (cxcRes.success) {
              res.data.cxc = cxcRes.data?.cxc_pendiente || '0.00';
            }
          } catch { }
        }
        setDetailData(res.data);
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el detalle del viaje',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      }
    } catch (error) {
      toast.error('Error al cargar detalle');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Despachar viaje ──────────────────────────────────────────
  const handleDespachar = async () => {
    const confirm = await Swal.fire({
      title: '¿Despachar viaje?',
      text: '¿Está seguro de despachar este viaje?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, despachar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    setDespachando(true);
    try {
      const payload = {
        id_viaje: selectedTrip.id_viajes || selectedTrip.id_viaje,
        id_unidad: detailData?.unidad?.id || null,
        id_conductor: detailData?.conductor?.id || null,
        id_auxiliar: detailData?.auxiliar?.id || null,
      };
      const res = await ViajesService.dispatchTrip(payload);
      if (res.success) {
        const boletos = res.data?.boletos || [];
        if (boletos.length > 0) {
          await autorizarBoletos(boletos);
        } else {
          toast.success('Viaje despachado exitosamente');
        }
        setSelectedTrip(null);
        setDetailData(null);
        setActiveTab(0);
        setDespachando(false);
        fetchTrips();
      } else {
        toast.error(res.message || 'Error al despachar');
        setDespachando(false);
      }
    } catch (error) {
      toast.error('Error al despachar viaje');
      setDespachando(false);
    }
  };

  // ── Autorizar boletos (SRI) después del despacho ────────────
  const autorizarBoletos = async (ids) => {
    const total = ids.length;
    let exitosos = 0;
    let fallidos = 0;
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const toastId = toast.loading(`Autorizando boletos (0/${total})...`);

    for (let i = 0; i < ids.length; i++) {
      const id_boleto = ids[i];
      toast.loading(`Autorizando boletos (${i + 1}/${total})...`, { id: toastId });

      try {
        await api.post('/boleto/actualizarClaveAcceso', { id_boleto });

        const xmlRes = await fetch(`${baseUrl}/php/negocioXmlBoleto.php?id_boleto=${id_boleto}`);
        const xmlData = await xmlRes.json();

        if (xmlData.success && xmlData.xml) {
          try {
            const firmaRes = await api.post('/firma/firmar-enviar', {
              xml: xmlData.xml,
              ruc: '',
              clave: xmlData.p12_password || '',
            });
            const estado = (firmaRes.data?.estado || 'RECIBIDA').toUpperCase();
            const mensaje = firmaRes.data?.message || firmaRes.data?.mensaje || 'Procesado';

            if (estado === 'AUTORIZADO' || estado === 'RECIBIDA') {
              exitosos++;
            } else {
              fallidos++;
            }

            await api.post('/boleto/registrarAutorizacion', { id_boleto, estado, mensaje });
          } catch {
            fallidos++;
          }
        } else {
          fallidos++;
        }
      } catch {
        fallidos++;
      }
    }

    toast.dismiss(toastId);

    await Swal.fire({
      title: 'Proceso Terminado',
      html:
        `Viaje despachado y proceso de autorización completado.<br><br>` +
        `<b>Resultados:</b><br>` +
        `- Total boletos: ${total}<br>` +
        `- Autorizados: <span style="color:green; font-weight:bold;">${exitosos}</span><br>` +
        `- Fallidos/Pendientes: <span style="color:red; font-weight:bold;">${fallidos}</span>`,
      icon: fallidos > 0 ? 'warning' : 'success',
      confirmButtonText: 'OK',
    });
  };

  // ── Cambiar Unidad ──────────────────────────────────────────
  const handleCambiarUnidad = async (idBus) => {
    if (!idBus) { toast.error('Seleccione una unidad'); return; }
    setCambiando(true);
    try {
      const res = await ViajesService.changeBusTrip({
        id_viaje: selectedTrip.id_viajes || selectedTrip.id_viaje,
        id_bus: idBus,
        id_chofer: detailData?.conductor?.id || null,
        id_auxiliar: detailData?.auxiliar?.id || null,
      });
      if (res.success) {
        toast.success('Unidad actualizada');
        setShowUnidadModal(false);
        handleSelectTrip(selectedTrip);
      } else {
        toast.error(res.message || 'Error al actualizar');
      }
    } catch {
      toast.error('Error al cambiar unidad');
    } finally {
      setCambiando(false);
    }
  };

  // ── Cambiar Conductor/Auxiliar ──────────────────────────────
  const handleCambiarConductor = async (idChofer, idAuxiliar) => {
    if (!idChofer) { toast.error('Seleccione un conductor'); return; }
    setCambiando(true);
    try {
      const res = await ViajesService.changeBusTrip({
        id_viaje: selectedTrip.id_viajes || selectedTrip.id_viaje,
        id_bus: detailData?.unidad?.id || null,
        id_chofer: idChofer,
        id_auxiliar: idAuxiliar || null,
      });
      if (res.success) {
        toast.success('Conductor actualizado');
        setShowConductorModal(false);
        handleSelectTrip(selectedTrip);
      } else {
        toast.error(res.message || 'Error al actualizar');
      }
    } catch {
      toast.error('Error al cambiar conductor');
    } finally {
      setCambiando(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const groupByRoute = (trips) => {
    const groups = {};
    trips.forEach((t) => {
      const key = `${t.origen || '?'} - ${t.destino || '?'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  };

  const formatFecha = (f) => {
    if (!f) return '--/--/----';
    const d = new Date(f);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const viajesPorRuta = groupByRoute(trips);
  const viajesArr = Object.entries(viajesPorRuta);

  // ── Loading inicial ──────────────────────────────────────────
  if (loading && trips.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-4xl text-purple-500" />
          <span className="text-slate-500 font-medium">Cargando viajes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <div className="shrink-0" style={{ background: '#3987a8', borderBottom: '3px solid #2d6a82' }}>
        <div className="flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <i className="fas fa-shipping-fast" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight leading-none">Despacho de Viajes</h1>
              <p className="text-[10px] text-white/80 font-semibold mt-0.5">Gestión y control de viajes programados</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-bold text-white/80 bg-white/15 rounded-full px-3 py-1">
              {trips.length} viaje{trips.length !== 1 ? 's' : ''} pendiente{trips.length !== 1 ? 's' : ''}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={misOrigenes}
                onChange={(e) => setMisOrigenes(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-white/40 bg-white/20 text-white focus:ring-white/30"
              />
              <span className="text-white text-[11px] font-semibold">Solo Mi Oficina</span>
            </label>
            <button
              onClick={fetchTrips}
              disabled={loading}
              className="h-7 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
              ACTUALIZAR
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SPLIT PANEL ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT PANEL ─── */}
        <div className="w-[350px] shrink-0 border-r border-slate-200 bg-slate-100/50 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fas fa-spinner fa-spin text-xl text-purple-500" />
            </div>
          ) : viajesArr.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <i className="fas fa-bus-alt text-4xl mb-3 opacity-30" />
              <p className="text-sm font-bold">No hay viajes pendientes</p>
              <p className="text-[10px] mt-1">Los viajes aparecerán aquí cuando estén listos</p>
            </div>
          ) : (
            <div className="p-2.5 space-y-3">
              {viajesArr.map(([ruta, grupo]) => (
                <div key={ruta}>
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-xs font-bold"
                    style={{ background: '#3987a8' }}
                  >
                    <i className="fas fa-route text-[10px]" />
                    <span className="flex-1 truncate">{ruta}</span>
                    <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{grupo.length}</span>
                  </div>
                  {/* Group Items */}
                  <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg divide-y divide-slate-100">
                    {grupo.map((trip) => (
                      <div
                        key={trip.id_viajes || trip.id_viaje}
                        className={`p-3 transition-colors ${selectedTrip?.id_viajes === trip.id_viajes
                            ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                            : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-lg font-black text-slate-800 leading-none">{trip.hora_salida || '--:--'}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatFecha(trip.fecha_viaje)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded">
                            <i className="fas fa-users text-[10px] text-blue-500" />
                            <span className="text-xs font-bold text-blue-600">
                              {trip.asientos_ocupados || trip.cantidad_boletos || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Frec: {trip.codigo_viaje || '-'}
                          </span>
                          <button
                            onClick={() => handleSelectTrip(trip)}
                            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-all flex items-center gap-1 shadow-sm"
                          >
                            Despachar <i className="fas fa-arrow-right text-[9px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {!selectedTrip ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <i className="fas fa-hand-pointer text-5xl mb-4 opacity-30" style={{ color: '#3987a8' }} />
              <p className="text-base font-bold text-slate-500">Selecciona un viaje</p>
              <p className="text-xs mt-1 text-slate-300">Haz clic en "Despachar" para ver los detalles completos</p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <i className="fas fa-spinner fa-spin text-2xl text-purple-500" />
                <span className="text-xs font-bold text-slate-400">Cargando detalle...</span>
              </div>
            </div>
          ) : !detailData ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p className="text-sm font-semibold">No se pudo cargar el detalle del viaje</p>
            </div>
          ) : (
            <div className="p-4 space-y-4 pb-8">

              {/* ═══ HEADER RUTA ═══ */}
              <div
                className="rounded-xl p-4 text-white flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #3987a8, #2d6a82)' }}
              >
                <div>
                  <p className="text-sm font-bold">
                    <i className="fas fa-map-marker-alt mr-1.5" />
                    {selectedTrip.origen || 'S/N'}
                    <i className="fas fa-long-arrow-alt-right mx-2 opacity-60" />
                    <i className="fas fa-map-pin mr-1.5" />
                    {selectedTrip.destino || 'S/N'}
                  </p>
                  <p className="text-[10px] mt-0.5 opacity-70">
                    Viaje #{selectedTrip.codigo_viaje || selectedTrip.id_viajes || '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black leading-none">{selectedTrip.hora_salida || '--:--'}</p>
                  <p className="text-[10px] mt-0.5 opacity-80">{formatFecha(selectedTrip.fecha_viaje)}</p>
                </div>
              </div>

              {/* ═══ BARRA DE OCUPACIÓN ═══ */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    <i className="fas fa-chair text-blue-500 mr-1.5" />
                    Ocupación
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {detailData.cantidad_boletos || 0}
                    <span className="text-slate-400 font-normal">/{detailData.capacidad_bus || 40}</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <OcupacionBar capacidad={detailData.capacidad_bus} ocupados={detailData.cantidad_boletos} />
                </div>
              </div>

              {/* ═══ TABS ═══ */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Tab buttons */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {[
                    'Unidad y Conductor',
                    `Asientos (${(detailData.asientos || []).filter(
                      (a) => a.ocupado || a.ocupado === 1 || a.pasajero
                    ).length}/${detailData.capacidad_bus || 40})`,
                  ].map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === i
                          ? 'border-indigo-500 text-indigo-600 bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab 0: Unidad y Conductor */}
                {activeTab === 0 && (
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Card Unidad */}
                      <div className="rounded-xl p-3 border-l-[3px] border-blue-500 bg-white border border-slate-200">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                          <i className="fas fa-bus text-blue-500 mr-1" /> Unidad
                        </p>
                        <p className="text-base font-black text-slate-800">{detailData.unidad?.numero_unidad || '-'}</p>
                        <p className="text-[10px] text-slate-500">Placa: {detailData.unidad?.placa || '-'}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          CxC:{' '}
                          <span className="font-bold text-red-500">
                            ${parseFloat(detailData.cxc || detailData.valores?.cxc || '0.00').toFixed(2)}
                          </span>
                        </p>
                        <button
                          onClick={() => setShowUnidadModal(true)}
                          className="mt-2 w-full h-7 text-[9px] font-bold border border-blue-400 text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <i className="fas fa-exchange-alt" /> Cambiar
                        </button>
                      </div>
                      {/* Card Conductor */}
                      <div className="rounded-xl p-3 border-l-[3px] border-emerald-500 bg-white border border-slate-200">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                          <i className="fas fa-user text-emerald-500 mr-1" /> Conductor
                        </p>
                        <p className="text-xs font-bold text-slate-800">{detailData.conductor?.nombre || 'Sin Asignar'}</p>
                        <p className="text-[10px] text-slate-500">{detailData.conductor?.cedula || '-'}</p>
                        <button
                          onClick={() => setShowConductorModal(true)}
                          className="mt-3 w-full h-7 text-[9px] font-bold border border-emerald-400 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <i className="fas fa-user-edit" /> Cambiar
                        </button>
                      </div>
                      {/* Card Auxiliar */}
                      <div className="rounded-xl p-3 border-l-[3px] border-purple-500 bg-white border border-slate-200">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                          <i className="fas fa-user-tie text-purple-500 mr-1" /> Auxiliar
                        </p>
                        <p className="text-xs font-bold text-slate-800">{detailData.auxiliar?.nombre || 'Sin Asignar'}</p>
                        <p className="text-[10px] text-slate-500">{detailData.auxiliar?.cedula || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1: Asientos */}
                {activeTab === 1 && (
                  <AsientosTable asientos={detailData.asientos} capacidad={detailData.capacidad_bus} />
                )}
              </div>

              {/* ═══ RESUMEN FINANCIERO ═══ */}
              <div
                className="rounded-xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-3">
                  <i className="fas fa-dollar-sign mr-1" /> Resumen Financiero
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-white/10 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-wider opacity-70">Boletos</p>
                    <p className="text-xl font-black">${parseFloat(detailData.valores?.boletos || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-wider opacity-70">Retención</p>
                    <p className="text-xl font-black text-red-400">
                      ${parseFloat(detailData.valores?.retencion || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center bg-emerald-600/30 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-wider opacity-90 font-bold">Entregar</p>
                    <p className="text-xl font-black text-emerald-400">
                      ${parseFloat(detailData.valores?.entrega || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ═══ BOTÓN DESPACHAR ═══ */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleDespachar}
                  disabled={despachando}
                  className="w-72 h-12 text-sm font-black rounded-xl text-white tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                  style={{ background: despachando ? '#94a3b8' : 'linear-gradient(135deg, #27ae60, #219a52)' }}
                >
                  {despachando ? (
                    <><i className="fas fa-spinner fa-spin" /> Despachando...</>
                  ) : (
                    <><i className="fas fa-check-circle text-lg" /> DESPACHAR VIAJE</>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL: Cambiar Unidad ═══ */}
      {showUnidadModal && (
        <CambiarUnidadModal
          buses={buses}
          currentId={detailData?.unidad?.id || ''}
          onChange={handleCambiarUnidad}
          cambiando={cambiando}
          onClose={() => setShowUnidadModal(false)}
          viajeDesc={`${selectedTrip?.origen || ''} - ${selectedTrip?.destino || ''}`}
        />
      )}

      {/* ═══ MODAL: Cambiar Conductor / Auxiliar ═══ */}
      {showConductorModal && (
        <CambiarConductorModal
          personal={personal}
          currentChoferId={detailData?.conductor?.id || ''}
          currentAuxiliarId={detailData?.auxiliar?.id || ''}
          onSave={handleCambiarConductor}
          cambiando={cambiando}
          onClose={() => setShowConductorModal(false)}
          viajeDesc={`${selectedTrip?.origen || ''} - ${selectedTrip?.destino || ''}`}
        />
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════════════════

const OcupacionBar = ({ capacidad, ocupados }) => {
  const cap = capacidad || 40;
  const ocup = ocupados || 0;
  const pct = cap > 0 ? Math.min(Math.round((ocup / cap) * 100), 100) : 0;
  const color = pct >= 90 ? '#e74c3c' : pct >= 70 ? '#f39c12' : '#27ae60';
  return <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: color }} />;
};

const AsientosTable = ({ asientos, capacidad }) => {
  const ocupados = (asientos || []).filter((a) => a.ocupado || a.ocupado === 1 || a.pasajero);
  if (ocupados.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <i className="fas fa-chair text-3xl mb-2 opacity-30" />
        <p className="text-xs font-bold">Sin asientos ocupados</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
            <th className="px-3 py-2 text-center w-8">#</th>
            <th className="px-3 py-2 text-center w-16">Asiento</th>
            <th className="px-3 py-2 text-left">Pasajero</th>
            <th className="px-3 py-2 text-left">Cédula</th>
            <th className="px-3 py-2 text-left">Destino</th>
            <th className="px-3 py-2 text-right w-20">Precio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ocupados.map((a, i) => {
            const p = a.pasajero || {};
            return (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-center text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-center">
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {a.numero || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-slate-700">
                  {p.nombre || <span className="text-slate-300">-</span>}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {p.cedula || <span className="text-slate-300">-</span>}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {p.destino || <span className="text-slate-300">-</span>}
                </td>
                <td className="px-3 py-2 text-right font-bold text-emerald-600">
                  ${parseFloat(p.precio || 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// MODAL: Cambiar Unidad
// ═══════════════════════════════════════════════════════════════
const CambiarUnidadModal = ({ buses, currentId, onChange, cambiando, onClose, viajeDesc }) => {
  const [selectedBus, setSelectedBus] = useState(currentId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-800 px-5 py-3.5 rounded-t-xl flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="fas fa-exchange-alt text-blue-400" /> Cambiar Unidad
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Viaje</p>
            <p className="text-sm font-bold text-slate-700">{viajeDesc}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Unidad
            </label>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Seleccionar...</option>
              {buses.map((b) => (
                <option key={b.id_buses || b.bus_id} value={b.id_buses || b.bus_id}>
                  {b.disco_buses || b.codigo_buses || ''} - {b.placa_buses || ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              onClick={() => onChange(selectedBus)}
              disabled={cambiando || !selectedBus}
              className="px-4 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              {cambiando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// MODAL: Cambiar Conductor / Auxiliar
// ═══════════════════════════════════════════════════════════════
const CambiarConductorModal = ({
  personal,
  currentChoferId,
  currentAuxiliarId,
  onSave,
  cambiando,
  onClose,
  viajeDesc,
}) => {
  const [choferId, setChoferId] = useState(currentChoferId);
  const [auxiliarId, setAuxiliarId] = useState(currentAuxiliarId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-800 px-5 py-3.5 rounded-t-xl flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="fas fa-user-edit text-emerald-400" /> Cambiar Conductor / Auxiliar
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Viaje</p>
            <p className="text-sm font-bold text-slate-700">{viajeDesc}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Conductor
            </label>
            <select
              value={choferId}
              onChange={(e) => setChoferId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Seleccionar...</option>
              {personal.map((p) => (
                <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                  {p.per_nombres_persona || p.nombre_personal}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Auxiliar
            </label>
            <select
              value={auxiliarId}
              onChange={(e) => setAuxiliarId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Seleccionar...</option>
              {personal.map((p) => (
                <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                  {p.per_nombres_persona || p.nombre_personal}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(choferId, auxiliarId)}
              disabled={cambiando || !choferId}
              className="px-4 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              {cambiando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DespachoViajesPage;
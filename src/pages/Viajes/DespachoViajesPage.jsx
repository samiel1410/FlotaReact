import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ViajesService from '../../services/viajes.service';
import { api } from '../../config/axios';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';

import DespachoFilterBar from './components/despacho/DespachoFilterBar';
import DespachoTripList from './components/despacho/DespachoTripList';
import DespachoTripDetail from './components/despacho/DespachoTripDetail';
import DespachoCambiarUnidadModal from './components/despacho/DespachoCambiarUnidadModal';
import DespachoCambiarTripulacionModal from './components/despacho/DespachoCambiarTripulacionModal';
import DespachoRetencionesModal from './components/despacho/DespachoRetencionesModal';

const formatDateStr = (date) => {
  if (!date) return '';
  if (typeof date === 'string') return date.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * DespachoViajesPage — Panel operativo modular de despacho de viajes con SRI y liquidación financiera.
 */
export const DespachoViajesPage = () => {
  // ── Filtros de consulta ──────────────────────────────────────
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const [fechaInicio, setFechaInicio] = useState(todayStr);
  const [fechaFin, setFechaFin] = useState(todayStr);
  const [misOrigenes, setMisOrigenes] = useState(false);
  const [filtroBus, setFiltroBus] = useState(null);
  const [filtroOcupacion, setFiltroOcupacion] = useState('TODOS'); // 'TODOS' | 'CON_PASAJEROS' | 'VACIOS'
  const [searchTerm, setSearchTerm] = useState('');

  // ── Estado de datos ──────────────────────────────────────────
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [despachando, setDespachando] = useState(false);

  // Combos
  const [buses, setBuses] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Modales
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [showConductorModal, setShowConductorModal] = useState(false);
  const [showRetencionesModal, setShowRetencionesModal] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  // Ref para evitar doble fetch de combos
  const fetchRef = useRef(false);

  // ── Cargar viajes ────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fechaInicio && fechaFin) {
        params.fecha_inicio = fechaInicio;
        params.fecha_fin = fechaFin;
      } else if (fechaInicio) {
        params.fecha = fechaInicio;
      }
      if (misOrigenes) params.mis_origenes = '1';
      if (filtroBus?.value) params.id_bus = filtroBus.value;

      const response = await ViajesService.getTripsToDispatch(params);
      if (response.success) {
        setTrips(response.data || []);
      } else {
        toast.error(response.message || 'Error al cargar viajes');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, misOrigenes, filtroBus]);

  // Cargar combos iniciales
  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    const loadCombos = async () => {
      const [bRes, pRes] = await Promise.all([
        ViajesService.getBuses(),
        ViajesService.getPersonal({ limit: 9999 }),
      ]);
      if (bRes.success) setBuses(bRes.data || []);
      if (pRes.success) setPersonal(pRes.data || []);
    };
    loadCombos();
  }, []);

  // Cargar viajes cuando cambian filtros principales
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (fechaInicio && fechaFin) {
          params.fecha_inicio = fechaInicio;
          params.fecha_fin = fechaFin;
        } else if (fechaInicio) {
          params.fecha = fechaInicio;
        }
        if (misOrigenes) params.mis_origenes = '1';
        if (filtroBus?.value) params.id_bus = filtroBus.value;

        const response = await ViajesService.getTripsToDispatch(params);
        if (!ignore) {
          if (response.success) {
            setTrips(response.data || []);
          } else {
            toast.error(response.message || 'Error al cargar viajes');
          }
        }
      } catch {
        if (!ignore) toast.error('Error al cargar viajes');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [fechaInicio, fechaFin, misOrigenes, filtroBus]);

  // ── Opciones de bus para SearchableSelect ─────────────────────
  const busOptions = useMemo(() => {
    return buses.map((b) => ({
      value: b.id_buses || b.bus_id,
      label: `Disco ${b.disco_buses || b.codigo_buses || '-'} — Placa: ${b.placa_buses || '-'}`,
    }));
  }, [buses]);

  // ── Seleccionar viaje (cargar detalle en panel derecho) ──────
  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const id = trip.id_viajes || trip.id_viaje;
      const res = await ViajesService.getTripDetail(id);
      if (res.success && res.data) {
        if (res.data.unidad && res.data.unidad.id) {
          try {
            const cxcRes = await ViajesService.getCxCUnidad(res.data.unidad.id);
            if (cxcRes.success) {
              res.data.cxc = cxcRes.data?.cxc_pendiente || '0.00';
            }
          } catch {
            /* ignorar */
          }
        }
        setDetailData(res.data);
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el detalle del viaje seleccionado',
          icon: 'error',
          confirmButtonText: 'Entendido',
        });
      }
    } catch {
      toast.error('Error al cargar detalle del viaje');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Despachar viaje ──────────────────────────────────────────
  const handleDespachar = async () => {
    const tripId = selectedTrip?.id_viajes || selectedTrip?.id_viaje;
    const confirm = await Swal.fire({
      title: '¿Confirmar despacho de viaje?',
      html: `¿Está seguro de despachar el viaje <b>N° ${tripId}</b> hacia <b>${selectedTrip?.destino || ''}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check-circle mr-1"></i> Sí, despachar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    setDespachando(true);
    try {
      const payload = {
        id_viaje: tripId,
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
          toast.success('Viaje despachado correctamente');
        }

        // Impresión con QZ Tray o apertura de PDF
        const metodoImpresion = localStorage.getItem('metodo_impresion') || 'manual';
        const printerBoletos = localStorage.getItem('printer_boletos') || localStorage.getItem('printer_guias');
        const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
        const pdfUrl = baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?id_viajes=${tripId}`);

        if (metodoImpresion === 'directa') {
          try {
            if (!printerBoletos) {
              toast.error('No hay impresora directa configurada. Abriendo PDF...');
              window.open(pdfUrl, '_blank');
            } else {
              const loadQZ = () =>
                new Promise((resolve, reject) => {
                  if (window.qz) return resolve();
                  const s = document.createElement('script');
                  s.src = '/qz.js';
                  s.onload = () => resolve();
                  s.onerror = () => reject(new Error('No se pudo cargar qz.js'));
                  document.head.appendChild(s);
                });

              const configurarQZ = () => {
                if (!window.qz) return;
                window.qz.security.setSignatureAlgorithm('SHA256');
                window.qz.security.setCertificatePromise((resolve) => {
                  fetch('/digital-certificate.crt', {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' },
                  })
                    .then((r) => (r.ok ? r.text() : null))
                    .then(resolve)
                    .catch(() => resolve(null));
                });
                window.qz.security.setSignaturePromise((toSign) => (resolve) => {
                  api
                    .get('/configuracion/sign-message', { params: { request: toSign } })
                    .then((r) => resolve(r.data))
                    .catch(() => resolve(null));
                });
              };

              const conectarQZ = () => {
                if (!window.qz) return Promise.reject('Librería no cargada');
                if (window.qz.websocket.isActive()) return Promise.resolve();
                const TIMEOUT_MS = 3000;
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                  timeoutId = setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
                });
                return Promise.race([
                  window.qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false }),
                  timeoutPromise,
                ]).finally(() => clearTimeout(timeoutId));
              };

              await loadQZ();
              configurarQZ();
              await conectarQZ();

              const config = window.qz.configs.create(printerBoletos, {
                scaleContent: true,
                units: 'mm',
                margins: { top: 0, bottom: 0, left: 8, right: 2 },
              });
              const data = [
                {
                  type: 'pixel',
                  format: 'pdf',
                  flavor: 'file',
                  data: pdfUrl,
                },
              ];
              await window.qz.print(config, data);
              toast.success('Despacho impreso en ' + printerBoletos);
            }
          } catch (e) {
            console.error('[QZ] Error al imprimir despacho:', e);
            toast.error('Error al imprimir vía QZ. Abriendo PDF...');
            window.open(pdfUrl, '_blank');
          }
        } else {
          window.open(pdfUrl, '_blank');
        }

        setSelectedTrip(null);
        setDetailData(null);
        setDespachando(false);
        fetchTrips();
      } else {
        toast.error(res.message || 'Error al despachar viaje');
        setDespachando(false);
      }
    } catch {
      toast.error('Error al despachar el viaje');
      setDespachando(false);
    }
  };

  // ── Autorizar boletos (SRI) ──────────────────────────────────
  const autorizarBoletos = async (ids) => {
    const total = ids.length;
    let exitosos = 0;
    let fallidos = 0;
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const toastId = toast.loading(`Autorizando boletos SRI (0/${total})...`);

    for (let i = 0; i < ids.length; i++) {
      const id_boleto = ids[i];
      toast.loading(`Autorizando boletos SRI (${i + 1}/${total})...`, { id: toastId });

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
            const msgsList = [];
            if (Array.isArray(firmaRes.data?.detalles?.mensajes))
              msgsList.push(...firmaRes.data.detalles.mensajes);
            if (Array.isArray(firmaRes.data?.infoRecepcion?.mensajes))
              msgsList.push(...firmaRes.data.infoRecepcion.mensajes);
            if (firmaRes.data?.autorizacion?.mensaje) {
              const aMsg = firmaRes.data.autorizacion.mensaje;
              if (typeof aMsg === 'string') msgsList.push(aMsg);
              else if (Array.isArray(aMsg)) {
                aMsg.forEach((m) =>
                  msgsList.push(
                    typeof m === 'string'
                      ? m
                      : `${m.mensaje || ''}${m.informacionAdicional ? ' - ' + m.informacionAdicional : ''}`
                  )
                );
              }
            }
            const mensaje =
              msgsList.filter(Boolean).join(' | ') ||
              firmaRes.data?.message ||
              firmaRes.data?.mensaje ||
              'Procesado';

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
      title: 'Despacho y Autorización SRI',
      html:
        `<div style="text-align:left; font-size:13px; line-height:1.6;">` +
        `Viaje despachado correctamente y proceso SRI finalizado.<br><br>` +
        `<div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">` +
        `<b>Resumen de Comprobantes:</b><br>` +
        `• Total boletos: <b>${total}</b><br>` +
        `• Autorizados SRI: <span style="color:#16a34a; font-weight:bold;">${exitosos}</span><br>` +
        `• Fallidos / Pendientes: <span style="color:#dc2626; font-weight:bold;">${fallidos}</span>` +
        `</div></div>`,
      icon: fallidos > 0 ? 'warning' : 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#2563eb',
    });
  };

  // ── Cambiar Unidad ──────────────────────────────────────────
  const handleCambiarUnidad = async (idBus) => {
    if (!idBus) {
      toast.error('Seleccione una unidad');
      return;
    }
    setCambiando(true);
    try {
      const res = await ViajesService.changeBusTrip({
        id_viaje: selectedTrip.id_viajes || selectedTrip.id_viaje,
        id_bus: idBus,
        id_chofer: detailData?.conductor?.id || null,
        id_auxiliar: detailData?.auxiliar?.id || null,
      });
      if (res.success) {
        toast.success('Unidad actualizada correctamente');
        setShowUnidadModal(false);
        handleSelectTrip(selectedTrip);
      } else {
        toast.error(res.message || 'Error al actualizar unidad');
      }
    } catch {
      toast.error('Error al cambiar unidad');
    } finally {
      setCambiando(false);
    }
  };

  // ── Cambiar Conductor / Auxiliar ────────────────────────────
  const handleCambiarConductor = async (idChofer, idAuxiliar) => {
    if (!idChofer) {
      toast.error('Seleccione un conductor');
      return;
    }
    setCambiando(true);
    try {
      const res = await ViajesService.changeBusTrip({
        id_viaje: selectedTrip.id_viajes || selectedTrip.id_viaje,
        id_bus: detailData?.unidad?.id || null,
        id_chofer: idChofer,
        id_auxiliar: idAuxiliar || null,
      });
      if (res.success) {
        toast.success('Tripulación actualizada correctamente');
        setShowConductorModal(false);
        handleSelectTrip(selectedTrip);
      } else {
        toast.error(res.message || 'Error al actualizar tripulación');
      }
    } catch {
      toast.error('Error al cambiar tripulación');
    } finally {
      setCambiando(false);
    }
  };

  const handleClearFilters = () => {
    setFechaInicio(todayStr);
    setFechaFin(todayStr);
    setMisOrigenes(false);
    setFiltroBus(null);
    setFiltroOcupacion('TODOS');
    setSearchTerm('');
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim();
      if (term) {
        setLoading(true);
        try {
          const params = { estado: 'todos' };
          if (!isNaN(term)) {
            params.id_viaje = term;
          } else {
            params.nombre = term;
            params.fecha_inicio = fechaInicio;
            params.fecha_fin = fechaFin;
          }
          if (misOrigenes) params.mis_origenes = '1';
          if (filtroBus?.value) params.id_bus = filtroBus.value;

          const res = await ViajesService.getTripsToDispatch(params);
          if (res.success) {
            setTrips(res.data || []);
            if ((res.data || []).length === 0) {
              toast.error(`No se encontraron viajes con: "${term}"`);
            } else {
              toast.success(`${res.data.length} viaje(s) encontrado(s)`);
              if (res.data.length === 1) {
                handleSelectTrip(res.data[0]);
              }
            }
          } else {
            toast.error(res.message || 'Error al buscar viaje');
          }
        } catch {
          toast.error('Error al consultar viaje');
        } finally {
          setLoading(false);
        }
      } else {
        fetchTrips();
      }
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchTrips();
  };

  // Filtrado en memoria por texto y ocupación
  const filteredTrips = useMemo(() => {
    let result = trips;

    // Filtro por ocupación
    if (filtroOcupacion === 'CON_PASAJEROS') {
      result = result.filter((t) => (t.asientos_ocupados || t.cantidad_boletos || 0) > 0);
    } else if (filtroOcupacion === 'VACIOS') {
      result = result.filter((t) => (t.asientos_ocupados || t.cantidad_boletos || 0) === 0);
    }

    // Filtro por búsqueda rápida
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((t) => {
        const ruta = `${t.origen || ''} ${t.destino || ''}`.toLowerCase();
        const nroViaje = String(t.id_viajes || t.id_viaje || t.codigo_viaje || '');
        const bus = `${t.disco_buses || t.numero_unidad || ''} ${t.placa_buses || t.placa || ''}`.toLowerCase();
        const hora = (t.hora_salida || '').toLowerCase();
        return ruta.includes(term) || nroViaje.includes(term) || bus.includes(term) || hora.includes(term);
      });
    }

    return result;
  }, [trips, filtroOcupacion, searchTerm]);

  // Agrupación de viajes por ruta
  const viajesPorRuta = useMemo(() => {
    const groups = {};
    filteredTrips.forEach((t) => {
      const key = `${t.origen || 'Origen'} ➔ ${t.destino || 'Destino'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups);
  }, [filteredTrips]);

  // Métricas rápidas
  const totalPasajerosListados = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + (t.asientos_ocupados || t.cantidad_boletos || 0), 0);
  }, [filteredTrips]);

  const viajeDesc = `${selectedTrip?.origen || ''} ➔ ${selectedTrip?.destino || ''} (N° ${
    selectedTrip?.id_viajes || selectedTrip?.id_viaje || ''
  })`;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden font-sans">
      {/* ── BARRA SUPERIOR Y FILTROS ── */}
      <DespachoFilterBar
        filteredTripsCount={filteredTrips.length}
        totalPasajerosListados={totalPasajerosListados}
        loading={loading}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onDateChange={({ startDateStr, endDateStr }) => {
          setFechaInicio(startDateStr || '');
          setFechaFin(endDateStr || startDateStr || '');
        }}
        busOptions={busOptions}
        filtroBus={filtroBus}
        onBusChange={(val) => setFiltroBus(val)}
        filtroOcupacion={filtroOcupacion}
        onOcupacionChange={(val) => setFiltroOcupacion(val)}
        misOrigenes={misOrigenes}
        onMisOrigenesChange={(val) => setMisOrigenes(val)}
        onClearFilters={handleClearFilters}
        onRefresh={fetchTrips}
      />

      {/* ── CONTENEDOR PRINCIPAL: PANEL IZQUIERDO Y DERECHO ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo: Listado de viajes */}
        <DespachoTripList
          searchTerm={searchTerm}
          onSearchChange={(val) => setSearchTerm(val)}
          onSearchKeyDown={handleSearchKeyDown}
          onClearSearch={handleClearSearch}
          loading={loading}
          viajesPorRuta={viajesPorRuta}
          selectedTrip={selectedTrip}
          onSelectTrip={handleSelectTrip}
        />

        {/* Panel derecho: Detalle del viaje seleccionado */}
        <DespachoTripDetail
          selectedTrip={selectedTrip}
          detailLoading={detailLoading}
          detailData={detailData}
          despachando={despachando}
          onDespachar={handleDespachar}
          onOpenUnidadModal={() => setShowUnidadModal(true)}
          onOpenConductorModal={() => setShowConductorModal(true)}
          onOpenRetencionesModal={() => setShowRetencionesModal(true)}
        />
      </div>

      {/* ── MODALES ── */}
      {showUnidadModal && (
        <DespachoCambiarUnidadModal
          buses={buses}
          currentId={detailData?.unidad?.id || ''}
          onChange={handleCambiarUnidad}
          cambiando={cambiando}
          onClose={() => setShowUnidadModal(false)}
          viajeDesc={viajeDesc}
        />
      )}

      {showConductorModal && (
        <DespachoCambiarTripulacionModal
          personal={personal}
          currentChoferId={detailData?.conductor?.id || ''}
          currentAuxiliarId={detailData?.auxiliar?.id || ''}
          onSave={handleCambiarConductor}
          cambiando={cambiando}
          onClose={() => setShowConductorModal(false)}
          viajeDesc={viajeDesc}
        />
      )}

      {showRetencionesModal && (
        <DespachoRetencionesModal
          valores={detailData?.valores}
          deudas={detailData?.deudas_pendientes}
          unidad={detailData?.unidad}
          onClose={() => setShowRetencionesModal(false)}
          viajeDesc={viajeDesc}
        />
      )}
    </div>
  );
};

export default DespachoViajesPage;
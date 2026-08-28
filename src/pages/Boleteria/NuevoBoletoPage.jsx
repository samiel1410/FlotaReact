import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// Componentes modulares de Boletería
import { BoletoTopBar } from './components/BoletoTopBar';
import { ViajesSelector } from './components/ViajesSelector';
import { DetallesViajePanel } from './components/DetallesViajePanel';
import { DatosPasajeroPanel } from './components/DatosPasajeroPanel';
import { OpcionesBoletoPanel } from './components/OpcionesBoletoPanel';
import { BoletoFooter } from './components/BoletoFooter';
import { BusVisualizer } from './components/BusVisualizer';
import { PasajerosGrid } from './components/PasajerosGrid';
import { BoletoTotalesPanel } from './components/BoletoTotalesPanel';

// Modales
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { CambiarBusModal } from './components/CambiarBusModal';
import { ReagendarBoletoModal } from './components/ReagendarBoletoModal';
import { CambiarAgenciaModal } from './components/CambiarAgenciaModal';
import { ListadoPasajerosModal } from './components/ListadoPasajerosModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import Modal from '../../components/common/Modal';
import { AperturaCajaForm } from '../CajaBoleteria/components/AperturaCajaForm';

// Servicios y Utilidades
import { BoleteriaService } from '../../services/boleteria.service';
import { cajaBoleteriaService } from '../../services/cajaBoleteria.service';
import { api, clienteApi } from '../../config/axios';
import { useSocket } from '../../hooks/useSocket';
import {
  getTarifaLabel,
  calcularValorConTarifa,
  calcularDescuento,
  calcularEdad,
  tarifaDesdeEdad,
  horaAMinutos,
  hoyLocal,
  getSessionUser
} from './utils/boletoUtils';
import { imprimirBoletoDirectoQZ } from './utils/boletoImpresion';
import './NuevoBoletoPage.css';

export const NuevoBoletoPage = () => {
  const navigate = useNavigate();
  useSocket();

  // Estados del formulario y viaje
  const [viajesDisponibles, setViajesDisponibles] = useState([]);
  const [destinosViaje, setDestinosViaje] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [asientosOcupados, setAsientosOcupados] = useState([]);
  const [capacidadBus, setCapacidadBus] = useState(40);
  const [discoBus, setDiscoBus] = useState('');
  const [idBus, setIdBus] = useState('');
  const [idChofer, setIdChofer] = useState('');
  const [cedulaChofer, setCedulaChofer] = useState('');
  const [nombreChofer, setNombreChofer] = useState('');
  const [horaViaje, setHoraViaje] = useState('');
  const [pisosBus, setPisosBus] = useState(1);
  const [mapaAsientos, setMapaAsientos] = useState(null);
  const [subrutaSeleccionada, setSubrutaSeleccionada] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [esReserva, setEsReserva] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalVenta, setTotalVenta] = useState(0);
  const [alimentoInfo, setAlimentoInfo] = useState(null);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [copiasBoletos, setCopiasBoletos] = useState(1);
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [printerBoletos, setPrinterBoletos] = useState('');

  // Modales
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState('');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState(null);
  const [isForcedEditCliente, setIsForcedEditCliente] = useState(false);
  const [showCambiarBusModal, setShowCambiarBusModal] = useState(false);
  const [showReagendarModal, setShowReagendarModal] = useState(false);
  const [boletoAReagendar, setBoletoAReagendar] = useState(null);
  const [showCambiarAgenciaModal, setShowCambiarAgenciaModal] = useState(false);
  const [showListadoPasajeros, setShowListadoPasajeros] = useState(false);
  const [autoAutorizarBoleto, setAutoAutorizarBoleto] = useState(false);
  const [descuentoGlobalBoleto, setDescuentoGlobalBoleto] = useState(false);
  const [refreshAsientosKey, setRefreshAsientosKey] = useState(0);
  const [asientosPendientes, setAsientosPendientes] = useState({});

  // Heartbeat y temporizador
  const lastRealActionRef = useRef(null);
  useEffect(() => { lastRealActionRef.current = Date.now(); }, []);
  const [tiempoRestante, setTiempoRestante] = useState(null);

  // Validación de Caja
  const [localCajaId, setLocalCajaId] = useState(null);
  const [cajaResolved, setCajaResolved] = useState(false);
  const [cajaChecking, setCajaChecking] = useState(true);
  const [showCajaModal, setShowCajaModal] = useState(false);
  const cajaCheckRef = useRef(false);

  const [currentAgencia, setCurrentAgencia] = useState(() => {
    const u = getSessionUser();
    return u.nombre_sucursal || 'Desconocida';
  });

  const [formData, setFormData] = useState({
    idCliente: '',
    fechaViaje: hoyLocal(),
    origen: '',
    destino: '',
    idViaje: '',
    viajeTexto: '',
    asientosSeleccionados: [],
    pasajeros: [],
    totales: { subtotal: 0, total: 0 },
    identificacion: '',
    nombres: '',
    fechaNacimiento: '',
    direccion: '',
    celular: '',
    correo: '',
    tarifa: 1,
    observacion: ''
  });

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const marcarActividadReal = useCallback(() => {
    lastRealActionRef.current = Date.now();
  }, []);

  // Timer countdown basado en horaViaje
  useEffect(() => {
    if (!horaViaje) { setTiempoRestante(null); return; }
    const calcular = () => {
      const ahora = new Date();
      const [h, m, s] = horaViaje.split(':').map(Number);
      const salida = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, s || 0);
      const diffSeg = Math.floor((salida - ahora) / 1000);
      const abs = Math.abs(diffSeg);
      setTiempoRestante({
        horas: Math.floor(abs / 3600),
        minutos: Math.floor((abs % 3600) / 60),
        segundos: abs % 60,
        pasado: diffSeg < 0,
        totalSeg: diffSeg,
      });
    };
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [horaViaje]);

  // Validar caja activa al iniciar
  useEffect(() => {
    if (cajaCheckRef.current) return;
    cajaCheckRef.current = true;
    const validar = async () => {
      try {
        const res = await cajaBoleteriaService.validarCaja();
        const cajaId = res.id_caja || res.data?.id_caja;

        if (res.success && cajaId) {
          setLocalCajaId(cajaId);
          setCajaResolved(true);
        } else {
          setShowCajaModal(true);
          setCajaResolved(false);
        }
      } catch (e) {
        console.error('Error validando caja:', e);
        setShowCajaModal(true);
        setCajaResolved(false);
      } finally {
        setCajaChecking(false);
      }
    };
    validar();
  }, []);

  // Cargar datos iniciales tras validar caja
  useEffect(() => {
    if (!cajaResolved) return;
    const fetchInit = async () => {
      try {
        const usuario = getSessionUser();
        const [viajesRes, configRes] = await Promise.all([
          BoleteriaService.getViajesDisponibles({
            fecha: hoyLocal(),
            id_sucursal: usuario.id_sucursal
          }),
          api.get('/configuracion/configuracionSeleccion')
        ]);
        if (viajesRes.success && viajesRes.data) setViajesDisponibles(viajesRes.data);
        if (configRes.data?.success && configRes.data?.data?.length > 0) {
          const cfg = configRes.data.data[0];
          if (cfg.autorizar_boleto_sri === 1 || cfg.autorizar_boleto_sri === true) {
            setAutoAutorizarBoleto(true);
          }
          if (cfg.descuento_global_boleto === 1 || cfg.descuento_global_boleto === true) {
            setDescuentoGlobalBoleto(true);
          }
        }

        try {
          const userRes = await api.get('/buscarUsuario');
          if (userRes.data?.success && userRes.data?.data?.nombre_sucursal) {
            setCurrentAgencia(userRes.data.data.nombre_sucursal);
          }
        } catch (e) {
          console.error('Error cargando datos de usuario:', e);
        }
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
      }
    };
    fetchInit();

    const userId = getSessionUser().id_usuario;
    if (userId) {
      api.get('/impresoras/miConfig', { params: { id_usuario: userId } }).then(res => {
        if (res.data?.success && res.data?.data) {
          setMetodoImpresion(res.data.data.metodo_impresion || 'manual');
          setPrinterBoletos(res.data.data.printer_boletos || '');
          setCopiasBoletos(res.data.data.copias_boletos || 1);
        }
      }).catch(() => { });
    }
  }, [cajaResolved]);

  // Buscar cliente por CI/RUC
  const buscarPasajeroPorCI = async (identificacion) => {
    if (!identificacion || identificacion.length < 10) {
      toast.error('Ingrese al menos 10 dígitos para buscar');
      return;
    }
    const toastId = toast.loading('Buscando cliente...');
    try {
      const res = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: identificacion }
      });
      if (res.data?.success && res.data?.total > 0) {
        const c = res.data.data[0];
        const fechaNac = c.fecha_nacimiento ? new Date(c.fecha_nacimiento).toISOString().split('T')[0] : '';
        const edad = calcularEdad(fechaNac);
        const tarifaVal = tarifaDesdeEdad(edad);

        setFormData(prev => ({
          ...prev,
          idCliente: c.id_cliente,
          identificacion: c.identificacion_cliente,
          nombres: c.nombre_cliente,
          celular: c.telefono_cliente || '',
          direccion: c.direccion_cliente || '',
          correo: c.email_cliente || '',
          fechaNacimiento: fechaNac,
          tarifa: tarifaVal,
        }));
        toast.success(`Cliente encontrado: ${c.nombre_cliente}`, { id: toastId });
      } else {
        toast.error('Cliente no encontrado con esa identificación', { id: toastId });
        setFormData(prev => ({ ...prev, idCliente: '', nombres: '', celular: '', direccion: '', correo: '', fechaNacimiento: '', tarifa: 1 }));
      }
    } catch (err) {
      console.error('[buscarPasajeroPorCI] Error:', err);
      try {
        const res = await api.get('/cliente/clientebusquedaIdentificacion', {
          params: { identificacion_busqueda: identificacion }
        });
        if (res.data?.success && res.data?.total > 0) {
          const c = res.data.data[0];
          const fechaNac = c.fecha_nacimiento ? new Date(c.fecha_nacimiento).toISOString().split('T')[0] : '';
          const edad = calcularEdad(fechaNac);
          const tarifaVal = tarifaDesdeEdad(edad);

          setFormData(prev => ({
            ...prev,
            idCliente: c.id_cliente,
            identificacion: c.identificacion_cliente,
            nombres: c.nombre_cliente,
            celular: c.telefono_cliente || '',
            direccion: c.direccion_cliente || '',
            correo: c.email_cliente || '',
            fechaNacimiento: fechaNac,
            tarifa: tarifaVal,
          }));
          toast.success(`Cliente encontrado: ${c.nombre_cliente} (local)`, { id: toastId });
          return;
        }
        toast.error('Cliente no encontrado', { id: toastId });
      } catch {
        toast.error('Error al buscar cliente - servidor no disponible', { id: toastId });
      }
    }
  };

  const handleConsumidorFinal = async () => {
    marcarActividadReal();
    try {
      const res = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: '9999999999999' }
      });
      if (res.data?.success && res.data?.total > 0) {
        const c = res.data.data[0];
        setFormData(prev => ({
          ...prev,
          idCliente: c.id_cliente,
          identificacion: c.identificacion_cliente || '9999999999999',
          nombres: c.nombre_cliente || 'CONSUMIDOR FINAL',
          celular: c.telefono_cliente || '9999999999',
          direccion: c.direccion_cliente || 'S/D',
          correo: c.email_cliente || 'sincorreo@gmail.com',
          fechaNacimiento: '',
          tarifa: 1,
        }));
        toast.success('Consumidor Final seleccionado');
        return;
      }
    } catch { }

    setFormData(prev => ({
      ...prev,
      idCliente: 683,
      identificacion: '9999999999999',
      nombres: 'CONSUMIDOR FINAL',
      celular: '9999999999',
      direccion: 'S/D',
      correo: 'sincorreo@gmail.com',
      fechaNacimiento: '',
      tarifa: 1,
    }));
    toast.success('Consumidor Final seleccionado');
  };

  // Buscar viajes disponibles
  const buscarViajes = useCallback(async () => {
    if (!formData.fechaViaje) return;
    setLoadingViajes(true);
    try {
      const usuario = getSessionUser();
      const res = await BoleteriaService.getViajesDisponibles({
        fecha: formData.fechaViaje,
        id_sucursal: usuario.id_sucursal
      });
      if (res.success && res.data) {
        setViajesDisponibles(res.data);
      } else {
        setViajesDisponibles([]);
      }
    } catch (e) {
      console.error('Error cargando viajes:', e);
      setViajesDisponibles([]);
    } finally {
      setLoadingViajes(false);
    }
  }, [formData.fechaViaje]);

  // Cargar asientos y destinos al seleccionar viaje
  useEffect(() => {
    if (!formData.idViaje) {
      setAsientosOcupados([]);
      setDestinosViaje([]);
      setMapaAsientos(null);
      setHoraViaje('');
      setAlimentoInfo(null);
      setTotalRecaudado(0);
      return;
    }

    const cargarAsientos = async () => {
      try {
        const [asientosRes, destinosViajeRes] = await Promise.all([
          BoleteriaService.getAsientosBusViaje(formData.idViaje).catch(e => {
            console.error('[cargarAsientos] Error en getAsientosBusViaje:', e);
            return { success: false };
          }),
          BoleteriaService.getDestinosViaje(formData.idViaje).catch(e => {
            console.error('[cargarAsientos] Error en getDestinosViaje:', e);
            return { success: false };
          })
        ]);

        if (asientosRes.success && asientosRes.data && asientosRes.data.length > 0) {
          const busData = asientosRes.data[0];
          setCapacidadBus(busData.capacidad_buses || 40);
          setDiscoBus(busData.disco_buses || '');
          setIdBus(busData.id_buses || '');
          setIdChofer(busData.id_fkpersonal_buses || '');
          setCedulaChofer(busData.per_cedula_personal || '');
          setNombreChofer(busData.per_nombres_persona || 'Sin asignar');
          setPisosBus(busData.pisos_buses || 1);
          setMapaAsientos(busData.mapa_asientos || null);
          const selectedViaje = viajesDisponibles.find(v => String(v.id_viajes) === String(formData.idViaje));
          const horaDelViaje = selectedViaje?.hora_origen_salida || selectedViaje?.hora_salida_rutas || selectedViaje?.hora || selectedViaje?.hora_salida || busData.hora_viaje || formData.viajeTexto?.split(' - ')[0] || '';
          setHoraViaje(horaDelViaje);
          if (busData.incluye_alimentos) setAlimentoInfo(busData);

          const ocupados = [];
          if (asientosRes.asiento) {
            asientosRes.asiento.forEach(a => {
              if (a.estado_boleto_detalle !== '0' && Number(a.estado_boleto_detalle) !== 0) {
                ocupados.push(a);
              }
            });
          }
          setAsientosOcupados(ocupados);
          setTotalRecaudado(asientosRes.total_boletos || 0);
        }

        if (destinosViajeRes.success && destinosViajeRes.data) {
          setDestinosViaje(destinosViajeRes.data);
          if (destinosViajeRes.data.length > 0) {
            const first = destinosViajeRes.data[0];
            setSubrutaSeleccionada(String(first.id_sub_rutas));
            setPrecioUnitario(parseFloat(first.valor_sub_rutas || 0));
            if (first.id_lugar_origen) {
              setFormData(prev => ({ ...prev, origen: first.id_lugar_origen }));
            }
          } else {
            setSubrutaSeleccionada('');
            setPrecioUnitario(0);
          }
        } else {
          setSubrutaSeleccionada('');
          setPrecioUnitario(0);
        }
      } catch (e) {
        console.error('Error cargando asientos:', e);
      }
    };

    setSubrutaSeleccionada('');
    setPrecioUnitario(0);
    cargarAsientos();
  }, [formData.idViaje, refreshAsientosKey]);

  // Sockets: Bloqueo/Liberación en tiempo real
  useEffect(() => {
    const handleBloqueado = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !data.asiento) return;
      if (String(data.id_viaje) !== String(formData.idViaje)) return;

      const asientoNum = Number(data.asiento);
      setAsientosPendientes(prev => ({
        ...prev,
        [asientoNum]: {
          usuario: data.usuario || 'Otro usuario',
          lockedAt: data.lockedAt || Date.now()
        }
      }));
    };

    const handleLiberado = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !data.asiento) return;
      if (String(data.id_viaje) !== String(formData.idViaje)) return;

      const asientoNum = Number(data.asiento);
      setAsientosPendientes(prev => {
        const next = { ...prev };
        delete next[asientoNum];
        return next;
      });

      if (data.motivo === 'timeout') {
        toast(`⏱️ Asiento ${asientoNum} liberado (${data.usuario} excedió el tiempo)`, {
          id: `liberado-${data.id_viaje}-${asientoNum}`,
          duration: 4000,
        });
      } else if (data.motivo === 'admin') {
        toast(`🔓 Asiento ${asientoNum} liberado por administrador`, {
          id: `liberado-admin-${asientoNum}`,
          duration: 4000,
        });
      } else if (data.motivo === 'desconexion') {
        toast(`🔌 Asiento ${asientoNum} liberado (${data.usuario} se desconectó)`, {
          id: `liberado-dc-${asientoNum}`,
          duration: 3000,
        });
      }
    };

    const handleRechazado = (e) => {
      const data = e.detail;
      if (!data || !data.motivo) return;
      toast.error(data.motivo, { duration: 3000 });
    };

    window.addEventListener('asiento_bloqueado', handleBloqueado);
    window.addEventListener('asiento_liberado', handleLiberado);
    window.addEventListener('asiento_bloqueo_rechazado', handleRechazado);

    return () => {
      window.removeEventListener('asiento_bloqueado', handleBloqueado);
      window.removeEventListener('asiento_liberado', handleLiberado);
      window.removeEventListener('asiento_bloqueo_rechazado', handleRechazado);
    };
  }, [formData.idViaje]);

  useEffect(() => {
    setAsientosPendientes({});
    marcarActividadReal();
  }, [formData.idViaje]);

  // Heartbeat para renovar lock
  useEffect(() => {
    if (formData.asientosSeleccionados.length === 0) return;

    const interval = setInterval(() => {
      const tiempoDesdeUltimaAccion = Date.now() - lastRealActionRef.current;
      if (tiempoDesdeUltimaAccion < 60000 && window.__socket) {
        window.__socket.emit('asiento_renovar_lock', {
          id_viaje: formData.idViaje,
          asientos: formData.asientosSeleccionados
        });
        lastRealActionRef.current = Date.now();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData.idViaje, formData.asientosSeleccionados]);

  const deseleccionarAsientosActuales = (viajeId, asientos) => {
    const fd = formDataRef.current;
    const vId = viajeId || fd.idViaje;
    const as = asientos || fd.asientosSeleccionados;

    if (window.__socket && vId && as.length > 0) {
      as.forEach(asiento => {
        window.__socket.emit('asiento_desbloquear', {
          id_viaje: vId,
          asiento: Number(asiento)
        });
      });
    }
  };

  useEffect(() => {
    const handleUnload = () => {
      deseleccionarAsientosActuales();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      deseleccionarAsientosActuales();
    };
  }, []);

  // Eventos Socket: Venta o anulación de boleto
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !formData.idViaje) return;
      if (String(data.id_viaje) !== String(formData.idViaje)) return;

      if (data.asientos && data.asientos.length > 0 && data.tipo !== 'anulacion_reserva') {
        const vendidos = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        setAsientosPendientes(prev => {
          const next = { ...prev };
          vendidos.forEach(s => delete next[s]);
          return next;
        });
      }

      if (data.tipo === 'anulacion_reserva' && data.asientos) {
        const liberados = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        setAsientosPendientes(prev => {
          const next = { ...prev };
          liberados.forEach(s => delete next[s]);
          return next;
        });
      }

      if (!data.asientos || data.asientos.length === 0) return;

      if (data.tipo === 'anulacion_reserva') {
        const asientosLiberados = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        setAsientosOcupados(prev => prev.filter(a => !asientosLiberados.has(Number(a.asiento_boleto_detalle))));
        return;
      }

      const currentUser = getSessionUser();
      const esMismoUsuario = currentUser && data.usuario === currentUser.nombre_usuario;

      setAsientosOcupados(prev => {
        const existingSeats = new Set(prev.map(a => Number(a.asiento_boleto_detalle)));
        const toAdd = data.asientos.filter(a => !existingSeats.has(Number(a.asiento_boleto_detalle)));
        if (toAdd.length === 0) return prev;

        const nuevos = toAdd.map(a => ({
          asiento_boleto_detalle: String(a.asiento_boleto_detalle),
          nombre_cliente: a.nombre_cliente || '',
          identificacion_cliente: a.identificacion_cliente || '',
          total_boleto_detalle: a.total_boleto_detalle || 0,
          id_destino_boleto: a.id_destino_boleto || null,
          estado_boleto_detalle: 1,
          id_boleto: data.id_boleto
        }));

        return [...prev, ...nuevos];
      });

      if (!esMismoUsuario) {
        const vendidos = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        const conflicto = formData.asientosSeleccionados.filter(s => vendidos.has(Number(s)));

        if (conflicto.length > 0) {
          toast.error(
            `⚠️ Conflicto de asientos\nEl asiento ${conflicto.join(', ')} acaba de ser vendido por ${data.usuario || 'otro usuario'}.\nSe ha deseleccionado automáticamente.`,
            {
              id: `conflicto-${data.id_viaje}-${conflicto.join('-')}`,
              duration: 8000,
            }
          );
          setFormData(prev => ({
            ...prev,
            asientosSeleccionados: prev.asientosSeleccionados.filter(s => !vendidos.has(Number(s))),
            pasajeros: prev.pasajeros.filter(p => !vendidos.has(p.asiento))
          }));
        }
      }
    };

    window.addEventListener('boleto_insertado', handler);
    return () => window.removeEventListener('boleto_insertado', handler);
  }, [formData.idViaje, formData.asientosSeleccionados]);

  // Click en asiento
  const handleAsientoClick = (asientoId) => {
    if (!formData.idCliente && !formData.identificacion) {
      Swal.fire({
        title: 'Cliente no seleccionado',
        text: 'Debe escoger un cliente o ingresar una identificación antes de seleccionar un asiento',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0a365d',
      });
      return;
    }

    if (formData.asientosSeleccionados.includes(asientoId)) {
      marcarActividadReal();
      if (window.__socket && formData.idViaje) {
        window.__socket.emit('asiento_desbloquear', {
          id_viaje: formData.idViaje,
          asiento: asientoId
        });
      }

      setFormData(prev => ({
        ...prev,
        asientosSeleccionados: prev.asientosSeleccionados.filter(a => a !== asientoId),
        pasajeros: prev.pasajeros.filter(p => p.asiento !== asientoId)
      }));
    } else {
      if (asientosPendientes[asientoId]) {
        const info = asientosPendientes[asientoId];
        const usuario = typeof info === 'string' ? info : info.usuario;
        toast.error(`El asiento ${asientoId} ya está siendo seleccionado por ${usuario}`, { duration: 4000 });
        return;
      }

      marcarActividadReal();
      if (window.__socket && formData.idViaje) {
        window.__socket.emit('asiento_bloquear', {
          id_viaje: formData.idViaje,
          asiento: asientoId
        });
      }

      setFormData(prev => {
        const tarifaTexto = getTarifaLabel(prev.tarifa);
        const valor = calcularValorConTarifa(precioUnitario, tarifaTexto);
        const descuento = calcularDescuento(precioUnitario, tarifaTexto);
        return {
          ...prev,
          tarifa: descuentoGlobalBoleto ? prev.tarifa : 1,
          asientosSeleccionados: [...prev.asientosSeleccionados, asientoId].sort((a, b) => a - b),
          pasajeros: [...prev.pasajeros, {
            asiento: asientoId,
            cedula: prev.identificacion,
            nombres: prev.nombres,
            valor,
            descuento,
            tarifa: tarifaTexto,
            id_destino: subrutaSeleccionada
          }].sort((a, b) => a.asiento - b.asiento)
        };
      });
    }
  };

  const handleAsientoOcupadoClick = (ocupado) => {
    if (!ocupado) return;
    const destino = destinosViaje.find(d => String(d.id_sub_rutas) === String(ocupado.id_destino_boleto));
    Swal.fire({
      title: `Asiento ${ocupado.asiento_boleto_detalle}`,
      html: `
        <div style="text-align:left;font-size:13px">
          <p><strong>Pasajero:</strong> ${ocupado.nombre_cliente || '---'}</p>
          <p><strong>Cédula:</strong> ${ocupado.identificacion_cliente || '---'}</p>
          <p><strong>Total:</strong> $${parseFloat(ocupado.total_boleto_detalle || 0).toFixed(2)}</p>
          <p><strong>Destino:</strong> ${destino?.nombre_sub_rutas || ocupado.id_destino_boleto || '---'}</p>
          <p><strong>Boleto #:</strong> ${ocupado.id_boleto}</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'IMPRIMIR',
      confirmButtonColor: '#28a745',
      cancelButtonText: 'CERRAR',
      showDenyButton: true,
      denyButtonText: 'CAMBIAR/REUBICAR',
      denyButtonColor: '#035f2c',
      showCloseButton: true,
      focusConfirm: false,
    }).then(result => {
      if (result.isConfirmed && ocupado.id_boleto) {
        imprimirBoleto(ocupado.id_boleto);
      } else if (result.isDenied && ocupado.id_boleto) {
        setBoletoAReagendar(ocupado);
        setShowReagendarModal(true);
      }
    });
  };

  const handleTotalesChange = (t) => {
    setFormData(prev => ({ ...prev, totales: t }));
    setTotalVenta(t.total);
  };

  const handlePrecioChange = (val) => {
    setPrecioUnitario(val);
  };

  const handleGridTotalChange = (total) => {
    setTotalVenta(total);
    setFormData(prev => ({ ...prev, totales: { subtotal: total, total } }));
  };

  // Impresión y Autorización SRI
  const imprimirBoleto = async (id_boleto) => {
    const printUrl = `/php/boletoFactura.php?id_boleto=${id_boleto}`;
    if (metodoImpresion === 'directa') {
      try {
        await imprimirBoletoDirectoQZ(id_boleto, printerBoletos, copiasBoletos);
        toast.success('Boleto impreso en ' + printerBoletos);
      } catch (e) {
        console.error('[QZ] Error al imprimir:', e);
        toast.error('Error al imprimir vía QZ Tray. Abriendo PDF manual...');
        setPdfModalUrl(printUrl);
        setShowPdfModal(true);
      }
    } else {
      setPdfModalUrl(printUrl);
      setShowPdfModal(true);
    }
  };

  const autorizarBoleto = async (id_boleto) => {
    try {
      await BoleteriaService.autorizarBoleto(id_boleto);
    } catch (e) {
      console.error('Error autorizando boleto:', e);
    }
  };

  const limpiarFormulario = () => {
    deseleccionarAsientosActuales();
    setFormData({
      idCliente: '',
      fechaViaje: hoyLocal(),
      origen: '',
      destino: '',
      idViaje: '',
      viajeTexto: '',
      asientosSeleccionados: [],
      pasajeros: [],
      totales: { subtotal: 0, total: 0 },
      identificacion: '',
      nombres: '',
      fechaNacimiento: '',
      direccion: '',
      celular: '',
      correo: '',
      tarifa: 1,
      observacion: ''
    });
    setDestinosViaje([]);
    setAsientosOcupados([]);
    setSubrutaSeleccionada('');
    setPrecioUnitario(0);
    setEsReserva(false);
    setTotalVenta(0);
    setAlimentoInfo(null);
    setDiscoBus('');
    setIdBus('');
    setIdChofer('');
    setCedulaChofer('');
    setNombreChofer('');
    setHoraViaje('');
    setMapaAsientos(null);
  };

  const refrescarViajes = useCallback(async () => {
    try {
      const usuario = getSessionUser();
      const viajesRes = await BoleteriaService.getViajesDisponibles({
        fecha: formData.fechaViaje || hoyLocal(),
        id_sucursal: usuario.id_sucursal
      });
      if (viajesRes.success && viajesRes.data) setViajesDisponibles(viajesRes.data);
    } catch (e) {
      console.error('Error refrescando viajes:', e);
    }
  }, [formData.fechaViaje]);

  const confirmarGuardar = async () => {
    const errores = [];
    if (!formData.idViaje) errores.push('• Seleccionar un viaje');
    if (!subrutaSeleccionada) errores.push('• Seleccionar un destino/tarifa');
    if (!formData.identificacion) errores.push('• Ingresar identificación del pasajero');
    if (!formData.nombres) errores.push('• Ingresar nombre del pasajero');
    if (formData.celular && !/^[0-9]{9,15}$/.test(formData.celular)) {
      errores.push('• El celular debe contener entre 9 y 15 dígitos numéricos');
    }
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errores.push('• Ingresar un correo electrónico válido (ej: usuario@correo.com)');
    }

    if (formData.asientosSeleccionados.length === 0) errores.push('• Seleccionar al menos un asiento');
    if (formData.pasajeros.some(p => !p.cedula || !p.nombres)) errores.push('• Completar cédula y nombres de todos los pasajeros en la lista');

    if (errores.length > 0) {
      toast.error(
        <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: 12, lineHeight: 1.6 }}>
          <strong>Complete los siguientes campos:</strong>
          {'\n' + errores.map(e => '\n• ' + e.replace('• ', '')).join('')}
        </div>,
        { duration: 6000 }
      );
      return;
    }

    const minutosBoleto = horaAMinutos(new Date().toTimeString().split(' ')[0]);
    const minutosViaje = horaAMinutos(horaViaje);
    const esHoy = !formData.fechaViaje || formData.fechaViaje === hoyLocal();

    if (esHoy && minutosViaje > 0 && minutosBoleto > minutosViaje) {
      toast.error('Este viaje ya está en despacho, no se pueden vender boletos', { duration: 5000 });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirmar Venta',
      html: `
        <div style="text-align:center">
          <p style="font-size:16px;font-weight:bold;color:#0a365d">${formData.pasajeros.length} asiento(s)</p>
          <p style="font-size:13px;color:#64748b">Pasajero: ${formData.nombres || '---'}</p>
          <p style="font-size:13px;color:#64748b">Total: <strong>$${totalVenta.toFixed(2)}</strong></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#035f2c'
    });
    if (!result.isConfirmed) return;
    ejecutarGuardar();
  };

  const ejecutarGuardar = async () => {
    setIsSubmitting(true);
    try {
      const precioPorAsiento = formData.asientosSeleccionados.length > 0
        ? totalVenta / formData.asientosSeleccionados.length
        : 0;

      const detalles = formData.pasajeros.map(p => {
        const valorFinal = p.valor !== undefined && p.valor !== null && p.valor !== '' ? parseFloat(p.valor) : precioPorAsiento;
        return {
          total_boleto_detalle: valorFinal,
          asiento_boleto_detalle: String(p.asiento),
          precio_boleto_detalle: valorFinal,
          descuento_boleto_detalle: parseFloat(p.descuento || 0),
          iva_boleto_detalle: 0,
          nombre_cliente_boleto_detalle: p.nombres || formData.nombres,
          identificacion_boleto_detalle: p.cedula || formData.identificacion,
          tarifa_boleto_detalle: p.tarifa || 'Normal',
          id_destino: parseInt(p.id_destino || subrutaSeleccionada) || null,
          incluye_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? 1 : 0,
          precio_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? parseFloat(alimentoInfo.precio_alimentos || 0) : 0,
        };
      });

      const body = {
        viaje: formData.idViaje,
        id_bus: idBus,
        id_chofer: idChofer,
        cedula_chofer: cedulaChofer,
        destino: subrutaSeleccionada,
        id_origen: formData.origen,
        identificacion: formData.pasajeros[0]?.cedula || formData.identificacion,
        nombres: formData.pasajeros[0]?.nombres || formData.nombres,
        total_final: totalVenta,
        es_reserva: esReserva ? 1 : 0,
        observacion: formData.observacion,
        hora_boleto: new Date().toTimeString().split(' ')[0],
        detalles_boletos: JSON.stringify(detalles),
        id_caja_global: localCajaId || getSessionUser().id_caja_global ||
          getSessionUser().id_caja_boleteria_global || 0
      };

      const response = await BoleteriaService.venderBoleto(body);

      if (response.success) {
        const idBoleto = response.id_boleto;
        toast.success(esReserva ? 'Boleto(s) reservado(s) correctamente' : 'Boleto(s) generado(s) correctamente');
        if (idBoleto) {
          if (autoAutorizarBoleto) {
            autorizarBoleto(idBoleto);
          }
          await imprimirBoleto(idBoleto);

          // Envío por WhatsApp si aplica
          const numerosUnicos = new Set();
          if (formData.celular) numerosUnicos.add(formData.celular.replace(/\D/g, ''));
          if (formData.pasajeros && formData.pasajeros.length > 0) {
            formData.pasajeros.forEach(p => {
              if (p.celular) numerosUnicos.add(p.celular.replace(/\D/g, ''));
            });
          }

          const numerosValidos = Array.from(numerosUnicos).filter(num => num.length >= 9);
          const empDataStr = sessionStorage.getItem('empresa_data');
          const empData = empDataStr ? JSON.parse(empDataStr) : null;
          const enviarWhatsapp = empData ? empData.enviar_whatsapp === 1 : false;

          if (numerosValidos.length > 0 && enviarWhatsapp) {
            try {
              const fileUrl = window.location.origin + `/php/boletoFactura.php?id_boleto=${idBoleto}`;
              const mensaje = `Estimado(a) ${formData.nombres || 'pasajero'},\n\nAdjuntamos su boleto de viaje para su próximo traslado. ¡Buen viaje!`;

              for (const celular of numerosValidos) {
                try {
                  await api.post('/whatsapp/enviar', {
                    number: celular,
                    message: mensaje,
                    fileUrl: fileUrl
                  });
                } catch (e) {
                  console.error('Error enviando WhatsApp boleto a', celular, e);
                }
              }
              toast.success(`Boleto enviado por WhatsApp a ${numerosValidos.length} destinatario(s)`);
            } catch (e) {
              console.error('Error preparando PDF boleto para WhatsApp', e);
            }
          }
        }
        limpiarFormulario();
        refrescarViajes();
      } else {
        toast.error(response.message || 'Error al generar el boleto.');
      }
    } catch (e) {
      console.error('Error al guardar:', e);
      const msg = e.response?.data?.message || e.message || 'Error al generar el boleto.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers para modales
  const handleClienteCreado = (nuevoCliente, esEdicion) => {
    const fechaNac = nuevoCliente.fecha_nacimiento ? new Date(nuevoCliente.fecha_nacimiento).toISOString().split('T')[0] : '';
    const edad = calcularEdad(fechaNac);
    const tarifaVal = tarifaDesdeEdad(edad);
    setFormData(prev => ({
      ...prev,
      idCliente: nuevoCliente.id_cliente,
      identificacion: nuevoCliente.identificacion_cliente,
      nombres: nuevoCliente.nombre_cliente,
      celular: nuevoCliente.telefono_cliente,
      direccion: nuevoCliente.direccion_cliente,
      correo: nuevoCliente.email_cliente,
      fechaNacimiento: fechaNac,
      tarifa: tarifaVal,
    }));
    toast.success(esEdicion
      ? `Cliente actualizado: ${nuevoCliente.nombre_cliente}`
      : `Cliente cargado: ${nuevoCliente.nombre_cliente}`);
  };

  const handleCambioBusExitoso = ({ id_bus, id_chofer }) => {
    setIdBus(id_bus);
    setIdChofer(id_chofer);
    setRefreshAsientosKey(prev => prev + 1);
  };

  const handleAgenciaCambiada = (record) => {
    if (!record) return;
    const usuario = getSessionUser();
    usuario.id_sucursal = record.id_sucursal;
    usuario.nombre_sucursal = record.nombre_sucursal || usuario.nombre_sucursal;
    usuario.punto_emision_sucursal = record.punto_emision_sucursal || usuario.punto_emision_sucursal;
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
    setCurrentAgencia(record.nombre_sucursal || usuario.nombre_sucursal || 'Desconocida');
    toast.success(`Agencia cambiada a: ${record.nombre_sucursal || record.id_sucursal}`);
    limpiarFormulario();
    buscarViajes();
  };

  const handleCerrarModalCaja = () => {
    setShowCajaModal(false);
    window.location.href = '/boleteria';
  };

  const handleCrearCaja = async (data) => {
    try {
      const usuario = getSessionUser();
      const res = await cajaBoleteriaService.insertarAperturaCaja({
        ...data,
        id_sucursal: usuario.id_sucursal,
        id_usuario: usuario.id_usuario
      });
      if (res.success) {
        setLocalCajaId(res.data?.id_caja || res.id_caja);
        setShowCajaModal(false);
        setCajaResolved(true);
        toast.success('Caja aperturada correctamente');
        buscarViajes();
      } else {
        toast.error('Error al aperturar caja: ' + res.message);
      }
    } catch (err) {
      toast.error('Error al aperturar caja: ' + (err.message || 'Desconocido'));
    }
  };

  if (cajaChecking) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
        <p style={{ marginLeft: 10 }}>Verificando caja...</p>
      </div>
    );
  }

  if (!cajaResolved) {
    return (
      <div className="nuevo-boleto-container" style={{ backgroundColor: '#f5f5f5', height: '100vh', display: 'flex' }}>
        <Modal isOpen={showCajaModal} onClose={handleCerrarModalCaja} title="Aperturar Caja">
          <AperturaCajaForm onSubmit={handleCrearCaja} onCancel={handleCerrarModalCaja} />
        </Modal>
      </div>
    );
  }

  return (
    <div className="nuevo-boleto-container" style={{ backgroundColor: '#f5f5f5' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px', paddingBottom: '70px' }}>
        {/* 1. TOP TOOLBAR & AGENCIA/TIMER */}
        <BoletoTopBar
          onOpenCambiarBus={() => setShowCambiarBusModal(true)}
          onOpenCambiarAgencia={() => setShowCambiarAgenciaModal(true)}
          onOpenListadoPasajeros={() => setShowListadoPasajeros(true)}
          idViaje={formData.idViaje}
          currentAgencia={currentAgencia}
          tiempoRestante={tiempoRestante}
          horaViaje={horaViaje}
        />

        {/* 2. SELECTOR DE FECHA Y VIAJES DISPONIBLES */}
        <ViajesSelector
          fechaViaje={formData.fechaViaje}
          onFechaChange={(fecha) => {
            marcarActividadReal();
            setFormData(prev => ({ ...prev, fechaViaje: fecha }));
          }}
          onBuscarViajes={buscarViajes}
          loadingViajes={loadingViajes}
          viajesDisponibles={viajesDisponibles}
          idViajeSeleccionado={formData.idViaje}
          onSelectViaje={(v) => {
            if (formData.idViaje !== String(v.id_viajes)) {
              deseleccionarAsientosActuales();
            }
            setFormData(prev => ({
              ...prev,
              idViaje: String(v.id_viajes),
              viajeTexto: `${v.hora || v.hora_salida} - Bus ${v.bus_disco || v.bus_codigo}`,
              origen: v.id_origen || prev.origen,
              asientosSeleccionados: [],
              pasajeros: []
            }));
            setDiscoBus(v.bus_disco || v.bus_codigo || '');
            setCapacidadBus(v.capacidad_buses || 40);
            setHoraViaje(v.hora || v.hora_salida || '');
            setIdBus(v.id_fkbus_viajes || v.id_buses || v.bus_id || '');
          }}
        />

        {/* 3. CONTENIDO PRINCIPAL (Formularios + Visualizador del Bus) */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* COLUMNA IZQUIERDA: Formularios de venta */}
          <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Detalles del Viaje */}
            <DetallesViajePanel
              idViaje={formData.idViaje}
              viajesDisponibles={viajesDisponibles}
              onViajeChange={(viajeId) => {
                marcarActividadReal();
                if (formData.idViaje !== viajeId) {
                  deseleccionarAsientosActuales();
                }
                const v = viajesDisponibles.find(vv => String(vv.id_viajes) === viajeId);
                setFormData(prev => ({ ...prev, idViaje: viajeId, origen: v?.id_origen || prev.origen, asientosSeleccionados: [], pasajeros: [] }));
                if (v) {
                  setDiscoBus(v.bus_disco || v.bus_codigo || '');
                  setHoraViaje(v.hora_origen_salida || v.hora_salida_rutas || v.hora || v.hora_salida || '');
                  setIdBus(v.id_fkbus_viajes || v.id_buses || v.bus_id || '');
                }
              }}
              onRefrescarViajes={buscarViajes}
              subrutaSeleccionada={subrutaSeleccionada}
              destinosViaje={destinosViaje}
              onDestinoChange={(id) => {
                marcarActividadReal();
                setSubrutaSeleccionada(id);
                const subruta = destinosViaje.find(d => String(d.id_sub_rutas) === id);
                const precio = subruta ? parseFloat(subruta.valor_sub_rutas || 0) : 0;
                setPrecioUnitario(precio);
              }}
              onRefrescarDestinos={() => {
                if (formData.idViaje) {
                  BoleteriaService.getDestinosViaje(formData.idViaje).then(r => {
                    if (r.success && r.data) {
                      setDestinosViaje(r.data);
                    } else {
                      toast.error('No se pudieron cargar los destinos');
                    }
                  }).catch(e => {
                    console.error('Error refrescando destinos:', e);
                    toast.error('Error al refrescar destinos');
                  });
                }
              }}
              alimentoInfo={alimentoInfo}
            />

            {/* Datos del Pasajero */}
            <DatosPasajeroPanel
              formData={formData}
              onFieldChange={(field, val) => {
                marcarActividadReal();
                setFormData(prev => ({ ...prev, [field]: val }));
              }}
              onBuscarCI={(ci) => {
                marcarActividadReal();
                buscarPasajeroPorCI(ci);
              }}
              onLimpiarPasajero={() => {
                marcarActividadReal();
                setFormData(prev => ({ ...prev, idCliente: '', identificacion: '', nombres: '', celular: '', direccion: '', correo: '', fechaNacimiento: '', tarifa: 1 }));
              }}
              onConsumidorFinal={handleConsumidorFinal}
              onOpenCrearCliente={() => {
                marcarActividadReal();
                setClienteAEditar(null);
                setShowNuevoClienteModal(true);
              }}
              onOpenEditarCliente={() => {
                marcarActividadReal();
                setClienteAEditar({
                  id_cliente: formData.idCliente,
                  identificacion_cliente: formData.identificacion,
                  nombre_cliente: formData.nombres,
                  direccion_cliente: formData.direccion,
                  telefono_cliente: formData.celular,
                  email_cliente: formData.correo,
                  fecha_nacimiento: formData.fechaNacimiento,
                });
                setShowNuevoClienteModal(true);
              }}
              onFechaNacimientoChange={(fecha) => {
                marcarActividadReal();
                const edad = calcularEdad(fecha);
                const tarifa = tarifaDesdeEdad(edad);
                setFormData(prev => ({ ...prev, fechaNacimiento: fecha, tarifa }));
              }}
            />

            {/* Opciones de Boleto */}
            <OpcionesBoletoPanel
              tarifa={formData.tarifa}
              onTarifaChange={(tarifaVal) => {
                marcarActividadReal();
                if (descuentoGlobalBoleto) {
                  const tarifaTexto = getTarifaLabel(tarifaVal);
                  setFormData(prev => {
                    const nuevosPasajeros = prev.pasajeros.map(p => {
                      const destino = destinosViaje.find(d => String(d.id_sub_rutas) === String(p.id_destino || subrutaSeleccionada));
                      const base = destino ? parseFloat(destino.valor_sub_rutas || 0) : precioUnitario;
                      const val = calcularValorConTarifa(base, tarifaTexto);
                      const dcto = calcularDescuento(base, tarifaTexto);
                      return { ...p, tarifa: tarifaTexto, valor: val, descuento: dcto };
                    });
                    const nuevoTotal = nuevosPasajeros.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
                    setTotalVenta(nuevoTotal);
                    return {
                      ...prev,
                      tarifa: tarifaVal,
                      pasajeros: nuevosPasajeros,
                      totales: { subtotal: nuevoTotal, total: nuevoTotal }
                    };
                  });
                } else {
                  setFormData(prev => ({ ...prev, tarifa: tarifaVal }));
                }
              }}
              esReserva={esReserva}
              onToggleReserva={() => {
                marcarActividadReal();
                setEsReserva(!esReserva);
              }}
              observacion={formData.observacion}
              onObservacionChange={(val) => {
                marcarActividadReal();
                setFormData(prev => ({ ...prev, observacion: val }));
              }}
            />

            {/* Lista de Asientos seleccionados */}
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 3,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 2
              }}>
                <i className="fas fa-users" style={{ marginRight: 4, color: '#0a365d', fontSize: 13 }}></i>
                Lista de Asientos
              </div>
              <PasajerosGrid
                pasajeros={formData.pasajeros}
                onChange={nuevosPasajeros => setFormData(prev => ({
                  ...prev,
                  pasajeros: nuevosPasajeros,
                  asientosSeleccionados: nuevosPasajeros.map(p => p.asiento).filter(Boolean)
                }))}
                destinosViaje={destinosViaje}
                precioUnitario={precioUnitario}
                onTotalesChange={handleGridTotalChange}
              />
            </div>

            {/* Panel de Totales */}
            <BoletoTotalesPanel
              cantidadAsientos={formData.asientosSeleccionados.length}
              precioUnitario={precioUnitario}
              totales={formData.totales}
              onTotalesChange={handleTotalesChange}
              onPrecioChange={handlePrecioChange}
              compact={true}
            />
          </div>

          {/* COLUMNA DERECHA: Visualizador del Bus */}
          <div style={{ flex: 4, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 150px)' }}>
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'
            }}>
              {alimentoInfo?.incluye_alimentos && (
                <div style={{
                  fontSize: 12, color: '#d35400', fontWeight: 'bold', fontStyle: 'italic',
                  textAlign: 'center', marginBottom: 2
                }}>
                  <i className="fas fa-utensils" style={{ fontSize: 12 }}></i> Incluye: {alimentoInfo.nombre_alimentos} (${parseFloat(alimentoInfo.precio_alimentos || 0).toFixed(2)})
                </div>
              )}
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 3,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 2
              }}>
                <i className="fas fa-bus" style={{ marginRight: 3, color: '#e67e22', fontSize: 13 }}></i>
                Visualización del Bus
              </div>
              {formData.idViaje && nombreChofer && (
                <div style={{
                  fontSize: 12, color: '#0a365d', fontWeight: 600,
                  marginBottom: 2, padding: '1px 0',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <i className="fas fa-user-tie" style={{ fontSize: 12 }}></i>
                  Conductor: {nombreChofer}
                </div>
              )}
              {!formData.idViaje ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-bus" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}></i>
                  <p style={{ fontSize: 11 }}>Seleccione un viaje para ver la distribución de asientos</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <BusVisualizer
                    capacidad={capacidadBus}
                    pisos={pisosBus}
                    mapaAsientos={mapaAsientos}
                    asientosOcupados={asientosOcupados}
                    asientosSeleccionados={formData.asientosSeleccionados}
                    asientosPendientes={asientosPendientes}
                    onAsientoClick={handleAsientoClick}
                    onAsientoOcupadoClick={handleAsientoOcupadoClick}
                    discoBus={discoBus}
                    totalVenta={totalVenta}
                    seatLockTimeoutMs={15 * 60 * 1000}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOOTER FIJO */}
      <BoletoFooter
        idViaje={formData.idViaje}
        discoBus={discoBus}
        totalRecaudado={totalRecaudado}
        cantidadAsientos={formData.asientosSeleccionados.length}
        precioUnitario={precioUnitario}
        totalVenta={totalVenta}
        isSubmitting={isSubmitting}
        onGuardar={confirmarGuardar}
        onCancelar={() => navigate('/boleteria')}
      />

      {/* 5. MODALES */}
      <NuevoClienteModal
        isOpen={showNuevoClienteModal}
        onClose={() => { setShowNuevoClienteModal(false); setClienteAEditar(null); setIsForcedEditCliente(false); }}
        onClienteCreado={handleClienteCreado}
        clienteInicial={clienteAEditar}
        isForcedEdit={isForcedEditCliente}
      />
      <CambiarBusModal
        isOpen={showCambiarBusModal}
        onClose={() => setShowCambiarBusModal(false)}
        viajeId={formData.idViaje}
        currentBusId={idBus}
        currentChoferId={idChofer}
        onCambioExitoso={handleCambioBusExitoso}
      />
      <ReagendarBoletoModal
        isOpen={showReagendarModal}
        onClose={() => { setShowReagendarModal(false); setBoletoAReagendar(null); }}
        boletoOriginal={boletoAReagendar}
        onSuccess={() => {
          setRefreshAsientosKey(k => k + 1);
          if (boletoAReagendar?.asiento_boleto_detalle) {
            setAsientosPendientes(prev => {
              const next = { ...prev };
              delete next[boletoAReagendar.asiento_boleto_detalle];
              return next;
            });
          }
        }}
      />
      <CambiarAgenciaModal
        isOpen={showCambiarAgenciaModal}
        onClose={() => setShowCambiarAgenciaModal(false)}
        currentIdCaja={getSessionUser().id_sucursal}
        onAgenciaCambiada={handleAgenciaCambiada}
      />
      <ListadoPasajerosModal
        isOpen={showListadoPasajeros}
        onClose={() => setShowListadoPasajeros(false)}
        viajeId={formData.idViaje}
      />
      <PdfViewerModal
        open={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        url={pdfModalUrl}
        title="Boleto - Vista previa"
        showPrintButton
      />
    </div>
  );
};

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
import { AsientoOcupadoModal } from './components/AsientoOcupadoModal';
import { ListadoPasajerosModal } from './components/ListadoPasajerosModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import Modal from '../../components/common/Modal';
import { AperturaCajaForm } from '../CajaBoleteria/components/AperturaCajaForm';

// Servicios y Utilidades
import { BoleteriaService } from '../../services/boleteria.service';
import { AsientosService } from '../../services/asientos.service';
import { cajaBoleteriaService } from '../../services/cajaBoleteria.service';
import { COLORES_ASIENTOS_DEFAULT, normalizarColoresAsientos } from '../../config/coloresAsientos';
import { api, clienteApi } from '../../config/axios';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import {
  getTarifaLabel,
  calcularValorConTarifa,
  calcularDescuento,
  calcularEdad,
  tarifaDesdeEdad,
  hoyLocal,
  getSessionUser
} from './utils/boletoUtils';
import { imprimirBoletoDirectoQZ, imprimirPdfDirecto } from './utils/boletoImpresion';
import './NuevoBoletoPage.css';

/// Tolerancia por defecto para vender boletos después de la hora de salida.
/// El backend envía `minutos_gracia_venta` en cada viaje; este es el respaldo.
const MINUTOS_GRACIA_VENTA = 10;

const obtenerSalidaEfectiva = (viaje, fechaFallback) => {
  if (!viaje) return null;

  const fecha = String(viaje.fecha_viaje || fechaFallback || '').slice(0, 10);
  const hora = String(
    viaje.hora_origen_salida ||
    viaje.hora_salida_rutas ||
    viaje.hora ||
    viaje.hora_salida ||
    ''
  ).slice(0, 8);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) {
    return null;
  }

  const salida = new Date(`${fecha}T${hora.length === 5 ? `${hora}:00` : hora}`);
  if (Number.isNaN(salida.getTime())) return null;

  const minutosOffset = Number(viaje.minutos_offset_parada ?? viaje.minutos_aplicados ?? 0);
  if (Number.isFinite(minutosOffset) && minutosOffset > 0) {
    salida.setMinutes(salida.getMinutes() + minutosOffset);
  }

  return salida;
};

const extractSucursalId = (val) => {
  if (!val) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    if (val === '[object Object]' || val.trim() === '' || val === 'undefined' || val === 'null') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'object') {
    // Ignore SyntheticEvent and DOM events
    if (val.nativeEvent || val.target || val.preventDefault || val._reactName) return null;
    const raw = val.id_sucursal ?? val.id_fksucursal ?? val.suc_codigo_sucursal ?? val.id ?? val.value;
    if (raw !== undefined && raw !== null && typeof raw !== 'object') {
      const n = parseInt(raw, 10);
      return isNaN(n) ? null : n;
    }
  }
  return null;
};

// El usuario de sesión puede traer la sucursal como id interno, código,
// id_fksucursal_usuario o sucursal_usuario según el origen del login.
const idSucursalSesion = (u) => extractSucursalId(
  u?.id_sucursal ?? u?.id_fksucursal ?? u?.sucursal ?? u?.id_fksucursal_usuario ?? u?.sucursal_usuario
);
const codigoSucursalSesion = (u) => extractSucursalId(
  u?.suc_codigo_sucursal ?? u?.id_fksucursal ?? u?.id_fksucursal_usuario ?? u?.sucursal_usuario ?? u?.sucursal ?? u?.id_sucursal
);

export const NuevoBoletoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const usuario = user || getSessionUser();
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
  const [identificacionNuevaCliente, setIdentificacionNuevaCliente] = useState('');
  const [isForcedEditCliente, setIsForcedEditCliente] = useState(false);
  const [showCambiarBusModal, setShowCambiarBusModal] = useState(false);
  const [showReagendarModal, setShowReagendarModal] = useState(false);
  const [boletoAReagendar, setBoletoAReagendar] = useState(null);
  const [showCambiarAgenciaModal, setShowCambiarAgenciaModal] = useState(false);
  const [asientoOcupado, setAsientoOcupado] = useState(null);
  const [showListadoPasajeros, setShowListadoPasajeros] = useState(false);
  const [autoAutorizarBoleto, setAutoAutorizarBoleto] = useState(false);
  const [descuentoGlobalBoleto, setDescuentoGlobalBoleto] = useState(false);
  const [omitirConfirmacionBoleto, setOmitirConfirmacionBoleto] = useState(false);
  const [permitirConsumidorFinal, setPermitirConsumidorFinal] = useState(true);
  const [refreshAsientosKey, setRefreshAsientosKey] = useState(0);
  const [asientosPendientes, setAsientosPendientes] = useState({});

  // Heartbeat y temporizador
  const lastRealActionRef = useRef(null);
  useEffect(() => { lastRealActionRef.current = Date.now(); }, []);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  // Para no resetear el tramo al recargar ocupación por cambio de tramo
  const viajeCargadoRef = useRef(null);
  // Token de la última petición de asientos (descarta respuestas obsoletas)
  const peticionAsientosRef = useRef(0);
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

  const [activeSucursalId, setActiveSucursalId] = useState(() => idSucursalSesion(getSessionUser()));
  const [activeSucursalCodigo, setActiveSucursalCodigo] = useState(() => codigoSucursalSesion(getSessionUser()));

  // Colores del mapa de asientos configurados en la agencia activa.
  const [coloresAsientos, setColoresAsientos] = useState(COLORES_ASIENTOS_DEFAULT);
  useEffect(() => {
    let cancelado = false;
    const cargarColores = async () => {
      if (!activeSucursalId) {
        setColoresAsientos(COLORES_ASIENTOS_DEFAULT);
        return;
      }
      try {
        const respuesta = await AsientosService.getColoresAsientos(activeSucursalId);
        if (!cancelado) {
          setColoresAsientos(normalizarColoresAsientos(respuesta?.data ?? respuesta));
        }
      } catch (error) {
        console.error('Error cargando colores de asientos de la agencia:', error);
        if (!cancelado) setColoresAsientos(COLORES_ASIENTOS_DEFAULT);
      }
    };
    cargarColores();
    return () => { cancelado = true; };
  }, [activeSucursalId]);

  // Sucursal con la que el operador entró a la pantalla: permite restaurarla
  // desde el botón "Reiniciar" (cambiar de agencia sobrescribe la sesión).
  // useState con inicializador perezoso: se fija una sola vez al montar.
  const [sucursalOriginal] = useState(() => {
    const u = getSessionUser();
    return {
      id_sucursal: idSucursalSesion(u),
      suc_codigo_sucursal: codigoSucursalSesion(u),
      nombre_sucursal: u.nombre_sucursal || 'Desconocida',
      punto_emision_sucursal: u.punto_emision_sucursal || null,
    };
  });

  // La agencia puede identificarse por id interno o por código sucursal,
  // por eso se consideran ambos al decidir si se volvió a la original.
  const esSucursalOriginal = (idSucursal, codigoSucursal) => {
    const originales = [sucursalOriginal.id_sucursal, sucursalOriginal.suc_codigo_sucursal]
      .filter(v => v !== null && v !== undefined)
      .map(String);
    if (originales.length === 0) return true;
    return [idSucursal, codigoSucursal]
      .filter(v => v !== null && v !== undefined)
      .map(String)
      .some(v => originales.includes(v));
  };
  const sucursalCambiada = !esSucursalOriginal(activeSucursalId, activeSucursalCodigo);

  const [formData, setFormData] = useState({
    idCliente: '',
    fechaViaje: hoyLocal(),
    origen: '',
    destino: '',
    idViaje: '',
    viajeTexto: '',
    // Punto final real del pasaje cuando la agencia vende más allá de la
    // última parada de la ruta (ej. ruta Ambato - Coca vendida a Aguagrio).
    puntoFinal: '',
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

  // El conteo usa la salida efectiva desde la agencia actual.
  useEffect(() => {
    if (!horaViaje) { setTiempoRestante(null); return; }
    const calcular = () => {
      const viajeSeleccionado = viajesDisponibles.find(v => String(v.id_viajes) === String(formData.idViaje));
      const salida = obtenerSalidaEfectiva(viajeSeleccionado, formData.fechaViaje);
      if (!salida) {
        setTiempoRestante(null);
        return;
      }

      const ahora = new Date();
      const diff = Math.floor((salida - ahora) / 1000);
      const pasado = diff < 0;
      const absDiff = Math.abs(diff);

      const horas = Math.floor(absDiff / 3600);
      const minutos = Math.floor((absDiff % 3600) / 60);
      const segundos = absDiff % 60;

      // Ventana de tolerancia para seguir vendiendo tras la salida.
      const minutosGracia = Number(
        viajeSeleccionado?.minutos_gracia_venta ?? MINUTOS_GRACIA_VENTA
      );
      const graciaRestante = Math.max(0, minutosGracia * 60 - absDiff);

      setTiempoRestante({
        horas,
        minutos,
        segundos,
        totalSeg: absDiff,
        pasado,
        enGracia: pasado && graciaRestante > 0,
        graciaRestante
      });
    };
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [horaViaje, formData.idViaje, formData.fechaViaje, viajesDisponibles]);

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
        const initialSucursalId = extractSucursalId(usuario.id_sucursal || usuario.id_fksucursal || usuario.sucursal);
        const [viajesRes, configRes] = await Promise.all([
          BoleteriaService.getViajesDisponibles({
            fecha: hoyLocal(),
            ...(initialSucursalId ? { id_sucursal: initialSucursalId } : {})
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
          if (cfg.omitir_confirmacion_boleto === 1 || cfg.omitir_confirmacion_boleto === true) {
            setOmitirConfirmacionBoleto(true);
          }
          if (cfg.permitir_consumidor_final === 0 || cfg.permitir_consumidor_final === false) {
            setPermitirConsumidorFinal(false);
          }
        }

        try {
          const userRes = await api.get('/buscarUsuario');
          if (userRes.data?.success && userRes.data?.data) {
            const uData = userRes.data.data;
            if (uData.nombre_sucursal) {
              setCurrentAgencia(uData.nombre_sucursal);
            }
            const sucId = extractSucursalId(uData.id_sucursal || uData.suc_codigo_sucursal);
            if (sucId) {
              setActiveSucursalId(sucId);
              const currUser = getSessionUser();
              currUser.id_sucursal = sucId;
              currUser.nombre_sucursal = uData.nombre_sucursal;
              currUser.punto_emision_sucursal = uData.punto_emision_sucursal;
              sessionStorage.setItem('usuario', JSON.stringify(currUser));
              sessionStorage.setItem('user_data', JSON.stringify(currUser));
            }
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

  // Abre el modal de creación de cliente (opcionalmente precargando la identificación)
  const abrirCrearCliente = (identificacion = '') => {
    marcarActividadReal();
    setClienteAEditar(null);
    setIsForcedEditCliente(false);
    setIdentificacionNuevaCliente(identificacion);
    setShowNuevoClienteModal(true);
  };

  // Buscar cliente por CI/RUC (vía intermediario interno del backend → clientesfp)
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
        setFormData(prev => ({ ...prev, idCliente: '', nombres: '', celular: '', direccion: '', correo: '', fechaNacimiento: '', tarifa: 1 }));
        // Toast con acción: permite crear el cliente precargando la identificación buscada
        toast.custom(
          (t) => (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', color: '#1e293b', padding: '10px 14px',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: 13 }}>Cliente no encontrado</span>
              <button
                type="button"
                onClick={() => { toast.dismiss(t.id); abrirCrearCliente(identificacion); }}
                style={{
                  background: '#0a365d', color: '#fff', border: 'none', borderRadius: 4,
                  padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5
                }}
              >
                <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i> Crear cliente
              </button>
            </div>
          ),
          { id: toastId, duration: 8000 }
        );
      }
    } catch (err) {
      console.error('[buscarPasajeroPorCI] Error:', err);
      toast.error('Error al buscar cliente - servidor no disponible', { id: toastId });
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
  const buscarViajes = useCallback(async (customSucursalId, customFecha) => {
    const fechaBusqueda = customFecha || formData.fechaViaje;
    if (!fechaBusqueda) return;
    setLoadingViajes(true);
    try {
      const parsedCustom = extractSucursalId(customSucursalId);
      const parsedActive = extractSucursalId(activeSucursalId);
      const sessionUser = getSessionUser();
      const parsedSession = idSucursalSesion(sessionUser);
      const parsedUsuario = idSucursalSesion(usuario);

      const sucursalId = parsedCustom || parsedActive || parsedSession || parsedUsuario || null;
      const params = { fecha: fechaBusqueda };
      if (sucursalId && typeof sucursalId === 'number') {
        params.id_sucursal = sucursalId;
      }

      const res = await BoleteriaService.getViajesDisponibles(params);
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
  }, [formData.fechaViaje, activeSucursalId, usuario]);

  // Cargar asientos y destinos al seleccionar viaje
  useEffect(() => {
    if (!formData.idViaje) {
      viajeCargadoRef.current = null;
      setAsientosOcupados([]);
      setDestinosViaje([]);
      setMapaAsientos(null);
      setHoraViaje('');
      setAlimentoInfo(null);
      setTotalRecaudado(0);
      return;
    }

    // Debe calcularse ANTES de actualizar viajeCargadoRef; si no, esNuevoViaje
    // siempre sería false y los destinos no se refrescarían al cambiar de viaje.
    const esNuevoViaje = viajeCargadoRef.current !== formData.idViaje;

    // Al cambiar de viaje el destino anterior ya no aplica: si se enviara, se
    // consultaría la ocupación con un tramo de OTRA ruta (resultado incorrecto).
    const destinoConsulta = esNuevoViaje ? '' : subrutaSeleccionada;

    // Token de petición: las respuestas que llegan fuera de orden se descartan
    // para que una consulta anterior no sobrescriba la ocupación actual
    // (causa de que "desaparecieran" los asientos ocupados).
    const peticion = ++peticionAsientosRef.current;

    const cargarAsientos = async () => {
      try {
        const sucursalId = activeSucursalId || idSucursalSesion(getSessionUser()) || idSucursalSesion(usuario);
        // Tramo de venta: origen actual + destino seleccionado (para ocupación exacta)
        const origenTramo = formData.origen || undefined;
        const destinoTramo = destinoConsulta || undefined;

        const promises = [
          BoleteriaService.getAsientosBusViaje(formData.idViaje, origenTramo, destinoTramo).catch(e => {
            console.error('[cargarAsientos] Error en getAsientosBusViaje:', e);
            return { success: false };
          })
        ];

        if (esNuevoViaje || destinosViaje.length === 0) {
          promises.push(
            BoleteriaService.getDestinosViaje(formData.idViaje, sucursalId, undefined, sucursalCambiada).catch(e => {
              console.error('[cargarAsientos] Error en getDestinosViaje:', e);
              return { success: false };
            })
          );
        }

        const [asientosRes, destinosViajeRes] = await Promise.all(promises);

        // Respuesta obsoleta: ya se disparó otra consulta más reciente.
        if (peticion !== peticionAsientosRef.current) return;

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
          const horaDelViaje = selectedViaje?.hora_salida_parada || selectedViaje?.hora_origen_salida || selectedViaje?.hora_salida_rutas || selectedViaje?.hora || selectedViaje?.hora_salida || busData.hora_viaje || formData.viajeTexto?.split(' - ')[0] || '';
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

        if (destinosViajeRes && destinosViajeRes.success && destinosViajeRes.data) {
          setDestinosViaje(destinosViajeRes.data);
          if (destinosViajeRes.data.length > 0) {
            // Al cambiar de viaje la selección anterior ya no aplica: se elige
            // el primer destino. Si no, el `subrutaSeleccionada` capturado en el
            // closure (valor viejo) puede hacer "match" con las sub-rutas del
            // nuevo viaje y dejar el select vacío hasta refrescar.
            const currentMatch = esNuevoViaje
              ? null
              : destinosViajeRes.data.find(
                  d => String(d.id_sub_rutas) === String(subrutaSeleccionada)
                );
            if (currentMatch) {
              setPrecioUnitario(parseFloat(currentMatch.valor_sub_rutas || 0));
            } else {
              const first = destinosViajeRes.data[0];
              setSubrutaSeleccionada(String(first.id_sub_rutas));
              setPrecioUnitario(parseFloat(first.valor_sub_rutas || 0));
              setFormData(prev => ({
                ...prev,
                destino: String(first.id_sub_rutas),
                ...(first.id_lugar_origen ? { origen: first.id_lugar_origen } : {})
              }));
            }
          } else {
            setSubrutaSeleccionada('');
            setPrecioUnitario(0);
          }
        }
      } catch (e) {
        console.error('Error cargando asientos:', e);
      }
    };

    // Solo resetear el tramo al cambiar de viaje (no al recargar ocupación)
    if (esNuevoViaje) {
      viajeCargadoRef.current = formData.idViaje;
      setSubrutaSeleccionada('');
      setPrecioUnitario(0);
    }
    cargarAsientos();
  }, [formData.idViaje, formData.origen, subrutaSeleccionada, refreshAsientosKey, activeSucursalId, sucursalCambiada]);

  // Copia fresca de los asientos marcados por este usuario: los handlers de
  // socket se registran una sola vez por viaje y no pueden leer `formData`.
  const asientosSeleccionadosRef = useRef([]);
  useEffect(() => {
    asientosSeleccionadosRef.current = formData.asientosSeleccionados;
  }, [formData.asientosSeleccionados]);

  // Sockets: Bloqueo/Liberación en tiempo real
  useEffect(() => {
    // ¿El evento corresponde al usuario de esta ventana?
    const esMismoUsuario = (data) => {
      if (!data) return false;
      const actual = getSessionUser() || {};
      const miId = actual.id_usuario ?? actual.id_usuario_original ?? actual.id;
      if (data.userId !== undefined && data.userId !== null && miId !== undefined && miId !== null) {
        if (String(data.userId) === String(miId)) return true;
      }
      const nombres = [actual.nombre_usuario, actual.username_usuario, actual.username]
        .filter(Boolean)
        .map((n) => String(n).trim().toLowerCase());
      return Boolean(data.usuario) && nombres.includes(String(data.usuario).trim().toLowerCase());
    };

    const quitarAsientoDeLaVenta = (asientoNum) => {
      setFormData(prev => {
        if (!prev.asientosSeleccionados.includes(asientoNum)) return prev;
        return {
          ...prev,
          asientosSeleccionados: prev.asientosSeleccionados.filter(a => a !== asientoNum),
          pasajeros: prev.pasajeros.filter(p => Number(p.asiento) !== asientoNum),
        };
      });
    };

    const handleBloqueado = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !data.asiento) return;
      if (String(data.id_viaje) !== String(formData.idViaje)) return;
      // El bloqueo propio no significa "seleccionado por otro usuario".
      if (esMismoUsuario(data)) return;

      const asientoNum = Number(data.asiento);
      setAsientosPendientes(prev => ({
        ...prev,
        [asientoNum]: {
          usuario: data.usuario || 'Otro usuario',
          lockedAt: data.lockedAt || Date.now()
        }
      }));

      // Si este usuario lo tenía marcado (p. ej. su bloqueo expiró y otro lo
      // tomó), se retira de la venta: el servidor manda sobre el bloqueo.
      if ((asientosSeleccionadosRef.current || []).includes(asientoNum)) {
        quitarAsientoDeLaVenta(asientoNum);
        toast.error(
          `El asiento ${asientoNum} lo tomó ${data.usuario || 'otro usuario'} y se quitó de tu venta.`,
          { id: `asiento-tomado-${data.id_viaje}-${asientoNum}`, duration: 5000 }
        );
      }
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
      if (!data) return;
      if (data.id_viaje && formData.idViaje && String(data.id_viaje) !== String(formData.idViaje)) return;

      const asientoNum = Number(data.asiento);

      // El backend rechazó el bloqueo porque otro usuario lo tiene tomado: el
      // asiento NO puede quedar marcado en esta venta (antes la selección era
      // optimista y se quedaba marcada, permitiendo "vender" el mismo asiento).
      if (Number.isFinite(asientoNum)) {
        quitarAsientoDeLaVenta(asientoNum);
        setAsientosPendientes(prev => ({
          ...prev,
          [asientoNum]: { usuario: data.usuario || 'Otro usuario', lockedAt: Date.now() }
        }));
      }

      toast.error(
        data.motivo || `El asiento ${data.asiento} ya está siendo seleccionado por otro usuario`,
        { id: `asiento-rechazado-${data.id_viaje}-${data.asiento}`, duration: 4500 }
      );
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
          // Datos del tooltip del asiento (destino y oficina que vendió)
          nombre_destino: a.nombre_destino || '',
          punto_final_destino: a.punto_final_destino || '',
          nombre_sucursal_venta: a.nombre_sucursal_venta || '',
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

  // Socket: Viaje Despachado (Actualizar viajes y tiempos en tiempo real)
  useEffect(() => {
    const handleViajeDespachado = (e) => {
      const data = e.detail;
      console.log('[NuevoBoletoPage] Evento viaje_despachado recibido:', data);
      
      // 1. Refrescar listado de viajes disponibles para actualizar tiempos de salida calculados
      buscarViajes();

      // 2. Si el viaje despachado es el seleccionado actualmente, forzar recarga de asientos y hora
      if (data && data.id_viaje && String(data.id_viaje) === String(formData.idViaje)) {
        setRefreshAsientosKey(k => k + 1);
      }
    };

    window.addEventListener('viaje_despachado', handleViajeDespachado);
    return () => window.removeEventListener('viaje_despachado', handleViajeDespachado);
  }, [buscarViajes, formData.idViaje]);

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
        if (prev.asientosSeleccionados.includes(asientoId)) return prev;
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
    marcarActividadReal();
    setAsientoOcupado(ocupado);
  };

  const cerrarAsientoOcupado = () => setAsientoOcupado(null);

  // El nombre del tramo puede venir del backend (sub-ruta del boleto, incluso de
  // otra agencia) o, si no, del catálogo local de destinos del viaje.
  const destinoNombreAsiento = asientoOcupado
    ? (asientoOcupado.nombre_destino
        || destinosViaje.find(d => String(d.id_sub_rutas) === String(asientoOcupado.id_destino_boleto))?.nombre_sub_rutas
        || '')
    : '';

  const imprimirAsientoOcupado = () => {
    const idBoleto = asientoOcupado?.id_boleto;
    cerrarAsientoOcupado();
    if (idBoleto) imprimirBoleto(idBoleto);
  };

  const reubicarAsientoOcupado = () => {
    const ocupado = asientoOcupado;
    cerrarAsientoOcupado();
    if (ocupado?.id_boleto) {
      setBoletoAReagendar(ocupado);
      setShowReagendarModal(true);
    }
  };

  const handleTotalesChange = (t) => {
    setFormData(prev => ({ ...prev, totales: t }));
    setTotalVenta(t.total);
  };

  const handlePrecioChange = (val) => {
    setPrecioUnitario(val);
    // Recalcular el valor de TODOS los asientos con el nuevo precio unitario,
    // respetando la tarifa (%) de cada pasajero.
    setFormData(prev => {
      if (!prev.pasajeros || prev.pasajeros.length === 0) return prev;
      const nuevosPasajeros = prev.pasajeros.map(p => {
        const tarifaTexto = p.tarifa || 'Normal';
        return {
          ...p,
          valor: calcularValorConTarifa(val, tarifaTexto),
          descuento: calcularDescuento(val, tarifaTexto),
        };
      });
      const nuevoTotal = nuevosPasajeros.reduce(
        (sum, p) => sum + parseFloat(p.valor || 0),
        0
      );
      setTotalVenta(nuevoTotal);
      return {
        ...prev,
        pasajeros: nuevosPasajeros,
        totales: { subtotal: nuevoTotal, total: nuevoTotal },
      };
    });
  };

  const handleGridTotalChange = (total) => {
    setTotalVenta(total);
    setFormData(prev => ({ ...prev, totales: { subtotal: total, total } }));
  };

  // Impresión y Autorización SRI
  //
  // Flujo pedido: al confirmar el guardado se va DIRECTO al diálogo de
  // impresión (sin vista previa intermedia). Si QZ Tray no está activo,
  // se abre el diálogo del navegador.
  const imprimirBoleto = async (id_boleto) => {
    const printUrl = buildPdfUrl(`/php/boletoFactura.php?id_boleto=${id_boleto}`);

    // 1) QZ Tray configurado y activo → impresión directa en la impresora.
    if (metodoImpresion === 'directa') {
      try {
        await imprimirBoletoDirectoQZ(id_boleto, printerBoletos, copiasBoletos);
        toast.success('Boleto impreso en ' + printerBoletos);
        return;
      } catch (e) {
        console.error('[QZ] Error al imprimir:', e);
        toast.error('QZ Tray no está activo. Abriendo el diálogo de impresión...');
      }
    }

    // 2) Sin QZ Tray → diálogo de impresión del navegador, sin vista previa.
    const abierto = await imprimirPdfDirecto(printUrl);
    if (!abierto) {
      // Último recurso: vista previa (con botón Imprimir).
      toast('Abriendo vista previa del boleto...', { icon: 'ℹ️' });
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
    setFormData(prev => ({
      idCliente: '',
      // La fecha de viaje es un filtro del operador: se conserva al vender un boleto
      // (se restablece con el botón "Reiniciar" o al cambiar de agencia).
      fechaViaje: prev.fechaViaje || hoyLocal(),
      origen: '',
      destino: '',
      idViaje: '',
      viajeTexto: '',
      puntoFinal: '',
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
    }));
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

  // Al vender un boleto se conservan el viaje, el destino y el bus para que la
  // siguiente venta sea inmediata; solo se limpian los datos del pasajero y
  // los asientos seleccionados.
  const limpiarParaSiguienteVenta = () => {
    deseleccionarAsientosActuales();
    setFormData(prev => ({
      ...prev,
      idCliente: '',
      fechaViaje: prev.fechaViaje || hoyLocal(),
      // El punto final es una excepción de la venta: no debe arrastrarse a la
      // siguiente venta del mismo viaje.
      puntoFinal: '',
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
    }));
    setEsReserva(false);
    setTotalVenta(0);
    marcarActividadReal();
    // Recarga la ocupación del mismo viaje/tramo sin perder la selección.
    setRefreshAsientosKey(k => k + 1);
  };

  // Restablece los filtros de la pantalla (fecha → hoy y sucursal → la original)
  // y limpia la venta en curso. El botón "Reiniciar" solo aparece si algo cambió.
  const reiniciarFiltros = () => {
    const hoy = hoyLocal();
    const original = sucursalOriginal;

    // Volver a la sucursal con la que entró el usuario
    if (original?.id_sucursal && activeSucursalId !== original.id_sucursal) {
      const usuario = getSessionUser();
      usuario.id_sucursal = original.id_sucursal;
      usuario.suc_codigo_sucursal = original.suc_codigo_sucursal;
      usuario.id_fksucursal = original.suc_codigo_sucursal;
      usuario.nombre_sucursal = original.nombre_sucursal;
      if (original.punto_emision_sucursal) {
        usuario.punto_emision_sucursal = original.punto_emision_sucursal;
      }
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      sessionStorage.setItem('user_data', JSON.stringify(usuario));
      setActiveSucursalId(original.id_sucursal);
      setActiveSucursalCodigo(original.suc_codigo_sucursal);
      setCurrentAgencia(original.nombre_sucursal);
    }

    deseleccionarAsientosActuales();
    setFormData(prev => ({
      ...prev,
      fechaViaje: hoy,
      idViaje: '',
      viajeTexto: '',
      origen: '',
      destino: '',
      asientosSeleccionados: [],
      pasajeros: [],
      totales: { subtotal: 0, total: 0 },
    }));
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
    buscarViajes(original?.id_sucursal, hoy);
    toast.success('Filtros reiniciados');
  };

  const refrescarViajes = useCallback(async () => {
    try {
      const usuario = getSessionUser();
      const viajesRes = await BoleteriaService.getViajesDisponibles({
        fecha: formData.fechaViaje || hoyLocal(),
        id_sucursal: idSucursalSesion(usuario)
      });
      if (viajesRes.success && viajesRes.data) {
        setViajesDisponibles(viajesRes.data);
        return viajesRes.data;
      }
    } catch (e) {
      console.error('Error refrescando viajes:', e);
    }
    return null;
  }, [formData.fechaViaje]);

  const confirmarGuardar = async () => {
    const errores = [];
    if (!formData.idViaje) errores.push('• Seleccionar un viaje');
    if (!subrutaSeleccionada) errores.push('• Seleccionar un destino/tarifa');
    if (!formData.identificacion) errores.push('• Ingresar identificación del pasajero');
    if (!formData.nombres) errores.push('• Ingresar nombre del pasajero');
    if (formData.celular && !/^[0-9]{10}$/.test(formData.celular)) {
      errores.push('• El celular debe contener exactamente 10 dígitos numéricos');
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

    const viajeSeleccionado = viajesDisponibles.find(v => String(v.id_viajes) === String(formData.idViaje));
    const salidaEfectiva = obtenerSalidaEfectiva(viajeSeleccionado, formData.fechaViaje);

    // Tolerancia de venta: se puede vender hasta N minutos después de la salida
    // del viaje en esta agencia (el backend envía `minutos_gracia_venta`).
    if (salidaEfectiva) {
      const minutosGracia = Number(
        viajeSeleccionado?.minutos_gracia_venta ?? MINUTOS_GRACIA_VENTA
      );
      const limiteVenta = new Date(salidaEfectiva.getTime() + minutosGracia * 60000);
      const ahora = new Date();

      if (ahora >= limiteVenta) {
        const minutosPasados = Math.floor((ahora.getTime() - salidaEfectiva.getTime()) / 60000);
        toast.error(
          `El viaje salió hace ${minutosPasados} minuto(s). Solo se puede vender hasta ${minutosGracia} minutos después de la salida.`,
          { duration: 6000 }
        );
        return;
      }
    }

    // Si la configuración tiene activa la opción de omitir confirmación, guardar directamente
    if (omitirConfirmacionBoleto) {
      ejecutarGuardar();
      return;
    }

    const result = await Swal.fire({
      title: 'Confirmar Venta',
      html: `
        <div style="text-align:center">
          <p style="font-size:16px;font-weight:bold;color:#0a365d">${formData.pasajeros.length} asiento(s)</p>
          <p style="font-size:13px;color:#64748b">Pasajero: ${formData.nombres || '---'}</p>
          <p style="font-size:13px;color:#64748b">Destino: <strong>${(destinosViaje.find(d => String(d.id_sub_rutas) === String(subrutaSeleccionada))?.nombre_sub_rutas || '---')}${(formData.puntoFinal || '').trim() ? ' / ' + (formData.puntoFinal || '').trim().toUpperCase() : ''}</strong></p>
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
      const usuarioVenta = getSessionUser();
      const precioPorAsiento = formData.asientosSeleccionados.length > 0
        ? totalVenta / formData.asientosSeleccionados.length
        : 0;

      const subrutaGeneralObj = destinosViaje.find(d => String(d.id_sub_rutas) === String(subrutaSeleccionada));

      const detalles = formData.pasajeros.map(p => {
        const valorFinal = p.valor !== undefined && p.valor !== null && p.valor !== '' ? parseFloat(p.valor) : precioPorAsiento;
        const pasajeroDestino = p.id_destino || subrutaSeleccionada;
        const subrutaPasajero = destinosViaje.find(d => String(d.id_sub_rutas) === String(pasajeroDestino));
        return {
          total_boleto_detalle: valorFinal,
          asiento_boleto_detalle: String(p.asiento),
          precio_boleto_detalle: valorFinal,
          descuento_boleto_detalle: parseFloat(p.descuento || 0),
          iva_boleto_detalle: 0,
          nombre_cliente_boleto_detalle: p.nombres || formData.nombres,
          identificacion_boleto_detalle: p.cedula || formData.identificacion,
          tarifa_boleto_detalle: p.tarifa || 'Normal',
          id_destino: parseInt(pasajeroDestino) || null,
          nombre_destino: subrutaPasajero?.nombre_sub_rutas || '',
          punto_final: (p.puntoFinal ?? formData.puntoFinal ?? '').toString().trim().slice(0, 120),
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
        nombre_destino: subrutaGeneralObj?.nombre_sub_rutas || '',
        // Punto final real vendido (más allá de la última parada de la ruta).
        punto_final: (formData.puntoFinal || '').trim().slice(0, 120),
        id_origen: formData.origen,
        identificacion: formData.pasajeros[0]?.cedula || formData.identificacion,
        nombres: formData.pasajeros[0]?.nombres || formData.nombres,
        // Datos de contacto del facturado: el PDF del boleto (boletoFactura.php)
        // y el XML del SRI los leen desde celular_boleto / correo_boleto.
        celular: formData.celular,
        correo: formData.correo,
        total_final: totalVenta,
        es_reserva: esReserva ? 1 : 0,
        observacion: formData.observacion,
        hora_boleto: new Date().toTimeString().split(' ')[0],
        detalles_boletos: JSON.stringify(detalles),
        id_fksucursal: usuarioVenta.suc_codigo_sucursal || usuarioVenta.id_fksucursal || activeSucursalId,
        // P.E. Boletería del usuario logueado: sirve de respaldo cuando su
        // sucursal no tiene configurado el punto de emisión de boletería.
        punto_emision_boleteria: usuarioVenta.punto_emision_boleteria || '',
        id_caja_global: localCajaId || usuarioVenta.id_caja_global ||
          usuarioVenta.id_caja_boleteria_global || 0
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
              const fileUrl = window.location.origin + buildPdfUrl(`/php/boletoFactura.php?id_boleto=${idBoleto}`);
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
        const viajeVendido = formData.idViaje;
        limpiarParaSiguienteVenta();
        const vigentes = await refrescarViajes();
        // Si el viaje ya no está disponible (salió o se cerró), se reinicia todo.
        if (
          Array.isArray(vigentes) && viajeVendido &&
          !vigentes.some(v => String(v.id_viajes) === String(viajeVendido))
        ) {
          limpiarFormulario();
        }
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
    const sucursalId = record.id_sucursal || record.suc_codigo_sucursal;
    const codigoSucursal = record.suc_codigo_sucursal || sucursalId;
    const usuario = getSessionUser();
    // La agencia activa solo define qué viajes/P.E. se usan en esta pantalla:
    // la venta se registra en el backend con la oficina real del usuario
    // (JWT), no con la agencia a la que se cambia.
    usuario.id_sucursal = sucursalId;
    usuario.suc_codigo_sucursal = codigoSucursal;
    usuario.id_fksucursal = codigoSucursal;
    usuario.nombre_sucursal = record.nombre_sucursal || usuario.nombre_sucursal;
    usuario.punto_emision_sucursal = record.punto_emision_sucursal || usuario.punto_emision_sucursal;
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
    sessionStorage.setItem('user_data', JSON.stringify(usuario));
    setActiveSucursalId(sucursalId);
    setActiveSucursalCodigo(codigoSucursal);
    setCurrentAgencia(record.nombre_sucursal || usuario.nombre_sucursal || 'Desconocida');
    toast.success(`Agencia cambiada a: ${record.nombre_sucursal || sucursalId}`);
    limpiarFormulario();
    buscarViajes(sucursalId);
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
          puedeReiniciar={formData.fechaViaje !== hoyLocal() || sucursalCambiada}
          onReiniciar={reiniciarFiltros}
          onFechaChange={(fecha) => {
            marcarActividadReal();
            setFormData(prev => ({ ...prev, fechaViaje: fecha }));
          }}
          onBuscarViajes={() => buscarViajes()}
          loadingViajes={loadingViajes}
          viajesDisponibles={viajesDisponibles}
          idViajeSeleccionado={formData.idViaje}
          onSelectViaje={(v) => {
            const cambioViaje = formData.idViaje !== String(v.id_viajes);
            if (cambioViaje) {
              deseleccionarAsientosActuales();
              setDestinosViaje([]);
              setSubrutaSeleccionada('');
              setPrecioUnitario(0);
            }
            setFormData(prev => ({
              ...prev,
              idViaje: String(v.id_viajes),
              viajeTexto: `${v.hora_salida_parada || v.hora || v.hora_salida} - Bus ${v.bus_disco || v.bus_codigo}`,
              destino: cambioViaje ? '' : prev.destino,
              origen: v.id_origen || prev.origen,
              asientosSeleccionados: [],
              pasajeros: []
            }));
            setDiscoBus(v.bus_disco || v.bus_codigo || '');
            setCapacidadBus(v.capacidad_buses || 40);
            setHoraViaje(v.hora_salida_parada || v.hora || v.hora_salida || '');
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
                const cambioViaje = formData.idViaje !== viajeId;
                if (cambioViaje) {
                  deseleccionarAsientosActuales();
                  setDestinosViaje([]);
                  setSubrutaSeleccionada('');
                  setPrecioUnitario(0);
                }
                const v = viajesDisponibles.find(vv => String(vv.id_viajes) === viajeId);
                setFormData(prev => ({
                  ...prev,
                  idViaje: viajeId,
                  destino: cambioViaje ? '' : prev.destino,
                  puntoFinal: cambioViaje ? '' : prev.puntoFinal,
                  origen: v?.id_origen || prev.origen,
                  asientosSeleccionados: [],
                  pasajeros: []
                }));
                if (v) {
                  setDiscoBus(v.bus_disco || v.bus_codigo || '');
                  setHoraViaje(v.hora_salida_parada || v.hora_origen_salida || v.hora_salida_rutas || v.hora || v.hora_salida || '');
                  setIdBus(v.id_fkbus_viajes || v.id_buses || v.bus_id || '');
                }
              }}
              onRefrescarViajes={buscarViajes}
              subrutaSeleccionada={subrutaSeleccionada}
              destinosViaje={destinosViaje}
              onDestinoChange={(id) => {
                marcarActividadReal();
                setSubrutaSeleccionada(id);
                const subruta = destinosViaje.find(d => String(d.id_sub_rutas) === String(id));
                const precio = subruta ? parseFloat(subruta.valor_sub_rutas || 0) : 0;
                setPrecioUnitario(precio);

                setFormData(prev => {
                  const nuevosPasajeros = prev.pasajeros.map(p => {
                    const tarifaTexto = p.tarifa || 'Normal';
                    const valor = calcularValorConTarifa(precio, tarifaTexto);
                    const descuento = calcularDescuento(precio, tarifaTexto);
                    return {
                      ...p,
                      id_destino: id,
                      valor,
                      descuento
                    };
                  });
                  const nuevoTotal = nuevosPasajeros.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
                  setTotalVenta(nuevoTotal);
                  return {
                    ...prev,
                    destino: id,
                    pasajeros: nuevosPasajeros,
                    totales: { subtotal: nuevoTotal, total: nuevoTotal }
                  };
                });
              }}
              onRefrescarDestinos={() => {
                if (formData.idViaje) {
                  const sucursalId = activeSucursalId || idSucursalSesion(getSessionUser()) || idSucursalSesion(usuario);
                  BoleteriaService.getDestinosViaje(formData.idViaje, sucursalId, undefined, sucursalCambiada).then(r => {
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
              puntoFinal={formData.puntoFinal}
              onPuntoFinalChange={(valor) => {
                marcarActividadReal();
                setFormData(prev => ({ ...prev, puntoFinal: valor.toUpperCase() }));
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
              mostrarConsumidorFinal={permitirConsumidorFinal}
              onOpenCrearCliente={() => abrirCrearCliente('')}
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
                    pasajeros={formData.pasajeros}
                    destinosViaje={destinosViaje}
                    onAsientoClick={handleAsientoClick}
                    onAsientoOcupadoClick={handleAsientoOcupadoClick}
                    discoBus={discoBus}
                    totalVenta={totalVenta}
                    coloresAsientos={coloresAsientos}
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
        onClose={() => { setShowNuevoClienteModal(false); setClienteAEditar(null); setIsForcedEditCliente(false); setIdentificacionNuevaCliente(''); }}
        onClienteCreado={handleClienteCreado}
        clienteInicial={clienteAEditar}
        identificacionInicial={identificacionNuevaCliente}
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
      <AsientoOcupadoModal
        isOpen={Boolean(asientoOcupado)}
        onClose={cerrarAsientoOcupado}
        ocupado={asientoOcupado}
        destinoNombre={destinoNombreAsiento}
        onImprimir={imprimirAsientoOcupado}
        onReubicar={reubicarAsientoOcupado}
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

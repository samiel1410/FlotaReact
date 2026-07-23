import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusVisualizer } from './components/BusVisualizer';
import { PasajerosGrid } from './components/PasajerosGrid';
import { BoletoTotalesPanel } from './components/BoletoTotalesPanel';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { CambiarBusModal } from './components/CambiarBusModal';
import { ReagendarBoletoModal } from './components/ReagendarBoletoModal';
import { CambiarAgenciaModal } from './components/CambiarAgenciaModal';
import { ListadoPasajerosModal } from './components/ListadoPasajerosModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import Modal from '../../components/common/Modal';
import { AperturaCajaForm } from '../CajaBoleteria/components/AperturaCajaForm';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BoleteriaService } from '../../services/boleteria.service';
import { cajaBoleteriaService } from '../../services/cajaBoleteria.service';
import { api, clienteApi } from '../../config/axios';
import { CONFIG } from '../../config/env';
import axios from 'axios';
import { useSocket } from '../../hooks/useSocket';
import './NuevoBoletoPage.css';

const TARIFAS = [
  { label: 'Normal', value: 1 },
  { label: '50% 3ra Edad', value: 2 },
  { label: '50% Menor', value: 3 },
  { label: '50% Discap.', value: 4 },
  { label: '50% Estudiante', value: 5 },
  { label: 'Gratis Cortesía', value: 6 },
];

const getTarifaLabel = (val) => {
  const t = TARIFAS.find(t => t.value === val);
  return t ? t.label : 'Normal';
};

const calcularValorConTarifa = (precio, tarifaTexto) => {
  if (tarifaTexto === 'Normal') return precio;
  if (tarifaTexto.includes('50%')) return precio / 2;
  return 0; // Gratis Cortesía
};

const calcularDescuento = (precio, tarifaTexto) => {
  if (tarifaTexto === 'Normal') return 0;
  if (tarifaTexto.includes('50%')) return precio / 2;
  return precio; // Gratis Cortesía
};

export const NuevoBoletoPage = () => {
  const navigate = useNavigate();
  useSocket(); // Inicializar el socket para que window.__socket esté disponible


  // Estados del formulario
  const [viajesDisponibles, setViajesDisponibles] = useState([]);
  const [destinosViaje, setDestinosViaje] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [asientosOcupados, setAsientosOcupados] = useState([]);
  const [capacidadBus, setCapacidadBus] = useState(40);
  const [discoBus, setDiscoBus] = useState('');
  const [idBus, setIdBus] = useState('');
  const [idChofer, setIdChofer] = useState('');
  const [idAuxiliar, setIdAuxiliar] = useState('');
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
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [printerBoletos, setPrinterBoletos] = useState('');
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
  const [refreshAsientosKey, setRefreshAsientosKey] = useState(0);
  const [asientosPendientes, setAsientosPendientes] = useState({}); // { [asiento]: { usuario: 'nombre', lockedAt: timestamp } }
  const lastRealActionRef = useRef(null);
  useEffect(() => { lastRealActionRef.current = Date.now(); }, []);
  const [tiempoRestante, setTiempoRestante] = useState(null); // null = sin viaje, objeto = { horas, minutos, segundos, pasado, totalSeg }
  const [localCajaId, setLocalCajaId] = useState(null);
  const [cajaResolved, setCajaResolved] = useState(false);
  const [cajaChecking, setCajaChecking] = useState(true);
  const [showCajaModal, setShowCajaModal] = useState(false);
  const cajaCheckRef = useRef(false);

  const getSessionUser = () => {
    let user = {};
    try {
      const userData = sessionStorage.getItem('user_data');
      if (userData) user = { ...user, ...JSON.parse(userData) };
    } catch (e) { }
    try {
      const usuario = sessionStorage.getItem('usuario');
      if (usuario) user = { ...user, ...JSON.parse(usuario) };
    } catch (e) { }
    return user;
  };

  const [currentAgencia, setCurrentAgencia] = useState(() => {
    const u = getSessionUser();
    return u.nombre_sucursal || 'Desconocida';
  });

  const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
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
    // Datos del pasajero principal
    identificacion: '',
    nombres: '',
    fechaNacimiento: '',
    direccion: '',
    celular: '',
    correo: '',
    tarifa: 1, // Normal
    observacion: ''
  });

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

  // 1. Validar caja activa antes de cargar datos
  useEffect(() => {
    if (cajaCheckRef.current) return;
    cajaCheckRef.current = true;
    const validar = async () => {
      try {
        const user = getSessionUser();
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
        }

        // Cargar nombre real de la sucursal/agencia desde /buscarUsuario
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

    // Cargar método de impresión del usuario
    const userId = getSessionUser().id_usuario;
    if (userId) {
      api.get('/impresoras/miConfig', { params: { id_usuario: userId } }).then(res => {
        if (res.data?.success && res.data?.data) {
          setMetodoImpresion(res.data.data.metodo_impresion || 'manual');
          setPrinterBoletos(res.data.data.printer_boletos || '');
        }
      }).catch(() => { });
    }
  }, [cajaResolved]);

  // Mostrar detalle de boleto al hacer clic en asiento ocupado (ExtJS: mostrarDetalleBoleto)
  const handleAsientoOcupadoClick = (ocupado) => {
    if (!ocupado) return;
    const destino = destinosViaje.find(d => String(d.id_sub_rutas) === String(ocupado.id_destino_boleto));
    const isGreen = ocupado.orden_destino != null && ocupado.orden_actual != null && ocupado.orden_destino <= ocupado.orden_actual;
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

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const nac = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  const tarifaDesdeEdad = (edad) => {
    if (edad === null || edad === undefined) return 1;
    if (edad < 17) return 3;
    if (edad >= 60) return 2;
    return 1;
  };

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
        
        if (!c.telefono_cliente || !c.email_cliente) {
          toast.error('El cliente no tiene correo o teléfono. Debe actualizarlos para continuar.', { id: toastId });
          setClienteAEditar(c);
          setIsForcedEditCliente(true);
          setShowNuevoClienteModal(true);
          return; // No establecemos los datos hasta que no lo actualice
        }

        setFormData(prev => ({
          ...prev,
          idCliente: c.id_cliente,
          identificacion: c.identificacion_cliente,
          nombres: c.nombre_cliente,
          celular: c.telefono_cliente,
          direccion: c.direccion_cliente,
          correo: c.email_cliente,
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
      // Fallback: intentar con el backend local
      try {
        const res = await api.get('/cliente/clientebusquedaIdentificacion', {
          params: { identificacion_busqueda: identificacion }
        });
        if (res.data?.success && res.data?.total > 0) {
          const c = res.data.data[0];
          const fechaNac = c.fecha_nacimiento ? new Date(c.fecha_nacimiento).toISOString().split('T')[0] : '';
          const edad = calcularEdad(fechaNac);
          const tarifaVal = tarifaDesdeEdad(edad);
          
          if (!c.telefono_cliente || !c.email_cliente) {
            toast.error('El cliente no tiene correo o teléfono. Debe actualizarlos para continuar.', { id: toastId });
            setClienteAEditar(c);
            setIsForcedEditCliente(true);
            setShowNuevoClienteModal(true);
            return;
          }

          setFormData(prev => ({
            ...prev,
            idCliente: c.id_cliente,
            identificacion: c.identificacion_cliente,
            nombres: c.nombre_cliente,
            celular: c.telefono_cliente,
            direccion: c.direccion_cliente,
            correo: c.email_cliente,
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

  // Buscar viajes disponibles (ExtJS: ViajesBoleto store → viajesSelectBoleto)
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

  const handleBuscarViajes = () => {
    buscarViajes();
  };

  // Cargar asientos cuando se selecciona un viaje o se refresca (cambio de bus)
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

        console.log('[cargarAsientos] asientosRes:', JSON.stringify(asientosRes));
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
            console.log('[cargarAsientos] asientos encontrados:', asientosRes.asiento.length);
            asientosRes.asiento.forEach(a => {
              console.log(`[cargarAsientos] asiento ${a.asiento_boleto_detalle}: estado=${a.estado_boleto_detalle}`);
              if (a.estado_boleto_detalle !== '0' && Number(a.estado_boleto_detalle) !== 0) {
                ocupados.push(a);
              }
            });
          } else {
            console.log('[cargarAsientos] NO hay propiedad asiento en la respuesta');
          }
          console.log('[cargarAsientos] ocupados:', ocupados.length);
          setAsientosOcupados(ocupados);
          setTotalRecaudado(asientosRes.total_boletos || 0);
        } else {
          console.log('[cargarAsientos] success false o data vacía');
        }

        console.log('[cargarAsientos] destinosViajeRes:', JSON.stringify(destinosViajeRes));
        if (destinosViajeRes.success && destinosViajeRes.data) {
          setDestinosViaje(destinosViajeRes.data);
          if (destinosViajeRes.data.length > 0) {
            const first = destinosViajeRes.data[0];
            console.log('[AutoSelect] Primer destino:', first.id_sub_rutas, first.valor_sub_rutas);
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
          console.warn('[cargarAsientos] destinosViaje sin datos o success false');
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

  // ─── ESCUCHAR BLOQUEO/LIBERACIÓN DE ASIENTOS EN TIEMPO REAL ───────────
  useEffect(() => {
    // Un asiento fue bloqueado por otro usuario
    const handleBloqueado = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !data.asiento) return;

      // Solo si es el mismo viaje
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

    // Un asiento fue liberado
    const handleLiberado = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !data.asiento) return;

      // Solo si es el mismo viaje
      if (String(data.id_viaje) !== String(formData.idViaje)) return;

      const asientoNum = Number(data.asiento);

      setAsientosPendientes(prev => {
        const next = { ...prev };
        delete next[asientoNum];
        return next;
      });

      // Mostrar toast si fue liberado por timeout o admin
      if (data.motivo === 'timeout') {
        toast(
          `⏱️ Asiento ${asientoNum} liberado (${data.usuario} excedió el tiempo)`,
          {
            id: `liberado-${data.id_viaje}-${asientoNum}`,
            duration: 4000,
            style: {
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#166534',
              borderRadius: '8px',
              fontSize: 12,
            },
          }
        );
      } else if (data.motivo === 'admin') {
        toast(
          `🔓 Asiento ${asientoNum} liberado por administrador`,
          {
            id: `liberado-admin-${asientoNum}`,
            duration: 4000,
          }
        );
      } else if (data.motivo === 'desconexion') {
        toast(
          `🔌 Asiento ${asientoNum} liberado (${data.usuario} se desconectó)`,
          {
            id: `liberado-dc-${asientoNum}`,
            duration: 3000,
          }
        );
      }
    };

    // Intento de bloqueo rechazado (el asiento ya estaba bloqueado por otro)
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

  // Limpiar pendientes al cambiar de viaje
  useEffect(() => {
    setAsientosPendientes({});
    marcarActividadReal();
  }, [formData.idViaje]);

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // ─── HEARTBEAT: Renovar lock solo si hubo actividad real ────────────
  useEffect(() => {
    if (formData.asientosSeleccionados.length === 0) return;

    const interval = setInterval(() => {
      const tiempoDesdeUltimaAccion = Date.now() - lastRealActionRef.current;
      // Solo renovar si hubo actividad real en los últimos 60 segundos
      if (tiempoDesdeUltimaAccion < 60000 && window.__socket) {
        window.__socket.emit('asiento_renovar_lock', {
          id_viaje: formData.idViaje,
          asientos: formData.asientosSeleccionados
        });
        // Actualizar lastRealAction para no renovar innecesariamente
        lastRealActionRef.current = Date.now();
      }
    }, 30000); // cada 30 segundos

    return () => clearInterval(interval);
  }, [formData.idViaje, formData.asientosSeleccionados]);

  // Marcar actividad real (se llama desde inputs, clicks, selects, etc.)
  const marcarActividadReal = useCallback(() => {
    lastRealActionRef.current = Date.now();
  }, []);

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

  // Limpiar selecciones propias al cerrar el navegador, salir de la página o DESMONTAR el componente
  useEffect(() => {
    const handleUnload = () => {
      deseleccionarAsientosActuales();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      // Deseleccionar al desmontar (cuando se cierra la ventana en SPA)
      deseleccionarAsientosActuales();
    };
  }, []);

  // ─── ESCUCHAR EVENTOS SOCKET VENTA/ANULACIÓN ────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!data || !data.id_viaje || !formData.idViaje) return;

      // Solo actualizar si es el mismo viaje que estamos viendo
      if (String(data.id_viaje) !== String(formData.idViaje)) return;

      // Si se vendió, remover ese asiento de pendientes (ya no está disponible)
      if (data.asientos && data.asientos.length > 0 && data.tipo !== 'anulacion_reserva') {
        const vendidos = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        setAsientosPendientes(prev => {
          const next = { ...prev };
          vendidos.forEach(s => delete next[s]);
          return next;
        });
      }

      // Si se anuló una reserva, remover ese asiento de pendientes (ya no es del otro)
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
        // Anulación: REMOVER asientos liberados de asientosOcupados
        const asientosLiberados = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        setAsientosOcupados(prev => prev.filter(a => !asientosLiberados.has(Number(a.asiento_boleto_detalle))));
        return;
      }

      // Venta o reserva: AGREGAR nuevos asientos ocupados
      const currentUser = getSessionUser();
      const esMismoUsuario = currentUser && data.usuario === currentUser.nombre_usuario;

      setAsientosOcupados(prev => {
        const existingSeats = new Set(prev.map(a => Number(a.asiento_boleto_detalle)));
        const toAdd = data.asientos.filter(a => !existingSeats.has(Number(a.asiento_boleto_detalle)));

        if (toAdd.length === 0) return prev;

        // Agregar nuevos asientos
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

      // Verificar conflicto: si algún asiento seleccionado por este usuario
      // fue vendido por OTRO usuario
      if (!esMismoUsuario) {
        const vendidos = new Set(data.asientos.map(a => Number(a.asiento_boleto_detalle)));
        const conflicto = formData.asientosSeleccionados.filter(s => vendidos.has(Number(s)));

        if (conflicto.length > 0) {
          toast.error(
            `⚠️ Conflicto de asientos\nEl asiento ${conflicto.join(', ')} acaba de ser vendido por ${data.usuario || 'otro usuario'}.\nSe ha deseleccionado automáticamente.`,
            {
              id: `conflicto-${data.id_viaje}-${conflicto.join('-')}`,
              duration: 8000,
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '12px',
                padding: '12px 16px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                whiteSpace: 'pre-line',
              },
            }
          );
          // Deseleccionar los asientos en conflicto
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

  // Manejar click en asiento (igual a ExtJS AgregarAsientoAlista)
  const handleAsientoClick = (asientoId) => {
    // ExtJS: Validar que haya un cliente seleccionado primero
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

    // Obtener nombre del usuario actual para el socket
    const currentUser = getSessionUser();
    const nombreUsuario = currentUser?.nombre_usuario || 'Usuario';

    if (formData.asientosSeleccionados.includes(asientoId)) {
      // DESELECCIONAR - Liberar el bloqueo del asiento
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
      // Verificar si el asiento está siendo seleccionado por OTRO usuario
      if (asientosPendientes[asientoId]) {
        const info = asientosPendientes[asientoId];
        const usuario = typeof info === 'string' ? info : info.usuario;
        toast.error(
          `El asiento ${asientoId} ya está siendo seleccionado por ${usuario}`,
          { duration: 4000 }
        );
        return;
      }

      // SELECCIONAR - Emitir socket para bloquear el asiento
      marcarActividadReal();
      if (window.__socket && formData.idViaje) {
        window.__socket.emit('asiento_bloquear', {
          id_viaje: formData.idViaje,
          asiento: asientoId
        });
      }

      // ExtJS: leer tarifa ACTUAL del form (con prev para evitar stale closure) y calcular valor/descuento
      setFormData(prev => {
        const tarifaTexto = getTarifaLabel(prev.tarifa);
        const valor = calcularValorConTarifa(precioUnitario, tarifaTexto);
        const descuento = calcularDescuento(precioUnitario, tarifaTexto);
        return {
          ...prev,
          tarifa: 1,
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

  const handleTotalesChange = (t) => {
    setFormData(prev => ({ ...prev, totales: t }));
    setTotalVenta(t.total);
  };

  const handlePrecioChange = (val) => {
    setPrecioUnitario(val);
  };

  // Total change from grid
  const handleGridTotalChange = (total) => {
    setTotalVenta(total);
    setFormData(prev => ({ ...prev, totales: { subtotal: total, total } }));
  };

  const horaAMinutos = (horaStr) => {
    if (!horaStr) return 0;
    const [horas, minutos] = horaStr.split(':').map(Number);
    return horas * 60 + (minutos || 0);
  };

  const confirmarGuardar = async () => {
    const errores = [];
    if (!formData.idViaje) errores.push('• Seleccionar un viaje');
    if (!subrutaSeleccionada) errores.push('• Seleccionar un destino/tarifa');
    if (!formData.identificacion) errores.push('• Ingresar identificación del pasajero');
    if (!formData.nombres) errores.push('• Ingresar nombre del pasajero');
    if (!formData.celular) {
      errores.push('• Ingresar celular del pasajero');
    } else if (!/^[0-9]{9,15}$/.test(formData.celular)) {
      errores.push('• El celular debe contener entre 9 y 15 dígitos numéricos');
    }

    if (!formData.correo) {
      errores.push('• Ingresar correo electrónico del pasajero');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
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

    // Validar hora del viaje (ExtJS: minutosBoleto > minutosViaje → ya está en despacho)
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
          // ExtJS: incluye_alimento_boleto_detalle
          incluye_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? 1 : 0,
          precio_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? parseFloat(alimentoInfo.precio_alimentos || 0) : 0,
        };
      });

      // ExtJS: form.getValues() envía todos los campos, lo mismo hacemos aquí
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
        // Fecha/hora actual como hora_boleto (ExtJS: lo calculaba automáticamente)
        hora_boleto: new Date().toTimeString().split(' ')[0],
        detalles_boletos: JSON.stringify(detalles),
        id_caja_global: localCajaId || getSessionUser().id_caja_global ||
          getSessionUser().id_caja_boleteria_global || 0
      };

      const response = await BoleteriaService.venderBoleto(body);

      if (response.success) {
        const idBoleto = response.id_boleto;
        toast.success(esReserva ? 'Boleto(s) reservado(s) correctamente' : 'Boleto(s) generado(s) correctamente');
        // ExtJS: limpiarFormularioBoleto + onimpresionBoleto + onAutorizarBoleto después del guardado
        if (idBoleto) {
          if (autoAutorizarBoleto) {
            autorizarBoleto(idBoleto);
          }
          await imprimirBoleto(idBoleto);

          // Enviar WhatsApp a comprador y a pasajeros (multi-envío)
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
              const urlGenerador = window.location.origin + `/php/boletoFactura.php?id_boleto=${idBoleto}`;
              await axios.get(urlGenerador);

              const fileUrl = window.location.origin + `/php/tmp/boleto_${idBoleto}.pdf`;
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

  // Refrescar viajes disponibles (para actualizar total_boletos y asientos)
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

  // Limpiar formulario completo (ExtJS: limpiarFormularioBoleto)
  const limpiarFormulario = () => {
    deseleccionarAsientosActuales(); // Liberar asientos antes de limpiar
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

  // Abrir impresión del boleto (ExtJS: onimpresionBoleto)
  const imprimirBoleto = async (id_boleto) => {
    const printUrl = `/php/tmp/boleto_${id_boleto}.pdf`;

    // Generar PDF asegurando el guardado en disco
    try {
      await axios.get(`/php/boletoFactura.php?id_boleto=${id_boleto}`);
    } catch (e) { }

    if (metodoImpresion === 'directa') {
      // Directa: QZ Tray raw print
      try {
        if (!printerBoletos) {
          toast.error('No hay impresora de boletos configurada');
          return;
        }

        // Cargar QZ Tray dinámicamente
        const loadQZ = () => new Promise((resolve, reject) => {
          if (window.qz) return resolve();
          const s = document.createElement('script');
          s.src = '/qz.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('No se pudo cargar qz.js'));
          document.head.appendChild(s);
        });

        const configurarQZ = () => {
          if (!window.qz) return;
          qz.security.setSignatureAlgorithm('SHA256');
          qz.security.setCertificatePromise((resolve) => {
            fetch('/digital-certificate.crt', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
              .then(r => r.ok ? r.text() : null).then(resolve).catch(() => resolve(null));
          });
          qz.security.setSignaturePromise((toSign) => (resolve) => {
            api.get('/configuracion/sign-message', { params: { request: toSign } })
              .then(res => resolve(res.data))
              .catch(err => {
                console.error('Error signing message', err);
                resolve(null);
              });
          });
        };

        const conectarQZ = () => {
          if (!window.qz) return Promise.reject('Librería no cargada');
          if (qz.websocket.isActive()) return Promise.resolve();
          const TIMEOUT_MS = 3000;
          let timeoutId;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
          });
          return Promise.race([
            qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false }),
            timeoutPromise
          ]).finally(() => clearTimeout(timeoutId));
        };

        await loadQZ();
        configurarQZ();
        await conectarQZ();

        const config = window.qz.configs.create(printerBoletos, {
          scaleContent: true,
          units: 'mm',
          margins: { top: 0, bottom: 0, left: 8, right: 2 }
        });

        // Determinar URL completa del PDF basado en el entorno
        const fullPdfUrl = window.location.origin + printUrl;

        const data = [{
          type: 'pixel',
          format: 'pdf',
          flavor: 'file',
          data: fullPdfUrl
        }];
        await window.qz.print(config, data);
        toast.success('Boleto impreso en ' + printerBoletos);
      } catch (e) {
        console.error('[QZ] Error al imprimir:', e);
        toast.error('Error al imprimir vía QZ Tray. Abriendo PDF manual...');
        setPdfModalUrl(printUrl);
        setShowPdfModal(true);
      }
    } else {
      // Manual: abrir modal con iframe
      setPdfModalUrl(printUrl);
      setShowPdfModal(true);
    }
  };

  // Autorizar boleto SRI (ExtJS: onAutorizarBoleto)
  const autorizarBoleto = async (id_boleto) => {
    try {
      await BoleteriaService.autorizarBoleto(id_boleto);
    } catch (e) {
      console.error('Error autorizando boleto:', e);
    }
  };

  const handleCancelar = () => {
    navigate('/boleteria');
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
    // Refrescar asientos y datos del bus inmediatamente
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

    // Limpiar formulario y resetear datos del viaje anterior
    limpiarFormulario();
    // Refrescar viajes con nueva agencia (como ExtJS)
    buscarViajes();
  };

  if (cajaChecking) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
        <p style={{ marginLeft: 10 }}>Verificando caja...</p>
      </div>
    );
  }

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
        // Refrescar viajes con nueva agencia (como ExtJS)
        buscarViajes();
      } else {
        toast.error('Error al aperturar caja: ' + res.message);
      }
    } catch (err) {
      toast.error('Error al aperturar caja: ' + (err.message || 'Desconocido'));
    }
  };

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
      {/* CONTENIDO SCROLLABLE (padding inferior para que no lo tape el footer fixed) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px', paddingBottom: '70px' }}>
        {/* TOP TOOLBAR */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
          <button
            onClick={() => setShowCambiarBusModal(true)}
            style={{
              flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13
            }}
          >
            <i className="fas fa-bus"></i> Cambiar Bus
          </button>
          <button
            onClick={() => setShowCambiarAgenciaModal(true)}
            style={{
              flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13
            }}
          >
            <i className="fas fa-building"></i> Cambio Agencia
          </button>
          <button
            onClick={() => setShowListadoPasajeros(true)}
            disabled={!formData.idViaje}
            style={{
              flex: 1, background: !formData.idViaje ? '#94a3b8' : '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 4, padding: '4px 8px', cursor: !formData.idViaje ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13,
              opacity: !formData.idViaje ? 0.7 : 1
            }}
            title={!formData.idViaje ? 'Seleccione un viaje primero' : ''}
          >
            <i className="fas fa-list"></i> Listado Pasajeros
          </button>
        </div>

        {/* INDICADOR DE AGENCIA ACTUAL + TIMER VIAJE */}
        <div style={{
          background: '#e0f2fe', borderRadius: 4, padding: '6px 10px',
          border: '1px solid #bae6fd', marginBottom: 5,
          display: 'flex', alignItems: 'center', gap: 6, color: '#0369a1', fontWeight: 600, fontSize: 11
        }}>
          <i className="fas fa-map-marker-alt"></i>
          <span style={{ flex: 1 }}>Agencia actual: {currentAgencia}</span>

          {/* TIMER */}
          {formData.idViaje && tiempoRestante && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: tiempoRestante.pasado ? '#fef2f2' : tiempoRestante.totalSeg < 600 ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${tiempoRestante.pasado ? '#fca5a5' : tiempoRestante.totalSeg < 600 ? '#fcd34d' : '#86efac'}`,
              borderRadius: 4, padding: '3px 8px',
            }}>
              <i
                className={`fas ${tiempoRestante.pasado ? 'fa-flag-checkered' : 'fa-clock'}`}
                style={{ fontSize: 11, color: tiempoRestante.pasado ? '#dc2626' : tiempoRestante.totalSeg < 600 ? '#d97706' : '#16a34a' }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {tiempoRestante.pasado ? 'En curso' : 'Para despacho'}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
                  color: tiempoRestante.pasado ? '#dc2626' : tiempoRestante.totalSeg < 600 ? '#d97706' : '#16a34a',
                }}>
                  {tiempoRestante.pasado ? '-' : ''}{String(tiempoRestante.horas).padStart(2, '0')}:{String(tiempoRestante.minutos).padStart(2, '0')}:{String(tiempoRestante.segundos).padStart(2, '0')}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 6, lineHeight: 1.2 }}>
                <div style={{ fontSize: 7, color: '#94a3b8', fontWeight: 600 }}>SALIDA</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{horaViaje?.substring(0, 5)}</div>
              </div>
            </div>
          )}
        </div>

        {/* DATE FILTER SECTION */}
        <div style={{
          background: 'white', borderRadius: 4, padding: '5px 8px',
          border: '1px solid #ddd', marginBottom: 5,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <i className="fas fa-calendar-alt" style={{ fontSize: 14, color: '#0a365d' }}></i>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Fecha de Viaje:
            </label>
            <input
              type="date"
              value={formData.fechaViaje}                  onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, fechaViaje: e.target.value })); }}
              style={{
                flex: 1, padding: '4px 6px', border: '1px solid #cbd5e1',
                borderRadius: 4, fontSize: 11
              }}
            />
            <button
              onClick={handleBuscarViajes}
              disabled={loadingViajes}
              style={{
                background: '#0a365d', color: 'white', fontWeight: 'bold',
                border: 'none', borderRadius: 4, padding: '5px 12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13
              }}
            >
              {loadingViajes ? (
                <><i className="fas fa-spinner fa-spin"></i> Buscando...</>
              ) : (
                <><i className="fas fa-search"></i> Buscar Viajes</>
              )}
            </button>
          </div>
        </div>

        {/* DYNAMIC BUTTONS AREA (viajes disponibles) */}
        <div style={{
          background: '#ececec', borderRadius: 4, padding: '4px',
          marginBottom: 5, minHeight: 36,
          display: 'flex', gap: 4, overflowX: 'auto', flexWrap: 'nowrap'
        }}>
          {viajesDisponibles.length === 0 ? (
            <div style={{ padding: '8px', color: '#94a3b8', fontSize: 13, width: '100%', textAlign: 'center' }}>
              <i className="fas fa-bus"></i> Seleccione fecha y busque viajes disponibles
            </div>
          ) : (
            viajesDisponibles.map((v, idx) => (
              <button
                key={v?.id_viajes ?? `viaje-btn-${idx}`}
                onClick={() => {
                  if (formData.idViaje !== String(v.id_viajes)) {
                    deseleccionarAsientosActuales(); // Liberar anteriores
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
                style={{
                  flex: '0 0 auto', padding: '4px 10px', border: 'none', borderRadius: 3,
                  cursor: 'pointer', fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap',
                  background: formData.idViaje === String(v.id_viajes)
                    ? (v.es_viaje_extra === 1 ? '#d97706' : '#0a365d')
                    : (v.es_viaje_extra === 1 ? '#fef3c7' : 'white'),
                  color: formData.idViaje === String(v.id_viajes)
                    ? 'white'
                    : (v.es_viaje_extra === 1 ? '#92400e' : '#475569'),
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  borderLeft: v.es_viaje_extra === 1 ? '3px solid #f59e0b' : '3px solid transparent'
                }}
              >
                {v.es_viaje_extra === 1 && (
                  <span title="Viaje Extra" style={{ marginRight: 3 }}>
                    <i className="fas fa-star" style={{ fontSize: 7, color: formData.idViaje === String(v.id_viajes) ? '#fde68a' : '#f59e0b' }}></i>
                  </span>
                )}
                <i className="fas fa-clock" style={{ marginRight: 3, fontSize: 12 }}></i>
                {v.hora_origen_salida ? v.hora_origen_salida.substring(0, 5) : v.hora || v.hora_salida}
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  {v.nombre_rutas || v.nombre_aux}
                </span>
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  {v.bus_disco || v.bus_codigo}
                </span>
                <span style={{
                  marginLeft: 3, padding: '1px 4px', borderRadius: 2,
                  background: formData.idViaje === String(v.id_viajes) ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  fontSize: 12
                }}>
                  {v.asientos_libres || 0} libres
                </span>
              </button>
            ))
          )}
        </div>

        {/* MAIN SPLIT: Left (Form) + Right (Bus Visualizer) */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>

            {/* FIELDSET: Detalles del Viaje */}
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 5,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 3
              }}>
                <i className="fas fa-route" style={{ marginRight: 4, color: '#e67e22', fontSize: 13 }}></i>
                Detalles del Viaje
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {/* Viaje combo + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: 32 }}>
                    Viaje:
                  </label>
                  <select
                    value={formData.idViaje}
                    onChange={e => {
                      marcarActividadReal();
                      const viajeId = e.target.value;
                      if (formData.idViaje !== viajeId) {
                        deseleccionarAsientosActuales(); // Liberar anteriores
                      }
                      const v = viajesDisponibles.find(vv => String(vv.id_viajes) === viajeId);
                      setFormData(prev => ({ ...prev, idViaje: viajeId, origen: v?.id_origen || prev.origen, asientosSeleccionados: [], pasajeros: [] }));
                      if (v) {
                        setDiscoBus(v.bus_disco || v.bus_codigo || '');
                        setHoraViaje(v.hora_origen_salida || v.hora_salida_rutas || v.hora || v.hora_salida || '');
                        setIdBus(v.id_fkbus_viajes || v.id_buses || v.bus_id || '');
                      }
                    }}
                    style={{ flex: 1, padding: '3px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13 }}
                  >
                    <option value="">Seleccione...</option>
                    {viajesDisponibles.map((v, idx) => (
                      <option key={v?.id_viajes ?? `viaje-opt-${idx}`} value={v.id_viajes}>
                        {`${v.nombre_rutas || v.nombre_aux || `Viaje ${v.id_viajes}`} - ${v.hora_origen_salida ? v.hora_origen_salida.substring(0, 5) : v.hora || v.hora_salida} - Bus ${v.bus_disco || v.bus_codigo}${v.es_viaje_extra === 1 ? ' ⭐ EXTRA' : ''}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBuscarViajes}
                    title="Refrescar viajes"
                    style={{
                      background: '#035f2c', color: 'white', border: 'none',
                      borderRadius: 3, width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-sync-alt" style={{ fontSize: 12 }}></i>
                  </button>
                </div>

                {/* Destino combo + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: 40 }}>
                    Destino:
                  </label>
                  <select
                    value={subrutaSeleccionada}
                    onChange={e => {
                      marcarActividadReal();
                      const id = e.target.value;
                      setSubrutaSeleccionada(id);
                      const subruta = destinosViaje.find(d => String(d.id_sub_rutas) === id);
                      const precio = subruta ? parseFloat(subruta.valor_sub_rutas || 0) : 0;
                      setPrecioUnitario(precio);
                    }}
                    style={{ flex: 1, padding: '3px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13 }}
                  >
                    <option value="">Seleccione...</option>
                    {destinosViaje.map((d, idx) => (
                      <option key={d?.id_sub_rutas ?? `dest-opt-${idx}`} value={d.id_sub_rutas}>
                        {d.nombre_sub_rutas} - ${parseFloat(d.valor_sub_rutas || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    title="Refrescar destinos"
                    style={{
                      background: '#035f2c', color: 'white', border: 'none',
                      borderRadius: 3, width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => {
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
                  >
                    <i className="fas fa-sync-alt" style={{ fontSize: 12 }}></i>
                  </button>
                </div>

                {/* Alimento label (ExtJS: lbl_alimento_viaje) */}
                {alimentoInfo?.incluye_alimentos && (
                  <div style={{ gridColumn: 'span 2', fontSize: 12, color: '#d35400', fontWeight: 'bold', fontStyle: 'italic' }}>
                    <i className="fas fa-utensils" style={{ fontSize: 12 }}></i> Incluye: {alimentoInfo.nombre_alimentos} ($<span className="precio-alimento">{parseFloat(alimentoInfo.precio_alimentos || 0).toFixed(2)}</span>)
                  </div>
                )}
              </div>
            </div>

            {/* FIELDSET: Datos del Pasajero */}
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 2
              }}>
                <i className="fas fa-user" style={{ marginRight: 4, color: '#0a365d', fontSize: 13 }}></i>
                Datos del Pasajero
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {/* CI / Identificación */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Num CI:
                  </label>
                  <input
                    type="text"
                    value={formData.identificacion}
                    onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, identificacion: e.target.value.replace(/\D/g, '') })); }}
                    onKeyDown={e => { if (e.key === 'Enter') { marcarActividadReal(); buscarPasajeroPorCI(formData.identificacion); } }}
                    maxLength={15}
                    placeholder="Cédula"
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                  <button title="Buscar cliente"
                    onClick={() => { marcarActividadReal(); buscarPasajeroPorCI(formData.identificacion); }}
                    style={{ background: '#0a365d', color: 'white', border: 'none', borderRadius: 3, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className="fas fa-search" style={{ fontSize: 12 }}></i>
                  </button>
                  <button title="Limpiar"
                    style={{ background: '#FF9800', color: 'white', border: 'none', borderRadius: 3, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => { marcarActividadReal(); setFormData(prev => ({ ...prev, idCliente: '', identificacion: '', nombres: '', celular: '', direccion: '', correo: '', fechaNacimiento: '', tarifa: 1 })); }}
                  >
                    <i className="fas fa-redo" style={{ fontSize: 12 }}></i>
                  </button>
                  <button title="Crear cliente"
                    onClick={() => { marcarActividadReal(); setClienteAEditar(null); setShowNuevoClienteModal(true); }}
                    style={{ background: '#0a365d', color: 'white', border: 'none', borderRadius: 3, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className="fas fa-user-plus" style={{ fontSize: 12 }}></i>
                  </button>
                  {formData.idCliente && (
                    <button title="Actualizar cliente"
                      onClick={() => {
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
                      style={{ background: '#FF9800', color: 'white', border: 'none', borderRadius: 3, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fas fa-pen" style={{ fontSize: 12 }}></i>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Nombres:
                  </label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, nombres: e.target.value })); }}
                    placeholder="Nombre completo"
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    F. Nac:
                  </label>
                  <input
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={e => {
                      marcarActividadReal();
                      const fecha = e.target.value;
                      const edad = calcularEdad(fecha);
                      const tarifa = tarifaDesdeEdad(edad);
                      setFormData(prev => ({ ...prev, fechaNacimiento: fecha, tarifa }));
                    }}
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Dir:
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, direccion: e.target.value })); }}
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Celular:
                  </label>
                  <input
                    type="text"
                    value={formData.celular}
                    onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, celular: e.target.value.replace(/\D/g, '') })); }}
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Correo:
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, correo: e.target.value })); }}
                    style={{ flex: 1, padding: '2px 5px', border: '1px solid #cbd5e1', borderRadius: 3, fontSize: 13, height: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* FIELDSET: Opciones de Boleto */}
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 2
              }}>
                <i className="fas fa-cog" style={{ marginRight: 4, color: '#e67e22', fontSize: 13 }}></i>
                Opciones de Boleto
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                {/* Tarifa radio group */}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                    Tarifa:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
                    {TARIFAS.map(t => (
                      <label key={t.value} style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        fontSize: 12, cursor: 'pointer', padding: '1px 3px',
                        borderRadius: 2, background: formData.tarifa === t.value ? '#dbeafe' : 'transparent'
                      }}>
                        <input
                          type="radio"
                          name="tarifa"
                          checked={formData.tarifa === t.value}
                          onChange={() => { marcarActividadReal(); setFormData(prev => ({ ...prev, tarifa: t.value })); }}
                          style={{ margin: 0, width: 11, height: 11 }}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ES RESERVA toggle */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => { marcarActividadReal(); setEsReserva(!esReserva); }}
                    style={{
                      padding: '4px 10px', border: '2px solid', borderRadius: 3,
                      fontWeight: 'bold', fontSize: 12, cursor: 'pointer',
                      background: esReserva ? '#FF9800' : 'linear-gradient(to bottom, #f0f0f0, #e8e8e8)',
                      borderColor: esReserva ? '#F57C00' : '#ddd',
                      color: esReserva ? 'white' : 'gray',
                      boxShadow: esReserva ? '0 3px 8px rgba(255,152,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                  >
                    {esReserva ? '✓ ES RESERVA' : 'NO es Reserva'}
                  </button>
                </div>
              </div>

              {/* Observación */}
              <div style={{ marginTop: 4 }}>
                <textarea
                  value={formData.observacion}
                  onChange={e => { marcarActividadReal(); setFormData(prev => ({ ...prev, observacion: e.target.value })); }}
                  placeholder="Observación..."
                  rows={1}
                  style={{
                    width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1',
                    borderRadius: 3, fontSize: 13, resize: 'none', height: 22
                  }}
                />
              </div>
            </div>

            {/* PASAJEROS GRID */}
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

            {/* TOTALES */}
            <BoletoTotalesPanel
              cantidadAsientos={formData.asientosSeleccionados.length}
              precioUnitario={precioUnitario}
              totales={formData.totales}
              onTotalesChange={handleTotalesChange}
              onPrecioChange={handlePrecioChange}
              compact={true}
            />
          </div>

          {/* RIGHT COLUMN: Bus Visualizer */}
          <div style={{ flex: 4, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 150px)' }}>
            <div style={{
              background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
              padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'
            }}>
              {/* Alimento info */}
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

      {/* FOOTER FIJO: siempre visible al fondo del viewport */}
      <div className="nb-footer" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '2px solid #0a365d',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 -4px 15px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minHeight: 56
      }}>
        {/* Lado izquierdo: Bus, Total Bus, Cantidad, Precio Unitario, Total a Pagar */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {formData.idViaje && (
            <>
              <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
                BUS: <strong style={{ color: '#0a365d', fontSize: 15 }}>{discoBus || '---'}</strong>
              </span>
              <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
              <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
                TOTAL BUS: <strong style={{ color: '#035f2c', fontSize: 16 }}>${parseFloat(totalRecaudado || 0).toFixed(2)}</strong>
              </span>
              <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
            </>
          )}
          <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            Cantidad: <strong style={{ color: '#0a365d', fontSize: 22, fontFamily: 'monospace', fontWeight: 800 }}>{formData.asientosSeleccionados.length}</strong>
          </span>
          <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
          <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            P. Unit: <strong style={{ color: '#e67e22', fontSize: 22, fontFamily: 'monospace', fontWeight: 800 }}>${parseFloat(precioUnitario || 0).toFixed(2)}</strong>
          </span>
          <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
          <span style={{ fontSize: 14, whiteSpace: 'nowrap', fontWeight: 600 }}>
            Total a Pagar: <strong style={{ color: '#059669', fontSize: 26, fontFamily: 'monospace', fontWeight: 900 }}>${parseFloat(totalVenta || 0).toFixed(2)}</strong>
          </span>
        </div>

        {/* Lado derecho: botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={confirmarGuardar}
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(to right, #035f2c, #0a7f3f)',
              color: 'white', fontWeight: 'bold', fontSize: 14,
              border: 'none', borderRadius: 5, padding: '10px 24px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 6, opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin"></i> PROCESANDO...</>
            ) : (
              <><i className="fas fa-save"></i> GUARDAR</>
            )}
          </button>

          <button
            onClick={handleCancelar}
            style={{
              background: 'linear-gradient(to right, #d32f2f, #f44336)',
              color: 'white', fontWeight: 'bold', fontSize: 14,
              border: 'none', borderRadius: 5, padding: '10px 24px',
              cursor: 'pointer', boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <i className="fas fa-times"></i> CANCELAR
          </button>
        </div>
      </div>
      {/* MODALES */}
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
          setRefreshAsientosKey(k => k + 1); // Refresh seats to show the old seat empty
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

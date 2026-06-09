/* global qz */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusVisualizer } from './components/BusVisualizer';
import { PasajerosGrid } from './components/PasajerosGrid';
import { BoletoTotalesPanel } from './components/BoletoTotalesPanel';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { CambiarBusModal } from './components/CambiarBusModal';
import { CambiarAgenciaModal } from './components/CambiarAgenciaModal';
import { ListadoPasajerosModal } from './components/ListadoPasajerosModal';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BoleteriaService } from '../../services/boleteria.service';
import { api, clienteApi } from '../../config/axios';
import { CONFIG } from '../../config/env';
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

  // Estados del formulario
  const [destinos, setDestinos] = useState([]);
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
  const [showCambiarBusModal, setShowCambiarBusModal] = useState(false);
  const [showCambiarAgenciaModal, setShowCambiarAgenciaModal] = useState(false);
  const [showListadoPasajeros, setShowListadoPasajeros] = useState(false);
  const [autoAutorizarBoleto, setAutoAutorizarBoleto] = useState(false);
  const [refreshAsientosKey, setRefreshAsientosKey] = useState(0);

  const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
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

  // Cargar destinos al montar + viajes de hoy (como ExtJS ViajesBoleto store)
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [destRes, viajesRes, configRes] = await Promise.all([
          BoleteriaService.getDestinos(),
          BoleteriaService.getViajesDisponibles({ fecha: hoyLocal() }),
          api.get('/configuracion/configuracionSeleccion')
        ]);
        if (destRes.success && destRes.data) setDestinos(destRes.data);
        if (viajesRes.success && viajesRes.data) setViajesDisponibles(viajesRes.data);
        if (configRes.data?.success && configRes.data?.data?.length > 0) {
          const cfg = configRes.data.data[0];
          if (cfg.autorizar_boleto_sri === 1 || cfg.autorizar_boleto_sri === true) {
            setAutoAutorizarBoleto(true);
          }
        }
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
      }
    };
    fetchInit();

    // Cargar método de impresión del usuario
    const userId = JSON.parse(sessionStorage.getItem('usuario') || '{}').id_usuario;
    if (userId) {
      api.get('/impresoras/miConfig', { params: { id_usuario: userId } }).then(res => {
        if (res.data?.success && res.data?.data) {
          setMetodoImpresion(res.data.data.metodo_impresion || 'manual');
          setPrinterBoletos(res.data.data.printer_boletos || '');
        }
      }).catch(() => {});
    }
  }, []);

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
        setShowCambiarBusModal(true);
        // TODO: pasar datos del boleto al modal de reubicación
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
      const res = await BoleteriaService.getViajesDisponibles({
        fecha: formData.fechaViaje
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
          BoleteriaService.getAsientosBusViaje(formData.idViaje),
          BoleteriaService.getDestinosViaje(formData.idViaje)
        ]);

        console.log('[cargarAsientos] asientosRes:', JSON.stringify(asientosRes));
        if (asientosRes.success && asientosRes.data && asientosRes.data.length > 0) {
          const busData = asientosRes.data[0];
          setCapacidadBus(busData.capacidad_buses || 40);
          setDiscoBus(busData.disco_buses || '');
          setIdBus(busData.id_buses || '');
          setIdChofer(busData.id_fkpersonal_buses || '');
          setCedulaChofer(busData.per_cedula_personal || '');
          setPisosBus(busData.pisos_buses || 1);
          setMapaAsientos(busData.mapa_asientos || null);
          setHoraViaje(busData.hora_viaje || formData.viajeTexto?.split(' - ')[0] || '');
          // Guardar info de alimentos
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
    if (formData.asientosSeleccionados.includes(asientoId)) {
      setFormData(prev => ({
        ...prev,
        asientosSeleccionados: prev.asientosSeleccionados.filter(a => a !== asientoId),
        pasajeros: prev.pasajeros.filter(p => p.asiento !== asientoId)
      }));
    } else {
      if (formData.asientosSeleccionados.length >= 8) {
        toast.error('Máximo 8 asientos por transacción.');
        return;
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
    if (formData.asientosSeleccionados.length === 0) errores.push('• Seleccionar al menos un asiento');
    if (formData.pasajeros.some(p => !p.cedula || !p.nombres)) errores.push('• Completar cédula y nombres de todos los pasajeros en la lista');

    if (errores.length > 0) {
      toast.error(
        <div style={{whiteSpace:'pre-wrap',textAlign:'left',fontSize:12,lineHeight:1.6}}>
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
    if (minutosBoleto > minutosViaje) {
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

      const detalles = formData.pasajeros.map(p => ({
        total_boleto_detalle: parseFloat(p.valor || precioPorAsiento),
        asiento_boleto_detalle: String(p.asiento),
        precio_boleto_detalle: parseFloat(p.valor || precioPorAsiento),
        descuento_boleto_detalle: parseFloat(p.descuento || 0),
        iva_boleto_detalle: 0,
        nombre_cliente_boleto_detalle: p.nombres || formData.nombres,
        identificacion_boleto_detalle: p.cedula || formData.identificacion,
        tarifa_boleto_detalle: p.tarifa || 'Normal',
        id_destino: parseInt(p.id_destino || subrutaSeleccionada) || null,
        // ExtJS: incluye_alimento_boleto_detalle
        incluye_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? 1 : 0,
        precio_alimento_boleto_detalle: alimentoInfo?.incluye_alimentos ? parseFloat(alimentoInfo.precio_alimentos || 0) : 0,
      }));

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
        id_caja_global: JSON.parse(sessionStorage.getItem('usuario') || '{}').id_caja_global ||
                        JSON.parse(sessionStorage.getItem('usuario') || '{}').id_caja_boleteria_global || 0
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
      const viajesRes = await BoleteriaService.getViajesDisponibles({ fecha: formData.fechaViaje || hoyLocal() });
      if (viajesRes.success && viajesRes.data) setViajesDisponibles(viajesRes.data);
    } catch (e) {
      console.error('Error refrescando viajes:', e);
    }
  }, [formData.fechaViaje]);

  // Limpiar formulario completo (ExtJS: limpiarFormularioBoleto)
  const limpiarFormulario = () => {
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
    setHoraViaje('');
    setMapaAsientos(null);
  };

  // Abrir impresión del boleto (ExtJS: onimpresionBoleto)
  const imprimirBoleto = async (id_boleto) => {
    const printUrl = `/php/boletoFactura.php?id_boleto=${id_boleto}`;

    if (metodoImpresion === 'directa') {
      // Directa: QZ Tray raw print
      try {
        const ticketRes = await api.get('/boleto/ticketTexto', { params: { id_boleto } });
        const texto = typeof ticketRes.data === 'string' ? ticketRes.data : ticketRes.data?.message || '';

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
            const token = sessionStorage.getItem('auth_token') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            fetch('/configuracion/sign-message?request=' + encodeURIComponent(toSign), { headers })
              .then(r => r.ok ? r.text() : null).then(resolve).catch(() => resolve(null));
          });
        };

        const conectarQZ = () => {
          if (!window.qz) return Promise.reject('Librería no cargada');
          if (qz.websocket.isActive()) return Promise.resolve();
          return qz.websocket.connect({ retries: 1, delay: 1, usingSecure: false })
            .catch(() => qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false, port: { insecure: [8182, 8283, 8384, 8485] } }));
        };

        await loadQZ();
        configurarQZ();
        await conectarQZ();

        const config = window.qz.configs.create(printerBoletos);
        const data = [{ type: 'raw', format: 'plain', data: texto }];
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
    const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    usuario.id_sucursal = record.id_sucursal;
    usuario.nombre_sucursal = record.nombre_sucursal || usuario.nombre_sucursal;
    usuario.punto_emision_sucursal = record.punto_emision_sucursal || usuario.punto_emision_sucursal;
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
    toast.success(`Agencia cambiada a: ${record.nombre_sucursal || record.id_sucursal}`);
    // Refrescar viajes con nueva agencia (como ExtJS)
    buscarViajes();
  };

  return (
    <div className="nuevo-boleto-container" style={{ backgroundColor: '#f5f5f5' }}>
      {/* CONTENIDO SCROLLABLE (padding inferior para que no lo tape el footer fixed) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', paddingBottom: '70px' }}>
        {/* TOP TOOLBAR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setShowCambiarBusModal(true)}
            style={{
              flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 5, padding: '8px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12
            }}
          >
            <i className="fas fa-bus"></i> Cambiar Bus
          </button>
          <button
            onClick={() => setShowCambiarAgenciaModal(true)}
            style={{
              flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 5, padding: '8px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12
            }}
          >
            <i className="fas fa-building"></i> Cambio Agencia
          </button>
          <button
            onClick={() => setShowListadoPasajeros(true)}
            style={{
              flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 5, padding: '8px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12
            }}
          >
            <i className="fas fa-list"></i> Listado Pasajeros
          </button>
        </div>

        {/* DATE FILTER SECTION */}
        <div style={{
          background: 'white', borderRadius: 4, padding: '10px',
          border: '1px solid #ddd', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <i className="fas fa-calendar-alt" style={{ fontSize: 18, color: '#0a365d' }}></i>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Fecha de Viaje:
            </label>
            <input
              type="date"
              value={formData.fechaViaje}
              onChange={e => setFormData(prev => ({ ...prev, fechaViaje: e.target.value }))}
              style={{
                flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1',
                borderRadius: 4, fontSize: 13
              }}
            />
            <button
              onClick={handleBuscarViajes}
              disabled={loadingViajes}
              style={{
                background: '#0a365d', color: 'white', fontWeight: 'bold',
                border: 'none', borderRadius: 5, padding: '7px 16px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
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
          background: '#ececec', borderRadius: 4, padding: '5px',
          marginBottom: 12, minHeight: 50,
          display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap'
        }}>
          {viajesDisponibles.length === 0 ? (
            <div style={{ padding: '10px', color: '#94a3b8', fontSize: 12, width: '100%', textAlign: 'center' }}>
              <i className="fas fa-bus"></i> Seleccione fecha y busque viajes disponibles
            </div>
          ) : (
            viajesDisponibles.map((v, idx) => (
              <button
                key={v?.id_viajes ?? `viaje-btn-${idx}`}
                onClick={() => {
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
                  setIdBus(v.id_buses || v.bus_id || '');
                }}
                style={{
                  flex: '0 0 auto', padding: '8px 14px', border: 'none', borderRadius: 4,
                  cursor: 'pointer', fontWeight: 'bold', fontSize: 12, whiteSpace: 'nowrap',
                  background: formData.idViaje === String(v.id_viajes) ? '#0a365d' : 'white',
                  color: formData.idViaje === String(v.id_viajes) ? 'white' : '#475569',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                {v.hora_origen_salida ? v.hora_origen_salida.substring(0,5) : v.hora || v.hora_salida}
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  {v.nombre_rutas || v.nombre_aux}
                </span>
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  {v.bus_disco || v.bus_codigo}
                </span>
                <span style={{
                  marginLeft: 4, padding: '1px 5px', borderRadius: 3,
                  background: formData.idViaje === String(v.id_viajes) ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  fontSize: 10
                }}>
                  {v.asientos_libres || 0} libres
                </span>
              </button>
            ))
          )}
        </div>

        {/* MAIN SPLIT: Left (Form) + Right (Bus Visualizer) */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* FIELDSET: Detalles del Viaje */}
            <div style={{
              background: 'white', borderRadius: 6, border: '1px solid #e0e0e0',
              padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6
              }}>
                <i className="fas fa-route" style={{ marginRight: 6, color: '#e67e22' }}></i>
                Detalles del Viaje
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Viaje combo + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: 40 }}>
                    Viaje:
                  </label>
                  <select
                    value={formData.idViaje}
                    onChange={e => {
                      const viajeId = e.target.value;
                      const v = viajesDisponibles.find(vv => String(vv.id_viajes) === viajeId);
                      setFormData(prev => ({ ...prev, idViaje: viajeId, origen: v?.id_origen || prev.origen }));
                      if (v) {
                        setDiscoBus(v.bus_disco || v.bus_codigo || '');
                        setHoraViaje(v.hora || v.hora_salida || '');
                        setIdBus(v.id_buses || v.bus_id || '');
                      }
                    }}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  >
                    <option value="">Seleccione...</option>
                    {viajesDisponibles.map((v, idx) => (
                      <option key={v?.id_viajes ?? `viaje-opt-${idx}`} value={v.id_viajes}>
                        {`${v.nombre_rutas || v.nombre_aux || `Viaje ${v.id_viajes}`} - ${v.hora_origen_salida ? v.hora_origen_salida.substring(0,5) : v.hora || v.hora_salida} - Bus ${v.bus_disco || v.bus_codigo}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBuscarViajes}
                    title="Refrescar viajes"
                    style={{
                      background: '#035f2c', color: 'white', border: 'none',
                      borderRadius: 4, width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>
                  </button>
                </div>

                {/* Destino combo + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: 50 }}>
                    Destino:
                  </label>
                  <select
                    value={subrutaSeleccionada}
                    onChange={e => {
                      const id = e.target.value;
                      setSubrutaSeleccionada(id);
                      const subruta = destinosViaje.find(d => String(d.id_sub_rutas) === id);
                      const precio = subruta ? parseFloat(subruta.valor_sub_rutas || 0) : 0;
                      setPrecioUnitario(precio);
                      // Actualizar valor de pasajeros existentes
                      if (precio > 0 && formData.pasajeros.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          pasajeros: prev.pasajeros.map(p => ({
                            ...p,
                            id_destino: id,
                            valor: p.tarifa === 'Normal' ? precio : (p.tarifa.includes('50%') ? precio / 2 : 0),
                            descuento: p.tarifa === 'Normal' ? 0 : (p.tarifa === 'Gratis Cortesía' ? precio : precio / 2)
                          }))
                        }));
                      }
                    }}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
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
                      borderRadius: 4, width: 28, height: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => {
                      if (formData.idViaje) {
                        BoleteriaService.getDestinosViaje(formData.idViaje).then(r => {
                          if (r.success && r.data) setDestinosViaje(r.data);
                        });
                      }
                    }}
                  >
                    <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>
                  </button>
                </div>

                {/* Alimento label (ExtJS: lbl_alimento_viaje) */}
                {alimentoInfo?.incluye_alimentos && (
                  <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#d35400', fontWeight: 'bold', fontStyle: 'italic' }}>
                    <i className="fas fa-utensils"></i> Incluye: {alimentoInfo.nombre_alimentos} (${parseFloat(alimentoInfo.precio_alimentos || 0).toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            {/* FIELDSET: Datos del Pasajero */}
            <div style={{
              background: 'white', borderRadius: 6, border: '1px solid #e0e0e0',
              padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6
              }}>
                <i className="fas fa-user" style={{ marginRight: 6, color: '#0a365d' }}></i>
                Datos del Pasajero
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {/* CI / Identificación */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Num CI:
                  </label>
                  <input
                    type="text"
                    value={formData.identificacion}
                    onChange={e => setFormData(prev => ({ ...prev, identificacion: e.target.value.replace(/\D/g, '') }))}
                    onKeyDown={e => e.key === 'Enter' && buscarPasajeroPorCI(formData.identificacion)}
                    maxLength={15}
                    placeholder="Cédula"
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                  <button title="Buscar cliente"
                    onClick={() => buscarPasajeroPorCI(formData.identificacion)}
                    style={{ background: '#0a365d', color: 'white', border: 'none', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className="fas fa-search" style={{ fontSize: 11 }}></i>
                  </button>
                  <button title="Limpiar"
                    style={{ background: '#FF9800', color: 'white', border: 'none', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setFormData(prev => ({ ...prev, idCliente: '', identificacion: '', nombres: '', celular: '', direccion: '', correo: '', fechaNacimiento: '', tarifa: 1 }))}
                  >
                    <i className="fas fa-redo" style={{ fontSize: 11 }}></i>
                  </button>
                  <button title="Crear cliente"
                    onClick={() => { setClienteAEditar(null); setShowNuevoClienteModal(true); }}
                    style={{ background: '#0a365d', color: 'white', border: 'none', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i>
                  </button>
                  {formData.idCliente && (
                    <button title="Actualizar cliente"
                      onClick={() => {
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
                      style={{ background: '#FF9800', color: 'white', border: 'none', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fas fa-pen" style={{ fontSize: 11 }}></i>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Nombres:
                  </label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={e => setFormData(prev => ({ ...prev, nombres: e.target.value }))}
                    placeholder="Nombre completo"
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    F. Nac:
                  </label>
                  <input
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={e => {
                      const fecha = e.target.value;
                      const edad = calcularEdad(fecha);
                      const tarifa = tarifaDesdeEdad(edad);
                      setFormData(prev => ({ ...prev, fechaNacimiento: fecha, tarifa }));
                    }}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Dirección:
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={e => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Celular:
                  </label>
                  <input
                    type="text"
                    value={formData.celular}
                    onChange={e => setFormData(prev => ({ ...prev, celular: e.target.value.replace(/\D/g, '') }))}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                    Correo:
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={e => setFormData(prev => ({ ...prev, correo: e.target.value }))}
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* FIELDSET: Opciones de Boleto */}
            <div style={{
              background: 'white', borderRadius: 6, border: '1px solid #e0e0e0',
              padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6
              }}>
                <i className="fas fa-cog" style={{ marginRight: 6, color: '#e67e22' }}></i>
                Opciones de Boleto
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* Tarifa radio group */}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Tarifa:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {TARIFAS.map(t => (
                      <label key={t.value} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, cursor: 'pointer', padding: '2px 4px',
                        borderRadius: 3, background: formData.tarifa === t.value ? '#dbeafe' : 'transparent'
                      }}>
                        <input
                          type="radio"
                          name="tarifa"
                          checked={formData.tarifa === t.value}
                          onChange={() => setFormData(prev => ({ ...prev, tarifa: t.value }))}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ES RESERVA toggle */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => setEsReserva(!esReserva)}
                    style={{
                      padding: '6px 14px', border: '2px solid', borderRadius: 4,
                      fontWeight: 'bold', fontSize: 11, cursor: 'pointer',
                      background: esReserva ? '#FF9800' : 'linear-gradient(to bottom, #f0f0f0, #e8e8e8)',
                      borderColor: esReserva ? '#F57C00' : '#ddd',
                      color: esReserva ? 'white' : 'gray',
                      boxShadow: esReserva ? '0 4px 10px rgba(255,152,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {esReserva ? '✓ ES RESERVA' : 'NO es Reserva'}
                  </button>
                </div>
              </div>

              {/* Observación */}
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={formData.observacion}
                  onChange={e => setFormData(prev => ({ ...prev, observacion: e.target.value }))}
                  placeholder="Observación..."
                  rows={2}
                  style={{
                    width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1',
                    borderRadius: 4, fontSize: 12, resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* PASAJEROS GRID */}
            <div style={{
              background: 'white', borderRadius: 6, border: '1px solid #e0e0e0',
              padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6
              }}>
                <i className="fas fa-users" style={{ marginRight: 6, color: '#0a365d' }}></i>
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
            />
          </div>

          {/* RIGHT COLUMN: Bus Visualizer */}
          <div style={{ flex: 4 }}>
            <div style={{
              background: 'white', borderRadius: 6, border: '1px solid #e0e0e0',
              padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'sticky', top: 10
            }}>
              <div style={{
                fontSize: 24, fontWeight: 'bold', color: '#0a365d', textAlign: 'center',
                padding: '8px', marginBottom: 6
              }}>
                BUS Nro: {discoBus || '---'}
              </div>
              {/* Total recaudado del bus (ExtJS: total_bus) */}
              {formData.idViaje && (
                <div style={{
                  fontSize: 18, fontWeight: 'bold', color: '#035f2c', textAlign: 'center',
                  padding: '4px', marginBottom: 6
                }}>
                  TOTAL BUS: ${parseFloat(totalRecaudado || 0).toFixed(2)}
                </div>
              )}
              {/* Alimento info (ExtJS: lbl_alimento_viaje) */}
              {alimentoInfo?.incluye_alimentos && (
                <div style={{
                  fontSize: 11, color: '#d35400', fontWeight: 'bold', fontStyle: 'italic',
                  textAlign: 'center', marginBottom: 6
                }}>
                  <i className="fas fa-utensils"></i> Incluye: {alimentoInfo.nombre_alimentos} (${parseFloat(alimentoInfo.precio_alimentos || 0).toFixed(2)})
                </div>
              )}
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10,
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6
              }}>
                <i className="fas fa-bus" style={{ marginRight: 6, color: '#e67e22' }}></i>
                Visualización del Bus
              </div>
              {!formData.idViaje ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-bus" style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}></i>
                  <p style={{ fontSize: 13 }}>Seleccione un viaje para ver la distribución de asientos</p>
                </div>
              ) : (
                <BusVisualizer
                  capacidad={capacidadBus}
                  pisos={pisosBus}
                  mapaAsientos={mapaAsientos}
                  asientosOcupados={asientosOcupados}
                  asientosSeleccionados={formData.asientosSeleccionados}
                  onAsientoClick={handleAsientoClick}
                  onAsientoOcupadoClick={handleAsientoOcupadoClick}
                  discoBus={discoBus}
                  totalVenta={totalVenta}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER FIJO: siempre visible al fondo del viewport */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #ddd',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 15,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        zIndex: 1000
      }}>
        <button
          onClick={confirmarGuardar}
          disabled={isSubmitting}
          style={{
            background: 'linear-gradient(to right, #035f2c, #0a7f3f)',
            color: 'white', fontWeight: 'bold', fontSize: 15,
            border: 'none', borderRadius: 6, padding: '12px 30px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 8, opacity: isSubmitting ? 0.7 : 1
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
            color: 'white', fontWeight: 'bold', fontSize: 15,
            border: 'none', borderRadius: 6, padding: '12px 30px',
            cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-times"></i> CANCELAR
        </button>
      </div>
      {/* MODALES */}
      <NuevoClienteModal
        isOpen={showNuevoClienteModal}
        onClose={() => { setShowNuevoClienteModal(false); setClienteAEditar(null); }}
        onClienteCreado={handleClienteCreado}
        clienteInicial={clienteAEditar}
      />
      <CambiarBusModal
        isOpen={showCambiarBusModal}
        onClose={() => setShowCambiarBusModal(false)}
        viajeId={formData.idViaje}
        currentBusId={idBus}
        currentChoferId={idChofer}
        onCambioExitoso={handleCambioBusExitoso}
      />
      <CambiarAgenciaModal
        isOpen={showCambiarAgenciaModal}
        onClose={() => setShowCambiarAgenciaModal(false)}
        currentIdCaja={JSON.parse(sessionStorage.getItem('usuario') || '{}').id_sucursal}
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

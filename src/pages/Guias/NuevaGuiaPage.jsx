import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RemitenteDestinatarioForm } from './components/RemitenteDestinatarioForm';
import { DetalleCargaGrid } from './components/DetalleCargaGrid';
import { TotalesPanel } from './components/TotalesPanel';
import { CompaniaPanel } from './components/CompaniaPanel';
import { FormaPagoPanel } from './components/FormaPagoPanel';
import Modal from '../../components/common/Modal';
import { AperturaCajaForm } from '../CajaBoleteria/components/AperturaCajaForm';
import { cajaBoleteriaService } from '../../services/cajaBoleteria.service';
import { GuiaService } from '../../services/guia.service';
import { CONFIG } from '../../config/env';
import { api } from '../../config/axios';
import axios from 'axios';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

/**
 * NuevaGuiaPage - Equivalente COMPLETO a NuevaGuia.js del ExtJS (2137 líneas)
 * 
 * Layout (replicando ExtJS):
 * Fila 1: Info Básica (50%) + Compañía (50%)
 * Fila 2: Remitente (33%) + Destinatario (33%) + Otros (33%)
 * Fila 3: Encomienda (50%) + Forma de Pago (50%)
 *   - Encomienda: Detalle grid + Valor Declarado + Número Manual
 *   - Forma Pago: Combo, montos, pagos agregados, A Pagar/Pagado/Diferencia
 * Fila 4: Descuento (radios) + Totales
 * Fila 5: Botones Guardar / Cancelar
 */
export const NuevaGuiaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ── Validación de caja al entrar ─────────────────────
  const [cajaResolved, setCajaResolved] = useState(false);
  const [showCajaModal, setShowCajaModal] = useState(false);
  const [localCajaId, setLocalCajaId] = useState(null);
  const [cajaChecking, setCajaChecking] = useState(true);
  
  // ── Loading ──────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Field errors (rojo) ──────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Edición ──────────────────────────────────────────
  const location = useLocation();
  const editarGuiaObj = location.state?.editarGuia; // Objeto de respuesta de API (data, data_detalle) o array
  const idGuiaEdit = location.state?.idGuia;
  const isEditing = !!idGuiaEdit;
  
  // ── Combos ───────────────────────────────────────────
  const [sucursales, setSucursales] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [tiposEnvio, setTiposEnvio] = useState([]);
  const [selectedTipoEnvioObj, setSelectedTipoEnvioObj] = useState(null);
  
  // ── Cabecera (ExtJS: origen_guia, destino_guia, tipo_envio) ────
  const [origen, setOrigen] = useState(user?.nombre_canton || user?.canton || '');
  const origenOriginalRef = useRef(user?.nombre_canton || user?.canton || '');
  const [destino, setDestino] = useState(''); // ID del destino seleccionado
  const [destinoTexto, setDestinoTexto] = useState(''); // texto para el input
  const [destinoAbierto, setDestinoAbierto] = useState(false);
  const [tipoEnvio, setTipoEnvio] = useState('');
  
  // ── Clientes (ExtJS: remitente, destinatario) ────────
  const [remitente, setRemitente] = useState(null);
  const [destinatario, setDestinatario] = useState(null);
  const [convenio, setConvenio] = useState(null);
  
  // ── NUEVO: "A quién se factura" (ExtJS: facturar_a) ─
  const [facturarA, setFacturarA] = useState('1'); // 1=Remitente, 2=Destinatario, 3=Otros
  
  // ── NUEVO: Otros (ExtJS: datos otros - tercer remitente/destinatario)
  const [otrosIdentidad, setOtrosIdentidad] = useState('');
  const [otrosNombre, setOtrosNombre] = useState('');
  const [otrosTelefono, setOtrosTelefono] = useState('');
  const [otrosCorreo, setOtrosCorreo] = useState('');
  const [otrosDireccion, setOtrosDireccion] = useState('');
  const [otrosLoading, setOtrosLoading] = useState(false);
  const [otrosShowCreate, setOtrosShowCreate] = useState(false);
  const [otrosNewCliente, setOtrosNewCliente] = useState({
    identificacion_cliente: '',
    tipo_identificacion_cliente: 'C',
    nombre_cliente: '',
    direccion_cliente: '',
    email_cliente: '',
    telefono_cliente: ''
  });
  
  // ── NUEVO: Compañía (ExtJS: id_compania) ────────────
  const [compania, setCompania] = useState(null);
  
  // ── Detalle (ExtJS: store items) ────────────────────
  const [detalles, setDetalles] = useState([]);
  
  // ── Descuento (ExtJS: tipodescuento - 0=Normal, 1=50%, 2=100%) ─
  const [descuentoTipo, setDescuentoTipo] = useState('0');
  
  // ── Valor Declarado (ExtJS: valor_declarado, porcentaje, valor_declarado_valor) ─
  const [valorDeclaradoActivo, setValorDeclaradoActivo] = useState(false);
  const [valorDeclaradoPorcentaje, setValorDeclaradoPorcentaje] = useState('');
  const [valorDeclaradoValor, setValorDeclaradoValor] = useState('');
  
  const [numeroManual, setNumeroManual] = useState(false);
  const [numeroManualGuia, setNumeroManualGuia] = useState('');
  
  // ── NUEVO: Pagos (ExtJS: pagos store) ───────────────
  const [pagos, setPagos] = useState([]);
  const [pagadoPor, setPagadoPor] = useState('1'); // 1=Remitente, 2=Destinatario → canceladopor
  
  // ── Modal PDF ────────────────────────────────────────
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('Guía');

  // ── Observación (ExtJS: observacion) ─────────────────
  const [observacion, setObservacion] = useState('');
  
  // ── Configuración y usuario ──────────────────────────────
  const [defaultFormaPagoId, setDefaultFormaPagoId] = useState('');
  const [configTipoTarifa, setConfigTipoTarifa] = useState(0);
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [printerGuias, setPrinterGuias] = useState('');

  // ── Validar caja al montar (vía API, con guard) ────
  const cajaCheckRef = useRef(false);
  useEffect(() => {
    if (cajaCheckRef.current) return;
    cajaCheckRef.current = true;
    const checkCaja = async () => {
      try {
        const res = await cajaBoleteriaService.validarCaja();
        const cajaId = res.id_caja || res.data?.id_caja;
        if (res.success && cajaId) {
          setLocalCajaId(cajaId);
          setCajaResolved(true);
        } else {
          setShowCajaModal(true);
        }
      } catch {
        const fallback = user?.id_caja_global || user?.id_caja;
        if (fallback) {
          setLocalCajaId(fallback);
          setCajaResolved(true);
        } else {
          setShowCajaModal(true);
        }
      } finally {
        setCajaChecking(false);
      }
    };
    checkCaja();
  }, []);

  // ── Cargar combos al montar (con guard para evitar doble fetch en StrictMode) ──
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!cajaResolved) return;
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCombos();

    // Cargar método de impresión del usuario
    const userId = user?.id_usuario || user?.id;
    if (userId) {
      api.get('/impresoras/miConfig', { params: { id_usuario: userId } }).then(res => {
        if (res.data?.success && res.data?.data) {
          setMetodoImpresion(res.data.data.metodo_impresion || 'manual');
          setPrinterGuias(res.data.data.printer_guias || '');
        }
      }).catch(() => {});
    }
  }, [cajaResolved]);

  // ── changeAquienFactura: limpiar Otros ───────────────────
  useEffect(() => {
    if (facturarA !== '3') {
      setOtrosIdentidad('');
      setOtrosNombre('');
      setOtrosTelefono('');
      setOtrosCorreo('');
      setOtrosDireccion('');
      setOtrosShowCreate(false);
    }
  }, [facturarA]);

  // ── Compañía desde destino seleccionado ─────────────────
  // Al cambiar destino: si tiene compañía asociada la carga, si no la limpia
  useEffect(() => {
    if (!destino || !destinoTexto) {
      setCompania(null);
      return;
    }
    const d = destinos.find(d => String(d.id) === String(destino));
    if (d && d.idfk_compania_asociada_destino) {
      setCompania({
        id: d.idfk_compania_asociada_destino,
        id_compania_asociada: d.idfk_compania_asociada_destino,
        nombre: d.nombre_compania_asociada || '',
        ruc: '',
        telefono: d.numero_contacto || '',
        correo: ''
      });
    } else {
      // Si el destino no tiene compañía asociada, limpiar
      setCompania(null);
    }
  }, [destino, destinos, destinoTexto]);

  const normalizeComboData = (arr, idField, nombreField) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => ({ ...item, id: item[idField], nombre: item[nombreField] }));
  };

  const loadCombos = async () => {
    setLoading(true);
    try {
      const [sucRes, destRes, teRes, configRes, userRes] = await Promise.allSettled([
        GuiaService.getSucursalesCombo(),
        GuiaService.getDestinosCombo(),
        GuiaService.getTiposEnvio(),
        GuiaService.configuracionSeleccion(),
        GuiaService.buscarUsuario()
      ]);
      
      // ── Normalizar combos ──
      if (sucRes.status === 'fulfilled') {
        const raw = sucRes.value?.data || [];
        setSucursales(normalizeComboData(raw, 'id_sucursal', 'nombre_sucursal'));
      }
      if (destRes.status === 'fulfilled') {
        const raw = destRes.value?.data || [];
        setDestinos(normalizeComboData(raw, 'id_destino', 'lugar_destino'));
      }
      if (teRes.status === 'fulfilled') {
        const raw = teRes.value?.data || [];
        setTiposEnvio(normalizeComboData(raw, 'id_tipo_envio', 'nombre_envio'));
      }

      // ── Configuración: forma de pago por defecto + tipo tarifa ──
      if (configRes.status === 'fulfilled') {
        const cfgArr = configRes.value?.data;
        if (Array.isArray(cfgArr) && cfgArr.length > 0) {
          const cfg = cfgArr[0];
          if (cfg.id_forma_pago_configuracion) {
            setDefaultFormaPagoId(String(cfg.id_forma_pago_configuracion));
          }
          setConfigTipoTarifa(parseInt(cfg.tipo_tarifa_configuracion) || 0);
        }
      }

      // ── Usuario: origen = nombre_canton o ciudad (NO sucursal) ──
      if (userRes.status === 'fulfilled') {
        const uData = userRes.value?.data;
        if (uData && (uData.nombre_canton || uData.canton || uData.ciudad)) {
          const val = uData.nombre_canton || uData.canton || uData.ciudad;
          setOrigen(val);
          origenOriginalRef.current = val;
        }
      }

      // Fallback: si no hay ciudad, usar la ciudad de la primera sucursal
      if (!origenOriginalRef.current && sucRes.status === 'fulfilled') {
        const raw = sucRes.value?.data || [];
        if (raw.length > 0) {
          const val = raw[0].nombre_canton || raw[0].ciudad || raw[0].nombre_sucursal || raw[0].nombre || '';
          setOrigen(val);
          origenOriginalRef.current = val;
        }
      }

      // Tipo de envío por defecto (si no es edición)
      if (!isEditing && teRes.status === 'fulfilled' && teRes.value?.data?.length > 0) {
        const first = teRes.value.data[0];
        setTipoEnvio(String(first.id_tipo_envio));
        setSelectedTipoEnvioObj(normalizeComboData([first], 'id_tipo_envio', 'nombre_envio')[0]);
      }
    } catch (error) {
      console.error('Error cargando combos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Populate form data if editing ───────────────────
  useEffect(() => {
    if (isEditing && editarGuiaObj && !loading && destinos.length > 0 && tiposEnvio.length > 0) {
      // ExtJS envia un objeto que puede tener .data como array y .data_detalle o .detalleguia
      const cabeceraArr = Array.isArray(editarGuiaObj) ? editarGuiaObj : (editarGuiaObj.data || []);
      const cabecera = cabeceraArr[0];
      if (!cabecera) return;

      const detallesArr = editarGuiaObj.data_detalle || editarGuiaObj.detalleguia || [];

      // Origen, Destino
      setOrigen(cabecera.origen_guia || cabecera.origen || '');
      
      const destinoText = cabecera.destino_guia || cabecera.destino || '';
      setDestinoTexto(destinoText);
      const dMatch = destinos.find(d => (d.nombre || '').toLowerCase() === destinoText.toLowerCase());
      if (dMatch) setDestino(String(dMatch.id));

      // Remitente
      setRemitente({
        id_cliente: cabecera.id_remitente || cabecera.idclienterem || 0,
        cedula: cabecera.cedula_remitente || cabecera.cedula_cliente_remitente || '',
        nombres: cabecera.nombre_remitente || cabecera.nombre_cliente_remitente || '',
        direccion: cabecera.direccion_remitente || '',
        telefono: cabecera.telefono_remitente || cabecera.telefono_cliente_emisor || '',
        email: cabecera.email_remitente || ''
      });

      // Destinatario
      setDestinatario({
        id_cliente: cabecera.id_destinatario || cabecera.idclienterec || 0,
        cedula: cabecera.cedula_destinatario || cabecera.cedula_cliente_receptor || '',
        nombres: cabecera.nombre_destinatario || cabecera.nombre_cliente_receptor || '',
        direccion: cabecera.direccion_destinatario || '',
        telefono: cabecera.telefono_destinatario || cabecera.telefono_cliente_receptor || '',
        telefono2: cabecera.telefono2_destinatario || '',
        email: cabecera.email_destinatario || ''
      });

      // Bandera (1=Remitente, 2=Destinatario, 3=Otros)
      const band = String(cabecera.bandera || cabecera.bandera_guia || 1);
      setFacturarA(band);

      if (band === '3') {
        setOtrosIdentidad(cabecera.cedula_otros || cabecera.cedula_cliente_otros || '');
        setOtrosNombre(cabecera.nombre_otros || cabecera.nombre_cliente_otros || '');
        setOtrosTelefono(cabecera.telefono_otros || cabecera.telefono_cliente_otros || '');
        setOtrosCorreo(cabecera.email_otros || cabecera.correo_cliente_otros || '');
        setOtrosDireccion(cabecera.direccion_otros || cabecera.direccion_cliente_otros || '');
      }

      // Detalles
      if (detallesArr.length > 0) {
        const idTipo = detallesArr[0].id_fktipo_envio_detalle_guia || detallesArr[0].id_tipo_envio;
        if (idTipo) setTipoEnvio(String(idTipo));
        
        const mapDetalles = detallesArr.map(d => ({
          contenido: d.contenido_guia || d.contenido_detalle_guia || '',
          peso: parseFloat(d.peso_guia || d.peso_detalle_guia) || 0,
          precioUnitario: parseFloat(d.costo_detalle_guia || d.subtotal_detalle_guia) || 0,
          cantidad: parseFloat(d.cantidad_detalle_guia || d.cantidad) || 1,
          descuento: parseFloat(d.tipo_descuento_detalle_guia || d.descuento) || 0,
          iva: parseFloat(d.tipo_iva_detalle_guia || d.iva) || 0,
          tarifa: parseFloat(d.total_tarifa_detalle_guia || d.tarifa) || 0,
          subtotal: parseFloat(d.total_detalle_guia || d.subtotal) || 0
        }));
        setDetalles(mapDetalles);
      }

      // Otros
      setDescuentoTipo(String(cabecera.tipodescuento || cabecera.descuento_tipo || cabecera.tipo_descuento_guia || '0'));
      setObservacion(cabecera.observacion_guia || cabecera.observacion || '');
      
      const vDec = parseFloat(cabecera.valor_declarado_valor || cabecera.valor_declarado || 0);
      if (vDec > 0) {
        setValorDeclaradoActivo(true);
        setValorDeclaradoPorcentaje(cabecera.porcentaje || '');
        setValorDeclaradoValor(vDec);
      }

      const numMan = cabecera.numero_manual || cabecera.si_numero_manual || 0;
      if (numMan === 1 || numMan === '1' || numMan === true) {
        setNumeroManual(true);
        setNumeroManualGuia(cabecera.numero_manual_guia || '');
      }
    }
  }, [isEditing, editarGuiaObj, loading, destinos, tiposEnvio]);

  // ── Handler crear/aperturar caja ────────────────────
  const handleCrearCaja = async (data) => {
    try {
      const response = await cajaBoleteriaService.insertarAperturaCaja(data);
      if (response.success) {
        toast.success('Caja aperturada exitosamente');
        setShowCajaModal(false);
        const verify = await cajaBoleteriaService.validarCaja();
        if (verify.success && verify.data?.id_caja) {
          setLocalCajaId(verify.data.id_caja);
        }
        setCajaResolved(true);
      } else {
        toast.error(response.message || 'Error al aperturar caja');
      }
    } catch (error) {
      toast.error('Error al aperturar caja');
    }
  };

  const handleCerrarModalCaja = () => {
    setShowCajaModal(false);
    navigate('/guias');
  };

  // ── Handler buscar "Otros" por identidad ──────────────
  const handleBuscarOtros = async () => {
    if (!otrosIdentidad || otrosIdentidad.length < 5) return;
    setOtrosLoading(true);
    try {
      const res = await GuiaService.buscarClientePorIdentificacion(otrosIdentidad);
      const data = res?.data;
      if (data && (data.id_cliente || data.id)) {
        setOtrosNombre(data.nombres || data.nombre || '');
        setOtrosTelefono(data.telefono || '');
        setOtrosCorreo(data.email || data.correo || '');
        setOtrosDireccion(data.direccion || '');
      } else {
        toast('Cliente no encontrado. Puede crear uno nuevo.');
      }
    } catch (e) {
      console.error('Error buscando otros:', e);
    } finally {
      setOtrosLoading(false);
    }
  };

  const handleLimpiarOtros = () => {
    setOtrosIdentidad('');
    setOtrosNombre('');
    setOtrosTelefono('');
    setOtrosCorreo('');
    setOtrosDireccion('');
  };

  // ── Handler Nuevo Cliente Otros ──────────────────────
  const handleNuevoClienteOtros = async () => {
    if (!otrosNewCliente.nombre_cliente || !otrosNewCliente.identificacion_cliente) {
      toast.error('Identificación y Nombre son obligatorios');
      return;
    }
    if (!/^\d+$/.test(otrosNewCliente.identificacion_cliente)) {
      toast.error('La identificación debe contener solo números');
      return;
    }
    if (otrosNewCliente.email_cliente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otrosNewCliente.email_cliente)) {
      toast.error('Formato de correo inválido');
      return;
    }
    setOtrosLoading(true);
    try {
      const { api } = await import('../../config/axios');
      await api.post('/cliente/ingresarActualizarCliente', {
        identificacion_cliente: otrosNewCliente.identificacion_cliente,
        tipo_identificacion_cliente: otrosNewCliente.tipo_identificacion_cliente,
        nombre_cliente: otrosNewCliente.nombre_cliente,
        direccion_cliente: otrosNewCliente.direccion_cliente,
        email_cliente: otrosNewCliente.email_cliente,
        telefono_cliente: otrosNewCliente.telefono_cliente
      });
      setOtrosIdentidad(otrosNewCliente.identificacion_cliente);
      setOtrosNombre(otrosNewCliente.nombre_cliente);
      setOtrosTelefono(otrosNewCliente.telefono_cliente);
      setOtrosCorreo(otrosNewCliente.email_cliente);
      setOtrosDireccion(otrosNewCliente.direccion_cliente);
      setOtrosShowCreate(false);
      toast.success('Cliente creado exitosamente');
    } catch (error) {
      console.error('Error creando cliente:', error);
      toast.error('Error al crear el cliente');
    } finally {
      setOtrosLoading(false);
    }
  };

  // ── Handler Convenio ────────────────────────────────
  const handleConvenioFound = (conv) => {
    setConvenio(conv);
  };

  // ── Autocompletar destinatario desde remitente ──────
  const handleDestinatarioAutoFill = (data) => {
    if (!data) return;
    const aux = data.id_cliente_receptor || data.id_cliente || data.cedula_cliente_receptor;
    if (!aux) return;
    const clienteData = {
      id_cliente: data.id_cliente_receptor || data.id_cliente || 0,
      cedula: data.cedula_cliente_receptor || data.identificacion_cliente || '',
      nombres: data.nombre_cliente_receptor || data.nombre_cliente || '',
      direccion: data.direccion_cliente_receptor || data.direccion_cliente || '',
      telefono: data.telefono_cliente_receptor || data.telefono_cliente || '',
      email: data.correo_cliente_receptor || data.email_cliente_receptor || data.email_cliente || '',
      telefono2: data.telefono2_cliente_receptor || data.telefono2 || ''
    };
    if (clienteData.nombres) {
      handleSetDestinatario(clienteData);
      toast.success('Destinatario autocompletado del último envío');
    }
  };

  // ── Wrappers para limpiar errores al cambiar campos ──
  const handleSetRemitente = (data) => { setRemitente(data); setFieldErrors(prev => ({...prev, remitente: undefined})); };
  const handleSetDestinatario = (data) => { setDestinatario(data); setFieldErrors(prev => ({...prev, destinatario: undefined})); };
  const handleSetCompania = (data) => { setCompania(data); setFieldErrors(prev => ({...prev, compania: undefined})); };
  const handleSetDestino = (id, texto) => { setDestino(id); setDestinoTexto(texto); setFieldErrors(prev => ({...prev, destino: undefined})); };
  const handleSetTipoEnvio = (val) => { setTipoEnvio(val); setFieldErrors(prev => ({...prev, tipoEnvio: undefined})); };
  const handleSetDetalles = (data) => { setDetalles(data); setFieldErrors(prev => ({...prev, detalles: undefined})); };

  const bandera = parseInt(facturarA) || 1; // 1=Remitente, 2=Destinatario, 3=Otros
  const canceladopor = pagadoPor === '1' ? 0 : 1; // 0=Remitente, 1=Destinatario

  // ── Handler Guardar ──────────────────────────────────
  const handleGuardar = async () => {
    // ── Validaciones completas con errores en rojo ANTES de confirmación ──
    const errors = {};
    if (!remitente || !remitente.cedula || !remitente.nombres) errors.remitente = true;
    if (!destinatario || !destinatario.cedula || !destinatario.nombres) errors.destinatario = true;
    if (!origen) errors.origen = true;
    if (!destino || !destinoTexto) errors.destino = true;
    if (!compania) errors.compania = true;
    if (!tipoEnvio) errors.tipoEnvio = true;
    if (detalles.length === 0) errors.detalles = true;
    const detalleInvalido = detalles.find(d => !d.contenido || (parseFloat(d.precioUnitario) <= 0 && parseFloat(d.subtotal) <= 0));
    if (detalleInvalido) errors.detalles = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Complete los campos marcados en rojo antes de guardar');
      return;
    }
    setFieldErrors({});

    // Validar caja aperturada (ExtJS: validarcaja antes de guardar)
    const cajaId = localCajaId || user?.id_caja_global || user?.id_caja;
    if (!cajaId) {
      toast.error('No hay una caja aperturada. Debe aperturar una caja primero.');
      return;
    }

    // Confirmación (ExtJS behavior)
    const confirmGuardar = await Swal.fire({ title: '¿Guardar guía?', text: '¿Está seguro de guardar la guía?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, guardar', cancelButtonText: 'Cancelar' });
    if (!confirmGuardar.isConfirmed) return;

    // Calcular totales
    const totalSubtotal = detalles.reduce((sum, d) => sum + (d.subtotal || 0), 0);
    const totalDescuento = descuentoTipo === '2' ? totalSubtotal 
      : descuentoTipo === '1' ? totalSubtotal * 0.5 
      : detalles.reduce((sum, d) => sum + (d.descuento || 0), 0);
    const totalTarifa = detalles.reduce((sum, d) => sum + (d.tarifa || 0), 0);
    const subtotalConDescuento = totalSubtotal - totalDescuento;
    const totalIva = subtotalConDescuento * 0.12;
    const totalGeneral = subtotalConDescuento + totalIva + totalTarifa;

    // ID del cliente según bandera (1=Remitente, 2=Destinatario, 3=Otros)
    const idClienteFactura = facturarA === '1'
      ? (remitente?.id_cliente || 0)
      : facturarA === '2'
        ? (destinatario?.id_cliente || 0)
        : 0;

    const parametros = {
      // Cabecera (coincide con ExtJS form field names)
      origen_guia: origen || user?.sucursal || user?.nombre_sucursal || user?.canton || '',
      origen: origen || user?.sucursal || user?.nombre_sucursal || user?.canton || '',
      destino_guia: destinoTexto || '',
      destino: destinoTexto || '',
      tipo_envio: parseInt(tipoEnvio) || null,
      id_fktipo_envio_guia: parseInt(tipoEnvio) || null,
      fechaguia: new Date().toISOString().split('T')[0],

      // Bandera (determina qué ID de cliente usar para factura: 1=Remitente, 2=Destinatario, 3=Otros)
      bandera: bandera,

      // Quién paga (0=Remitente, 1=Destinatario)
      canceladopor: canceladopor,

      // Caja global (del usuario autenticado o recién creada)
      id_caja_global: localCajaId || user?.id_caja_global || null,
      
      // Remitente (usa idclienterem como ExtJS)
      idclienterem: remitente.id_cliente || 0,
      id_remitente: remitente.id_cliente || null,
      cedula_remitente: remitente.cedula,
      nombre_remitente: remitente.nombres,
      direccion_remitente: remitente.direccion,
      direccionemisor: remitente.direccion,
      telefono_remitente: remitente.telefono,
      telefonoemisor: remitente.telefono,
      email_remitente: remitente.email,
      correoemisor: remitente.email,
      
      // Destinatario (usa idclienterec como ExtJS)
      idclienterec: destinatario.id_cliente || 0,
      id_destinatario: destinatario.id_cliente || null,
      cedula_destinatario: destinatario.cedula,
      cedula_receptor: destinatario.cedula,
      nombre_destinatario: destinatario.nombres,
      nombre_receptor: destinatario.nombres,
      direccion_destinatario: destinatario.direccion,
      direccionreceptor: destinatario.direccion,
      telefono_destinatario: destinatario.telefono,
      telefonoreceptor: destinatario.telefono,
      email_destinatario: destinatario.email,
      correorecptor: destinatario.email,
      telefono2_destinatario: destinatario.telefono2 || '',
      
      // A quién se factura
      facturar_a: parseInt(facturarA) || 1,
      a_quien_factura: parseInt(facturarA) || 1,
      
      // Compañía (ExtJS field name: idcompania)
      id_compania: compania?.id || compania?.id_compania || null,
      idcompania: compania?.id || compania?.id_compania || null,
      nombre_compania: compania?.nombre || '',
      ruc_compania: compania?.ruc || '',
      telefono_compania: compania?.telefono || '',
      
      // Otros (si facturar_a = 3)
      id_cliente_otros: 0,
      identidad_otros: facturarA === '3' ? otrosIdentidad : null,
      cedula_otros: facturarA === '3' ? otrosIdentidad : null,
      nombre_otros: facturarA === '3' ? otrosNombre : null,
      telefono_otros: facturarA === '3' ? otrosTelefono : null,
      email_otros: facturarA === '3' ? otrosCorreo : null,
      correo_otros: facturarA === '3' ? otrosCorreo : null,
      direccion_otros: facturarA === '3' ? otrosDireccion : null,
      
      // Descuento (tipodescuento como en ExtJS)
      descuento_tipo: descuentoTipo,
      tipodescuento: descuentoTipo,
      
      // Valor Declarado (ExtJS: porcentaje + valor_declarado_valor)
      porcentaje: valorDeclaradoActivo ? (parseFloat(valorDeclaradoPorcentaje) || 0) : 0,
      valor_declarado: valorDeclaradoActivo
        ? (parseFloat(valorDeclaradoValor) || (totalGeneral * (parseFloat(valorDeclaradoPorcentaje) || 0) / 100) || 0)
        : 0,
      valor_declarado_valor: valorDeclaradoActivo ? (parseFloat(valorDeclaradoValor) || 0) : 0,
      
      // Número Manual
      numero_manual: numeroManual ? 1 : 0,
      si_numero_manual: numeroManual ? 1 : 0,
      numero_manual_guia: numeroManual ? numeroManualGuia : null,
      
      // Detalles (array con nombres exactos que espera el backend = ExtJS)
      detalle_guia: detalles.map(d => ({
        id_fktipo_envio_detalle_guia: parseInt(tipoEnvio) || null,
        contenido_guia: d.contenido || '',
        peso_guia: d.peso || 0,
        costo_detalle_guia: d.precioUnitario || 0,
        documento_detalle_guia: '',
        tipo_descuento_detalle_guia: d.descuento || 0,
        tipo_iva_detalle_guia: d.iva || 0,
        total_detalle_guia: d.subtotal || 0,
        subtotal_detalle_guia: d.precioUnitario || 0,
        cantidad_detalle_guia: d.cantidad || 1,
        total_tarifa_detalle_guia: d.tarifa || 0,
        id_guia: 0,
        sucursal: parseInt(user?.id_sucursal || user?.sucursal) || 0
      })),
      
      // Pagos (array con nombres exactos = ExtJS)
      comprobante_cobro: pagos.map(p => ({
        concepto_detalle: p.nombre || '',
        monto_comprobante: p.monto || 0,
        id_fkcliente: idClienteFactura,
        id_fkforma: p.id_forma_pago,
        observacion_comprobante: p.detalle || ''
      })),
      
      // Totales calculados
      subtotal_12: totalSubtotal,
      subtotal12: totalSubtotal,
      subtotal_0: 0,
      subtotal0: 0,
      subtotalguia: totalSubtotal,
      descuentoguia: totalDescuento,
      tarifa_factura: totalTarifa,
      valor_tarifa_adicional_guia: totalTarifa,
      impuestoiva: totalIva,
      total_factura: totalGeneral,
      
      // Valor total (display)
      valor_total: totalGeneral,
      total: totalGeneral,
      
      // Metadatos
      observacion: observacion,
      id_usuario: user?.id_usuario || user?.id,
      id_sucursal: user?.id_sucursal || user?.sucursal || null,
      sucursal: parseInt(user?.id_sucursal || user?.sucursal) || 0,
      estado: 'Pendiente'
    };

      // Si es edición, pasamos el id_guia
      if (isEditing) {
        parametros.id_guia = parseInt(idGuiaEdit);
      }

    setSaving(true);
    try {
      const result = isEditing 
        ? await GuiaService.actualizarGuia(parametros) 
        : await GuiaService.insertarGuia(parametros);
      
      if (result && result.success) {
        // Verificar tipo de respuesta (tipo 3 = no hay caja aperturada)
        if (result.tipo === 3) {
          toast.error(result.mensaje || 'No hay una caja aperturada');
          return;
        }
        const idGuia = result.message || result.id_guia;
        toast.success(`Guía guardada exitosamente. N° ${idGuia || ''}`);
        // Auto-imprimir / descargar PDF (como ExtJS: abrir PDF automáticamente)
        if (idGuia) {
          // Mostrar PDF usando el script PHP y enviar WhatsApp
          try {
            const idUsuario = user?.id_usuario || 0;
            const generatorUrl = window.location.origin + `/php/guiaPdfImpresion.php?id_guia=${idGuia}&id_usuario_global=${idUsuario}`;
            
            // Llamar al PHP para generar el PDF
            await axios.get(generatorUrl);

            // Usar la ruta del archivo físico
            const fullPdfUrl = window.location.origin + `/php/tmp/guiaImpresion_${idGuia}.pdf`;

            if (metodoImpresion === 'directa') {
              try {
                if (!printerGuias) {
                  toast.error('No hay impresora de guías configurada');
                  setPdfTitle(`Guía N° ${idGuia}`);
                  setPdfUrl(fullPdfUrl);
                  setPdfModalOpen(true);
                } else {
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
                    return qz.websocket.connect({ retries: 1, delay: 1, usingSecure: false })
                      .catch(() => qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false, port: { insecure: [8182, 8283, 8384, 8485] } }));
                  };

                  await loadQZ();
                  configurarQZ();
                  await conectarQZ();

                  const config = window.qz.configs.create(printerGuias);
                  const data = [{
                    type: 'pixel',
                    format: 'pdf',
                    flavor: 'file',
                    data: fullPdfUrl
                  }];
                  await window.qz.print(config, data);
                  toast.success('Guía impresa en ' + printerGuias);
                }
              } catch (e) {
                console.error('[QZ] Error al imprimir:', e);
                toast.error('Error al imprimir vía QZ Tray. Abriendo PDF manual...');
                setPdfTitle(`Guía N° ${idGuia}`);
                setPdfUrl(fullPdfUrl);
                setPdfModalOpen(true);
              }
            } else {
              setPdfTitle(`Guía N° ${idGuia}`);
              setPdfUrl(fullPdfUrl);
              setPdfModalOpen(true);
            }

            // Enviar WhatsApp al destinatario y remitente
            const telefonosAEnviar = [];
            
            const celDest = (destinatario?.telefono || destinatario?.telefono2 || '').replace(/\D/g, '');
            if (celDest.length >= 9) {
              telefonosAEnviar.push({ numero: celDest, nombre: destinatario?.nombres || 'cliente' });
            }

            const celRem = (remitente?.telefono || '').replace(/\D/g, '');
            if (celRem.length >= 9 && celRem !== celDest) {
              telefonosAEnviar.push({ numero: celRem, nombre: remitente?.nombres || 'cliente' });
            }

            const empDataStr = sessionStorage.getItem('empresa_data');
            const empData = empDataStr ? JSON.parse(empDataStr) : null;
            const enviarWhatsapp = empData ? empData.enviar_whatsapp === 1 : false;

            if (enviarWhatsapp) {
              for (const t of telefonosAEnviar) {
                try {
                  const mensajeGuia = `Estimado(a) ${t.nombre},\n\nAdjuntamos la guía N° ${idGuia} de su encomienda. ¡Gracias por preferirnos!`;
                  await api.post('/whatsapp/enviar', {
                    number: t.numero,
                    message: mensajeGuia,
                    fileUrl: fullPdfUrl
                  });
                } catch (e) {
                  console.error('Error enviando WhatsApp guia a ' + t.numero, e);
                }
              }
              if (telefonosAEnviar.length > 0) {
                toast.success('Guía enviada por WhatsApp');
              }
            }
          } catch (err) {
            console.error('Error abriendo PDF de guía:', err);
            toast.error('No se pudo abrir el PDF');
          }
        }
        setTimeout(() => handleResetForm(), 500);
      } else {
        toast.error(result?.data || 'Error al guardar la guía');
      }
    } catch (error) {
      console.error('Error guardando guía:', error);
      toast.error(error?.response?.data?.message || 'Error al guardar la guía');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset form for next guía ─────────────────────────
  const handleResetForm = () => {
    setFieldErrors({});
    setOrigen(origenOriginalRef.current);
    setDestino('');
    setDestinoTexto('');
    setTipoEnvio('');
    setRemitente(null);
    setDestinatario(null);
    setFacturarA('1');
    setConvenio(null);
    setCompania(null);
    setDetalles([]);
    setDescuentoTipo('0');
    setValorDeclaradoActivo(false);
    setValorDeclaradoPorcentaje('');
    setValorDeclaradoValor('');
    setNumeroManual(false);
    setNumeroManualGuia('');
    setPagos([]);
    setPagadoPor('1');
    setObservacion('');
    setOtrosIdentidad('');
    setOtrosNombre('');
    setOtrosTelefono('');
    setOtrosCorreo('');
    setOtrosDireccion('');
    setSelectedTipoEnvioObj(null);
    toast.success('Formulario listo para nueva guía');
  };

  // ── Handler Cancelar (confirmación como ExtJS) ────────
  const handleCancelar = async () => {
    const hasChanges = remitente || destinatario || detalles.length > 0 || observacion;
    if (hasChanges) {
      const confirmCancel = await Swal.fire({ title: '¿Cancelar?', text: '¿Desea cancelar la guía? Se perderán los cambios.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cancelar', cancelButtonText: 'No' });
      if (!confirmCancel.isConfirmed) return;
    }
    navigate('/guias');
  };

  if (cajaChecking || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  const cardClass = "bg-white rounded-xl shadow-sm border border-slate-200/80";
  const inputClass = "w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-700 transition-all duration-150";
  const inputRO = `${inputClass} bg-slate-50 cursor-not-allowed text-slate-400 border-dashed`;
  const labelClass = "block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' };
  const sectionIcon = { width: '26px', height: '26px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* ── CABECERA ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <i className="fas fa-plus-circle text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight leading-none">{isEditing ? `Editar Guía N° ${idGuiaEdit}` : 'Nueva Guía'}</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{isEditing ? 'Modificación de Encomienda' : 'Registro de Encomienda'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO SCROLLABLE ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* ═══════════════════════════════════════════════════
            FILA 1: Info Básica (50%) + Datos Compañía (50%)
            ExtJS: layout column 50/50
        ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Info Básica */}
          <div className={cardClass} style={{ padding: '16px' }}>
            <h3 style={sectionTitle}>
              <div style={{ ...sectionIcon, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#4f46e5', fontSize: '11px' }}></i>
              </div>
              Datos de la Guía
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* Origen = nombre_canton del usuario (read-only, NO sucursal) */}
              <div>
                <label className={labelClass}>Origen *</label>
                <input type="text" className={fieldErrors.origen ? `${inputRO} border-2 border-red-400 ring-2 ring-red-200` : inputRO} readOnly value={origen} placeholder="Cargando..." />
              </div>
              {/* Destino (autocomplete escribible) */}
              <div style={{ position: 'relative' }}>
                <label className={labelClass}>Destino *</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input type="text" className={fieldErrors.destino ? `${inputClass} border-2 border-red-400` : inputClass} style={{ flex: 1 }}
                    value={destinoTexto}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestinoTexto(val);
                      setDestino(''); // Limpiar selección mientras escribe
                      setFieldErrors(prev => ({...prev, destino: undefined}));
                      setDestinoAbierto(true);
                    }}
                    onFocus={() => {
                      setDestinoAbierto(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const filtrados = destinos.filter(d => (d.nombre || d.nombre_destino || '').toLowerCase().includes(destinoTexto.toLowerCase()));
                        if (filtrados.length > 0) {
                          const primero = filtrados[0];
                          handleSetDestino(String(primero.id || primero.id_destino), primero.nombre || primero.nombre_destino || '');
                        }
                        setDestinoAbierto(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setDestinoAbierto(false), 200)}
                    placeholder="Escriba para buscar destino..." />
                  <button onClick={async () => {
                    try {
                      const res = await GuiaService.getDestinosCombo();
                      setDestinos(res?.data || []);
                      toast.success('Destinos actualizados');
                    } catch (e) {
                      toast.error('Error al actualizar destinos');
                    }
                  }} className="h-8 w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md text-xs" title="Refrescar destinos">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
                {destinoAbierto && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: '42px', zIndex: 50, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    {destinos.filter(d => {
                      const txt = (d.nombre || d.nombre_destino || '').toLowerCase();
                      return txt.includes(destinoTexto.toLowerCase());
                    }).map(d => (
                      <div key={d.id || d.id_destino}
                        onMouseDown={() => {
                          const nombre = d.nombre || d.nombre_destino || '';
                          handleSetDestino(String(d.id || d.id_destino), nombre);
                          setDestinoAbierto(false);
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {d.nombre || d.nombre_destino}
                      </div>
                    ))}
                    {destinos.filter(d => (d.nombre || d.nombre_destino || '').toLowerCase().includes(destinoTexto.toLowerCase())).length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin resultados</div>
                    )}
                  </div>
                )}
              </div>
              {/* A quién se factura */}
              <div>
                <label className={labelClass}>A quién se factura</label>
                <select className={inputClass} value={facturarA} onChange={(e) => setFacturarA(e.target.value)}>
                  <option value="1">Remitente</option>
                  <option value="2">Destinatario</option>
                  <option value="3">Otros</option>
                </select>
              </div>
              </div>
              {/* Observación - dentro de Info Básica como en ExtJS */}
              <div style={{ marginTop: '10px' }}>
                <label className={labelClass}>Observación</label>
                <textarea 
                  className={inputClass} rows="2"
                  placeholder="Observaciones de la guía (opcional)..."
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '36px', paddingTop: '6px' }}
                ></textarea>
              </div>
            </div>

          {/* Compañía */}
          <CompaniaPanel 
            cliente={remitente} 
            compania={compania}
            onSeleccionarCompania={handleSetCompania}
            error={fieldErrors.compania}
          />
        </div>

        {/* ═══════════════════════════════════════════════════
            FILA 2: Remitente (33%) + Destinatario (33%) + Otros (33%)
            ExtJS: layout column 0.33/0.33/0.33
        ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <RemitenteDestinatarioForm 
            tipo="Remitente"
            cliente={remitente}
            onChange={handleSetRemitente}
            onConvenioFound={handleConvenioFound}
            onDestinatarioAutoFill={handleDestinatarioAutoFill}
            error={fieldErrors.remitente}
          />
          <RemitenteDestinatarioForm 
            tipo="Destinatario"
            cliente={destinatario}
            onChange={handleSetDestinatario}
            remitenteId={remitente?.id_cliente}
            error={fieldErrors.destinatario}
          />
          
          {/* ── OTROS (tercera persona) ──────────────────── */}
          <div className={cardClass} style={{ padding: '16px', opacity: facturarA !== '3' ? 0.5 : 1 }}>
            <h3 style={sectionTitle}>
              <div style={{ ...sectionIcon, background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                <i className="fas fa-user-friends" style={{ color: '#d97706', fontSize: '11px' }}></i>
              </div>
              Otros
            </h3>

            {/* Identidad + Botones */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
              <input type="text" className={inputClass} placeholder="Identidad..." 
                value={otrosIdentidad} onChange={(e) => setOtrosIdentidad(e.target.value.replace(/\D/g, ''))} 
                disabled={facturarA !== '3'}
                style={{ flex: 1 }} />
              <button onClick={handleBuscarOtros} disabled={otrosLoading || facturarA !== '3'}
                className="h-8 px-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm disabled:opacity-50"
                title="Buscar cliente">
                <i className={`fas ${otrosLoading ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
              </button>
              <button onClick={() => setOtrosShowCreate(true)}
                disabled={facturarA !== '3'}
                className="h-8 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-bold shadow-sm disabled:opacity-50"
                title="Nuevo cliente">
                <i className="fas fa-user-plus"></i>
              </button>
            </div>

            {otrosShowCreate ? (
              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
                  <i className="fas fa-user-plus"></i> Crear Otros
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label className={labelClass}>Identificación *</label>
                    <input className={inputClass} value={otrosNewCliente.identificacion_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, identificacion_cliente: e.target.value.replace(/\D/g, '')})}
                      maxLength={13} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo ID</label>
                    <select className={inputClass} value={otrosNewCliente.tipo_identificacion_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, tipo_identificacion_cliente: e.target.value})}>
                      <option value="C">Cédula</option>
                      <option value="R">RUC</option>
                      <option value="P">Pasaporte</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className={labelClass}>Nombre / Razón Social *</label>
                    <input className={inputClass} value={otrosNewCliente.nombre_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, nombre_cliente: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input className={inputClass} value={otrosNewCliente.direccion_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, direccion_cliente: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input className={inputClass} value={otrosNewCliente.telefono_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, telefono_cliente: e.target.value.replace(/\D/g, '')})} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className={labelClass}>Email</label>
                    <input className={inputClass} type="email" value={otrosNewCliente.email_cliente}
                      onChange={(e) => setOtrosNewCliente({...otrosNewCliente, email_cliente: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={() => setOtrosShowCreate(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 text-xs font-bold">
                    Cancelar
                  </button>
                  <button onClick={handleNuevoClienteOtros} disabled={otrosLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm disabled:opacity-70">
                    {otrosLoading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar</>}
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className={labelClass}>Razón Social</label>
                <input type="text" className={inputRO} readOnly value={otrosNombre} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input type="text" className={inputRO} readOnly value={otrosTelefono} />
              </div>
              <div>
                <label className={labelClass}>Correo</label>
                <input type="text" className={inputRO} readOnly value={otrosCorreo} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className={labelClass}>Dirección</label>
                <input type="text" className={inputRO} readOnly value={otrosDireccion} />
              </div>
            </div>

            <button onClick={handleLimpiarOtros}
              className="w-full h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
              <i className="fas fa-eraser mr-1"></i> Limpiar
            </button>
            </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            FILA 3: Encomienda (50%) + Forma de Pago (50%)
            ExtJS: layout column 50/50
        ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
          
          {/* ── Encomienda: Detalle + Valor Declarado + Número Manual ── */}
          <div className={cardClass} style={{ padding: '16px' }}>
            <h3 style={sectionTitle}>
              <div style={{ ...sectionIcon, background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                <i className="fas fa-box-open" style={{ color: '#d97706', fontSize: '11px' }}></i>
              </div>
              ENCOMIENDA
              {detalles.length > 0 && <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>{detalles.length} bulto{detalles.length !== 1 ? 's' : ''}</span>}
            </h3>

            {/* DETALLES + TOTAL header (como ExtJS) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b', letterSpacing: '0.05em' }}>DETALLES</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '11px', color: '#6366f1' }}>TOTAL:</span>
                <span style={{ fontWeight: 800, fontSize: '18px', color: '#6366f1' }}>
                  ${detalles.reduce((s, d) => s + (d.total || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
            {/* Tipo de Envío - dentro de ENCOMIENDA como en ExtJS */}
            <div style={{ marginBottom: '10px' }}>
              <label className={labelClass}>Tipo de Envío *</label>
              <select className={fieldErrors.tipoEnvio ? `${inputClass} border-2 border-red-400` : inputClass} value={tipoEnvio} onChange={(e) => {
                const val = e.target.value;
                handleSetTipoEnvio(val);
                const obj = tiposEnvio.find(t => String(t.id || t.value) === val);
                setSelectedTipoEnvioObj(obj || null);
              }}>
                <option value="">Seleccione tipo...</option>
                {tiposEnvio.map(t => (
                  <option key={t.id || t.value || t.id_tipo_envio} value={t.id || t.value || t.id_tipo_envio}>
                    {t.nombre || t.label || t.text}
                  </option>
                ))}
              </select>
            </div>
            <DetalleCargaGrid 
              detalles={detalles} 
              onChange={handleSetDetalles}
              convenio={convenio}
              costoEnvioPorDefecto={selectedTipoEnvioObj?.costo_envio}
              tiposEnvio={tiposEnvio}
              tipoEnvioId={tipoEnvio}
              error={fieldErrors.detalles}
            />

            {/* ── Número Manual ──────────────────────────── */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                <input type="checkbox" checked={numeroManual} onChange={(e) => setNumeroManual(e.target.checked)} 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Número Manual
              </label>
              {numeroManual && (
                <input type="text" className={inputClass} style={{ width: '120px' }}
                  value={numeroManualGuia} onChange={(e) => setNumeroManualGuia(e.target.value)}
                  placeholder="# Guía" />
              )}
            </div>

            {/* ── Valor Declarado ────────────────────────── */}
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
                Valor Declarado
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', border: `1.5px solid ${!valorDeclaradoActivo ? '#6366f1' : '#e2e8f0'}`, background: !valorDeclaradoActivo ? '#eef2ff' : 'transparent', fontSize: '11px', fontWeight: 600, color: !valorDeclaradoActivo ? '#4f46e5' : '#64748b' }}>
                  <input type="radio" name="valorDeclarado" checked={!valorDeclaradoActivo}
                    onChange={() => setValorDeclaradoActivo(false)} />
                  Sin valor
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', border: `1.5px solid ${valorDeclaradoActivo ? '#f59e0b' : '#e2e8f0'}`, background: valorDeclaradoActivo ? '#fef3c7' : 'transparent', fontSize: '11px', fontWeight: 600, color: valorDeclaradoActivo ? '#d97706' : '#64748b' }}>
                  <input type="radio" name="valorDeclarado" checked={valorDeclaradoActivo}
                    onChange={() => setValorDeclaradoActivo(true)} />
                  Con valor
                </label>
                {valorDeclaradoActivo && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" className={inputClass} style={{ width: '70px' }}
                        value={valorDeclaradoPorcentaje}
                        onChange={(e) => setValorDeclaradoPorcentaje(e.target.value)}
                        placeholder="%" min="0" max="100" step="0.01" />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" className={inputClass} style={{ width: '100px' }}
                        value={valorDeclaradoValor}
                        onChange={(e) => setValorDeclaradoValor(e.target.value)}
                        placeholder="$ 0.00" min="0" step="0.01" />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>$</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Columna Derecha: Descuento + Forma de Pago ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Descuento */}
            <div className={cardClass} style={{ padding: '16px' }}>
              <h3 style={sectionTitle}>
                <div style={{ ...sectionIcon, background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' }}>
                  <i className="fas fa-percentage" style={{ color: '#db2777', fontSize: '11px' }}></i>
                </div>
                Descuento
              </h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#475569' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${descuentoTipo === '0' ? '#6366f1' : '#e2e8f0'}`, background: descuentoTipo === '0' ? '#eef2ff' : 'white' }}>
                  <input type="radio" name="descuento" value="0" checked={descuentoTipo === '0'}
                    onChange={(e) => setDescuentoTipo(e.target.value)} />
                  Tarifa Normal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${descuentoTipo === '1' ? '#f59e0b' : '#e2e8f0'}`, background: descuentoTipo === '1' ? '#fef3c7' : 'white', opacity: convenio || parseInt(configTipoTarifa) !== 0 ? 1 : 0.6 }}>
                  <input type="radio" name="descuento" value="1" checked={descuentoTipo === '1'}
                    onChange={(e) => setDescuentoTipo(e.target.value)} disabled={!convenio && parseInt(configTipoTarifa) === 0} />
                  Tarifa 50%
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${descuentoTipo === '2' ? '#10b981' : '#e2e8f0'}`, background: descuentoTipo === '2' ? '#d1fae5' : 'white', opacity: convenio || parseInt(configTipoTarifa) !== 0 ? 1 : 0.6 }}>
                  <input type="radio" name="descuento" value="2" checked={descuentoTipo === '2'}
                    onChange={(e) => setDescuentoTipo(e.target.value)} disabled={!convenio && parseInt(configTipoTarifa) === 0} />
                  Cortesía 100%
                </label>
              </div>
            </div>

            {/* ── Forma de Pago ───────────────────────────── */}
            {!isEditing ? (
              <FormaPagoPanel 
                detalles={detalles}
                convenio={convenio}
                onPagosChange={setPagos}
                pagadoPor={pagadoPor}
                onPagadoPorChange={setPagadoPor}
                defaultFormaPagoId={defaultFormaPagoId}
                configTipoTarifa={configTipoTarifa}
              />
            ) : (
              <div className={cardClass} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <div className="text-center text-slate-400">
                  <i className="fas fa-lock text-2xl mb-2"></i>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-2">Pagos deshabilitados en edición</p>
                  <p className="text-[10px] opacity-75">Para modificar los pagos, anule y genere una nueva guía.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            FILA 4: Totales
        ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
          
          <div></div>

          {/* Totales */}
          <TotalesPanel 
            detalles={detalles}
            descuentoTipo={descuentoTipo}
          />
        </div>

        {/* Hidden fields para compatibilidad con ExtJS */}
        <input type="hidden" name="total" value={detalles.reduce((s, d) => s + (d.total || 0), 0)} />
        <input type="hidden" name="tipodescuento" value={descuentoTipo} />

      </div>

      {/* ═══════════════════════════════════════════════════
          FILA 5: Totales + Botones Guardar / Cancelar (sticky)
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: 'sticky', bottom: 0, background: 'white', borderTop: '2px solid #e2e8f0', boxShadow: '0 -6px 20px rgba(0,0,0,0.08)', zIndex: 40, flexShrink: 0 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', padding: '10px 28px' }}>
          
          {/* ── Contenedor Izquierdo: Totales ──────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* Cantidad de items */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 12px', background: '#f1f5f9', borderRadius: '8px', minWidth: '60px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cantidad</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#334155' }}>{detalles.length}</span>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }}></div>

            {/* Precio Unitario (promedio) */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>P. Unit.</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                ${(() => {
                  const totalC = detalles.reduce((s, d) => s + (d.cantidad || 1), 0);
                  const totalP = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
                  return totalC > 0 ? (totalP / totalC).toFixed(2) : '0.00';
                })()}
              </span>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }}></div>

            {/* Subtotal */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subtotal</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                ${(() => {
                  const st12 = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
                  return st12.toFixed(2);
                })()}
              </span>
            </div>

            {/* Descuento */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Desc.</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                ${(() => {
                  const st12 = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
                  if (descuentoTipo === '2') return st12.toFixed(2);
                  if (descuentoTipo === '1') return (st12 * 0.50).toFixed(2);
                  return detalles.reduce((s, d) => s + (d.descuento || 0), 0).toFixed(2);
                })()}
              </span>
            </div>

            {/* IVA */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IVA 12%</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                ${(() => {
                  const st12 = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
                  let desc = 0;
                  if (descuentoTipo === '2') desc = st12;
                  else if (descuentoTipo === '1') desc = st12 * 0.50;
                  else desc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
                  return ((st12 - desc) * 0.12).toFixed(2);
                })()}
              </span>
            </div>

            {/* Tarifa */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tarifa</span>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                ${detalles.reduce((s, d) => s + (d.tarifa || 0), 0).toFixed(2)}
              </span>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }}></div>

            {/* Total a Pagar */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 12px', background: '#f0fdf4', borderRadius: '8px', minWidth: '100px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total a Pagar</span>
              <span style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 900, color: '#059669' }}>
                ${(() => {
                  const st12 = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
                  let desc = 0;
                  if (descuentoTipo === '2') desc = st12;
                  else if (descuentoTipo === '1') desc = st12 * 0.50;
                  else desc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
                  const stDesc = st12 - desc;
                  const tarifa = detalles.reduce((s, d) => s + (d.tarifa || 0), 0);
                  return (stDesc + stDesc * 0.12 + tarifa).toFixed(2);
                })()}
              </span>
            </div>

          </div>

          {/* ── Contenedor Derecho: Estado cobro + Botones ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            
            {/* Estado de cobro */}
            {(() => {
              const st12 = detalles.reduce((s, d) => s + ((d.precioUnitario || 0) * (d.cantidad || 1)), 0);
              let desc = 0;
              if (descuentoTipo === '2') desc = st12;
              else if (descuentoTipo === '1') desc = st12 * 0.50;
              else desc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
              const totalG = st12 - desc + (st12 - desc) * 0.12 + detalles.reduce((s, d) => s + (d.tarifa || 0), 0);
              const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
              const cobrado = totalPagado >= totalG && totalG > 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: cobrado ? '#f0fdf4' : '#fffbeb', padding: '6px 12px', borderRadius: '8px' }}>
                  <i className={`fas ${cobrado ? 'fa-check-circle' : 'fa-hourglass-half'}`} 
                     style={{ color: cobrado ? '#059669' : '#f59e0b', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: cobrado ? '#059669' : '#d97706' }}>
                    {cobrado ? 'Cobrado' : 'No cobrado'}
                  </span>
                </div>
              );
            })()}

            {/* Botones */}
            <button onClick={handleCancelar}
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '10px', width: '140px', height: '40px', fontSize: '13px', fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
              <i className="fas fa-window-close"></i>Cancelar
            </button>
            <button onClick={handleGuardar} disabled={saving}
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '10px', width: '140px', height: '40px', fontSize: '13px', fontWeight: 700, color: 'white', border: 'none', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i>Procesando...</> : <><i className="fas fa-save"></i>Guardar</>}
            </button>
          </div>

        </div>

      </div>

      {/* ── Modal PDF de impresión ──────────────────────── */}
      <PdfViewerModal
        open={pdfModalOpen}
        onClose={() => { setPdfModalOpen(false); setPdfUrl(null); }}
        url={pdfUrl}
        title={pdfTitle}
        showPrintButton={true}
      />

      {/* ── Modal Apertura de Caja ────────────────────────── */}
      <Modal isOpen={showCajaModal} onClose={handleCerrarModalCaja} title="Apertura de Caja" width="max-w-2xl">
        <AperturaCajaForm
          onSubmit={handleCrearCaja}
          onCancel={handleCerrarModalCaja}
        />
      </Modal>
    </div>
  );
};
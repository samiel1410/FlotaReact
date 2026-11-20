import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CameraCapture } from './CameraCapture';
import { validarIdentificacionEntrega, normalizarIdentificacionEntrega } from '../../../utils/identificacionUtils';
import { CONFIG } from '../../../config/env';
import { EntregaService, abrirPdfEntrega } from '../../../services/entrega.service';
import { GuiaService } from '../../../services/guia.service';

/**
 * Modal para cobrar factura y entregar guía.
 * Recrea la funcionalidad de CobrarGuiaEntregado + onGuardarComprobantesGuia del ExtJS
 */
export const CobrarEntregarModal = ({ guia, destinoGuia, isNotaVenta = false, onClose, onSuccess }) => {
  const cedulaDestinatarioGuia = normalizarIdentificacionEntrega(guia.cedula_cliente_receptor);
  const nombreDestinatarioGuia = String(guia.nombre_cliente_receptor ?? '').trim();
  // Si el destinatario tiene pasaporte o documento extranjero se preselecciona
  // ese tipo para que su identificación se pueda registrar tal cual.
  const tipoDestinatarioGuia = cedulaDestinatarioGuia
    && !/^\d{10}$|^\d{13}$/.test(cedulaDestinatarioGuia)
    ? 'PASAPORTE'
    : 'CEDULA';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formasPago, setFormasPago] = useState([]);
  const [facturaData, setFacturaData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [clienteFotoUrl, setClienteFotoUrl] = useState(null);
  const [clienteNoRegistrado, setClienteNoRegistrado] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [entregaTercero, setEntregaTercero] = useState(false);
  const [tipoIdentificacionRecibe, setTipoIdentificacionRecibe] = useState(tipoDestinatarioGuia);
  const [intentoBusqueda, setIntentoBusqueda] = useState(0);

  const [formData, setFormData] = useState({
    monto: '',
    idformapago: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    observacion: '',
    cedula_recibe: '',
    archivocomprobante: ''
  });

  const fileInputRef = useRef(null);
  // Se considera completa cuando ya puede validarse: 10/13 dígitos para
  // cédula/RUC o al menos 5 caracteres para pasaporte.
  const identificacionCompleta = tipoIdentificacionRecibe === 'PASAPORTE'
    ? formData.cedula_recibe.length >= 5 && formData.cedula_recibe.length <= 20
    : formData.cedula_recibe.length === 10 || formData.cedula_recibe.length === 13;


  const initModal = async () => {
    try {
      // 1. Obtener formas de pago
      const fpRes = await EntregaService.getFormasPago();
      if (fpRes?.success && fpRes?.data) {
        setFormasPago(fpRes.data);
      }

      // 2. Notas de venta: no tienen factura, el saldo está en la guía.
      if (isNotaVenta) {
        const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
        const infoRes = await GuiaNotaVentaService.informacionGuia(guia.id_guia);
        let gInfo = infoRes?.data || infoRes;
        if (Array.isArray(gInfo)) gInfo = gInfo[0];
        if (!gInfo) {
          toast.error('No se pudo obtener la información de la Nota de Venta');
          onClose();
          return;
        }
        const restante = parseFloat(gInfo.por_cobrar !== undefined ? gInfo.por_cobrar : (gInfo.total_guia || 0)) || 0;
        if (restante <= 0.001) {
          toast.success('La nota de venta ya se encuentra cobrada en su totalidad');
          onClose();
          return;
        }
        setFacturaData({
          id_factura: null,
          id_fkcliente_factura: gInfo.id_fkcliente_remitente,
          punto_emision_sucursal: 'NV',
          punto_emision_factura: '000',
          numero_factura: gInfo.numero_guia_final || gInfo.numero_guia || gInfo.id_guia,
          total_factura: restante.toFixed(2)
        });
        setFormData(prev => ({ ...prev, monto: restante.toFixed(2) }));
        return;
      }

      // 3. Obtener datos de factura de la guía
      const factRes = await EntregaService.autorizadoFacturaPorGuia(guia.id_guia);
      if (!factRes?.data || factRes.data.length === 0) {
        toast.error('Esta guía no tiene una factura asociada');
        onClose();
        return;
      }

      const factData = factRes.data[0];

      // 3. Obtener suma ya cobrada
      let cobrado = 0;
      try {
        const sumRes = await EntregaService.facturaidguicobradasuma(guia.id_guia);
        if (sumRes?.success && sumRes?.data) {
          cobrado = parseFloat(sumRes.data.total_factura || sumRes.data || 0);
        }
      } catch (e) {
        console.warn('Error al obtener suma cobrada:', e);
      }

      const totalFactura = parseFloat(factData.total_factura || 0);
      const restante = totalFactura - cobrado;

      if (restante <= 0) {
        toast.success('La guía ya se encuentra cobrada en su totalidad');
        onClose();
        return;
      }

      const montoStr = restante.toFixed(2);
      // Se muestra/valida el saldo pendiente (no el total histórico), que es
      // lo que realmente se va a cobrar.
      setFacturaData({ ...factData, total_factura: montoStr });
      setFormData(prev => ({
        ...prev,
        monto: montoStr
      }));
    } catch (err) {
      console.error('Error inicializando modal de cobro:', err);
      toast.error('Error al cargar datos de factura');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initModal();
    if (cedulaDestinatarioGuia) {
      setFormData(prev => ({ ...prev, cedula_recibe: prev.cedula_recibe || cedulaDestinatarioGuia }));
    }
  }, [guia, cedulaDestinatarioGuia]);

  // Buscar cliente cuando cambia la cédula.
  // Un fallo del API no debe presentarse como "identificación no registrada".
  useEffect(() => {
    let cancelado = false;

    const buscarCliente = async (ident, intento = 0) => {
      setBuscandoCliente(true);
      setErrorCliente('');
      let reintentando = false;
      try {
        const res = await GuiaService.buscarClientePorIdentificacion(ident);
        if (cancelado) return;

        if (!res || typeof res !== 'object' || typeof res.success !== 'boolean') {
          throw new Error('El API de clientes devolvió una respuesta no válida.');
        }
        if (res.success === false) {
          throw new Error(res.mensaje || res.message || res.detalle || res.error || 'El API de clientes rechazó la consulta.');
        }

        const lista = Array.isArray(res.data)
          ? res.data
          : (res.data && typeof res.data === 'object' ? [res.data] : []);
        const cliente = lista.length > 0 ? lista[0] : null;
        const esDestinatarioGuia = cedulaDestinatarioGuia === normalizarIdentificacionEntrega(ident);

        setClienteInfo(cliente);
        setClienteFotoUrl(cliente?.foto_cliente ? `${CONFIG.CLIENTE_URL}/cliente/fotos/${cliente.foto_cliente}` : null);
        setClienteNoRegistrado(!cliente);
        setNombreRecibe(cliente?.nombre_cliente || (esDestinatarioGuia ? nombreDestinatarioGuia : ''));
      } catch (e) {
        if (cancelado) return;
        if (intento < 1) {
          reintentando = true;
          setTimeout(() => { if (!cancelado) buscarCliente(ident, intento + 1); }, 800);
          return;
        }
        console.warn('No se pudo verificar la identificación en el API de clientes:', e?.message || e);
        setClienteInfo(null);
        setClienteFotoUrl(null);
        setClienteNoRegistrado(false);
        setNombreRecibe(cedulaDestinatarioGuia === normalizarIdentificacionEntrega(ident) ? nombreDestinatarioGuia : '');
        setErrorCliente('No se pudo verificar la identificación en el API de clientes. Reintente o continúe escribiendo el nombre de quien recibe.');
      } finally {
        if (!cancelado && !reintentando) setBuscandoCliente(false);
      }
    };

    const cedula = formData.cedula_recibe;
    let temporizador = null;
    if (identificacionCompleta) {
      // Debounce: en pasaportes no se sabe la longitud final mientras se escribe.
      temporizador = setTimeout(() => {
        if (!cancelado) buscarCliente(cedula);
      }, 350);
    } else {
      setClienteInfo(null);
      setClienteFotoUrl(null);
      setClienteNoRegistrado(false);
      setNombreRecibe('');
      setErrorCliente('');
    }

    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [formData.cedula_recibe, identificacionCompleta, cedulaDestinatarioGuia, nombreDestinatarioGuia, intentoBusqueda]);

  const limpiarCliente = () => {
    setClienteInfo(null);
    setClienteFotoUrl(null);
    setClienteNoRegistrado(false);
    setErrorCliente('');
    setNombreRecibe('');
  };

  const handleTipoIdentificacionChange = (tipo) => {
    setTipoIdentificacionRecibe(tipo);
    // Al cambiar de tipo se descartan los caracteres que ya no aplican
    // (una cédula no admite letras y un pasaporte sí).
    setFormData(prev => ({
      ...prev,
      cedula_recibe: tipo === 'PASAPORTE'
        ? normalizarIdentificacionEntrega(prev.cedula_recibe).slice(0, 20)
        : String(prev.cedula_recibe ?? '').replace(/\D/g, '').slice(0, 13)
    }));
    limpiarCliente();
  };

  const handleEntregaTerceroChange = (checked) => {
    setEntregaTercero(checked);
    setTipoIdentificacionRecibe('CEDULA');

    if (checked) {
      setFormData(prev => ({ ...prev, cedula_recibe: '' }));
      limpiarCliente();
      return;
    }

    setTipoIdentificacionRecibe(tipoDestinatarioGuia);
    setFormData(prev => ({ ...prev, cedula_recibe: cedulaDestinatarioGuia }));
    if (!cedulaDestinatarioGuia) {
      limpiarCliente();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, archivocomprobante: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (dataUrl) => {
    setFotoCapturada(dataUrl);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!formData.monto || !formData.idformapago || !formData.fecha || !formData.concepto) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    const cedulaRecibeNormalizada = normalizarIdentificacionEntrega(formData.cedula_recibe);
    const esCedulaDestinatario = !!cedulaDestinatarioGuia && cedulaRecibeNormalizada === cedulaDestinatarioGuia;
    const validacion = validarIdentificacionEntrega(formData.cedula_recibe, tipoIdentificacionRecibe);
    if (!validacion.valido && !esCedulaDestinatario) {
      toast.error(validacion.mensaje);
      return;
    }

    if (!entregaTercero && cedulaDestinatarioGuia && !esCedulaDestinatario) {
      toast.error('La identificación no coincide con el destinatario de la guía. Si la recibe otra persona, marque “Entrega a tercero”.');
      return;
    }

    if ((entregaTercero || !clienteInfo) && !nombreRecibe.trim()) {
      toast.error('Ingrese el nombre de quien recibe la guía.');
      return;
    }

    const montoVal = parseFloat(formData.monto);
    const totalVal = parseFloat(facturaData.total_factura || 0);
    if (montoVal <= 0 || montoVal > totalVal) {
      toast.error(`El monto debe ser mayor a 0 y no exceder $${totalVal.toFixed(2)}`);
      return;
    }
    if (montoVal + 0.001 < totalVal) {
      toast.error(`Para cobrar y entregar debe cubrir el saldo pendiente de $${totalVal.toFixed(2)}.`);
      return;
    }

    setSaving(true);
    try {
      // 1. Obtener usuario actual
      const userRes = await EntregaService.buscarUsuario();
      if (!userRes?.success) {
        toast.error('No se pudo obtener información del usuario');
        setSaving(false);
        return;
      }
      const { nombre_oficina } = userRes.data;

      // 2. Crear comprobante de cobro
      const comprobantePayload = {
        id: '',
        fecha: formData.fecha,
        concepto: formData.concepto,
        monto: montoVal,
        idcliente: facturaData.id_fkcliente_factura,
        idfactura: facturaData.id_factura,
        estado: 'COBRADA',
        idformapago: formData.idformapago,
        observacion: formData.observacion || '',
        id_guia: guia.id_guia,
        destino_guia: destinoGuia || guia.destino_guia || '',
        archivocomprobante: formData.archivocomprobante,
        bandera_entregado: 1,
        nombre_oficina: nombre_oficina || ''
      };

      const compRes = await EntregaService.insertarComprobante(comprobantePayload, isNotaVenta);
      if (!compRes?.success) {
        const errorMsg = compRes?.tipo === 3
          ? 'No existe una caja aperturada'
          : (compRes?.message || 'Error al registrar el cobro');
        toast.error(errorMsg);
        setSaving(false);
        return;
      }

      toast.success('Cobro registrado correctamente');

      // 3. Registrar la entrega con los datos de quien recibe. El cobro ya
      // quedó guardado como COBRADA; si la entrega falla se informa y la guía
      // queda lista para reintentar solo la entrega (sin volver a cobrar).
      try {
        const entregaRes = await EntregaService.entregarGuiaConFoto({
          id_guia: guia.id_guia,
          nombre_oficina: nombre_oficina || '',
          destino_guia: destinoGuia || guia.destino_guia || '',
          cedula_recibe: normalizarIdentificacionEntrega(formData.cedula_recibe),
          nombre_recibe: (nombreRecibe || clienteInfo?.nombre_cliente || '').trim(),
          tipo_identificacion_recibe: tipoIdentificacionRecibe,
          // Se envía 1/0 porque el cuerpo se serializa como form-urlencoded.
          entrega_tercero: entregaTercero ? 1 : 0,
          foto_base64: fotoCapturada
        }, isNotaVenta);

        if (entregaRes && entregaRes.success === false) {
          toast.error(`El cobro se registró, pero no se pudo entregar la guía: ${entregaRes.message || entregaRes.data || 'revise los datos de quien recibe'}`);
          if (onSuccess) onSuccess();
          onClose();
          return;
        }
      } catch (e) {
        console.warn('Error guardando datos de entrega:', e);
        toast.error('El cobro se registró, pero no se pudo registrar la entrega. Vuelva a intentar la entrega.');
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // 4. Generar e imprimir el comprobante de entrega
      try {
        const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, userRes.data.id_usuario, isNotaVenta);
        if (pdfRes?.success && pdfRes?.url) {
          abrirPdfEntrega(pdfRes.url);
        } else {
          toast.error(pdfRes?.message || 'No se pudo imprimir el comprobante de entrega');
        }
      } catch (pdfErr) {
        console.warn('Error generando PDF:', pdfErr);
        toast.error('No se pudo imprimir el comprobante de entrega');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al procesar cobro:', err);
      toast.error('Ocurrió un error al procesar el cobro');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Cargando información de cobro...</p>
        </div>
      </div>
    );
  }

  if (!facturaData) return null;

  const numFactura = String(facturaData.numero_factura).padStart(9, '0');
  const nombreFactura = isNotaVenta
    ? `NV ${facturaData.numero_factura || ''}`
    : `${facturaData.punto_emision_sucursal}-${facturaData.punto_emision_factura}-${numFactura}`;

  const cedulaValida = identificacionCompleta;
  const validacionCedula = cedulaValida
    ? validarIdentificacionEntrega(formData.cedula_recibe, tipoIdentificacionRecibe)
    : null;
  const esCedulaDestinatario = !!cedulaDestinatarioGuia
    && normalizarIdentificacionEntrega(formData.cedula_recibe) === cedulaDestinatarioGuia;
  const cedulaInvalida = !!validacionCedula && !validacionCedula.valido && !esCedulaDestinatario;
  const advertenciaCedula = !!validacionCedula && !validacionCedula.valido && esCedulaDestinatario;
  const cedulaNoCoincide = !entregaTercero && !!cedulaDestinatarioGuia && cedulaValida && !esCedulaDestinatario;
  const nombreObligatorio = entregaTercero || (!clienteInfo && cedulaValida);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <i className="fas fa-money-bill-wave text-green-400"></i> REALIZAR COBRO
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex flex-col gap-5">
            {/* Info de factura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Factura</label>
                <div className="text-slate-900 font-semibold px-3 py-2 bg-white border border-slate-200 rounded-md text-sm">
                  {nombreFactura}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Total a cobrar</label>
                <div className="text-green-700 font-bold px-3 py-2 bg-green-50 border border-green-200 rounded-md text-lg">
                  ${parseFloat(facturaData.total_factura || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Datos de cobro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Monto USD <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={facturaData.total_factura}
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Forma Pago <span className="text-red-500">*</span>
                </label>
                <select
                  name="idformapago"
                  value={formData.idformapago}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {formasPago.map(fp => (
                    <option key={fp.id_forma_pago} value={fp.id_forma_pago}>
                      {fp.nombre_forma_pago}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Nº Depósito / Transferencia / Otros... <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="concepto"
                value={formData.concepto}
                onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value.toUpperCase() }))}
                placeholder="Número de referencia"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {tipoIdentificacionRecibe === 'PASAPORTE'
                    ? (entregaTercero ? 'Pasaporte del tercero que recibe' : 'Pasaporte de quien recibe')
                    : (entregaTercero ? 'Cédula del tercero que recibe' : 'Cédula de quien recibe')} <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-1 mb-2">
                  {[
                    { valor: 'CEDULA', texto: 'Cédula / RUC' },
                    { valor: 'PASAPORTE', texto: 'Pasaporte / Extranjero' }
                  ].map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => handleTipoIdentificacionChange(opcion.valor)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${tipoIdentificacionRecibe === opcion.valor
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {opcion.texto}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  name="cedula_recibe"
                  value={formData.cedula_recibe}
                  onChange={(e) => {
                    const valor = tipoIdentificacionRecibe === 'PASAPORTE'
                      ? normalizarIdentificacionEntrega(e.target.value).slice(0, 20)
                      : e.target.value.replace(/[^0-9]/g, '');
                    setFormData(prev => ({ ...prev, cedula_recibe: valor }));
                    setClienteNoRegistrado(false);
                  }}
                  placeholder={tipoIdentificacionRecibe === 'PASAPORTE' ? 'Pasaporte o documento extranjero' : 'Cédula o RUC'}
                  maxLength={tipoIdentificacionRecibe === 'PASAPORTE' ? 20 : 13}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />

                <label className={`mt-2 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none rounded-full px-3 py-1 border shadow-sm w-fit transition-colors ${entregaTercero ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                  <input
                    type="checkbox"
                    checked={entregaTercero}
                    onChange={(e) => handleEntregaTerceroChange(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Entrega a tercero
                </label>

                {cedulaInvalida && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                      <i className="fas fa-exclamation-triangle mr-1"></i> Cédula no válida
                    </p>
                    <p className="text-[11px] text-red-700">
                      {validacionCedula.mensaje} No se puede entregar con una identificación falsa o incompleta.
                    </p>
                  </div>
                )}

                {advertenciaCedula && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      <i className="fas fa-exclamation-circle mr-1"></i> Verifique la cédula registrada
                    </p>
                    <p className="text-[11px] text-amber-700">
                      {validacionCedula.mensaje} Es la cédula del destinatario en la guía; confirme con el cliente antes de entregar.
                    </p>
                  </div>
                )}

                {cedulaNoCoincide && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                      <i className="fas fa-user-shield mr-1"></i> No coincide con el destinatario
                    </p>
                    <p className="text-[11px] text-red-700">
                      La identificación ingresada no es la del destinatario de la guía ({cedulaDestinatarioGuia}). Si la recibe otra persona, marque “Entrega a tercero”.
                    </p>
                  </div>
                )}

                {buscandoCliente && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <i className="fas fa-spinner fa-spin text-blue-500"></i> Buscando datos del cliente...
                  </div>
                )}

                {!buscandoCliente && clienteInfo && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cliente registrado</p>
                    <p className="text-sm font-semibold text-emerald-900 break-words">
                      <i className="fas fa-user-check mr-1"></i> {clienteInfo.nombre_cliente}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      {clienteInfo.tipo_identificacion_cliente} {clienteInfo.identificacion_cliente}
                    </p>
                  </div>
                )}

                {!buscandoCliente && errorCliente && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                      No se pudo verificar
                    </p>
                    <p className="text-[11px] text-red-700">{errorCliente}</p>
                    <button
                      type="button"
                      onClick={() => setIntentoBusqueda((n) => n + 1)}
                      className="mt-1 text-[11px] font-bold text-red-700 underline hover:text-red-900"
                    >
                      Reintentar consulta
                    </button>
                  </div>
                )}

                {!buscandoCliente && !errorCliente && clienteNoRegistrado && !cedulaInvalida && !cedulaNoCoincide && identificacionCompleta && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Identificación no registrada
                    </p>
                    <p className="text-[11px] text-amber-700">
                      {entregaTercero
                        ? 'El API de clientes no tiene registrado al tercero. Puede continuar escribiendo el nombre de quien recibe.'
                        : 'El API de clientes no tiene registrada esta identificación. Puede entregar igual indicando el nombre de quien recibe.'}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nombre de quien recibe {nombreObligatorio && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={nombreRecibe}
                  onChange={(e) => setNombreRecibe(e.target.value)}
                  placeholder="Se completa con la cédula"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="block text-sm font-semibold text-slate-700 mb-1 mt-3">Observación</label>
                <input
                  type="text"
                  name="observacion"
                  value={formData.observacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Foto / Imagen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen comprobante</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 text-sm"
                />
              </div>
              <div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Identidad / Foto de Entrega{' '}
                    <span className="text-[10px] font-medium text-slate-400">(opcional)</span>
                  </label>

                  {!fotoCapturada && clienteFotoUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] text-slate-500">Foto registrada del cliente:</span>
                      <img src={clienteFotoUrl} alt="Cliente" width={96} height={96} loading="lazy" decoding="async" className="h-24 w-24 object-cover rounded-full border-4 border-white shadow-md" />
                      <button
                        onClick={() => setShowCamera(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <i className="fas fa-camera"></i> Tomar nueva foto (opcional)
                      </button>
                    </div>
                  )}

                  {!fotoCapturada && !clienteFotoUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] text-slate-500 text-center">La foto es opcional: puede confirmar solo con la cédula.</p>
                      <button
                        onClick={() => setShowCamera(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <i className="fas fa-camera"></i> Tomar foto (opcional)
                      </button>
                    </div>
                  )}
                  
                  {fotoCapturada && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200 shadow-sm flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> Nueva foto capturada
                      </span>
                      <div className="relative inline-block mt-1">
                        <img src={fotoCapturada} alt="Preview" className="h-24 w-24 object-cover rounded-full border-4 border-green-100 shadow-md" />
                        <button
                          onClick={() => setFotoCapturada('')}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors ring-2 ring-white"
                          title="Eliminar foto"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
              disabled={saving || !cedulaValida || cedulaInvalida || cedulaNoCoincide || (nombreObligatorio && !nombreRecibe.trim())}
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
              ) : (
                <><i className="fas fa-save"></i> Cobrar y Entregar</>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};

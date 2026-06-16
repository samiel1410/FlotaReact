import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CameraCapture } from './CameraCapture';
import { CONFIG } from '../../../config/env';
import { EntregaService } from '../../../services/entrega.service';

/**
 * Modal para cobrar factura y entregar guía.
 * Recrea la funcionalidad de CobrarGuiaEntregado + onGuardarComprobantesGuia del ExtJS
 */
export const CobrarEntregarModal = ({ guia, destinoGuia, isNotaVenta = false, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formasPago, setFormasPago] = useState([]);
  const [facturaData, setFacturaData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState('');

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

  useEffect(() => {
    initModal();
  }, []);

  const initModal = async () => {
    try {
      // 1. Obtener formas de pago
      const fpRes = await EntregaService.getFormasPago();
      if (fpRes?.success && fpRes?.data) {
        setFormasPago(fpRes.data);
      }

      // 2. Obtener datos de factura de la guía
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
      setFacturaData(factData);
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

    const montoVal = parseFloat(formData.monto);
    const totalVal = parseFloat(facturaData.total_factura || 0);
    if (montoVal <= 0 || montoVal > totalVal) {
      toast.error(`El monto debe ser mayor a 0 y no exceder $${totalVal.toFixed(2)}`);
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

      const numFactura = String(facturaData.numero_factura).padStart(9, '0');
      const nombreFactura = `${facturaData.punto_emision_sucursal}-${facturaData.punto_emision_factura}-${numFactura}`;

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

      const compRes = await EntregaService.insertarComprobante(comprobantePayload);
      if (!compRes?.success) {
        const errorMsg = compRes?.tipo === 3
          ? 'No existe una caja aperturada'
          : (compRes?.message || 'Error al registrar el cobro');
        toast.error(errorMsg);
        setSaving(false);
        return;
      }

      toast.success('Cobro registrado correctamente');

      // 3. Si hay cédula o foto, guardar datos de entrega
      if (formData.cedula_recibe || fotoCapturada) {
        try {
          await EntregaService.entregarGuiaConFoto({
            id_guia: guia.id_guia,
            nombre_oficina: nombre_oficina || '',
            destino_guia: destinoGuia || guia.destino_guia || '',
            cedula_recibe: formData.cedula_recibe,
            foto_base64: fotoCapturada
          }, isNotaVenta);
        } catch (e) {
          console.warn('Error guardando foto de entrega:', e);
        }
      }

      // 4. Generar PDF de entrega
      try {
        const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, userRes.data.id_usuario, isNotaVenta);
        if (pdfRes?.success && pdfRes?.ruta) {
          const w = window.open(
            `${CONFIG.PHP_URL}/tmp/${pdfRes.ruta}`,
            'PDF_Entrega',
            'width=800,height=600'
          );
          if (!w) {
            const a = document.createElement('a');
            a.href = `${CONFIG.PHP_URL}/tmp/${pdfRes.ruta}`;
            a.target = '_blank';
            a.click();
          }
        }
      } catch (pdfErr) {
        console.warn('Error generando PDF:', pdfErr);
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
  const nombreFactura = `${facturaData.punto_emision_sucursal}-${facturaData.punto_emision_factura}-${numFactura}`;

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
                  Cédula de quien recibe
                </label>
                <input
                  type="text"
                  name="cedula_recibe"
                  value={formData.cedula_recibe}
                  onChange={(e) => setFormData(prev => ({ ...prev, cedula_recibe: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Cédula o RUC"
                  maxLength={13}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Observación</label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Foto de entrega</label>
                <button
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-camera"></i>
                  {fotoCapturada ? 'Foto capturada ✓' : 'Tomar Foto'}
                </button>
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
              disabled={saving}
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

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { getFormasPago } from '../../../services/formapago.service';
import { GuiaService } from '../../../services/guia.service';

/**
 * Modal para cobrar una factura asociada a una guía.
 * Recrea la funcionalidad de CobrarFactura de ExtJS.
 */
export const CobrarFacturaModal = ({ guia, onClose, onSuccess, isNotaVenta = false }) => {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facturaData, setFacturaData] = useState(null);
  const [formasPago, setFormasPago] = useState([]);
  
  const [formData, setFormData] = useState({
    monto: '',
    idformapago: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    observacion: '',
    archivocomprobante: ''
  });

  const fileInputRef = useRef(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Evitar doble petición en React StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const init = async () => {
      try {
        // 1. Obtener formas de pago
        const fPagosRes = await getFormasPago({ limite: 1000 });
        if (fPagosRes.success && fPagosRes.data) {
          setFormasPago(fPagosRes.data);
        }

        if (isNotaVenta) {
          // Para Notas de Venta, no hay factura. Cobramos el total_guia directamente.
          const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
          
          // Obtenemos los detalles del remitente y el total de la guía
          const infoRes = await GuiaNotaVentaService.informacionGuia(guia.id_guia);
          if (infoRes) {
            let gInfo = infoRes.data || infoRes;
            if (Array.isArray(gInfo)) gInfo = gInfo[0];
            
            if (!gInfo) {
              toast.error('La guía no contiene información válida');
              onClose();
              return;
            }
            const restante = parseFloat(gInfo.por_cobrar !== undefined ? gInfo.por_cobrar : (gInfo.total_guia || 0));

            if (restante <= 0) {
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
            setFormData(prev => ({
              ...prev,
              monto: restante.toFixed(2)
            }));
          } else {
            toast.error('No se pudo obtener la información de la Nota de Venta');
            onClose();
          }
        } else {
          // 2. Obtener datos de la factura a cobrar sumando
          const factDataRes = await api.get(`/factura/autorizadofacturaxguia?id_guia=${guia.id_guia}`);
          
          if (factDataRes && factDataRes.data && factDataRes.data.length > 0) {
            const fData = factDataRes.data[0];
            
            // Obtener suma ya cobrada
            const sumRes = await api.get(`/factura/facturaidguicobradasuma?id_guia=${guia.id_guia}`);
            const cobrado = (sumRes && sumRes.success && sumRes.data) ? parseFloat(sumRes.data) : 0;
            
            const totalAFacturar = parseFloat(fData.total_factura || 0);
            const restante = totalAFacturar - cobrado;

            if (restante <= 0) {
              toast.success('La guía ya se encuentra cobrada en su totalidad');
              onClose();
              return;
            }
            
            setFacturaData({
              ...fData,
              total_factura: restante.toFixed(2)
            });
            setFormData(prev => ({
              ...prev,
              monto: restante.toFixed(2)
            }));
          } else {
            toast.error('No se pudo obtener la información de cobro');
            onClose();
          }
        }
      } catch (err) {
        console.error('Error inicializando modal de cobro', err);
        toast.error('Error al cargar datos de factura');
        onClose();
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [guia.id_guia, onClose]);

  const handleInputChange = (e) => {
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
    } else {
      setFormData(prev => ({ ...prev, archivocomprobante: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monto || !formData.idformapago || !formData.fecha || !formData.concepto) {
      toast.error('Por favor complete todos los campos obligatorios');
      return;
    }

    const montoVal = parseFloat(formData.monto);
    if (montoVal <= 0 || montoVal > parseFloat(facturaData.total_factura)) {
      toast.error(`El monto debe ser mayor a 0 y no puede exceder el total a cobrar ($${facturaData.total_factura})`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: "",
        fecha: formData.fecha,
        concepto: formData.concepto,
        monto: montoVal,
        idcliente: facturaData.id_fkcliente_factura,
        idfactura: facturaData.id_factura,
        estado: 'COBRADA',
        idformapago: formData.idformapago,
        tipo: isNotaVenta ? 2 : 1, // 2 para guía directa/nota de venta, 1 para factura
        observacion: formData.observacion || ' ',
        id_guia: guia.id_guia,
        destino_guia: guia.destino_guia || guia.destino || '',
        archivocomprobante: formData.archivocomprobante
      };

      let res;
      if (isNotaVenta) {
        const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
        res = await GuiaNotaVentaService.insertarComprobante(payload);
      } else {
        res = await api.post('/comprobantecobro/comprobanteCobroInsertarActualizar', payload);
      }
      
      const respuesta = isNotaVenta ? res : (res?.data || res);
      if (respuesta && respuesta.success) {
        toast.success('Cobro registrado correctamente');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(respuesta?.message || (typeof respuesta?.data === 'string' ? respuesta.data : 'Error al registrar el cobro'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al guardar el comprobante');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Cargando información de factura...</p>
        </div>
      </div>
    );
  }

  if (!facturaData) return null;

  const numFactura = String(facturaData.numero_factura).padStart(9, '0');
  const nombreFactura = `${facturaData.punto_emision_sucursal}-${facturaData.punto_emision_factura}-${numFactura}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <i className="fas fa-money-bill-wave text-green-400"></i> REALIZAR COBRO
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{isNotaVenta ? 'Nota de Venta' : 'Factura'}</label>
              <div className="text-slate-900 font-medium px-3 py-2 bg-white border border-slate-200 rounded-md">
                {isNotaVenta ? `Guía #${facturaData.numero_factura}` : nombreFactura}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Total a cobrar</label>
              <div className="text-green-700 font-bold px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                ${facturaData.total_factura}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Monto USD <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max={facturaData.total_factura}
                name="monto"
                value={formData.monto}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Forma Pago <span className="text-red-500">*</span></label>
              <select
                name="idformapago"
                value={formData.idformapago}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nº Depósito / Transferencia / Otros... <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="concepto"
              value={formData.concepto}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Observación</label>
            <input
              type="text"
              name="observacion"
              value={formData.observacion}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium shadow-sm transition-colors flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-save"></i> Guardar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

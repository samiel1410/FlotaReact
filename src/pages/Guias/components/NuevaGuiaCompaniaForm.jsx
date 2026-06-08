import React, { useState, useEffect, useRef } from 'react';
import { api, clienteApi } from '../../../config/axios';
import toast from 'react-hot-toast';

// Función para validar si hay una caja abierta
const validarCajaAbierta = async () => {
  try {
    // Intentar obtener id_caja_global del JWT (decodificado en el interceptor de axios)
    // o de localStorage como fallback
    const localCaja = localStorage.getItem('id_caja_global');
    if (localCaja) return localCaja;

    // Si no hay en localStorage, consultar al backend
    const res = await api.post('/caja/validarcaja');
    if (res.data?.success && res.data?.id_caja) {
      localStorage.setItem('id_caja_global', res.data.id_caja);
      return res.data.id_caja;
    }
    return null;
  } catch {
    return null;
  }
};

export const NuevaGuiaCompaniaForm = ({ initialData, onSubmit, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Opciones de Selects
  const [companias, setCompanias] = useState([]);
  const [destinos, setDestinos] = useState([]);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    numero_guia: '',
    compania_id: '',
    id_destino: '',
    porcentaje_comision: '',
    valor_neto: '',
    valor_comision: '',
    identificacion_cliente: '',
    nombre_cliente: '',
    monto_cobro: '',
    id_forma_pago: '1', // Efectivo por defecto
    detalle_pago: '',
    observacion_comprobante: '',
  });

  const [clienteBuscando, setClienteBuscando] = useState(false);
  const effectRan = useRef(false);

  useEffect(() => {
    if (!effectRan.current) {
      cargarCombos();
      effectRan.current = true;
    }
  }, []);

  const cargarCombos = async () => {
    try {
      // Cargar Compañías (Convenios)
      const resCompanias = await api.get('/companiaasociada/companiaasociadaSeleccionPaginadoCombo');
      if (resCompanias.data?.data) {
        setCompanias(resCompanias.data.data);
      }

      // Cargar Destinos (activos)
      const resDestinos = await api.get('/destino/destinoSeleccionCombo');
      if (resDestinos.data?.data) {
        setDestinos(resDestinos.data.data);
      }
    } catch (error) {
      console.error("Error al cargar combos:", error);
      toast.error("Error al cargar datos iniciales");
    }
  };

  const handleCompaniaChange = (e) => {
    const companiaId = e.target.value;
    const compania = companias.find(c => String(c.id_compania_asociada) === String(companiaId));
    
    let porcentaje = '';
    if (compania && compania.porcentaje_comision) {
      porcentaje = parseFloat(compania.porcentaje_comision).toString();
    } else if (compania) {
      toast.error('Esta compañía no tiene un porcentaje de comisión asignado');
    }

    setFormData(prev => {
      const newForm = { ...prev, compania_id: companiaId, porcentaje_comision: porcentaje };
      // Recalcular comisión si hay valor neto
      if (newForm.valor_neto && porcentaje) {
        newForm.valor_comision = ((parseFloat(newForm.valor_neto) * parseFloat(porcentaje)) / 100).toFixed(2);
        newForm.monto_cobro = newForm.valor_comision;
      } else {
        newForm.valor_comision = '';
        newForm.monto_cobro = '';
      }
      return newForm;
    });
  };

  const handleValorNetoChange = (e) => {
    const valorNeto = e.target.value;
    setFormData(prev => {
      const newForm = { ...prev, valor_neto: valorNeto };
      if (valorNeto && prev.porcentaje_comision) {
        newForm.valor_comision = ((parseFloat(valorNeto) * parseFloat(prev.porcentaje_comision)) / 100).toFixed(2);
        newForm.monto_cobro = newForm.valor_comision;
      } else {
        newForm.valor_comision = '';
        newForm.monto_cobro = '';
      }
      return newForm;
    });
  };

  const buscarClientePorIdentificacion = async (identificacion) => {
    if (!identificacion) return;
    setClienteBuscando(true);
    try {
      const res = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: identificacion }
      });
      if (res.data?.data && res.data.data.length > 0) {
        const cliente = res.data.data[0];
        setFormData(prev => ({
          ...prev,
          nombre_cliente: cliente.nombre_cliente || ''
        }));
        toast.success("Cliente encontrado");
      } else {
        toast.error("Cliente no encontrado, por favor escriba el nombre");
        setFormData(prev => ({ ...prev, nombre_cliente: '' }));
      }
    } catch (error) {
      toast.error("Error al buscar cliente");
    } finally {
      setClienteBuscando(false);
    }
  };

  const handleIdentificacionKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Enter') e.preventDefault();
      buscarClientePorIdentificacion(formData.identificacion_cliente);
    }
  };

  const mostrarError = (msg) => {
    setErrorMsg(msg);
    toast.error(msg);
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (!formData.numero_guia || !formData.compania_id || !formData.id_destino || !formData.valor_neto || !formData.identificacion_cliente || !formData.nombre_cliente) {
      mostrarError("Por favor complete todos los campos obligatorios (*)");
      return;
    }
    if (!formData.valor_comision || parseFloat(formData.valor_comision) <= 0) {
      mostrarError("La comisión debe ser mayor a 0");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    // Validaciones Paso 2
    if (!formData.monto_cobro || !formData.id_forma_pago) {
      mostrarError("Complete los datos de cobro");
      return;
    }

    // Validar que haya una caja abierta antes de enviar
    const cajaId = await validarCajaAbierta();
    if (!cajaId) {
      mostrarError('No tiene una caja abierta. Debe aperturar una caja primero.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        id_caja_global: cajaId,
        fecha_procesamiento: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      const res = await api.post('/guias_companias/crear', payload);
      
      if (res.data?.success) {
        toast.success("Guía Compañía creada correctamente");
        if (onSubmit) onSubmit();
      } else {
        mostrarError(res.data?.error || res.data?.msg || "Error al crear la guía");
      }
    } catch (error) {
      mostrarError(error.response?.data?.error || error.response?.data?.msg || "Error de comunicación con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Wizard Header */}
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex space-x-4">
          <div className={`flex items-center ${step === 1 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step === 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>1</div>
            Info de la Guía
          </div>
          <div className="w-12 h-px bg-gray-300 my-auto"></div>
          <div className={`flex items-center ${step === 2 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step === 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>2</div>
            Información del Cobro
          </div>
        </div>
      </div>

      {/* Mensaje de error visible en el formulario */}
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
          <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
          <div>
            <p className="text-sm font-bold text-red-700">Error</p>
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2">
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº Guía *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 uppercase"
                  value={formData.numero_guia}
                  onChange={e => setFormData({ ...formData, numero_guia: e.target.value.toUpperCase() })}
                  placeholder="001-001-000000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compañía *</label>
                <select
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  value={formData.compania_id}
                  onChange={handleCompaniaChange}
                >
                  <option value="">Seleccionar...</option>
                  {companias.map(c => (
                    <option key={c.id_compania_asociada} value={c.id_compania_asociada}>{c.nombre_compania_asociada}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <select
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  value={formData.id_destino}
                  onChange={e => setFormData({ ...formData, id_destino: e.target.value })}
                >
                  <option value="">Seleccionar destino...</option>
                  {destinos.map(d => (
                    <option key={d.id_destino} value={d.id_destino}>{d.lugar_destino}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-4 border-b pb-2">Valores</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje Comisión (%)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-gray-100"
                    value={formData.porcentaje_comision}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Neto ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 font-bold"
                    value={formData.valor_neto}
                    onChange={handleValorNetoChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center flex flex-col justify-center">
                  <span className="text-xs text-green-700 font-bold uppercase">Comisión a Cobrar</span>
                  <span className="text-2xl font-black text-green-600">
                    ${formData.valor_comision || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula / RUC Cliente *</label>
                <div className="flex">
                  <input
                    type="text"
                    className="w-full p-2 border rounded-l focus:ring-blue-500 focus:border-blue-500"
                    value={formData.identificacion_cliente}
                    onChange={e => setFormData({ ...formData, identificacion_cliente: e.target.value })}
                    onKeyDown={handleIdentificacionKeyDown}
                    placeholder="Presione Enter para buscar"
                  />
                  <button 
                    type="button"
                    onClick={() => buscarClientePorIdentificacion(formData.identificacion_cliente)}
                    disabled={clienteBuscando}
                    className="bg-slate-200 px-3 border border-l-0 rounded-r text-slate-600 hover:bg-slate-300"
                  >
                    <i className={`fas ${clienteBuscando ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social Cliente *</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 uppercase"
                  value={formData.nombre_cliente}
                  onChange={e => setFormData({ ...formData, nombre_cliente: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center mb-6">
              <p className="text-blue-800 text-sm font-medium">TOTAL A COBRAR POR COMISIÓN</p>
              <p className="text-4xl font-black text-blue-600">${formData.monto_cobro}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago *</label>
                <select
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  value={formData.id_forma_pago}
                  onChange={e => setFormData({ ...formData, id_forma_pago: e.target.value })}
                >
                  <option value="1">Efectivo</option>
                  <option value="2">Transferencia / Depósito</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº Comprobante / Detalle</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 uppercase"
                  value={formData.detalle_pago}
                  onChange={e => setFormData({ ...formData, detalle_pago: e.target.value.toUpperCase() })}
                  disabled={formData.id_forma_pago === '1'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 uppercase"
                  rows="3"
                  value={formData.observacion_comprobante}
                  onChange={e => setFormData({ ...formData, observacion_comprobante: e.target.value.toUpperCase() })}
                ></textarea>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        {step === 1 ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setErrorMsg(''); setStep(1); }}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Atrás
          </button>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            Siguiente <i className="fas fa-chevron-right ml-2"></i>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
            Crear Guía Compañía
          </button>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../config/axios';
import { useAuth } from '../../hooks/useAuth';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getSistemaModo, setSistemaModoCache } from '../../services/sistema.service';

const inputClass = "w-full pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all";
const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

export const ConfiguracionPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState({});
  const [formasPago, setFormasPago] = useState([]);
  const [sistemaModo, setSistemaModo] = useState('prueba');
  const [savingModo, setSavingModo] = useState(false);

  const { register, handleSubmit } = useForm({
    values: configData,
    resetOptions: { keepDirtyValues: true }
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const fpRes = await api.get('/formapago/formapagoSeleccionPaginadoCombo');
        setFormasPago(fpRes.data?.data || []);

        const response = await api.get('/configuracion/configuracionSeleccion');
        if (response.data && response.data.data && response.data.data.length > 0) {
          const conf = response.data.data[0];
          setConfigData({
            formapago: conf.id_forma_pago_configuracion || '',
            numero_factura: conf.numero_factura || '',
            numero_version: conf.version_sistema || '',
            tipo_tarifa_configuracion: String(conf.tipo_tarifa_configuracion || '1'),
            leyenda: conf.leyendamensaje_configuracion || '',
            maneja_leyenda: conf.mensajeleyenda_configuracion === 1 || conf.mensajeleyenda_configuracion === true,
            leyenda_boleteria: conf.leyenda_boleteria || '',
            maneja_leyenda_boleteria: conf.mostrar_leyenda_boleteria === 1 || conf.mostrar_leyenda_boleteria === true,

            id_empresa: conf.id_empresa || '',
            razon_social_empresa: conf.razon_social_empresa || '',
            nombre_comercial_empresa: conf.nombre_comercial_empresa || '',
            ruc_empresa: conf.ruc_empresa || '',
            direccion_empresa: conf.direccion_empresa || '',
            telefono_empresa: conf.telefono_empresa || '',
            correo_empresa: conf.correo_empresa || '',

            password_p12: '',
            ambiente_sri: String(conf.ambiente_sri || '1'),
            regimen_fiscal: String(conf.regimen_fiscal || '1'),
            obligado_contabilidad: conf.obligado_contabilidad || 'SI',
            contribuyente_especial: conf.contribuyente_especial || '',
            leyenda_sri: conf.leyenda_sri || '',
            dir_matriz_empresa: conf.dir_matriz_empresa || conf.direccion_empresa || '',
            dir_establecimiento_empresa: conf.dir_establecimiento_empresa || '',
            autorizar_factura_sri: conf.autorizar_factura_sri === 1 || conf.autorizar_factura_sri === true,
            autorizar_boleto_sri: conf.autorizar_boleto_sri === 1 || conf.autorizar_boleto_sri === true,
          });
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();

    getSistemaModo().then(modo => {
      setSistemaModo(modo);
    });
  }, []);

  const esProduccion = sistemaModo === 'produccion';

  const handleModoChange = async (nuevoModo) => {
    if (nuevoModo === sistemaModo || esProduccion) return;

    const result = await Swal.fire({
      title: '¿Cambiar a Producción?',
      html: `
        <div style="text-align: left; font-size: 13px;">
          <p style="margin-bottom: 12px; font-weight: 600; color: #dc2626;">
            ⚠️ Esta acción eliminará TODOS los datos transaccionales:
          </p>
          <ul style="list-style: none; padding: 0; margin: 0 0 12px 0; line-height: 1.8;">
            <li>• Guías, detalle de guías, guías entregadas</li>
            <li>• Boletos, detalle de boletos, reservas</li>
            <li>• Facturas y detalle de facturas</li>
            <li>• Cajas (principal, boletería, retenciones)</li>
            <li>• Comprobantes de cobro</li>
            <li>• Viajes, itinerarios</li>
            <li>• Despachos</li>
            <li>• Cobros, seguimientos</li>
            <li>• Inventario y movimientos</li>
          </ul>
          <p style="color: #991b1b; font-weight: 600;">Los datos maestros (usuarios, buses, rutas, clientes, etc.) NO se eliminarán.</p>
          <p style="margin-top: 12px; color: #64748b;">Esta operación no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar a Producción',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const confirm2 = await Swal.fire({
      title: '¿Estás completamente seguro?',
      text: 'Escribe "PRODUCCION" para confirmar',
      input: 'text',
      inputPlaceholder: 'Escribe PRODUCCION',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      preConfirm: (value) => {
        if (value !== 'PRODUCCION') {
          Swal.showValidationMessage('Debes escribir PRODUCCION para confirmar');
        }
      }
    });
    if (!confirm2.isConfirmed) return;

    setSavingModo(true);
    try {
      const res = await api.post('/sistema/modo', { modo: nuevoModo });
      if (res.data?.success) {
        setSistemaModo(nuevoModo);
        setSistemaModoCache(nuevoModo);
        toast.success(res.data.message || 'Modo actualizado correctamente');
      } else {
        toast.error(res.data?.message || 'Error al cambiar el modo');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error de conexión con el servidor');
    } finally {
      setSavingModo(false);
    }
  };

  const handleSave = async (data) => {
    try {
      const payload = {
        ...data,
        maneja_leyenda: data.maneja_leyenda ? 1 : 0,
        maneja_leyenda_boleteria: data.maneja_leyenda_boleteria ? 1 : 0,
        autorizar_factura_sri: data.autorizar_factura_sri ? 1 : 0,
        autorizar_boleto_sri: data.autorizar_boleto_sri ? 1 : 0,
        dir_matriz_empresa: data.dir_matriz_empresa || data.direccion_empresa,
      };
      const response = await api.post('/configuracion/Actualizarconfiguracion', payload);
      if (response.data && response.data.success) {
        toast.success('Configuración guardada correctamente');
        // Actualizar sessionStorage para el header
        const stored = sessionStorage.getItem('empresa_data');
        if (stored) {
          const emp = JSON.parse(stored);
          emp.nombre = data.razon_social_empresa || data.nombre_comercial_empresa || emp.nombre;
          sessionStorage.setItem('empresa_data', JSON.stringify(emp));
        }
      } else {
        toast.error(response.data?.mensaje || 'Ocurrió un error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error de conexión al guardar');
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
          <span className="text-slate-500 font-medium">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-32">

      {/* Cabecera */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-slate-800 text-white rounded-xl flex items-center justify-center text-xl shadow-sm">
            <i className="fas fa-cog"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Configuración del Sistema</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Parámetros globales, datos de la empresa y facturación electrónica
            </p>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('general')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors ${
                activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              <i className="fas fa-sliders-h text-lg"></i> General
            </button>
            <button onClick={() => setActiveTab('empresa')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors ${
                activeTab === 'empresa' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              <i className="fas fa-building text-lg"></i> Empresa
            </button>
          </nav>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6">

            {/* ════ TAB GENERAL ════ */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fas fa-cog text-blue-500 mr-2"></i>Sistema
                  </h2>
                  <div>
                    <label className={labelClass}>Forma de Pago</label>
                    <select {...register('formapago')} className={inputClass}>
                      <option value="">Seleccionar...</option>
                      {formasPago.map(fp => (
                        <option key={fp.id_forma_pago} value={fp.id_forma_pago}>{fp.nombre_formapago}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}># Factura</label>
                    <input type="text" {...register('numero_factura')} className={inputClass} placeholder="Solo números" />
                  </div>
                  <div>
                    <label className={labelClass}>Versión</label>
                    <input type="text" {...register('numero_version')} className={inputClass} placeholder="Ej: 1.0.0" />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo Tarifa</label>
                    <select {...register('tipo_tarifa_configuracion')} className={inputClass}>
                      <option value="1">TODOS</option>
                      <option value="0">TARIFA NORMAL</option>
                    </select>
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">
                      <i className="fas fa-toggle-on text-amber-600 mr-2"></i>Estado del Sistema
                    </h3>
                    <div className="flex items-center gap-3">
                      <select
                        value={sistemaModo}
                        onChange={(e) => handleModoChange(e.target.value)}
                        disabled={savingModo || esProduccion || user?.rol_usuario !== 5}
                        className="w-full max-w-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="prueba">🔧 Modo Prueba</option>
                        <option value="produccion">🚀 Producción</option>
                      </select>
                      {savingModo && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          Guardando...
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        sistemaModo === 'prueba'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sistemaModo === 'prueba' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                        {sistemaModo === 'prueba' ? 'Los datos son de prueba' : 'Irreversible — No se puede regresar a pruebas'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fas fa-file-alt text-blue-500 mr-2"></i>Leyendas
                  </h2>
                  <div>
                    <label className={labelClass}>Leyenda App</label>
                    <textarea {...register('leyenda')} rows="2" className={inputClass} placeholder="Texto en la app..."></textarea>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('maneja_leyenda')} id="maneja_leyenda" className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500" />
                    <label htmlFor="maneja_leyenda" className="text-sm font-semibold text-slate-700 cursor-pointer">Mostrar en App</label>
                  </div>
                  <div>
                    <label className={labelClass}>Leyenda Boletos</label>
                    <textarea {...register('leyenda_boleteria')} rows="2" className={inputClass} placeholder="Texto en boletos..."></textarea>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('maneja_leyenda_boleteria')} id="maneja_leyenda_boleteria" className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500" />
                    <label htmlFor="maneja_leyenda_boleteria" className="text-sm font-semibold text-slate-700 cursor-pointer">Mostrar en Boletos</label>
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB EMPRESA (unificado) ════ */}
            {activeTab === 'empresa' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Col 1: Datos principales */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fas fa-info-circle text-emerald-500 mr-2"></i>Información General
                  </h2>
                  <div>
                    <label className={labelClass}>Razón Social</label>
                    <input type="text" {...register('razon_social_empresa')} className={inputClass} placeholder="Nombre legal de la empresa" />
                  </div>
                  <div>
                    <label className={labelClass}>Nombre Comercial</label>
                    <input type="text" {...register('nombre_comercial_empresa')} className={inputClass} placeholder="Si está vacío se usa Razón Social" />
                  </div>
                  <div>
                    <label className={labelClass}>RUC</label>
                    <input type="text" {...register('ruc_empresa')} className={inputClass} placeholder="Ej: 0190155722001" />
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input type="text" {...register('direccion_empresa')} className={inputClass} placeholder="Dirección fiscal completa" />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input type="text" {...register('telefono_empresa')} className={inputClass} placeholder="Ej: 0987654321" />
                  </div>
                  <div>
                    <label className={labelClass}>Correo</label>
                    <input type="email" {...register('correo_empresa')} className={inputClass} placeholder="correo@empresa.com" />
                  </div>
                </div>

                {/* Col 2: SRI + Archivos */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fas fa-file-invoice-dollar text-emerald-500 mr-2"></i>Facturación SRI
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Dir. Matriz</label>
                      <input type="text" {...register('dir_matriz_empresa')} className={inputClass} placeholder="Matriz" />
                    </div>
                    <div>
                      <label className={labelClass}>Dir. Establecimiento</label>
                      <input type="text" {...register('dir_establecimiento_empresa')} className={inputClass} placeholder="Sucursal" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Régimen Fiscal</label>
                      <select {...register('regimen_fiscal')} className={inputClass}>
                        <option value="1">Régimen General</option>
                        <option value="2">RIMPE — Emprendedor</option>
                        <option value="3">RIMPE — Popular</option>
                        <option value="4">Régimen Microempresa</option>
                        <option value="5">RISE — Simplificado</option>
                        <option value="6">Régimen Agropecuario</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Obligado Contab.</label>
                      <select {...register('obligado_contabilidad')} className={inputClass}>
                        <option value="SI">SÍ</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Contribuyente Especial</label>
                    <input type="text" {...register('contribuyente_especial')} className={inputClass} placeholder="N° Resolución" />
                  </div>
                  <div>
                    <label className={labelClass}>Leyenda SRI</label>
                    <textarea {...register('leyenda_sri')} rows="2" className={inputClass} placeholder="Ej: Contribuyente Especial" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Ambiente SRI</label>
                      <select {...register('ambiente_sri')} className={inputClass}>
                        <option value="1">Pruebas</option>
                        <option value="2">Producción</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Password P12</label>
                      <input type="password" {...register('password_p12')} className={inputClass} placeholder="Certificado" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className={labelClass}>Autorización Automática SRI</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('autorizar_factura_sri')} id="autorizar_factura_sri" className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" />
                        <label htmlFor="autorizar_factura_sri" className="text-sm font-semibold text-slate-700 cursor-pointer">Autorizar Guías (Facturas) al guardar</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('autorizar_boleto_sri')} id="autorizar_boleto_sri" className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" />
                        <label htmlFor="autorizar_boleto_sri" className="text-sm font-semibold text-slate-700 cursor-pointer">Autorizar Boletos al guardar</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end pt-6 border-t border-slate-200 mt-8">
              <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md shadow-slate-200 hover:bg-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <i className="fas fa-save"></i> Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
};
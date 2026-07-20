import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { api, clienteApi } from '../../config/axios';
import { useAuth } from '../../hooks/useAuth';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getSistemaModo, setSistemaModoCache } from '../../services/sistema.service';
import { WhatsAppTestForm } from './components/WhatsAppTestForm';
import { CONFIG } from '../../config/env';

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
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [firmaFile, setFirmaFile] = useState(null);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [rucDesbloqueado, setRucDesbloqueado] = useState(false);
  const [rucTieneDatos, setRucTieneDatos] = useState(false);
  const fileInputRef = useRef(null);
  const firmaInputRef = useRef(null);

  const { register, handleSubmit, setValue, getValues } = useForm({
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
            leyenda_nota_venta: conf.leyenda_nota_venta || '',
            maneja_leyenda_nota_venta: conf.mostrar_leyenda_nota_venta === 1 || conf.mostrar_leyenda_nota_venta === true,

            id_empresa: conf.id_empresa || '',
            razon_social_empresa: conf.razon_social_empresa || '',
            nombre_comercial_empresa: conf.nombre_comercial_empresa || '',
            ruc_empresa: conf.ruc_empresa || '',
            direccion_empresa: conf.direccion_empresa || '',
            telefono_empresa: conf.telefono_empresa || '',
            correo_empresa: conf.correo_empresa || '',
            imagen_empresa: conf.imagen_empresa || null,

            password_p12: '',
            ambiente_sri: String(conf.ambiente_sri || '1'),
            regimen_fiscal: String(conf.regimen_fiscal || '1'),
            obligado_contabilidad: conf.obligado_contabilidad || 'SI',
            contribuyente_especial: conf.contribuyente_especial || '',
            leyenda_sri: conf.leyenda_sri || '',
            dir_matriz_empresa: conf.dir_matriz_empresa || conf.direccion_empresa || '',
            dir_establecimiento_empresa: conf.dir_establecimiento_empresa || '',
            actividad_economica_empresa: conf.actividad_economica_empresa || '',
            autorizar_factura_sri: conf.autorizar_factura_sri === 1 || conf.autorizar_factura_sri === true,
            autorizar_boleto_sri: conf.autorizar_boleto_sri === 1 || conf.autorizar_boleto_sri === true,
            enviar_whatsapp: conf.enviar_whatsapp === 1 || conf.enviar_whatsapp === true,
            cobrar_iva_guia: conf.cobrar_iva_guia === 1 || conf.cobrar_iva_guia === true,
            imprimir_boucher_guia: conf.imprimir_boucher_guia === 1 || conf.imprimir_boucher_guia === true,
          });
          setRucTieneDatos(!!conf.ruc_empresa);
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

  useEffect(() => {
    if (configData.imagen_empresa) {
      setLogoPreview(`data:image/png;base64,${configData.imagen_empresa}`);
    }
  }, [configData.imagen_empresa]);

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
      let finalFirmaPath = null;
      let finalPassword = data.password_p12;

      // 1. Upload Firma if selected
      if (firmaFile) {
        const formData = new FormData();
        formData.append('firma', firmaFile);
        formData.append('ruc_empresa', data.ruc_empresa || 'DEFAULT_RUC');

        try {
          const resFirma = await fetch(CONFIG.API_FIRMA + '/subir-firma', {
            method: 'POST',
            body: formData
          });
          const firmaResult = await resFirma.json();
          if (firmaResult.success) {
            finalFirmaPath = firmaResult.path;
          } else {
            toast.error('Error al subir firma: ' + (firmaResult.message || firmaResult.error || ''));
            return;
          }
        } catch (e) {
          console.error(e);
          toast.error('Error al conectar con el servicio de firmas');
          return;
        }
      }

      // 2. Encrypt password if provided
      if (finalPassword && finalPassword.trim() !== '') {
        try {
          // fetch direct to avoid api interceptor messing with content-type for non-backend url
          const resClave = await fetch(CONFIG.API_FIRMA + '/encrypt-clave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: finalPassword })
          });
          const claveResult = await resClave.json();
          if (claveResult && claveResult.clave_encriptada) {
            finalPassword = claveResult.clave_encriptada;
          }
        } catch (e) {
          console.error('Error encrypting password', e);
        }
      } else {
        delete data.password_p12;
        finalPassword = undefined;
      }

      const payload = {
        ...data,
        maneja_leyenda: data.maneja_leyenda ? 1 : 0,
        maneja_leyenda_boleteria: data.maneja_leyenda_boleteria ? 1 : 0,
        maneja_leyenda_nota_venta: data.maneja_leyenda_nota_venta ? 1 : 0,
        autorizar_factura_sri: data.autorizar_factura_sri ? 1 : 0,
        autorizar_boleto_sri: data.autorizar_boleto_sri ? 1 : 0,
        enviar_whatsapp: data.enviar_whatsapp ? 1 : 0,
        cobrar_iva_guia: data.cobrar_iva_guia ? 1 : 0,
        imprimir_boucher_guia: data.imprimir_boucher_guia ? 1 : 0,
        dir_matriz_empresa: data.dir_matriz_empresa || data.direccion_empresa,
      };

      if (finalFirmaPath) payload.firma_empresa = finalFirmaPath;
      if (finalPassword !== undefined) payload.password_p12 = finalPassword;

      const response = await api.post('/configuracion/Actualizarconfiguracion', payload);
      if (response.data && response.data.success) {
        // Si hay un nuevo logo, subirlo al endpoint de empresa
        if (logoFile) {
          const logoReader = new FileReader();
          const logoBase64 = await new Promise((resolve) => {
            logoReader.onload = (e) => resolve(e.target.result);
            logoReader.readAsDataURL(logoFile);
          });
          await api.post('/empresa/empresaActualizar', {
            imagen_empresa: logoBase64,
          });
          setLogoFile(null);
        }

        toast.success('Configuración guardada correctamente');
        // Actualizar sessionStorage para el header
        const stored = sessionStorage.getItem('empresa_data');
        if (stored) {
          const emp = JSON.parse(stored);
          emp.nombre = data.razon_social_empresa || data.nombre_comercial_empresa || emp.nombre;
          emp.cobrar_iva_guia = data.cobrar_iva_guia ? 1 : 0;
          if (logoPreview) {
            emp.imagen = logoPreview.replace('data:image/png;base64,', '').replace('data:image/jpeg;base64,', '');
          }
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

  // ── Búsqueda de RUC en API de clientes ──────────────────────
  const handleSearchRuc = useCallback(async () => {
    const ruc = getValues('ruc_empresa')?.trim();
    if (!ruc || ruc.length < 10) {
      toast.error('Ingrese un RUC/Cédula válido (mínimo 10 dígitos)');
      return;
    }
    setBuscandoRuc(true);
    try {
      const response = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: ruc }
      });
      const result = response.data;
      if (result.success && result.total > 0 && result.data?.length > 0) {
        const c = result.data[0];

        setValue('razon_social_empresa', c.razon_social || c.nombre_cliente || '');
        setValue('nombre_comercial_empresa', c.nombre_comercial || '');
        setValue('direccion_empresa', c.direccion_cliente || '');
        setValue('telefono_empresa', c.telefono_cliente || '');
        setValue('correo_empresa', c.email_cliente || '');
        setValue('dir_matriz_empresa', c.direccion_cliente || '');

        setValue('actividad_economica_empresa', c.actividad_economica || '');

        // Régimen fiscal (texto del SRI → número del select)
        if (c.regimen) {
          const regimenMap = {
            'GENERAL': '1',
            'RIMPE EMPRENDEDOR': '2',
            'RIMPE POPULAR': '3',
            'MICROEMPRESA': '4',
            'RISE': '5',
            'AGROPECUARIO': '6'
          };
          const key = c.regimen.toUpperCase().trim();
          setValue('regimen_fiscal', regimenMap[key] || '1');
        }

        // Datos SRI
        if (c.obligado_contabilidad) {
          setValue('obligado_contabilidad', c.obligado_contabilidad === 'SI' ? 'SI' : 'NO');
        }
        if (c.agente_retencion) {
          setValue('contribuyente_especial', c.agente_retencion);
        }
        if (c.estado_contribuyente || c.tipo_contribuyente) {
          const leyenda = [c.estado_contribuyente, c.tipo_contribuyente].filter(Boolean).join(' — ');
          setValue('leyenda_sri', leyenda);
        }

        // Bloquear para evitar sobreescritura accidental
        setRucTieneDatos(true);
        setRucDesbloqueado(false);

        toast.success(`Datos cargados: ${c.razon_social || c.nombre_cliente}`);
      } else {
        toast.error('No se encontraron datos para ese RUC');
      }
    } catch (err) {
      console.error('Error buscando RUC:', err);
      toast.error('Error al consultar RUC: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setBuscandoRuc(false);
    }
  }, [setValue, getValues]);

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
            <button onClick={() => setActiveTab('whatsapp')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors ${
                activeTab === 'whatsapp' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              <i className="fab fa-whatsapp text-lg"></i> WhatsApp
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
                    <label className={labelClass}>Leyenda Guías</label>
                    <textarea {...register('leyenda')} rows="2" className={inputClass} placeholder="Texto en las guías de transporte..."></textarea>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('maneja_leyenda')} id="maneja_leyenda" className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500" />
                    <label htmlFor="maneja_leyenda" className="text-sm font-semibold text-slate-700 cursor-pointer">Mostrar en Guías</label>
                  </div>
                  <div>
                    <label className={labelClass}>Leyenda Guías Nota de Venta</label>
                    <textarea {...register('leyenda_nota_venta')} rows="2" className={inputClass} placeholder="Texto en las guías de nota de venta..."></textarea>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('maneja_leyenda_nota_venta')} id="maneja_leyenda_nota_venta" className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500" />
                    <label htmlFor="maneja_leyenda_nota_venta" className="text-sm font-semibold text-slate-700 cursor-pointer">Mostrar en Guías Nota de Venta</label>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <input type="checkbox" {...register('imprimir_boucher_guia')} id="imprimir_boucher_guia" className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500" />
                    <label htmlFor="imprimir_boucher_guia" className="text-sm font-bold text-slate-700 cursor-pointer">Imprimir Hojas Extras (Boucher Guía)</label>
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

                  {/* RUC con buscador - ARRIBA DE TODO */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 -mx-1">
                    <label className={labelClass}>
                      RUC / Cédula
                      <span className="text-[10px] font-normal text-slate-400 ml-2">
                        (Busca y llena datos automáticamente)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={15}
                          {...register('ruc_empresa')}
                          className={inputClass + ' pr-8 ' + (rucTieneDatos && !rucDesbloqueado ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : '')}
                          placeholder="Ej: 0190155722001"
                          readOnly={rucTieneDatos && !rucDesbloqueado}
                          onCopy={rucTieneDatos && !rucDesbloqueado ? (e) => e.preventDefault() : undefined}
                        />
                        {rucTieneDatos && !rucDesbloqueado && (
                          <i className="fas fa-lock absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm"></i>
                        )}
                      </div>

                      {rucTieneDatos && !rucDesbloqueado ? (
                        <button
                          type="button"
                          onClick={() => setRucDesbloqueado(true)}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                          title="Habilitar búsqueda para actualizar datos"
                        >
                          <i className="fas fa-unlock-alt"></i>
                          <span className="hidden sm:inline">Desbloquear</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSearchRuc}
                          disabled={buscandoRuc}
                          className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                          title="Buscar datos de la empresa por RUC"
                        >
                          {buscandoRuc ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <><i className="fas fa-search"></i><span className="hidden sm:inline">Buscar</span></>
                          )}
                        </button>
                      )}
                    </div>
                    {rucTieneDatos && !rucDesbloqueado && (
                      <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                        <i className="fas fa-check-circle"></i>
                        Datos cargados. Presiona "Desbloquear" para buscar de nuevo.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Razón Social</label>
                    <input type="text" {...register('razon_social_empresa')} className={inputClass} placeholder="Nombre legal de la empresa" />
                  </div>
                  <div>
                    <label className={labelClass}>Nombre Comercial</label>
                    <input type="text" {...register('nombre_comercial_empresa')} className={inputClass} placeholder="Si está vacío se usa Razón Social" />
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
                  <div>
                    <label className={labelClass}>Actividad Económica</label>
                    <input type="text" {...register('actividad_economica_empresa')} className={inputClass + ' bg-slate-100 text-slate-600'} placeholder="Se carga automáticamente del SRI" readOnly />
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
                      <input type="password" {...register('password_p12')} className={inputClass} placeholder="Dejar en blanco si no cambia" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Firma (.p12 / .pfx)</label>
                    <input
                      ref={firmaInputRef}
                      type="file"
                      accept=".p12,.pfx"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setFirmaFile(file);
                        else setFirmaFile(null);
                      }}
                    />
                    {configData.password_p12 !== undefined && (
                      <p className="text-xs text-slate-400 mt-1">Ya existe una firma cargada. Sube una nueva para reemplazarla.</p>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                      <i className="fas fa-image text-emerald-500 mr-2"></i>Logo de la Empresa
                    </h2>
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain border border-slate-200 rounded-lg p-1 bg-white" />
                        ) : (
                          <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
                            <i className="fas fa-image text-3xl"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className={labelClass}>Seleccionar archivo</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setLogoFile(file);
                              const reader = new FileReader();
                              reader.onload = (evt) => setLogoPreview(evt.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <p className="text-xs text-slate-400">Formatos: PNG, JPG. Se redimensionará automáticamente.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className={labelClass}>Autorización Automática SRI</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('autorizar_factura_sri')} id="autorizar_factura_sri" className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" />
                        <label htmlFor="autorizar_factura_sri" className="text-sm font-semibold text-slate-700 cursor-pointer">Autorizar Guías al guardar</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('autorizar_boleto_sri')} id="autorizar_boleto_sri" className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" />
                        <label htmlFor="autorizar_boleto_sri" className="text-sm font-semibold text-slate-700 cursor-pointer">Autorizar Boletos al guardar</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className={labelClass}>IVA en Guías</label>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...register('cobrar_iva_guia')} className="sr-only peer" />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Cobrar IVA en Guías</p>
                        <p className="text-xs text-slate-400">Cuando está desactivado, el IVA se fuerza a 0 en todas las guías</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB WHATSAPP ════ */}
            {activeTab === 'whatsapp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fab fa-whatsapp text-green-500 mr-2"></i>Configuración de WhatsApp
                  </h2>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${configData?.enviar_whatsapp === false ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          <i className={`fab fa-whatsapp text-2xl`}></i>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800 mb-1">
                            Envío Automático de WhatsApp
                          </h3>
                          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                            Activa o desactiva el envío automático de notificaciones de guías, notas de venta y boletos a los clientes.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input type="checkbox" {...register('enviar_whatsapp')} className="sr-only peer" />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </div>

                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-8">
                    <i className="fas fa-paper-plane text-slate-500 mr-2"></i>Enviar Mensaje de Prueba
                  </h2>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 mb-4">
                    <i className="fas fa-info-circle mr-2"></i>
                    El servidor proxy envía la solicitud a <code className="text-xs bg-slate-200 px-1 py-0.5 rounded text-slate-800">https://whatsappnotif.easysplus.com/</code>
                  </div>

                  <WhatsAppTestForm />
                </div>

                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    <i className="fas fa-clock text-slate-500 mr-2"></i>Últimos Envíos
                  </h2>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-400">
                    <i className="fas fa-history text-2xl mb-2 block opacity-50"></i>
                    Los mensajes enviados aparecerán aquí durante la sesión
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
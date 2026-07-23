import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { api, clienteApi } from '../../../config/axios';
import toast from 'react-hot-toast';

const SocioForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [eliminarFoto, setEliminarFoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const blobUrlRef = useRef(null);

  const revokeBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => revokeBlobUrl();
  }, []);

  useEffect(() => {
    if (isEditing && initialData.ruta_imagen_personal && initialData.id_personal) {
      loadPhoto(initialData.id_personal);
    }
  }, []);

  const loadPhoto = async (id) => {
    setLoadingPhoto(true);
    try {
      const response = await api.get(`/personal/foto/${id}`, { responseType: 'blob' });
      revokeBlobUrl();
      const url = URL.createObjectURL(response.data);
      blobUrlRef.current = url;
      setPhotoPreview(url);
    } catch (err) {
      setPhotoPreview(null);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const setPhotoPreviewWithCleanup = (url) => {
    revokeBlobUrl();
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      blobUrlRef.current = url;
    }
    setPhotoPreview(url);
  };

  const initialProfiles = isEditing && initialData.perfil_personal
    ? String(initialData.perfil_personal).split(',').map(p => p.trim())
    : [];
  const [selectedProfiles, setSelectedProfiles] = useState(initialProfiles);

  const handleProfileChange = (e) => {
    const val = e.target.value;
    if (e.target.checked) {
      setSelectedProfiles(prev => [...prev, val]);
    } else {
      setSelectedProfiles(prev => prev.filter(p => p !== val));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPhotoPreviewWithCleanup(URL.createObjectURL(file));
      setEliminarFoto(false);
      setPhotoError('');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreviewWithCleanup(null);
    setEliminarFoto(true);
  };

  const [searchandoCliente, setSearchandoCliente] = useState(false);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      per_codigo_personal: initialData.per_codigo_personal || initialData.soc_codigo || '',
      per_cedula_personal: initialData.per_cedula_personal || initialData.soc_cedula || '',
      per_nombres_persona: initialData.per_nombres_persona || initialData.soc_nombres || '',
      per_apellidos_personal: initialData.per_apellidos_personal || initialData.soc_apellidos || '',
      genero_personal: String(initialData.genero_personal || ''),
      celular_personal: initialData.celular_personal || initialData.soc_telefono || '',
      telefono_personal: initialData.telefono_personal || '',
      fecha_nacimiento_personal: initialData.fecha_nacimiento_personal || '',
      estado_civil_personal: String(initialData.estado_civil_personal || ''),
      perfil_personal: initialData.perfil_personal || '',
      tipo_licencia: String(initialData.tipo_licencia || ''),
      puntos_licencia: initialData.puntos_licencia || '',
      nombre_apellido_emergencia: initialData.nombre_apellido_emergencia || '',
      parentesco_emergencia: initialData.parentesco_emergencia || '',
      celular_fijo_emergencia: initialData.celular_fijo_emergencia || '',
      direccion_emergencia: initialData.direccion_emergencia || '',
      estado_personal: (initialData.estado_personal ?? initialData.soc_estado ?? 1) == 1 || (initialData.estado_personal ?? initialData.soc_estado ?? 1) === '1',
      tiene_porcentaje_individual: (initialData.tiene_porcentaje_individual == 1) || false,
      porcentaje_individual: initialData.porcentaje_individual || '0.00',
    } : {
      per_codigo_personal: '',
      per_cedula_personal: '',
      per_nombres_persona: '',
      per_apellidos_personal: '',
      genero_personal: '',
      celular_personal: '',
      telefono_personal: '',
      fecha_nacimiento_personal: '',
      estado_civil_personal: '',
      perfil_personal: '',
      tipo_licencia: '',
      puntos_licencia: '',
      nombre_apellido_emergencia: '',
      parentesco_emergencia: '',
      celular_fijo_emergencia: '',
      direccion_emergencia: '',
      estado_personal: true,
      tiene_porcentaje_individual: false,
      porcentaje_individual: '0.00',
    }
  });

  // ── Búsqueda de cliente por cédula/RUC ──────────────────

  // Dividir nombre completo en nombres y apellidos (formato Ecuador: "APELLIDOS NOMBRES")
  const splitNombreCompleto = useCallback((nombreCompleto) => {
    if (!nombreCompleto) return { nombres: '', apellidos: '' };
    const parts = nombreCompleto.trim().split(/\s+/);
    if (parts.length <= 1) {
      return { nombres: nombreCompleto, apellidos: '' };
    }
    if (parts.length === 2) {
      return { nombres: parts[1], apellidos: parts[0] };
    }
    // 3+ palabras: asumir formato "APELLIDO1 APELLIDO2 NOMBRES..."
    const apellidos = parts.slice(0, 2).join(' ');
    const nombres = parts.slice(2).join(' ');
    return { nombres, apellidos };
  }, []);

  // Mapear sexo de texto a número del formulario
  const mapSexo = useCallback((sexo) => {
    if (!sexo) return '';
    const s = String(sexo).toUpperCase().trim();
    if (s === 'MASCULINO' || s === 'M' || s === 'HOMBRE' || s === '1') return '1';
    if (s === 'FEMENINO' || s === 'F' || s === 'MUJER' || s === '2') return '2';
    return '3';
  }, []);

  // Mapear estado civil de texto a número del formulario
  const mapEstadoCivil = useCallback((estado) => {
    if (!estado) return '';
    const e = String(estado).toUpperCase().trim();
    if (e.includes('SOLTER') || e === '1') return '1';
    if (e.includes('CASAD') || e === '2') return '2';
    if (e.includes('DIVORCIAD') || e === '3') return '3';
    if (e.includes('VIUD') || e === '4') return '4';
    if (e.includes('UNION') || e.includes('LIBRE') || e === '5') return '5';
    return '';
  }, []);

  // Buscar cliente por identificación en la API de clientes
  const handleSearchCliente = useCallback(async (cedulaDesdeParam) => {
    const cedula = cedulaDesdeParam || getValues('per_cedula_personal') || '';
    if (!cedula || cedula.trim().length < 10) {
      toast.error('Ingrese al menos 10 dígitos de cédula/RUC para buscar');
      return;
    }
    setSearchandoCliente(true);
    try {
      const response = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: cedula.trim() }
      });
      const result = response.data;
      if (result.success && result.total > 0 && result.data?.length > 0) {
        const c = result.data[0];
        const { nombres, apellidos } = splitNombreCompleto(c.nombre_cliente);

        setValue('per_nombres_persona', nombres);
        setValue('per_apellidos_personal', apellidos);
        setValue('celular_personal', c.telefono_cliente || '');
        setValue('genero_personal', mapSexo(c.sexo));
        setValue('estado_civil_personal', mapEstadoCivil(c.estado_civil));
        setValue('fecha_nacimiento_personal', c.fecha_nacimiento ? String(c.fecha_nacimiento).split('T')[0] : '');
        setValue('direccion_emergencia', c.direccion_cliente || '');

        toast.success(`Cliente encontrado: ${c.nombre_cliente}`, { duration: 3000 });
      } else {
        toast.error('No se encontró un cliente con esa identificación');
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
      toast.error('Error al consultar cliente: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setSearchandoCliente(false);
    }
  }, [getValues, setValue, splitNombreCompleto, mapSexo, mapEstadoCivil]);

  // Comprime y convierte un File a base64 data URI (max 300px, calidad 0.7)
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const MAX = 300;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = (height / width) * MAX; width = MAX; }
          else { width = (width / height) * MAX; height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('No se pudo cargar la imagen seleccionada')); };
      img.src = URL.createObjectURL(file);
    });

  const onFormSubmit = async (data) => {
    if (selectedProfiles.length === 0) {
      toast.error('Debe seleccionar al menos un perfil');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();

      Object.keys(data).forEach(key => {
        if (key === 'estado_personal' || key === 'tiene_porcentaje_individual') {
          formData.append(key, data[key] ? '1' : '0');
        } else if (key === 'fecha_nacimiento_personal') {
          if (data.fecha_nacimiento_personal) {
            formData.append(key, data.fecha_nacimiento_personal.split('T')[0]);
          } else {
            formData.append(key, '');
          }
        } else if (key !== 'perfil_personal') {
          formData.append(key, data[key] ?? '');
        }
      });

      if (isEditing) {
        formData.append('id_personal', initialData.id_personal || initialData.id_socio);
      }

      formData.append('perfil_personal', selectedProfiles.join(','));

      if (selectedFile) {
        // Convertir la foto a base64 para evitar problemas con FormData + archivos
        const base64Foto = await fileToBase64(selectedFile);
        formData.append('foto', base64Foto);
      } else if (eliminarFoto) {
        formData.append('eliminar_foto', '1');
      }

      const response = await api.post('/personal/insertarActualizarPersonal', formData, {
        timeout: 60000, // 60s para la subida de foto en base64
      });

      const resData = response.data;
      if (resData && (resData.tipo === 2 || resData.success === false)) {
        toast.error(resData.message || 'No se pudo guardar la información');
        return;
      }

      toast.success(resData?.message || (isEditing ? 'Socio actualizado correctamente' : 'Socio creado correctamente'));
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando socio:', err);
      toast.error('Error al guardar el socio. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";
  const sectionClass = "bg-slate-50 rounded-xl p-4 border border-slate-100";
  const sectionTitle = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">

      {/* ── Información Básica ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-id-card text-indigo-400" />Información Básica</p>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Foto de Perfil */}
          <div className="flex flex-col items-center justify-center border border-slate-200 rounded-xl p-4 bg-white min-w-[160px] self-start shadow-sm shrink-0">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Foto de Perfil</label>
            <div className={`relative group w-24 h-24 border-2 border-dashed rounded-full flex items-center justify-center overflow-hidden bg-slate-50 transition-colors ${photoError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 hover:border-indigo-400'}`}>
              {loadingPhoto ? (
                <div className="flex flex-col items-center text-slate-400">
                  <i className="fas fa-spinner fa-spin text-xl mb-1"></i>
                  <span className="text-[9px] font-black uppercase text-slate-400">Cargando...</span>
                </div>
              ) : photoPreview ? (
                <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <i className="fas fa-camera text-xl mb-1"></i>
                  <span className="text-[9px] font-black uppercase text-slate-400">Subir Foto</span>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {photoPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="mt-2.5 text-[10px] text-rose-500 hover:text-rose-600 font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <i className="fas fa-trash-alt"></i> Quitar Foto
              </button>
            )}
            {photoError && (
              <p className="mt-2 text-[10px] text-rose-500 font-bold flex items-center gap-1 text-center">
                <i className="fas fa-exclamation-circle" />{photoError}
              </p>
            )}
          </div>

          {/* Campos Básicos */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Código Personal <span className="text-rose-500">*</span></label>
              <input
                type="text"
                {...register('per_codigo_personal', {
                  required: 'El código es requerido',
                  pattern: { value: /^[0-9]+$/, message: 'Solo números' }
                })}
                className={inputClass}
                placeholder="Ej: 001"
              />
              {errors.per_codigo_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_codigo_personal.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Cédula / RUC <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={15}
                  {...register('per_cedula_personal', {
                    required: 'La cédula es requerida',
                    pattern: { value: /^[0-9]+$/, message: 'Solo números' }
                  })}
                  className={inputClass + ' flex-1'}
                  placeholder="Ej: 1800123456"
                  onBlur={(e) => {
                    if (!isEditing && e.target.value.trim().length >= 10) {
                      handleSearchCliente(e.target.value.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSearchCliente()}
                  disabled={searchandoCliente}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 shrink-0"
                  title="Buscar cliente en el sistema"
                >
                  {searchandoCliente ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <><i className="fas fa-search"></i><span className="hidden sm:inline">Buscar</span></>
                  )}
                </button>
              </div>
              {errors.per_cedula_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_cedula_personal.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Nombres <span className="text-rose-500">*</span></label>
              <input
                type="text"
                {...register('per_nombres_persona', { required: 'Los nombres son requeridos' })}
                className={inputClass}
                placeholder="Nombres completos"
              />
              {errors.per_nombres_persona && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_nombres_persona.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Apellidos <span className="text-rose-500">*</span></label>
              <input
                type="text"
                {...register('per_apellidos_personal', { required: 'Los apellidos son requeridos' })}
                className={inputClass}
                placeholder="Apellidos completos"
              />
              {errors.per_apellidos_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_apellidos_personal.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Género <span className="text-rose-500">*</span></label>
              <select
                {...register('genero_personal', { required: 'El género es requerido' })}
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                <option value="1">Masculino</option>
                <option value="2">Femenino</option>
                <option value="3">Otro</option>
              </select>
              {errors.genero_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.genero_personal.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Fecha de Nacimiento</label>
              <input
                type="date"
                {...register('fecha_nacimiento_personal')}
                className={inputClass}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Información Personal ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-phone text-emerald-400" />Contacto Personal</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <label className={labelClass}>Estado Civil</label>
            <select {...register('estado_civil_personal')} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="1">Soltero/a</option>
              <option value="2">Casado/a</option>
              <option value="3">Divorciado/a</option>
              <option value="4">Viudo/a</option>
              <option value="5">Unión Libre</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Celular <span className="text-rose-500">*</span></label>
            <input
              type="text"
              maxLength={15}
              {...register('celular_personal', {
                required: 'El celular es requerido',
                pattern: { value: /^[0-9]+$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 0998765432"
              onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
            />
            {errors.celular_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.celular_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="text"
              maxLength={15}
              {...register('telefono_personal', {
                pattern: { value: /^[0-9]*$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 032765432"
              onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
            />
            {errors.telefono_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.telefono_personal.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Contacto de Emergencia ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-exclamation-triangle text-rose-400" />Contacto de Emergencia</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Nombres y Apellidos</label>
            <input
              type="text"
              {...register('nombre_apellido_emergencia')}
              className={inputClass}
              placeholder="Nombre de contacto"
            />
          </div>

          <div>
            <label className={labelClass}>Parentesco</label>
            <input
              type="text"
              {...register('parentesco_emergencia')}
              className={inputClass}
              placeholder="Ej: Esposo/a, Hijo/a"
            />
          </div>

          <div>
            <label className={labelClass}>Celular / Teléfono</label>
            <input
              type="text"
              maxLength={15}
              {...register('celular_fijo_emergencia', {
                pattern: { value: /^[0-9]*$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 0998765432"
              onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
            />
            {errors.celular_fijo_emergencia && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.celular_fijo_emergencia.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              {...register('direccion_emergencia')}
              className={inputClass}
              placeholder="Dirección de contacto"
            />
          </div>
        </div>
      </div>

      {/* ── Información Laboral ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-briefcase text-amber-400" />Información Laboral</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <label className={labelClass}>Perfil <span className="text-rose-500">*</span></label>
            <div className="flex flex-wrap gap-4 items-center h-9">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  value="0"
                  checked={selectedProfiles.includes('0')}
                  onChange={handleProfileChange}
                  className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 bg-white cursor-pointer"
                />
                Conductor
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  value="1"
                  checked={selectedProfiles.includes('1')}
                  onChange={handleProfileChange}
                  className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 bg-white cursor-pointer"
                />
                Auxiliar
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  value="2"
                  checked={selectedProfiles.includes('2')}
                  onChange={handleProfileChange}
                  className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 bg-white cursor-pointer"
                />
                Socio
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tipo de Licencia <span className="text-rose-500">*</span></label>
            <select {...register('tipo_licencia', { required: 'El tipo de licencia es requerido' })} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="1">Tipo A</option>
              <option value="2">Tipo B</option>
              <option value="3">Tipo C</option>
              <option value="4">Tipo D</option>
              <option value="5">Tipo E</option>
            </select>
            {errors.tipo_licencia && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.tipo_licencia.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Puntos de Licencia</label>
            <input
              type="number"
              min={0}
              max={30}
              {...register('puntos_licencia')}
              className={inputClass}
              placeholder="Ej: 30"
            />
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input type="checkbox" className="sr-only peer" {...register('estado_personal')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
            </label>
          </div>

          {selectedProfiles.includes('2') && (
            <>
              <div>
                <label className={labelClass}>¿Porcentaje Individual?</label>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" {...register('tiene_porcentaje_individual')} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  <span className="ml-3 text-sm font-semibold text-slate-700">Sí</span>
                </label>
              </div>

              {watch('tiene_porcentaje_individual') && (
                <div>
                  <label className={labelClass}>Porcentaje (%) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register('porcentaje_individual', { 
                      required: watch('tiene_porcentaje_individual') ? 'El porcentaje es requerido' : false 
                    })}
                    className={inputClass}
                    placeholder="Ej: 10.50"
                  />
                  {errors.porcentaje_individual && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.porcentaje_individual.message}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-bold transition-all"
        >
          <i className="fas fa-times mr-2" />Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-70 flex items-center gap-2"
        >
          {loading
            ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
            : <><i className="fas fa-save" />Guardar</>
          }
        </button>
      </div>
    </form>
  );
};

export default SocioForm;

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const SucursalForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [ciudades, setCiudades] = useState([]);
  // ── Estado para Provincia → Ciudades ─────────────────
  const [provincias, setProvincias] = useState([]);
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [loadingCantones, setLoadingCantones] = useState(false);

  // Normalizador de estado para asegurar '1' o '0'
  const normalizeStatus = (val) => {
    const v = String(val ?? '').trim().toUpperCase();
    const isActive = v === 'A' || v === '1' || val === 1 || val === true || v === 'ACTIVO' || v === 'S';
    return isActive ? '1' : '0';
  };

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre_sucursal: '',
      ciudad_sucursal: '',
      direccion_sucursal: '',
      telefono_sucursal: '',
      ruc_sucursal: '',
      porcentaje_retencion: 0,
      tiene_punto_emision: false,
      punto_emision_sucursal: '',
      tiene_encomiendas: false,
      punto_emision_boleteria_sucursal: '',
      estado_sucursales: '1'
    }
  });

  const tienePuntoEmision = watch('tiene_punto_emision');
  const tieneEncomiendas = watch('tiene_encomiendas');

  // Cargar provincias al montar
  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const res = await api.get('/locacion/seleccionarProvincia');
        const data = res?.data?.data || res?.data || [];
        setProvincias(data);
      } catch (e) {
        console.error('Error cargando provincias:', e);
      }
    };
    fetchProvincias();
  }, []);

  // Cargar cantones cuando cambia la provincia
  useEffect(() => {
    if (!selectedProvincia) {
      setCiudades([]);
      setValue('ciudad_sucursal', '');
      return;
    }
    const fetchCantones = async () => {
      setLoadingCantones(true);
      try {
        const res = await api.get('/canton/cantonSeleccionarCombo', {
          params: { id_provincia: selectedProvincia }
        });
        const data = res?.data?.data || res?.data || [];
        // Ordenar alfabéticamente por nombre
        const ordenados = [...data].sort((a, b) => {
          const nombreA = (a.nombre_canton || a.nombre || '').toLowerCase();
          const nombreB = (b.nombre_canton || b.nombre || '').toLowerCase();
          return nombreA.localeCompare(nombreB);
        });
        setCiudades(ordenados);
        setValue('ciudad_sucursal', '');
      } catch (e) {
        console.error('Error cargando cantones:', e);
        setCiudades([]);
      } finally {
        setLoadingCantones(false);
      }
    };
    fetchCantones();
  }, [selectedProvincia, setValue]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Si es edición, resetear el formulario con los datos mapeados
        if (isEditing) {
          reset({
            ...initialData,
            estado_sucursales: normalizeStatus(initialData.estado_sucursales ?? initialData.estado),
            tiene_punto_emision: !!initialData.punto_emision_sucursal,
            tiene_encomiendas: !!initialData.punto_emision_boleteria_sucursal,
            // Aseguramos que los puntos de emisión no sean nulos para el input
            punto_emision_sucursal: initialData.punto_emision_sucursal || '',
            punto_emision_boleteria_sucursal: initialData.punto_emision_boleteria_sucursal || '',
          });
          // Cargar todas las ciudades para edición (fallback)
          const res = await api.get('/locacion/seleccionarCiudad');
          const dataCiudades = res.data.data || [];
          setCiudades(dataCiudades);
        } else {
          // Si es nuevo, cargar RUC de empresa
          const resEmpresa = await api.get('/empresa/selectempresa');
          if (resEmpresa.data.success && resEmpresa.data.data.length > 0) {
            setValue('ruc_sucursal', resEmpresa.data.data[0].ruc_empresa);
          }
        }
      } catch (err) {
        console.error('Error inicializando formulario:', err);
      }
    };
    loadData();
  }, [isEditing, initialData, reset, setValue]);

  const onFormSubmit = async (formData) => {
    setLoading(true);
    try {
      // Mapear datos de vuelta al formato del servidor
      const payload = {
        ...formData,
        // Si el checkbox está apagado, enviamos vacío como en el legacy
        punto_emision_sucursal: formData.tiene_punto_emision ? formData.punto_emision_sucursal : '',
        punto_emision_boleteria_sucursal: formData.tiene_encomiendas ? formData.punto_emision_boleteria_sucursal : '',
        // Enviar flags de checkbox como '1'/'0' si el servidor lo requiere
        tiene_punto_emision: formData.tiene_punto_emision ? '1' : '0',
        tiene_encomiendas: formData.tiene_encomiendas ? '1' : '0'
      };

      if (isEditing) payload.id_sucursal = initialData.id_sucursal;

      const res = await api.post('/sucursal/insertarActualizarSucursal', payload);
      
      if (res.data.success) {
        toast.success(isEditing ? 'Agencia actualizada' : 'Agencia creada');
        onSubmit(payload);
      } else {
        toast.error(res.data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error guardando sucursal:', err);
      toast.error('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre de la Agencia</label>
          <input 
            type="text" 
            {...register('nombre_sucursal', { required: 'El nombre es requerido' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
            placeholder="Ej: Agencia Central"
          />
          {errors.nombre_sucursal && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.nombre_sucursal.message}</span>}
        </div>

        {/* Provincia */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Provincia</label>
          <select
            value={selectedProvincia}
            onChange={(e) => setSelectedProvincia(e.target.value)}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          >
            <option value="">Seleccione una provincia...</option>
            {provincias.map(p => (
              <option key={p.id_provincia || p.id || p.value} value={p.id_provincia || p.id || p.value}>
                {p.nombre_provincia || p.nombre || p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ciudad</label>
          <select 
            {...register('ciudad_sucursal', { required: 'La ciudad es requerida' })} 
            disabled={!selectedProvincia || loadingCantones}
            className={`w-full h-10 px-3 text-xs font-bold border rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none ${
              !selectedProvincia ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
            }`}
          >
            <option value="">
              {loadingCantones
                ? 'Cargando ciudades...'
                : selectedProvincia
                  ? 'Seleccione una ciudad...'
                  : 'Primero seleccione una provincia'
              }
            </option>
            {ciudades.map(c => (
              <option key={c.id_canton || c.id || c.value} value={c.nombre_canton || c.nombre || c.label}>
                {c.nombre_canton || c.nombre || c.label}
              </option>
            ))}
          </select>
          {errors.ciudad_sucursal && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.ciudad_sucursal.message}</span>}
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dirección</label>
          <input 
            type="text" 
            {...register('direccion_sucursal', { required: 'La dirección es requerida' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</label>
          <input 
            type="text" 
            {...register('telefono_sucursal', { required: 'El teléfono es requerido' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* RUC (Read Only) */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RUC</label>
          <input 
            type="text" 
            {...register('ruc_sucursal')} 
            readOnly
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-slate-100 text-slate-500 outline-none"
          />
        </div>

        {/* Retención */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">% Retención</label>
          <input 
            type="number" 
            step="0.01"
            {...register('porcentaje_retencion')} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</label>
          <select 
            {...register('estado_sucursales', { required: true })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>

        {/* Punto Emisión Guías */}
        <div className="border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              {...register('tiene_punto_emision')} 
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-[10px] font-black text-slate-600 uppercase">Habilitar P.E. Guías</label>
          </div>
          <input 
            type="text" 
            maxLength="3"
            disabled={!tienePuntoEmision}
            {...register('punto_emision_sucursal', { required: tienePuntoEmision })} 
            className={`w-full h-10 px-3 text-xs font-bold border rounded-xl transition-all outline-none ${tienePuntoEmision ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent text-slate-400'}`}
            placeholder="Ej: 001"
          />
        </div>

        {/* Punto Emisión Boletería */}
        <div className="border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              {...register('tiene_encomiendas')} 
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-[10px] font-black text-slate-600 uppercase">Habilitar P.E. Boletería</label>
          </div>
          <input 
            type="text" 
            maxLength="3"
            disabled={!tieneEncomiendas}
            {...register('punto_emision_boleteria_sucursal', { required: tieneEncomiendas })} 
            className={`w-full h-10 px-3 text-xs font-bold border rounded-xl transition-all outline-none ${tieneEncomiendas ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent text-slate-400'}`}
            placeholder="Ej: 002"
          />
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-6 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-8 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest flex items-center gap-2"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          {isEditing ? 'Actualizar Agencia' : 'Guardar Agencia'}
        </button>
      </div>
    </form>
  );
};

export default SucursalForm;

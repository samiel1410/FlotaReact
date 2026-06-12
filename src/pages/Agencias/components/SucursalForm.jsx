import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../../components/common/ToggleSwitch';

const SucursalForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [todasCiudades, setTodasCiudades] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [selectedProvincia, setSelectedProvincia] = useState('');

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
      estado_sucursales: true
    }
  });

  const tienePuntoEmision = watch('tiene_punto_emision');
  const tieneEncomiendas = watch('tiene_encomiendas');
  const estadoValue = watch('estado_sucursales');

  // Cargar provincias y TODAS las ciudades al montar (sin depender de provincia)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [provRes, cityRes] = await Promise.all([
          api.get('/locacion/seleccionarProvincia'),
          api.get('/locacion/seleccionarCiudad')
        ]);
        setProvincias(provRes?.data?.data || provRes?.data || []);
        
        const todas = (cityRes?.data?.data || cityRes?.data || []).sort((a, b) => {
          const na = (a.nombre_canton || a.nombre || '').toLowerCase();
          const nb = (b.nombre_canton || b.nombre || '').toLowerCase();
          return na.localeCompare(nb);
        });
        setTodasCiudades(todas);
        
        // Al editar: resetear form y auto-seleccionar provincia
        if (isEditing && initialData) {
          reset({
            ...initialData,
            estado_sucursales: (initialData.estado_sucursales ?? initialData.estado ?? 1) == 1 || (initialData.estado_sucursales ?? initialData.estado ?? 1) === '1',
            tiene_punto_emision: !!initialData.punto_emision_sucursal,
            tiene_encomiendas: !!initialData.punto_emision_boleteria_sucursal,
            punto_emision_sucursal: initialData.punto_emision_sucursal || '',
            punto_emision_boleteria_sucursal: initialData.punto_emision_boleteria_sucursal || '',
          });
          
          // Auto-seleccionar provincia
          if (initialData.ciudad_sucursal) {
            const match = todas.find(c =>
              (c.nombre_canton || '').trim().toUpperCase() === initialData.ciudad_sucursal.trim().toUpperCase()
            );
            if (match?.id_fkprovincia) {
              setSelectedProvincia(String(match.id_fkprovincia));
            }
          }
        }
      } catch (e) {
        console.error('Error cargando datos:', e);
      }
    };
    fetchData();
  }, []); // Solo al montar, sin dependencias problemáticas

  // Al editar con initialData, cargar RUC si es nuevo
  useEffect(() => {
    if (!isEditing) {
      api.get('/empresa/selectempresa').then(res => {
        if (res.data.success && res.data.data.length > 0) {
          setValue('ruc_sucursal', res.data.data[0].ruc_empresa);
        }
      }).catch(() => {});
    }
  }, []);

  // Ciudades visibles: filtradas por provincia o TODAS si no hay provincia seleccionada
  const ciudadesVisibles = selectedProvincia
    ? todasCiudades.filter(c => String(c.id_fkprovincia) === String(selectedProvincia))
    : todasCiudades;

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
            disabled={!todasCiudades.length}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          >
            <option value="">{todasCiudades.length ? 'Seleccione la ciudad...' : 'Cargando ciudades...'}</option>
            {ciudadesVisibles.map(c => (
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
          <ToggleSwitch 
            register={register('estado_sucursales')}
            label={estadoValue ? 'Activo' : 'Inactivo'}
          />
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

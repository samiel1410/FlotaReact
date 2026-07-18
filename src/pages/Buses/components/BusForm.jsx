import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

export const BusForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  // Estado para combos
  const [combos, setCombos] = useState({ buseros: [], auxiliares: [], socios: [] });

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      ...initialData,
      estado_buses: (initialData.estado_buses ?? initialData.estado ?? 1) == 1 || (initialData.estado_buses ?? initialData.estado ?? 1) === '1'
    } : {
      codigo_buses: '',
      disco_buses: '',
      placa_buses: '',
      chasis_buses: '',
      motor_buses: '',
      marca_buses: '',
      modelo_buses: '',
      capacidad_buses: 40,
      anio_buses: '',
      pisos_buses: 1,
      estado_buses: true,
      id_fkpersonal_buses: '',
      id_fkauxiliar_buses: '',
      id_fksocio_buses: '',
      socios_ids: []
    }
  });

  // Inicializar socios seleccionados al editar
  useEffect(() => {
    if (isEditing) {
      const sociosIniciales = [];
      // Si viene el array de socios desde el backend
      if (initialData.socios && Array.isArray(initialData.socios)) {
        sociosIniciales.push(...initialData.socios.map(s =>
          typeof s === 'object' ? s.id_socio : s
        ));
      }
      // Fallback: si solo tiene id_fksocio_buses
      if (sociosIniciales.length === 0 && initialData.id_fksocio_buses && initialData.id_fksocio_buses !== '0') {
        sociosIniciales.push(parseInt(initialData.id_fksocio_buses));
      }
      setValue('socios_ids', sociosIniciales);
    }
  }, [isEditing, initialData, setValue]);

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [buserosRes, auxiliaresRes, sociosRes] = await Promise.all([
          api.get('/personal/personalSelectCombo'),
          api.get('/personal/auxiliarSelectCombo'),
          api.get('/personal/socioSelectCombo')
        ]);
        // Filtrar duplicados por id_personal en caso de que el backend envíe múltiples filas por la misma persona
        const uniqueBuseros = Array.from(new Map((buserosRes.data.data || []).map(item => [item.id_personal, item])).values());
        const uniqueAuxiliares = Array.from(new Map((auxiliaresRes.data.data || []).map(item => [item.id_personal, item])).values());
        const uniqueSocios = Array.from(new Map((sociosRes.data.data || []).map(item => [item.id_personal, item])).values());

        setCombos({
          buseros: uniqueBuseros,
          auxiliares: uniqueAuxiliares,
          socios: uniqueSocios
        });

        // Asegurar selección al editar
        if (isEditing) {
          if (initialData.id_fkpersonal_buses) setValue('id_fkpersonal_buses', initialData.id_fkpersonal_buses);
          if (initialData.id_fkauxiliar_buses) setValue('id_fkauxiliar_buses', initialData.id_fkauxiliar_buses);
        }
      } catch (err) {
        console.error('Error cargando combos de buses:', err);
      }
    };
    loadCombos();
  }, [isEditing, initialData, setValue]);

  const onFormSubmit = async (data) => {
    // Validar que al menos un socio esté seleccionado
    const selectedSocios = data.socios_ids || [];
    if (selectedSocios.length === 0) {
      toast.error('Debe seleccionar al menos un socio');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        ...data, 
        estado_buses: data.estado_buses ? '1' : '0',
        socios_ids: selectedSocios,
        id_fksocio_buses: selectedSocios.length > 0 ? selectedSocios[0] : ''
      };
      if (isEditing) payload.id_buses = initialData.id_buses;

      const res = await api.post('/buses/insertarActualizarBus', payload);
      
      if (res.data.success) {
        toast.success(isEditing ? 'Bus actualizado' : 'Bus creado');
        onSubmit(data);
      } else {
        toast.error(res.data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error guardando bus:', err);
      toast.error('Error de servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="p-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código</label>
          <input 
            {...register('codigo_buses', { required: 'Requerido' })}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
            placeholder="Código"
          />
          {errors.codigo_buses && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.codigo_buses.message}</span>}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disco</label>
          <input 
            {...register('disco_buses', { required: 'Requerido' })}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
            placeholder="Nro. Disco"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Placa</label>
          <input 
            {...register('placa_buses', { required: 'Requerido' })}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
            placeholder="ABC-1234"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marca</label>
          <input {...register('marca_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" placeholder="Ej: Mercedes Benz" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</label>
          <input {...register('modelo_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" placeholder="Ej: 2024" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motor</label>
          <input {...register('motor_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" placeholder="N° Motor" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chasis</label>
          <input {...register('chasis_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" placeholder="N° Chasis" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Año</label>
          <input {...register('anio_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacidad</label>
          <input type="number" {...register('capacidad_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pisos</label>
          <select {...register('pisos_buses')} className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50">
            <option value={1}>1 Piso</option>
            <option value={2}>2 Pisos</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('estado_buses')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Conductor <span className="text-rose-500">*</span>
          </label>
          <Controller
            name="id_fkpersonal_buses"
            control={control}
            rules={{ required: 'Seleccione un conductor' }}
            render={({ field }) => (
              <SearchableSelect
                {...field}
                options={combos.buseros.map(b => ({
                  value: b.id_personal,
                  label: `${b.per_cedula_personal} - ${b.per_nombres_persona} ${b.per_apellidos_personal || ''}`.trim()
                }))}
                placeholder="-- Seleccione conductor --"
              />
            )}
          />
          {errors.id_fkpersonal_buses && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.id_fkpersonal_buses.message}</span>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Socios <span className="text-rose-500">*</span>
          </label>
          
          <Controller
            name="socios_ids"
            control={control}
            rules={{ required: 'Seleccione al menos un socio' }}
            render={({ field }) => (
              <SearchableSelect
                {...field}
                isMulti={true}
                options={combos.socios.map(s => ({
                  value: s.id_personal,
                  label: `${s.per_cedula_personal} - ${s.per_nombres_persona} ${s.per_apellidos_personal || ''}`.trim()
                }))}
                placeholder="-- Seleccione socios --"
              />
            )}
          />
          {errors.socios_ids && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.socios_ids.message}</span>}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Auxiliar <span className="text-rose-500">*</span>
          </label>
          <Controller
            name="id_fkauxiliar_buses"
            control={control}
            rules={{ required: 'Seleccione un auxiliar' }}
            render={({ field }) => (
              <SearchableSelect
                {...field}
                options={combos.auxiliares.map(a => ({
                  value: a.id_personal,
                  label: `${a.per_cedula_personal} - ${a.per_nombres_persona} ${a.per_apellidos_personal || ''}`.trim()
                }))}
                placeholder="-- Seleccione auxiliar --"
              />
            )}
          />
          {errors.id_fkauxiliar_buses && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.id_fkauxiliar_buses.message}</span>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
        <button type="button" onClick={onCancel} className="h-10 px-6 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          {isEditing ? 'Actualizar Bus' : 'Guardar Bus'}
        </button>
      </div>
    </form>
  );
};

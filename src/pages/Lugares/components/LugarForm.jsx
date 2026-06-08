import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const LugarForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [provincias, setProvincias] = useState([]);
  const [ciudades, setCiudades] = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      nombre_lugar: initialData.lug_nombre || initialData.nombre_lugar || '',
      id_provincia: String(initialData.id_provincia || ''),
      id_fkcanton: String(initialData.id_fkcanton || initialData.id_canton || ''),
      lug_estado: initialData.lug_estado == 1 || initialData.lug_estado === '1',
    } : {
      nombre_lugar: '',
      id_provincia: '',
      id_fkcanton: '',
      lug_estado: true,
    }
  });

  const selectedProvincia = watch('id_provincia');

  // Cargar provincias al montar
  useEffect(() => {
    api.get('/locacion/seleccionarProvincia')
      .then(res => setProvincias(res.data.data || []))
      .catch(err => console.error('Error cargando provincias:', err));
  }, []);

  // Cargar ciudades cuando cambia la provincia
  useEffect(() => {
    if (selectedProvincia) {
      api.get(`/locacion/seleccionarCiudad?id_provincia=${selectedProvincia}`)
        .then(res => {
          setCiudades(res.data.data || []);
          if (isEditing && initialData.id_fkcanton) {
            setValue('id_fkcanton', String(initialData.id_fkcanton));
          }
        })
        .catch(err => console.error('Error cargando ciudades:', err));
    } else {
      setCiudades([]);
      setValue('id_fkcanton', '');
    }
  }, [selectedProvincia, isEditing, initialData, setValue]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, lug_estado: data.lug_estado ? '1' : '0' };
      if (isEditing) {
        await api.post('/lugar/lugaractualizar', { ...payload, id_lugar: initialData.id_lugar });
      } else {
        await api.post('/lugar/lugarinsertar', payload);
      }
      toast.success(isEditing ? 'Lugar actualizado correctamente' : 'Lugar creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando lugar:', err);
      toast.error('Error al guardar el lugar. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Nombre del Lugar */}
        <div className="md:col-span-2">
          <label className={labelClass}>
            Nombre del Lugar / Parada <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('nombre_lugar', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Terminal Terrestre Pelileo"
          />
          {errors.nombre_lugar && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_lugar.message}</p>
          )}
        </div>

        {/* Provincia */}
        <div>
          <label className={labelClass}>
            Provincia <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('id_provincia', { required: 'La provincia es requerida' })}
            className={inputClass}
          >
            <option value="">Seleccione una provincia...</option>
            {provincias.map(p => (
              <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
            ))}
          </select>
          {errors.id_provincia && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_provincia.message}</p>
          )}
        </div>

        {/* Ciudad / Cantón */}
        <div>
          <label className={labelClass}>
            Ciudad / Cantón <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('id_fkcanton', { required: selectedProvincia ? 'La ciudad es requerida' : false })}
            className={inputClass}
            disabled={!selectedProvincia}
          >
            <option value="">
              {selectedProvincia ? 'Seleccione una ciudad...' : 'Seleccione provincia primero'}
            </option>
            {ciudades.map(c => (
              <option key={c.id_canton} value={c.id_canton}>{c.nombre_canton}</option>
            ))}
          </select>
          {errors.id_fkcanton && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_fkcanton.message}</p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('lug_estado')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
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

export default LugarForm;

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const SubRutaForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [destinos, setDestinos] = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      codigo_sub_rutas: initialData.codigo_sub_rutas || '',
      nombre_sub_rutas: initialData.nombre_sub_rutas || '',
      descripcion_sub_rutas: initialData.descripcion_sub_rutas || '',
      minutos_sub_rutas: initialData.minutos_sub_rutas || '',
      id_fkorigen_sub_rutas: String(initialData.id_fkorigen_sub_rutas || ''),
      id_fkdestino_sub_rutas: String(initialData.id_fkdestino_sub_rutas || ''),
      hora_salida_sub_rutas: initialData.hora_salida_sub_rutas || '',
      estado_sub_rutas: initialData.estado_sub_rutas == 1 || initialData.estado_sub_rutas === '1',
    } : {
      codigo_sub_rutas: '',
      nombre_sub_rutas: '',
      descripcion_sub_rutas: '',
      minutos_sub_rutas: '',
      id_fkorigen_sub_rutas: '',
      id_fkdestino_sub_rutas: '',
      hora_salida_sub_rutas: '',
      estado_sub_rutas: true,
    }
  });

  // Cargar destinos para origen/destino
  useEffect(() => {
    api.get('/destino/destinoselect')
      .then(res => setDestinos(res.data.data || []))
      .catch(err => console.error('Error cargando destinos:', err));
  }, []);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, estado_sub_rutas: data.estado_sub_rutas ? '1' : '0' };
      if (isEditing) {
        await api.post('/sub_rutas/subrutaactualizar', {
          ...payload,
          id_sub_rutas: initialData.id_sub_rutas
        });
      } else {
        await api.post('/sub_rutas/subrutainsertar', payload);
      }
      toast.success(isEditing ? 'Sub-ruta actualizada correctamente' : 'Sub-ruta creada correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando sub-ruta:', err);
      toast.error('Error al guardar la sub-ruta. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Código */}
        <div>
          <label className={labelClass}>Código <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('codigo_sub_rutas', { required: 'El código es requerido' })}
            className={`${inputClass} uppercase`}
            placeholder="Ej: SR-001"
          />
          {errors.codigo_sub_rutas && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.codigo_sub_rutas.message}</p>}
        </div>

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('nombre_sub_rutas', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Pelileo - Ambato Segmento 1"
          />
          {errors.nombre_sub_rutas && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_sub_rutas.message}</p>}
        </div>

        {/* Descripción */}
        <div className="md:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea
            {...register('descripcion_sub_rutas')}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 resize-none"
            placeholder="Descripción del segmento de ruta..."
          />
        </div>

        {/* Origen */}
        <div>
          <label className={labelClass}>Origen <span className="text-rose-500">*</span></label>
          <select
            {...register('id_fkorigen_sub_rutas', { required: 'El origen es requerido' })}
            className={inputClass}
          >
            <option value="">Seleccionar destino de origen...</option>
            {destinos.map(d => (
              <option key={d.id_destino} value={d.id_destino}>
                {d.nombre_destino || d.lugar_destino}
              </option>
            ))}
          </select>
          {errors.id_fkorigen_sub_rutas && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_fkorigen_sub_rutas.message}</p>}
        </div>

        {/* Destino */}
        <div>
          <label className={labelClass}>Destino <span className="text-rose-500">*</span></label>
          <select
            {...register('id_fkdestino_sub_rutas', { required: 'El destino es requerido' })}
            className={inputClass}
          >
            <option value="">Seleccionar destino final...</option>
            {destinos.map(d => (
              <option key={d.id_destino} value={d.id_destino}>
                {d.nombre_destino || d.lugar_destino}
              </option>
            ))}
          </select>
          {errors.id_fkdestino_sub_rutas && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_fkdestino_sub_rutas.message}</p>}
        </div>

        {/* Minutos */}
        <div>
          <label className={labelClass}>Duración (minutos)</label>
          <input
            type="number"
            min={0}
            {...register('minutos_sub_rutas')}
            className={inputClass}
            placeholder="Ej: 45"
          />
        </div>

        {/* Hora de Salida */}
        <div>
          <label className={labelClass}>Hora de Salida</label>
          <input
            type="time"
            {...register('hora_salida_sub_rutas')}
            className={inputClass}
          />
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('estado_sub_rutas')} />
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

export default SubRutaForm;

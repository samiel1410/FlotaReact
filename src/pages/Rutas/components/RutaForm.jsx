import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const RutaForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      rut_codigo: initialData.rut_codigo || '',
      rut_nombre: initialData.rut_nombre || '',
      rut_origen: initialData.rut_origen || '',
      rut_destino: initialData.rut_destino || '',
      rut_valor: initialData.rut_valor || '',
      rut_estado: initialData.rut_estado == 1 || initialData.rut_estado === '1',
    } : {
      rut_codigo: '',
      rut_nombre: '',
      rut_origen: '',
      rut_destino: '',
      rut_valor: '',
      rut_estado: true,
    }
  });

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, rut_estado: data.rut_estado ? '1' : '0' };
      if (isEditing) {
        await api.post('/rutas/rutaactualizar', { ...payload, id_ruta: initialData.id_ruta });
      } else {
        await api.post('/rutas/rutainsertar', payload);
      }
      toast.success(isEditing ? 'Ruta actualizada correctamente' : 'Ruta creada correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando ruta:', err);
      toast.error('Error al guardar la ruta. ' + (err.response?.data?.mensaje || err.message));
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
          <label className={labelClass}>
            Código de Ruta <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('rut_codigo', { required: 'El código es requerido' })}
            className={`${inputClass} uppercase`}
            placeholder="Ej: RT-001"
          />
          {errors.rut_codigo && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.rut_codigo.message}</p>}
        </div>

        {/* Nombre */}
        <div>
          <label className={labelClass}>
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('rut_nombre', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Pelileo - Ambato"
          />
          {errors.rut_nombre && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.rut_nombre.message}</p>}
        </div>

        {/* Origen */}
        <div>
          <label className={labelClass}>
            Origen <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('rut_origen', { required: 'El origen es requerido' })}
            className={inputClass}
            placeholder="Ciudad de origen"
          />
          {errors.rut_origen && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.rut_origen.message}</p>}
        </div>

        {/* Destino */}
        <div>
          <label className={labelClass}>
            Destino <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('rut_destino', { required: 'El destino es requerido' })}
            className={inputClass}
            placeholder="Ciudad de destino"
          />
          {errors.rut_destino && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.rut_destino.message}</p>}
        </div>

        {/* Tarifa */}
        <div>
          <label className={labelClass}>Tarifa ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('rut_valor')}
            className={inputClass}
            placeholder="Ej: 2.50"
          />
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('rut_estado')} />
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

export default RutaForm;

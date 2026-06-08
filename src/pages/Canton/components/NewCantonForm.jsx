import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../../../config/axios';
import ProvinciaSelect from '../../../components/common/ProvinciaSelect';
import toast from 'react-hot-toast';

const NewCantonForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      id: initialData?.id_canton || '',
      nombre_canton: initialData?.nombre_canton || '',
      id_fkprovincia: initialData?.id_fkprovincia || '',
    }
  });

  const onFormSubmit = async (data) => {
    console.log('[NewCantonForm] onFormSubmit called with data:', data);
    if (!data.id_fkprovincia) {
      toast.error('Debe seleccionar una provincia');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: isEditing ? initialData.id_canton : null,
        nombre_canton: data.nombre_canton.toUpperCase(),
        id_fkprovincia: data.id_fkprovincia,
      };
      console.log('[NewCantonForm] Sending payload:', payload);
      const res = await api.post('/canton/cantonInsertarActualizar', payload);
      console.log('[NewCantonForm] Response:', res.data);
      if (res.data.success) {
        toast.success(isEditing ? 'Cantón actualizado correctamente' : 'Cantón creado correctamente');
        onSubmit(data);
      } else {
        toast.error(res.data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      console.error('[NewCantonForm] Error guardando cantón:', err);
      toast.error('Error al guardar el cantón: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <input type="hidden" {...register('id')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Nombre del Cantón */}
        <div>
          <label className={labelClass}>Nombre del Cantón <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('nombre_canton', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Ambato"
          />
          {errors.nombre_canton && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_canton.message}</p>}
        </div>

        {/* Provincia */}
        <div>
          <label className={labelClass}>Provincia <span className="text-rose-500">*</span></label>
          <Controller
            name="id_fkprovincia"
            control={control}
            rules={{ required: 'La provincia es requerida' }}
            render={({ field }) => (
              <ProvinciaSelect
                name="id_fkprovincia"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className={inputClass}
              />
            )}
          />
          {errors.id_fkprovincia && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_fkprovincia.message}</p>}
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

export default NewCantonForm;

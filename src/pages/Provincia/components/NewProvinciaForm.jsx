import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const NewProvinciaForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      nombre_provincia: initialData?.nombre_provincia || initialData?.pro_nombre || '',
    }
  });

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      if (isEditing) {
        await api.post('/provincia/provinciaInsertarActualizar', {
          id_provincia: initialData.id_provincia,
          nombre_provincia: data.nombre_provincia,
        });
      } else {
        await api.post('/provincia/provinciaInsertarActualizar', {
          nombre_provincia: data.nombre_provincia,
        });
      }
      toast.success(isEditing ? 'Provincia actualizada correctamente' : 'Provincia creada correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando provincia:', err);
      toast.error('Error al guardar la provincia. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="space-y-4">
        {/* Nombre Provincia */}
        <div>
          <label className={labelClass}>
            Nombre de la Provincia <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-map text-slate-400"></i>
            </div>
            <input
              type="text"
              {...register('nombre_provincia', { required: 'El nombre es obligatorio' })}
              className={`${inputClass} pl-10 uppercase`}
              placeholder="Ej. PICHINCHA"
              autoFocus
            />
          </div>
          {errors.nombre_provincia && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_provincia.message}</p>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 mt-2">
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
            : <><i className="fas fa-save" />Guardar Provincia</>
          }
        </button>
      </div>
    </form>
  );
};

export default NewProvinciaForm;

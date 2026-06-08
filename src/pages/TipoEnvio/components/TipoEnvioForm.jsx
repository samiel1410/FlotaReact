import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const TipoEnvioForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    if (initialData) {
      reset({
        nombre_tipo_envio: initialData.nombre_envio || '',
        observacion_tipo_envio: initialData.observacion_tipo_envio || '',
        estado_convenio: initialData.estado_tipo_envio == 1 || initialData.estado_tipo_envio === '1',
      });
    } else {
      reset({
        nombre_tipo_envio: '',
        observacion_tipo_envio: '',
        estado_convenio: true,
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        estado_convenio: data.estado_convenio ? '1' : '0',
        ...(isEditing ? { id_tipo_envio: initialData.id_tipo_envio } : {}),
      };
      await api.post('/tipoenvio/tipoEnvioInsertarActualizar', payload);
      toast.success(isEditing ? 'Tipo de envío actualizado correctamente' : 'Tipo de envío creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando tipo de envío:', err);
      toast.error('Error al guardar. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5">

        <div>
          <label className={labelClass}>
            Nombre del Tipo de Envío <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('nombre_tipo_envio', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Encomienda Express"
          />
          {errors.nombre_tipo_envio && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_tipo_envio.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            {...register('observacion_tipo_envio')}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 resize-none"
            placeholder="Descripción del tipo de envío..."
          />
        </div>

        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('estado_convenio')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>
      </div>

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

export default TipoEnvioForm;

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const NewProvinciaForm = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      id: '',
      nombre_provincia: '',
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id_provincia || '',
        nombre_provincia: initialData.pro_nombre || initialData.nombre_provincia || '',
      });
    } else {
      reset({ id: '', nombre_provincia: '' });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {/* Identificador Oculto */}
        <input type="hidden" {...register('id')} />

        <div className="space-y-4">
          {/* Nombre Provincia */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Nombre de la Provincia <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-map text-slate-400"></i>
              </div>
              <input
                type="text"
                {...register('nombre_provincia', { required: 'El nombre es obligatorio' })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.nombre_provincia 
                    ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500' 
                    : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="Ej. Pichincha"
                autoFocus
              />
            </div>
            {errors.nombre_provincia && (
              <p className="mt-1 text-xs text-rose-500 font-medium flex items-center gap-1">
                <i className="fas fa-exclamation-circle"></i> {errors.nombre_provincia.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm flex items-center gap-2"
        >
          <i className="fas fa-times"></i>
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 border border-emerald-700 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2"
        >
          <i className="fas fa-save"></i>
          Guardar Provincia
        </button>
      </div>
    </form>
  );
};

export default NewProvinciaForm;

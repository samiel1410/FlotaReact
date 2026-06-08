import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const NewAlimentoForm = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      id_alimentos: '',
      nombre_alimentos: '',
      descripcion_alimentos: '',
      precio_alimentos: '',
      estado_alimentos: '1'
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        id_alimentos: initialData.id_alimentos || '',
        nombre_alimentos: initialData.ali_nombre || initialData.nombre_alimentos || '',
        descripcion_alimentos: initialData.ali_descripcion || initialData.descripcion_alimentos || '',
        precio_alimentos: initialData.ali_valor || initialData.precio_alimentos || '',
        estado_alimentos: (initialData.ali_estado !== undefined ? String(initialData.ali_estado) : String(initialData.estado_alimentos || '1')),
      });
    } else {
      reset({
        id_alimentos: '',
        nombre_alimentos: '',
        descripcion_alimentos: '',
        precio_alimentos: '',
        estado_alimentos: '1'
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <input type="hidden" {...register('id_alimentos')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre Alimento */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-utensils text-slate-400"></i>
              </div>
              <input
                type="text"
                {...register('nombre_alimentos', { required: 'El nombre es obligatorio' })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.nombre_alimentos ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="Ej. Almuerzo Completo"
                autoFocus
              />
            </div>
            {errors.nombre_alimentos && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.nombre_alimentos.message}</p>}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Precio ($) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-dollar-sign text-slate-400"></i>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('precio_alimentos', { 
                  required: 'El precio es obligatorio',
                  min: { value: 0, message: 'No puede ser negativo' }
                })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.precio_alimentos ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.precio_alimentos && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.precio_alimentos.message}</p>}
          </div>

          {/* Estado (Switch) */}
          <div className="flex flex-col justify-center">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Estado</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                {...register('estado_alimentos')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
            </label>
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Descripción
            </label>
            <textarea
              {...register('descripcion_alimentos')}
              rows="3"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all resize-none"
              placeholder="Detalles adicionales del plato o servicio..."
            ></textarea>
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
          Guardar Alimento
        </button>
      </div>
    </form>
  );
};

export default NewAlimentoForm;

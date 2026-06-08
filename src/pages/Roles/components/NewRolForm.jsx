import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const NewRolForm = ({ initialData, onSubmit, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      id_rol: '',
      nombre_rol: '',
      estado_rol: '1'
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        id_rol: initialData.id_rol || '',
        nombre_rol: initialData.nombre_rol || '',
        estado_rol: (initialData.estado_rol !== undefined ? String(initialData.estado_rol) : '1')
      });
    } else {
      reset({
        id_rol: '',
        nombre_rol: '',
        estado_rol: '1'
      });
    }
  }, [initialData, reset]);

  const guardar = async (data) => {
    setSaving(true);
    try {
      const payload = {
        id_rol: data.id_rol || '',
        nombre_rol: data.nombre_rol,
        estado_rol: data.estado_rol === '1' || data.estado_rol === true ? '1' : '0'
      };

      const res = await api.post('/roles/insertarActualizarRoles', payload);

      if (res.data?.success) {
        toast.success(initialData ? 'Rol actualizado correctamente' : 'Rol creado correctamente');
        if (onSubmit) onSubmit();
      } else {
        toast.error(res.data?.message || res.data?.data || 'Error al guardar el rol');
      }
    } catch (err) {
      console.error('Error guardando rol:', err);
      toast.error('Error de conexión al guardar el rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(guardar)} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <input type="hidden" {...register('id_rol')} />

        <div className="grid grid-cols-1 gap-4">
          
          {/* Nombre Rol */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Nombre del Rol <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-id-badge text-slate-400"></i>
              </div>
              <input
                type="text"
                {...register('nombre_rol', { required: 'El nombre es obligatorio' })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.nombre_rol ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="Ej: Administrador"
                autoFocus
              />
            </div>
            {errors.nombre_rol && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.nombre_rol.message}</p>}
          </div>

          {/* Estado (Switch) */}
          <div className="flex flex-col justify-center">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Estado</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                {...register('estado_rol')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
            </label>
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
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 border border-emerald-700 rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2"
        >
          {saving ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-save"></i>
          )}
          {saving ? 'Guardando...' : 'Guardar Rol'}
        </button>
      </div>
    </form>
  );
};

export default NewRolForm;

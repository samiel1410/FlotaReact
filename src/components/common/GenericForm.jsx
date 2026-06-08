import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';

/**
 * Formulario genérico reutilizable para entidades CRUD simples.
 * 
 * Props:
 *   - fields: Array de configuración de campos:
 *       { name, label, type: 'text'|'number'|'select'|'textarea'|'date', required, options, placeholder, defaultValue, readOnly }
 *   - endpoint: endpoint para guardar (POST)
 *   - updateEndpoint: endpoint para actualizar (opcional, si no se usa el mismo)
 *   - idField: nombre del campo ID para actualizaciones
 *   - initialData: datos del registro a editar (o null para crear)
 *   - onSubmit: callback después de guardar exitosamente
 *   - onCancel: callback para cerrar el formulario
 */
export const GenericForm = ({
  fields = [],
  endpoint,
  updateEndpoint,
  idField = 'id',
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (initialData) {
      const formData = {};
      fields.forEach(f => {
        formData[f.name] = initialData[f.name] ?? f.defaultValue ?? '';
      });
      reset(formData);
    } else {
      const defaults = {};
      fields.forEach(f => {
        defaults[f.name] = f.defaultValue ?? '';
      });
      reset(defaults);
    }
  }, [initialData, fields, reset]);

  const handleFormSubmit = async (data) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const isEdit = initialData && initialData[idField];
      const url = isEdit ? (updateEndpoint || endpoint) : endpoint;

      // Enviar como objeto plano para que el interceptor de axios lo convierta a form-urlencoded
      const body = { ...data };
      if (isEdit) {
        body[idField] = initialData[idField];
      }

      const res = await api.post(url, body);

      if (res.data.success) {
        toast.success(isEdit ? 'Actualizado correctamente' : 'Creado correctamente');
        onSubmit?.();
      } else {
        toast.error(res.data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error saving:', err);
      toast.error(err.response?.data?.mensaje || 'Error al guardar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.name} className={field.type === 'textarea' ? 'col-span-2' : ''}>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              {field.label}
              {field.required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                {...register(field.name, { required: field.required ? 'Requerido' : false })}
                className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
                disabled={field.readOnly}
              >
                <option value="">{field.placeholder || 'Seleccionar...'}</option>
                {(field.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                {...register(field.name, { required: field.required ? 'Requerido' : false })}
                rows={3}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 placeholder:text-slate-300 transition-all resize-none"
                readOnly={field.readOnly}
              />
            ) : (
              <input
                type={field.type || 'text'}
                {...register(field.name, { required: field.required ? 'Requerido' : false })}
                placeholder={field.placeholder || ''}
                className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                readOnly={field.readOnly}
              />
            )}
            
            {errors[field.name] && (
              <p className="text-rose-500 text-[9px] mt-0.5 font-bold">{errors[field.name].message}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`h-9 px-5 text-[10px] font-black text-white rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 ${
            submitting
              ? 'bg-indigo-400 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
          }`}
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {initialData?.[idField] ? 'ACTUALIZANDO...' : 'GUARDANDO...'}
            </>
          ) : (
            initialData?.[idField] ? 'ACTUALIZAR' : 'GUARDAR'
          )}
        </button>
      </div>
    </form>
  );
};
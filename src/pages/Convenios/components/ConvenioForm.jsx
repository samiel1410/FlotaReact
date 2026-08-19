import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const ConvenioForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      nombre: '',
      ruc: '',
      porcentaje_comision: '',
      direccion: '',
      telefono: '',
      celular: '',
      correo: '',
      estado: true,
      observacion: '',
    }
  });

  useEffect(() => {
    if (initialData) {
      console.log('ConvenioForm received initialData:', initialData);
      reset({
        nombre: initialData.nombre_compania_asociada || '',
        ruc: initialData.ruc_compania_asociada || '',
        porcentaje_comision: initialData.porcentaje_comision ?? '',
        direccion: initialData.direccion_compania_asociada || '',
        telefono: initialData.telefono_compania_asociada || '',
        celular: initialData.celular_compania_asociada || '',
        correo: initialData.correo_compania_asociada || '',
        estado: initialData.estado_compania_asociada == 1 || initialData.estado_compania_asociada === '1',
        observacion: initialData.observacion_compania_asociada || initialData.observacion_compania_asoc || '',
      });
    } else {
      reset({
        nombre: '',
        ruc: '',
        porcentaje_comision: '',
        direccion: '',
        telefono: '',
        celular: '',
        correo: '',
        estado: true,
        observacion: '',
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        nombre: data.nombre ? data.nombre.trim() : '',
        ruc: data.ruc ? data.ruc.trim() : '',
        porcentaje_comision: data.porcentaje_comision !== '' ? parseFloat(data.porcentaje_comision) : 0,
        direccion: data.direccion ? data.direccion.trim() : '',
        telefono: data.telefono ? data.telefono.trim() : '',
        celular: data.celular ? data.celular.trim() : '',
        correo: data.correo ? data.correo.trim() : '',
        estado: data.estado ? '1' : '0',
        observacion: data.observacion ? data.observacion.trim() : '',
      };

      if (isEditing) {
        await api.post('/companiaasociada/companiaasociadainsertarActualizar', { ...payload, id: initialData.id_compania_asociada });
      } else {
        await api.post('/companiaasociada/companiaasociadainsertarActualizar', payload);
      }
      toast.success(isEditing ? 'Convenio actualizado correctamente' : 'Convenio creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando convenio:', err);
      toast.error('Error al guardar el convenio. ' + (err.response?.data?.mensaje || err.message));
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

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('nombre', {
              required: 'El nombre es requerido',
              minLength: { value: 3, message: 'El nombre debe tener al menos 3 caracteres' }
            })}
            className={inputClass}
            placeholder="Nombre de la compañía"
          />
          {errors.nombre && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre.message}</p>}
        </div>

        {/* RUC */}
        <div>
          <label className={labelClass}>RUC / Cédula <span className="text-rose-500">*</span></label>
          <input
            type="text"
            maxLength={13}
            {...register('ruc', {
              required: 'El RUC o Cédula es requerido',
              pattern: { value: /^[0-9]+$/, message: 'Solo se permiten números' },
              minLength: { value: 10, message: 'Mínimo 10 dígitos' },
              maxLength: { value: 13, message: 'Máximo 13 dígitos' }
            })}
            className={inputClass}
            placeholder="Ej: 1790012345001"
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              e.target.value = val;
            }}
          />
          {errors.ruc && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.ruc.message}</p>}
        </div>

        {/* Porcentaje Comisión */}
        <div>
          <label className={labelClass}>Porcentaje Comisión (%) <span className="text-rose-500">*</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('porcentaje_comision', {
              required: 'El porcentaje es requerido',
              min: { value: 0, message: 'El porcentaje no puede ser negativo' },
              max: { value: 100, message: 'El porcentaje no puede ser mayor a 100%' }
            })}
            className={inputClass}
            placeholder="Ej: 10.50"
          />
          {errors.porcentaje_comision && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.porcentaje_comision.message}</p>}
        </div>

        {/* Dirección */}
        <div>
          <label className={labelClass}>Dirección <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('direccion', {
              required: 'La dirección es requerida',
              minLength: { value: 3, message: 'La dirección debe tener al menos 3 caracteres' }
            })}
            className={inputClass}
            placeholder="Dirección de la compañía"
          />
          {errors.direccion && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.direccion.message}</p>}
        </div>

        {/* Teléfono */}
        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            type="text"
            maxLength={10}
            {...register('telefono', {
              pattern: { value: /^[0-9]*$/, message: 'Solo se permiten números' },
              minLength: { value: 7, message: 'El teléfono debe tener al menos 7 dígitos' }
            })}
            className={inputClass}
            placeholder="Ej: 022345678"
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              e.target.value = val;
            }}
          />
          {errors.telefono && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.telefono.message}</p>}
        </div>

        {/* Celular */}
        <div>
          <label className={labelClass}>Celular</label>
          <input
            type="text"
            maxLength={10}
            {...register('celular', {
              pattern: { value: /^[0-9]*$/, message: 'Solo se permiten números' },
              minLength: { value: 10, message: 'El celular debe tener 10 dígitos' }
            })}
            className={inputClass}
            placeholder="Ej: 0998765432"
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              e.target.value = val;
            }}
          />
          {errors.celular && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.celular.message}</p>}
        </div>

        {/* Correo */}
        <div>
          <label className={labelClass}>Correo Electrónico</label>
          <input
            type="email"
            {...register('correo', {
              pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: 'Formato de correo electrónico inválido' }
            })}
            className={inputClass}
            placeholder="correo@ejemplo.com"
          />
          {errors.correo && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.correo.message}</p>}
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('estado')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>

        {/* Observación */}
        <div className="md:col-span-2">
          <label className={labelClass}>Observación</label>
          <textarea
            {...register('observacion')}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 resize-none"
            placeholder="Observaciones adicionales..."
          />
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

export default ConvenioForm;
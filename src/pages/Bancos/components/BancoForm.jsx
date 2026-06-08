import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const BancoForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      nombre_banco: initialData.ban_nombre || initialData.nombre_banco || '',
      numero_cuenta: initialData.numero_cuenta || '',
      tipo_cuenta: initialData.tipo_cuenta || '',
      ban_estado: initialData.ban_estado == 1 || initialData.ban_estado === '1',
    } : {
      nombre_banco: '',
      numero_cuenta: '',
      tipo_cuenta: '',
      ban_estado: true,
    }
  });

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, ban_estado: data.ban_estado ? '1' : '0' };
      if (isEditing) {
        await api.post('/banco/bancoactualizar', { ...payload, id_banco: initialData.id_banco });
      } else {
        await api.post('/banco/bancoinsertar', payload);
      }
      toast.success(isEditing ? 'Banco actualizado correctamente' : 'Banco creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando banco:', err);
      toast.error('Error al guardar el banco. ' + (err.response?.data?.mensaje || err.message));
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

        {/* Nombre del Banco */}
        <div className="md:col-span-2">
          <label className={labelClass}>
            Nombre del Banco <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('nombre_banco', { required: 'El nombre es requerido' })}
            className={`${inputClass} uppercase`}
            placeholder="Ej: BANCO PICHINCHA"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.nombre_banco && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_banco.message}</p>
          )}
        </div>

        {/* Número de Cuenta */}
        <div>
          <label className={labelClass}>
            Número de Cuenta <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('numero_cuenta', {
              required: 'El número de cuenta es requerido',
              pattern: { value: /^[0-9]+$/, message: 'Solo números permitidos' }
            })}
            className={inputClass}
            placeholder="Ej: 2200123456"
          />
          {errors.numero_cuenta && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.numero_cuenta.message}</p>
          )}
        </div>

        {/* Tipo de Cuenta */}
        <div>
          <label className={labelClass}>
            Tipo de Cuenta <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('tipo_cuenta', { required: 'El tipo de cuenta es requerido' })}
            className={inputClass}
          >
            <option value="">Seleccionar...</option>
            <option value="AHORROS">AHORROS</option>
            <option value="CORRIENTE">CORRIENTE</option>
          </select>
          {errors.tipo_cuenta && (
            <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.tipo_cuenta.message}</p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('ban_estado')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
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
            : <><i className="fas fa-save" />Guardar</>
          }
        </button>
      </div>
    </form>
  );
};

export default BancoForm;

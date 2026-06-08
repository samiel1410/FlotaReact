import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const ClienteForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      tipo_identificacion_cliente: initialData.tipo_identificacion_cliente || 'C',
      identificacion_cliente: initialData.identificacion_cliente || '',
      nombre_cliente: initialData.nombre_cliente || '',
      email_cliente: initialData.email_cliente || '',
      direccion_cliente: initialData.direccion_cliente || '',
      telefono_cliente: initialData.telefono_cliente || '',
      estado_clientes: initialData.estado_clientes == 1 || initialData.estado_clientes === '1',
    } : {
      tipo_identificacion_cliente: 'C',
      identificacion_cliente: '',
      nombre_cliente: '',
      email_cliente: '',
      direccion_cliente: '',
      telefono_cliente: '',
      estado_clientes: true,
    }
  });

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, estado_clientes: data.estado_clientes ? '1' : '0' };
      if (isEditing) payload.id_clientes = initialData.id_clientes;

      const res = await api.post('/cliente/ingresarActualizarCliente', payload);
      if (res.data?.success) {
        toast.success(isEditing ? 'Cliente actualizado' : 'Cliente creado');
        onSubmit(data);
      } else {
        toast.error(res.data?.mensaje || 'Error al guardar');
      }
    } catch (err) {
      toast.error('Error de servidor: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tipo Identificación *</label>
          <select {...register('tipo_identificacion_cliente', { required: 'Requerido' })} className={inputClass}>
            <option value="C">Cédula</option>
            <option value="R">RUC</option>
            <option value="P">Pasaporte</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Identificación *</label>
          <input
            type="text"
            {...register('identificacion_cliente', { required: 'Requerido' })}
            className={inputClass}
            placeholder="Ej: 1800123456"
          />
          {errors.identificacion_cliente && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.identificacion_cliente.message}</span>}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Nombre / Razón Social *</label>
          <input
            type="text"
            {...register('nombre_cliente', { required: 'Requerido' })}
            className={inputClass}
            placeholder="Nombre completo del cliente"
          />
          {errors.nombre_cliente && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.nombre_cliente.message}</span>}
        </div>

        <div>
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            {...register('email_cliente')}
            className={inputClass}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            type="text"
            {...register('telefono_cliente')}
            className={inputClass}
            placeholder="Ej: 0998765432"
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Dirección</label>
          <input
            type="text"
            {...register('direccion_cliente')}
            className={inputClass}
            placeholder="Dirección completa"
          />
        </div>

        <div>
          <label className={labelClass}>Estado</label>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input type="checkbox" className="sr-only peer" {...register('estado_clientes')} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-bold transition-all">
          <i className="fas fa-times mr-2"></i>Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-70 flex items-center gap-2">
          {loading ? <><i className="fas fa-spinner fa-spin"></i>Guardando...</> : <><i className="fas fa-save"></i>Guardar</>}
        </button>
      </div>
    </form>
  );
};

export default ClienteForm;
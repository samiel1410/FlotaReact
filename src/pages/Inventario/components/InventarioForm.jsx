import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

/**
 * InventarioForm — Ajuste de Stock
 * En ExtJS, el inventario no tenía un formulario de alta directa: 
 * los productos vienen de Alimentos y el inventario se gestiona
 * mediante "Ajuste de Stock". Este formulario implementa esa lógica.
 */
const InventarioForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [alimentos, setAlimentos] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      id_alimento: String(initialData.id_alimento || ''),
      id_sucursal: String(initialData.id_sucursal || ''),
      stock_actual: initialData.stock_actual || initialData.inv_stock || '',
      precio_alimentos: initialData.precio_alimentos || initialData.inv_precio || '',
      observacion: initialData.observacion || '',
      tipo_movimiento: 'AJUSTE',
    } : {
      id_alimento: '',
      id_sucursal: '',
      stock_actual: '',
      precio_alimentos: '',
      observacion: '',
      tipo_movimiento: 'ENTRADA',
    }
  });

  useEffect(() => {
    Promise.all([
      api.get('/alimentos/seleccionarAlimentos'),
      api.get('/sucursal/sucursalselect'),
    ]).then(([aliRes, sucRes]) => {
      setAlimentos(aliRes.data.data || []);
      setSucursales(sucRes.data.data || []);
    }).catch(err => console.error('Error cargando datos:', err));
  }, []);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      if (isEditing) {
        await api.post('/inventario/ajusteinventario', {
          ...data,
          id_inventario: initialData.id_inventario,
        });
      } else {
        await api.post('/inventario/ajusteinventario', data);
      }
      toast.success(isEditing ? 'Inventario actualizado correctamente' : 'Inventario creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando inventario:', err);
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

      {/* Banner informativo */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <i className="fas fa-info-circle text-amber-500 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium">
          {isEditing
            ? 'Modifica el stock o precio del producto seleccionado. Se registrará un movimiento de AJUSTE.'
            : 'Registra una entrada de stock para un producto. El movimiento quedará en el historial de inventario.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Producto */}
        <div>
          <label className={labelClass}>Producto <span className="text-rose-500">*</span></label>
          <select
            {...register('id_alimento', { required: 'El producto es requerido' })}
            className={inputClass}
            disabled={isEditing}
          >
            <option value="">Seleccionar producto...</option>
            {alimentos.map(a => (
              <option key={a.id_alimentos || a.id_alimento} value={a.id_alimentos || a.id_alimento}>
                {a.ali_nombre || a.nombre_alimentos}
              </option>
            ))}
          </select>
          {errors.id_alimento && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_alimento.message}</p>}
        </div>

        {/* Sucursal */}
        <div>
          <label className={labelClass}>Sucursal <span className="text-rose-500">*</span></label>
          <select
            {...register('id_sucursal', { required: 'La sucursal es requerida' })}
            className={inputClass}
          >
            <option value="">Seleccionar sucursal...</option>
            {sucursales.map(s => (
              <option key={s.id_sucursal || s.suc_codigo_sucursal} value={s.id_sucursal || s.suc_codigo_sucursal}>
                {s.nombre_sucursal || s.suc_nombre}
              </option>
            ))}
          </select>
          {errors.id_sucursal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_sucursal.message}</p>}
        </div>

        {/* Tipo de Movimiento */}
        <div>
          <label className={labelClass}>Tipo de Movimiento <span className="text-rose-500">*</span></label>
          <select
            {...register('tipo_movimiento', { required: 'El tipo es requerido' })}
            className={inputClass}
          >
            <option value="ENTRADA">ENTRADA (Ingreso de stock)</option>
            <option value="AJUSTE">AJUSTE (Corrección manual)</option>
            {isEditing && <option value="SALIDA">SALIDA (Baja de stock)</option>}
          </select>
        </div>

        {/* Cantidad / Stock */}
        <div>
          <label className={labelClass}>
            {isEditing ? 'Stock Actualizado' : 'Cantidad a Ingresar'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            {...register('stock_actual', {
              required: 'La cantidad es requerida',
              min: { value: 0, message: 'Debe ser mayor a 0' }
            })}
            className={inputClass}
            placeholder="Ej: 10"
          />
          {errors.stock_actual && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.stock_actual.message}</p>}
        </div>

        {/* Precio */}
        <div>
          <label className={labelClass}>Precio unitario ($)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            {...register('precio_alimentos')}
            className={inputClass}
            placeholder="Ej: 2.50"
          />
        </div>

        {/* Observación */}
        <div className="md:col-span-2">
          <label className={labelClass}>Observación</label>
          <textarea
            {...register('observacion')}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 resize-none"
            placeholder="Motivo del ajuste o entrada de stock..."
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
            : <><i className="fas fa-save" />{isEditing ? 'Ajustar' : 'Registrar Entrada'}</>
          }
        </button>
      </div>
    </form>
  );
};

export default InventarioForm;

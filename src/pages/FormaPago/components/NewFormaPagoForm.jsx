import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import EstadoSelect from '../../../components/common/EstadoSelect';
import TipoFormaPagoSelect from '../../../components/common/TipoFormaPagoSelect';
import SRICodeSelect from '../../../components/common/SRICodeSelect';

const NewFormaPagoForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm();

  useEffect(() => {
    if (initialData) {
      reset({
        codigo_forma_pago: initialData.codigo_forma_pago || '',
        nombre_forma_pago: initialData.nombre_forma_pago || '',
        tipo_forma_pago: initialData.tipo_forma_pago || '1',
        id_fkcodigo_pago_sri: initialData.id_fkcodigo_pago_sri || '',
        estado_forma_pago: String(initialData.estado_forma_pago_cuenta ?? 1),
        check_registra_cheque: initialData.registra_cheque === '1' || initialData.registra_cheque === 1,
      });
    } else {
      reset({
        codigo_forma_pago: '',
        nombre_forma_pago: '',
        tipo_forma_pago: '1',
        id_fkcodigo_pago_sri: '',
        estado_forma_pago: '1',
        check_registra_cheque: false,
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        check_registra_cheque: data.check_registra_cheque ? '1' : '0',
      };
      if (isEditing) {
        payload.id_forma_pago = initialData.id_forma_pago;
      }
      await api.post('/formapago/insertarActualizarformapago', payload);
      toast.success(isEditing ? 'Forma de pago actualizada correctamente' : 'Forma de pago creada correctamente');
      onSubmit();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";

  // Watchers for custom selects if they don't support react-hook-form nicely
  const tipoFormaPagoValue = watch('tipo_forma_pago');
  const sriCodeValue = watch('id_fkcodigo_pago_sri');
  const estadoValue = watch('estado_forma_pago');

  // Register the fields
  useEffect(() => {
    register('tipo_forma_pago', { required: 'El tipo es requerido' });
    register('id_fkcodigo_pago_sri', { required: 'El código SRI es requerido' });
    register('estado_forma_pago');
  }, [register]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Código */}
        <div>
          <label className={labelClass}>Código <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('codigo_forma_pago', { 
              required: 'El código es requerido',
              pattern: { value: /^[0-9]+$/, message: 'Solo números' },
              maxLength: { value: 10, message: 'Máximo 10 dígitos' }
            })}
            maxLength="10"
            className={inputClass}
            placeholder="Ej: 01"
          />
          {errors.codigo_forma_pago && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.codigo_forma_pago.message}</p>}
        </div>

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('nombre_forma_pago', { required: 'El nombre es requerido' })}
            className={inputClass}
            placeholder="Ej: Efectivo"
          />
          {errors.nombre_forma_pago && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.nombre_forma_pago.message}</p>}
        </div>

        {/* Tipo Forma Pago */}
        <div>
          <label className={labelClass}>Tipo <span className="text-rose-500">*</span></label>
          <div className="w-full">
            <TipoFormaPagoSelect
              value={tipoFormaPagoValue}
              onChange={(e) => setValue('tipo_forma_pago', e.target.value)}
              name="tipo_forma_pago"
              className={inputClass}
            />
          </div>
          {errors.tipo_forma_pago && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.tipo_forma_pago.message}</p>}
        </div>

        {/* Código SRI */}
        <div>
          <label className={labelClass}>Código SRI <span className="text-rose-500">*</span></label>
          <div className="w-full">
            <SRICodeSelect
              value={sriCodeValue}
              onChange={(e) => setValue('id_fkcodigo_pago_sri', e.target.value)}
              name="id_fkcodigo_pago_sri"
              className={inputClass}
            />
          </div>
          {errors.id_fkcodigo_pago_sri && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.id_fkcodigo_pago_sri.message}</p>}
        </div>

        {/* Estado */}
        <div>
          <label className={labelClass}>Estado</label>
          <div className="w-full">
            <EstadoSelect
              value={estadoValue}
              onChange={(e) => setValue('estado_forma_pago', e.target.value)}
              name="estado_forma_pago"
              readOnly={true}
              className={inputClass}
            />
          </div>
        </div>

        {/* Registra Cheque */}
        <div className="md:col-span-2 flex items-center h-full pt-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                {...register('check_registra_cheque')}
                className="peer sr-only"
              />
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-500"></div>
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
              Registra Cheques
            </span>
          </label>
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

export default NewFormaPagoForm;

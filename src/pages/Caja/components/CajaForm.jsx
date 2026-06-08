import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import cajaService from '../../../services/caja.service';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';

export const CajaForm = ({ initialData, onClose, onSave }) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      fecha: format(new Date(), 'yyyy-MM-dd'),
      tipo: '',
      valor: '',
      descripcion: ''
    }
  });

  const fechaValue = watch('fecha');

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        fecha: initialData.fecha ? format(parseISO(initialData.fecha), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      });
    } else {
      reset({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        tipo: '',
        valor: '',
        descripcion: ''
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      valor: parseFloat(data.valor),
      fecha: format(new Date(data.fecha), 'yyyy-MM-dd')
    };

    let response;
    if (initialData && initialData.caja_id) {
      response = await cajaService.updateCaja(initialData.caja_id, payload);
    } else {
      response = await cajaService.createCaja(payload);
    }

    if (response.success) {
      toast.success('Registro de caja guardado exitosamente!');
      onSave();
      onClose();
    } else {
      toast.error(response.message || 'Error al guardar el registro de caja.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <div>
        <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha</label>
        <DatePicker
          selected={fechaValue ? parseISO(fechaValue) : null}
          onChange={(date) => setValue('fecha', format(date, 'yyyy-MM-dd'))}
          dateFormat="yyyy-MM-dd"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha.message}</p>}
      </div>

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
        <select
          id="tipo"
          {...register('tipo', { required: 'El tipo es requerido' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Seleccione un tipo</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        {errors.tipo && <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>}
      </div>

      <div>
        <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor</label>
        <input
          type="number"
          id="valor"
          {...register('valor', {
            required: 'El valor es requerido',
            min: { value: 0.01, message: 'El valor debe ser mayor a 0' }
          })}
          step="0.01"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          id="descripcion"
          {...register('descripcion', { required: 'La descripción es requerida' })}
          rows="3"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        ></textarea>
        {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Guardar
        </button>
      </div>
    </form>
  );
};
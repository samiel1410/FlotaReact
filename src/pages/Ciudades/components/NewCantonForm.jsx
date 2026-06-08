import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import { IoMdArrowBack } from 'react-icons/io';
import { MdSave } from 'react-icons/md';

export const NewCantonForm = ({ initialData, onSubmit, onCancel }) => {
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setIsEdit(true);
    } else {
      setIsEdit(false);
    }
  }, [initialData]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      nombre_canton: initialData?.nombre_canton || '',
      id_fkprovincia: initialData?.id_fkprovincia || '',
    },
  });

  useEffect(() => {
    reset({
      nombre_canton: initialData?.nombre_canton || '',
      id_fkprovincia: initialData?.id_fkprovincia || '',
    });
  }, [initialData, reset]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        id: isEdit ? initialData.id_canton : null,
        nombre_canton: data.nombre_canton.toUpperCase(),
        id_fkprovincia: data.id_fkprovincia,
      };
      await api.post('/canton/cantonInsertarActualizar', payload);
      toast.success(isEdit ? 'Cantón actualizado correctamente' : 'Cantón creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando cantón:', err);
      toast.error('Error al guardar el cantón. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">
              Nombre del Cantón <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nombre_canton', { required: 'El nombre es requerido' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingrese nombre del cantón"
              style={{ textTransform: 'uppercase' }}
            />
            {errors.nombre_canton && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre_canton.message}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">
              Código de Provincia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('id_fkprovincia', { required: 'El código es requerido' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingrese código de provincia"
            />
            {errors.id_fkprovincia && (
              <p className="text-red-500 text-sm mt-1">{errors.id_fkprovincia.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <IoMdArrowBack /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>
                <MdSave /> Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCantonForm;
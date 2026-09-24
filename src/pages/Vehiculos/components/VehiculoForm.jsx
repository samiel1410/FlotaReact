import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const TIPOS_VEHICULO = [
  { value: 'Camión', label: 'Camión' },
  { value: 'Camioneta', label: 'Camioneta' },
  { value: 'Automóvil', label: 'Automóvil' }
];

export const VehiculoForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [personalList, setPersonalList] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      ...initialData,
      estado_vehiculo: (initialData.estado_vehiculo ?? 1) == 1
    } : {
      tipo_vehiculo: 'Camión',
      numero_vehiculo: '',
      placa_vehiculo: '',
      marca_vehiculo: '',
      modelo_vehiculo: '',
      id_fkpersonal_responsable: '',
      nombre_responsable: '',
      telefono_responsable: '',
      estado_vehiculo: true
    }
  });

  const selectedPersonalId = watch('id_fkpersonal_responsable');

  useEffect(() => {
    const fetchPersonal = async () => {
      setLoadingCombos(true);
      try {
        const res = await api.get('/personal/personalSelectCombo');
        const list = res.data?.data || res.data || [];
        setPersonalList(list);
      } catch (err) {
        console.error('Error cargando personal:', err);
      } finally {
        setLoadingCombos(false);
      }
    };
    fetchPersonal();
  }, []);

  // Al seleccionar personal del combo, auto-llenar nombre y teléfono si no tiene
  const handlePersonalChange = (val) => {
    setValue('id_fkpersonal_responsable', val);
    const p = personalList.find(item => String(item.id_personal || item.per_codigo_personal) === String(val));
    if (p) {
      const nombreCompleto = `${p.per_nombres_persona || p.nombre_personal || ''} ${p.per_apellidos_personal || ''}`.trim();
      setValue('nombre_responsable', nombreCompleto);
      setValue('telefono_responsable', p.per_celular_personal || p.telefono || '');
    }
  };

  const handleFormSubmit = (data) => {
    const payload = {
      ...data,
      id_vehiculo: isEditing ? (initialData.id_vehiculo || initialData.id) : undefined,
      estado_vehiculo: data.estado_vehiculo ? 1 : 0
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de Vehículo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Tipo de Vehículo <span className="text-red-500">*</span>
          </label>
          <Controller
            name="tipo_vehiculo"
            control={control}
            rules={{ required: 'Seleccione el tipo de vehículo' }}
            render={({ field }) => (
              <SearchableSelect
                options={TIPOS_VEHICULO}
                value={field.value}
                onChange={field.onChange}
                placeholder="Seleccione el tipo..."
                isClearable={false}
              />
            )}
          />
          {errors.tipo_vehiculo && (
            <span className="text-red-500 text-xs font-semibold mt-0.5 block">{errors.tipo_vehiculo.message}</span>
          )}
        </div>

        {/* Número del Vehículo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Número de Vehículo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('numero_vehiculo', { required: 'El número de vehículo es requerido' })}
            placeholder="Ej: 1, 102, C-05"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
          {errors.numero_vehiculo && (
            <span className="text-red-500 text-xs font-semibold mt-0.5 block">{errors.numero_vehiculo.message}</span>
          )}
        </div>

        {/* Placa */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Placa <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('placa_vehiculo', { required: 'La placa es requerida' })}
            placeholder="Ej: TBA-8026"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
          {errors.placa_vehiculo && (
            <span className="text-red-500 text-xs font-semibold mt-0.5 block">{errors.placa_vehiculo.message}</span>
          )}
        </div>

        {/* Marca */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marca</label>
          <input
            type="text"
            {...register('marca_vehiculo')}
            placeholder="Ej: Hino, Chevrolet, Toyota"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo</label>
          <input
            type="text"
            {...register('modelo_vehiculo')}
            placeholder="Ej: Dutro 716, D-Max, Hilux"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Personal Responsable (Selector) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Personal / Conductor Asignado
          </label>
          <SearchableSelect
            options={personalList.map(p => ({
              value: String(p.id_personal || p.per_codigo_personal),
              label: `${p.per_cedula_personal ? `[${p.per_cedula_personal}] ` : ''}${p.per_nombres_persona || p.nombre_personal || ''} ${p.per_apellidos_personal || ''}`.trim()
            }))}
            value={selectedPersonalId}
            onChange={handlePersonalChange}
            placeholder="Buscar chofer / responsable..."
          />
        </div>

        {/* Nombre Responsable (Texto libre o auto-completado) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nombre Responsable
          </label>
          <input
            type="text"
            {...register('nombre_responsable')}
            placeholder="Nombre del responsable del vehículo"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Teléfono Responsable */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Teléfono de Contacto
          </label>
          <input
            type="text"
            {...register('telefono_responsable')}
            placeholder="Ej: 0987654321"
            className="w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Estado Activo / Inactivo */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            {...register('estado_vehiculo')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          <span className="ml-3 text-xs font-bold text-slate-700 uppercase">Vehículo Activo</span>
        </label>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg uppercase tracking-wider transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm uppercase tracking-wider transition-colors"
        >
          {isEditing ? 'Actualizar Vehículo' : 'Guardar Vehículo'}
        </button>
      </div>
    </form>
  );
};

export default VehiculoForm;

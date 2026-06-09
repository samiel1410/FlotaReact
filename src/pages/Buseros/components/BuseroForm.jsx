import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const BuseroForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      per_codigo_personal: initialData.per_codigo_personal || initialData.soc_codigo || '',
      per_cedula_personal: initialData.per_cedula_personal || initialData.soc_cedula || '',
      per_nombres_persona: initialData.per_nombres_persona || initialData.soc_nombres || '',
      per_apellidos_personal: initialData.per_apellidos_personal || initialData.soc_apellidos || '',
      genero_personal: String(initialData.genero_personal || ''),
      celular_personal: initialData.celular_personal || initialData.soc_telefono || '',
      telefono_personal: initialData.telefono_personal || '',
      fecha_nacimiento_personal: initialData.fecha_nacimiento_personal || '',
      estado_civil_personal: String(initialData.estado_civil_personal || ''),
      perfil_personal: initialData.perfil_personal || '',
      tipo_licencia: String(initialData.tipo_licencia || ''),
      puntos_licencia: initialData.puntos_licencia || '',
      estado_personal: (initialData.estado_personal ?? initialData.soc_estado ?? 1) == 1 || (initialData.estado_personal ?? initialData.soc_estado ?? 1) === '1',
    } : {
      per_codigo_personal: '',
      per_cedula_personal: '',
      per_nombres_persona: '',
      per_apellidos_personal: '',
      genero_personal: '',
      celular_personal: '',
      telefono_personal: '',
      fecha_nacimiento_personal: '',
      estado_civil_personal: '',
      perfil_personal: '',
      tipo_licencia: '',
      puntos_licencia: '',
      estado_personal: true,
    }
  });

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, estado_personal: data.estado_personal ? '1' : '0' };
      if (isEditing) {
        await api.post('/personal/actualizarPersonal', {
          ...payload,
          id_personal: initialData.id_personal || initialData.id_socio
        });
      } else {
        await api.post('/personal/insertarPersonal', payload);
      }
      toast.success(isEditing ? 'Busero actualizado' : 'Busero creado');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando busero:', err);
      toast.error('Error al guardar el busero. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1 flex items-center gap-1";
  const sectionClass = "bg-slate-50 rounded-xl p-4 border border-slate-100";
  const sectionTitle = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">

      {/* ── Información Básica ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-id-card text-indigo-400" />Información Básica</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className={labelClass}>Código Personal <span className="text-rose-500">*</span></label>
            <input
              type="text"
              {...register('per_codigo_personal', {
                required: 'El código es requerido',
                pattern: { value: /^[0-9]+$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 001"
            />
            {errors.per_codigo_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_codigo_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Cédula <span className="text-rose-500">*</span></label>
            <input
              type="text"
              maxLength={15}
              {...register('per_cedula_personal', {
                required: 'La cédula es requerida',
                pattern: { value: /^[0-9]+$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 1800123456"
            />
            {errors.per_cedula_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_cedula_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Nombres <span className="text-rose-500">*</span></label>
            <input
              type="text"
              {...register('per_nombres_persona', { required: 'Los nombres son requeridos' })}
              className={inputClass}
              placeholder="Nombres completos"
            />
            {errors.per_nombres_persona && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_nombres_persona.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Apellidos <span className="text-rose-500">*</span></label>
            <input
              type="text"
              {...register('per_apellidos_personal', { required: 'Los apellidos son requeridos' })}
              className={inputClass}
              placeholder="Apellidos completos"
            />
            {errors.per_apellidos_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.per_apellidos_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Género <span className="text-rose-500">*</span></label>
            <select
              {...register('genero_personal', { required: 'El género es requerido' })}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              <option value="1">Masculino</option>
              <option value="2">Femenino</option>
              <option value="3">Otro</option>
            </select>
            {errors.genero_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.genero_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Fecha de Nacimiento</label>
            <input
              type="date"
              {...register('fecha_nacimiento_personal')}
              className={inputClass}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      {/* ── Información Personal ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-phone text-emerald-400" />Contacto Personal</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <label className={labelClass}>Estado Civil</label>
            <select {...register('estado_civil_personal')} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="1">Soltero/a</option>
              <option value="2">Casado/a</option>
              <option value="3">Divorciado/a</option>
              <option value="4">Viudo/a</option>
              <option value="5">Unión Libre</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Celular <span className="text-rose-500">*</span></label>
            <input
              type="text"
              maxLength={15}
              {...register('celular_personal', {
                required: 'El celular es requerido',
                pattern: { value: /^[0-9]+$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 0998765432"
              onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
            />
            {errors.celular_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.celular_personal.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="text"
              maxLength={15}
              {...register('telefono_personal', {
                pattern: { value: /^[0-9]*$/, message: 'Solo números' }
              })}
              className={inputClass}
              placeholder="Ej: 032765432"
              onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
            />
            {errors.telefono_personal && <p className={errorClass}><i className="fas fa-exclamation-circle" />{errors.telefono_personal.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Información Laboral ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}><i className="fas fa-briefcase text-amber-400" />Información Laboral</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <label className={labelClass}>Perfil</label>
            <select {...register('perfil_personal')} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="0">Conductor</option>
              <option value="1">Auxiliar</option>
              <option value="2">Socio</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Tipo de Licencia</label>
            <select {...register('tipo_licencia')} className={inputClass}>
              <option value="">Seleccionar...</option>
              <option value="1">Tipo A</option>
              <option value="2">Tipo B</option>
              <option value="3">Tipo C</option>
              <option value="4">Tipo D</option>
              <option value="5">Tipo E</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Puntos de Licencia</label>
            <input
              type="number"
              min={0}
              max={30}
              {...register('puntos_licencia')}
              className={inputClass}
              placeholder="Ej: 30"
            />
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input type="checkbox" className="sr-only peer" {...register('estado_personal')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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

export default BuseroForm;
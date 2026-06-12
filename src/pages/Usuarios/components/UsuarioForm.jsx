import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../../components/common/ToggleSwitch';

const UsuarioForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: isEditing ? {
      ...initialData,
      estado_usuario: initialData.estado_usuario ?? initialData.estado ?? 1
    } : {
      rol: '',
      id_fkrol_usuario: '',
      nombre_usuario: '',
      apellido_usuario: '',
      username_usuario: '',
      telefono_usuario: '',
      punto_emision_usuario: '',
      punto_emision_boleteria: '',
      correo_usuario: '',
      clave_usuario: '',
      id_fksucursal_usuario: '',
      id_fkprovincia_usuario: '',
      id_fkciudad_usuario: '',
      id_fklugar: '',
      estado_usuario: 1,
      per_personal_usuario: 0
    }
  });

  const [loading, setLoading] = useState(false);
  const [combos, setCombos] = useState({
    roles: [],
    sucursales: [],
    provincias: [],
    ciudades: [],
    lugares: []
  });

  // Watch for cascading combo values
  const selectedSucursal = watch('id_fksucursal_usuario');
  const selectedProvincia = watch('id_fkprovincia_usuario');
  const selectedCiudad = watch('id_fkciudad_usuario');

  useEffect(() => {
    // Load initial standalone combos
    const loadCombos = async () => {
      try {
        const [rolesRes, sucursalesRes, provRes] = await Promise.all([
          api.get('/roles/rolesSeleccionCombo'),
          api.get('/sucursal/sucursalselect'),
          api.get('/locacion/seleccionarProvincia') // As per Provincia.js legacy store
        ]);
        
        setCombos(prev => ({
          ...prev,
          roles: rolesRes.data.data || [],
          sucursales: sucursalesRes.data.data || [],
          provincias: provRes.data.data || []
        }));
      } catch (err) {
        console.error('Error cargando combos:', err);
      }
    };
    loadCombos();
  }, []);

  useEffect(() => {
    if (initialData) {
      // Explicitly set values for select elements to ensure they are pre-selected
      setValue('rol', String(initialData.rol || ''));
      setValue('id_fkrol_usuario', String(initialData.id_fkrol_usuario || ''));
      // You might need to set other fields here too if they are not pre-filling correctly
      // For example:
      // setValue('nombre_usuario', initialData.nombre_usuario || '');
      // setValue('apellido_usuario', initialData.apellido_usuario || '');
      // ...
    }
  }, [initialData, setValue]);

  // Cascade Sucursal -> Ciudad -> Lugar logic
  // In a full implementation we would filter based on ExtJS logic:
  // "Al seleccionar sucursal, autoselecciona ciudad y provincia"
  useEffect(() => {
    if (selectedSucursal) {
      const sucursal = combos.sucursales.find(s => String(s.suc_codigo_sucursal) === String(selectedSucursal));
      if (sucursal && sucursal.ciudad_sucursal) {
        // En una implementación real, aquí buscaríamos el id_canton correspondiente a sucursal.ciudad_sucursal
        // y el id_provincia, y usaríamos setValue().
      }
    }
  }, [selectedSucursal, combos.sucursales]);

  // Load Ciudades based on Provincia
  useEffect(() => {
    if (selectedProvincia) {
      api.get(`/locacion/seleccionarCiudad?id_provincia=${selectedProvincia}`).then(res => {
        const data = res.data.data || [];
        setCombos(prev => ({ ...prev, ciudades: data }));
        // Asegurar selección al editar
        if (isEditing && initialData.id_fkciudad_usuario) {
          setValue('id_fkciudad_usuario', String(initialData.id_fkciudad_usuario));
        }
      });
    }
  }, [selectedProvincia, isEditing, initialData, setValue]);

  // Load Lugares based on Ciudad
  useEffect(() => {
    if (selectedCiudad) {
      api.get('/lugares/seleccionLugarCombo').then(res => {
        const data = res.data.data || [];
        setCombos(prev => ({ ...prev, lugares: data }));
        // Asegurar selección al editar
        if (isEditing && initialData.id_fklugar) {
          setValue('id_fklugar', String(initialData.id_fklugar));
        }
      });
    }
  }, [selectedCiudad, isEditing, initialData, setValue]);

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, estado_usuario: data.estado_usuario ? '1' : '0' };
      if (isEditing) {
        await api.post('/usuario/usuarioActualizar', { ...payload, id_usuario: initialData.id_usuario });
      } else {
        await api.post('/usuario/usuarioIngresar', payload);
      }
      toast.success(isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      onSubmit(data);
    } catch (err) {
      console.error('Error guardando usuario:', err);
      toast.error('Error al guardar el usuario. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Roles */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rol Móvil <span className="text-red-500">*</span></label>
          <select 
            {...register('rol', { required: 'El rol móvil es requerido' })} 
            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 p-2 border"
          >
            <option value="">Seleccionar</option>
            <option value="1">Administrador</option>
            <option value="2">Busero</option>
            <option value="4">Oficinista</option>
            <option value="5">Super Administrador</option>
          </select>
          {errors.rol && <span className="text-red-500 text-xs">{errors.rol.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rol Web <span className="text-red-500">*</span></label>
          <select 
            {...register('id_fkrol_usuario', { required: 'El rol web es requerido' })} 
            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 p-2 border"
          >
            <option value="">Seleccionar</option>
            {combos.roles.map(r => (
              <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
            ))}
          </select>
          {errors.id_fkrol_usuario && <span className="text-red-500 text-xs">{errors.id_fkrol_usuario.message}</span>}
        </div>

        {/* Datos Personales */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register('nombre_usuario', { 
              required: 'El nombre es requerido', 
              pattern: { 
                value: /^[a-zA-Z0-9áíóúéñÑ\s]+$/, 
                message: 'Formato de nombre inválido' 
              }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          />
          {errors.nombre_usuario && <span className="text-red-500 text-xs">{errors.nombre_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Apellido <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register('apellido_usuario', { 
              required: 'El apellido es requerido',
              minLength: { value: 2, message: 'El apellido debe tener al menos 2 caracteres' }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          />
          {errors.apellido_usuario && <span className="text-red-500 text-xs">{errors.apellido_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuario (Username) <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register('username_usuario', { required: 'El nombre de usuario es requerido' })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          />
          {errors.username_usuario && <span className="text-red-500 text-xs">{errors.username_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            maxLength="10"
            {...register('telefono_usuario', { 
              required: 'El teléfono es requerido', 
              pattern: { 
                value: /^[0-9]{10}$/, 
                message: 'El teléfono debe tener 10 dígitos numéricos' 
              }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
            onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
          />
          {errors.telefono_usuario && <span className="text-red-500 text-xs">{errors.telefono_usuario.message}</span>}
        </div>

        {/* Puntos de Emisión */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">P. Venta G. <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            maxLength="3"
            {...register('punto_emision_usuario', { 
              required: 'El punto de venta G. es requerido', 
              pattern: { 
                value: /^[0-9]+$/, 
                message: 'Debe ser un número' 
              }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
            onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
          />
          {errors.punto_emision_usuario && <span className="text-red-500 text-xs">{errors.punto_emision_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">P. Venta B. <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            maxLength="3"
            {...register('punto_emision_boleteria', { 
              required: 'El punto de venta B. es requerido', 
              pattern: { 
                value: /^[0-9]+$/, 
                message: 'Debe ser un número' 
              }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
            onChange={e => e.target.value = e.target.value.replace(/\D/g, '')}
          />
          {errors.punto_emision_boleteria && <span className="text-red-500 text-xs">{errors.punto_emision_boleteria.message}</span>}
        </div>

        {/* Credenciales */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo <span className="text-red-500">*</span></label>
          <input 
            type="email" 
            {...register('correo_usuario', { 
              required: 'El correo es requerido', 
              pattern: { 
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, 
                message: 'Formato de correo inválido' 
              }
            })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          />
          {errors.correo_usuario && <span className="text-red-500 text-xs">{errors.correo_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Clave <span className="text-red-500">*</span></label>
          <input 
            type="password" 
            {...register('clave_usuario', { required: !isEditing ? 'La clave es requerida' : false })} 
            placeholder={isEditing ? "(Dejar en blanco para no cambiar)" : ""}
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          />
          {errors.clave_usuario && <span className="text-red-500 text-xs">{errors.clave_usuario.message}</span>}
        </div>

        {/* Locaciones */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal <span className="text-red-500">*</span></label>
          <select 
            {...register('id_fksucursal_usuario', { required: 'La sucursal es requerida' })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          >
            <option value="">Seleccionar</option>
            {combos.sucursales.map(s => (
              <option key={s.suc_codigo_sucursal} value={s.suc_codigo_sucursal}>{s.nombre_sucursal || s.suc_nombre}</option>
            ))}
          </select>
          {errors.id_fksucursal_usuario && <span className="text-red-500 text-xs">{errors.id_fksucursal_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Provincia <span className="text-red-500">*</span></label>
          <select 
            {...register('id_fkprovincia_usuario', { required: 'La provincia es requerida' })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
          >
            <option value="">Seleccionar</option>
            {combos.provincias.map(p => (
              <option key={p.id_provincia} value={p.id_provincia}>{p.nombre_provincia}</option>
            ))}
          </select>
          {errors.id_fkprovincia_usuario && <span className="text-red-500 text-xs">{errors.id_fkprovincia_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad <span className="text-red-500">*</span></label>
          <select 
            {...register('id_fkciudad_usuario', { required: selectedProvincia ? 'La ciudad es requerida' : false })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border disabled:bg-slate-100"
            disabled={!selectedProvincia}
          >
            <option value="">Seleccionar</option>
            {combos.ciudades.map(c => (
              <option key={c.id_canton} value={c.id_canton}>{c.nombre_canton}</option>
            ))}
          </select>
          {errors.id_fkciudad_usuario && <span className="text-red-500 text-xs">{errors.id_fkciudad_usuario.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lugar <span className="text-red-500">*</span></label>
          <select 
            {...register('id_fklugar', { required: selectedCiudad ? 'El lugar es requerido' : false })} 
            className="w-full border-slate-300 rounded-md shadow-sm p-2 border disabled:bg-slate-100"
            disabled={!selectedCiudad}
          >
            <option value="">Seleccionar Ciudad primero</option>
            {combos.lugares.map(l => (
              <option key={l.id_lugar} value={l.id_lugar}>{l.nombre_lugar}</option>
            ))}
          </select>
          {errors.id_fklugar && <span className="text-red-500 text-xs">{errors.id_fklugar.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <ToggleSwitch 
            register={register('estado_usuario')}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-medium flex items-center"
        >
          {loading ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i> Guardando...</>
          ) : (
            <><i className="fas fa-save mr-2"></i> Guardar</>
          )}
        </button>
      </div>
    </form>
  );
};

export default UsuarioForm;

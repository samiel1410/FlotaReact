import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const inputClass = "w-full pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all";
const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

export const NotificacionForm = ({ onSuccess, onCancel }) => {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: { tipo_envio: 'rol', rol: '0', id_usuario: '' }
  });
  const tipoEnvio = watch('tipo_envio');
  
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Cargar roles y usuarios
    const fetchData = async () => {
      try {
        const [resRoles, resUsuarios] = await Promise.all([
          api.get('/roles/rolesSeleccionPaginado'),
          api.get('/usuario/usuarioSeleccionarPaginado?limit=1000&page=1') // Ajusta si hay otro endpoint
        ]);
        
        if (resRoles.data?.success && Array.isArray(resRoles.data.data)) {
          // Filtrar roles 1 y 5 si ya vienen para no duplicar, luego los inyectaremos
          const fetchedRoles = resRoles.data.data.filter(r => r.id_rol != 1 && r.id_rol != 5);
          setRoles([
            { id_rol: 5, nombre_rol: 'Super Administrador' },
            { id_rol: 1, nombre_rol: 'Administrador' },
            ...fetchedRoles
          ]);
        }
        
        if (resUsuarios.data?.success && Array.isArray(resUsuarios.data.data)) {
          setUsuarios(resUsuarios.data.data);
        }
      } catch (error) {
        console.error('Error cargando datos', error);
      }
    };
    fetchData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImagePreview(evt.target.result);
        setImageBase64(evt.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setImageBase64('');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        titulo: data.titulo,
        mensaje: data.mensaje,
      };
      
      if (data.tipo_envio === 'rol') {
        payload.rol = data.rol || 0;
      } else {
        payload.id_usuario = data.id_usuario;
        payload.rol = 0;
      }

      if (imageBase64) {
        payload.imagen = imageBase64;
      }

      const res = await api.post('/notificaciones/EnviarNotificaciones', payload);
      
      if (res.data?.success) {
        toast.success(res.data.data || 'Notificación enviada correctamente');
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.data?.data || res.data?.mensaje || 'Error al enviar notificación');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión al enviar notificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-1">
      <div className="flex items-center gap-4 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
          <input type="radio" value="rol" {...register('tipo_envio')} className="w-4 h-4 text-blue-600" />
          Enviar por Rol
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
          <input type="radio" value="usuario" {...register('tipo_envio')} className="w-4 h-4 text-blue-600" />
          Enviar por Usuario
        </label>
      </div>

      {tipoEnvio === 'rol' ? (
        <div>
          <label className={labelClass}>Rol Destinatario</label>
          <select 
            {...register('rol')} 
            className={inputClass}
          >
            <option value="0">Todos los Roles (0)</option>
            {roles.map(rol => (
              <option key={rol.id_rol} value={rol.id_rol}>
                {rol.nombre_rol}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Selecciona 0 para enviar a todos los usuarios con token registrado.</p>
        </div>
      ) : (
        <div>
          <label className={labelClass}>Usuario Destinatario</label>
          <select 
            {...register('id_usuario', { required: tipoEnvio === 'usuario' ? 'Selecciona un usuario' : false })} 
            className={inputClass}
          >
            <option value="">-- Seleccionar Usuario --</option>
            {usuarios.map(u => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.username_usuario || u.nombre_usuario} - {u.nombre_rol || 'Sin Rol'}
              </option>
            ))}
          </select>
          {errors.id_usuario && <p className="text-red-500 text-xs mt-1 font-medium">{errors.id_usuario.message}</p>}
        </div>
      )}

      <div>
        <label className={labelClass}>Título</label>
        <input 
          type="text" 
          {...register('titulo', { required: 'El título es obligatorio' })} 
          className={inputClass} 
          placeholder="Ej: Nueva Actualización" 
        />
        {errors.titulo && <p className="text-red-500 text-xs mt-1 font-medium">{errors.titulo.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Mensaje</label>
        <textarea 
          {...register('mensaje', { required: 'El mensaje es obligatorio' })} 
          className={inputClass} 
          rows="3"
          placeholder="Contenido de la notificación..."
        ></textarea>
        {errors.mensaje && <p className="text-red-500 text-xs mt-1 font-medium">{errors.mensaje.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Imagen Adjunta (Opcional)</label>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover border border-slate-200 rounded-lg shadow-sm" />
            ) : (
              <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
                <i className="fas fa-image text-2xl"></i>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              onChange={handleImageChange}
            />
            <p className="text-[10px] text-slate-400 leading-tight">Sube una imagen para acompañar la notificación (opcional). Formatos recomendados: JPG, PNG.</p>
            {imagePreview && (
              <button 
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageBase64('');
                  if(fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs font-bold text-red-500 hover:text-red-700"
              >
                <i className="fas fa-trash-alt mr-1"></i> Eliminar imagen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button 
          type="submit" 
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center gap-2 shadow-md shadow-blue-200"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
          {loading ? 'Enviando...' : 'Enviar Notificación'}
        </button>
      </div>
    </form>
  );
};

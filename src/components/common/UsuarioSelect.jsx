import React, { useEffect, useState } from 'react';
import { getUsuariosCombo } from '../../services/anulaciones.service'; // Usar el servicio de anulaciones

const UsuarioSelect = ({ value, onChange, name = 'idusuario', label = 'Usuario', ...props }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await getUsuariosCombo({ estado_busqueda: '1' }); // Solo usuarios activos
        setUsuarios(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  if (loading) return <p>Cargando usuarios...</p>;
  if (error) return <p>Error al cargar usuarios: {error.message}</p>;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        {...props}
      >
        <option value="">Seleccionar Usuario</option>
        {usuarios.map((usuario) => (
          <option key={usuario.id_usuario} value={usuario.id_usuario}>
            {usuario.nombre_usuario}
          </option>
        ))}
      </select>
    </div>
  );
};

export default UsuarioSelect;

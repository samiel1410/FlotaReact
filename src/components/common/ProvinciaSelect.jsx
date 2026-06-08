import React, { useEffect, useState } from 'react';
import { api as axios } from '../../config/axios'; // Asumiendo que axios está configurado aquí

const ProvinciaSelect = ({ value, onChange, name = 'id_fkprovincia', label = 'Provincia', ...props }) => {
  const [provincias, setProvincias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const response = await axios.get('/locacion/seleccionarProvincia');
        setProvincias(response.data.data);
      } catch (err) {
        console.error('Error fetching provincias:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProvincias();
  }, []);

  if (loading) return <p>Cargando provincias...</p>;
  if (error) return <p>Error al cargar provincias: {error.message}</p>;

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
        <option value="">Seleccione una provincia...</option>
        {provincias.map((provincia) => (
          <option key={provincia.id_provincia} value={provincia.id_provincia}>
            {provincia.nombre_provincia}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProvinciaSelect;

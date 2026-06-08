import React, { useEffect, useState } from 'react';
import { getCiudades } from '../../services/destino.service';

const CiudadSelect = ({ value, onChange, name = 'lugar_destino', label = 'Ciudad', ...props }) => {
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCiudades = async () => {
      try {
        const data = await getCiudades();
        setCiudades(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCiudades();
  }, []);

  if (loading) return <p>Cargando ciudades...</p>;
  if (error) return <p>Error al cargar ciudades: {error.message}</p>;

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
        <option value="">Seleccione una ciudad...</option>
        {ciudades.map((ciudad) => (
          <option key={ciudad.id_canton} value={ciudad.nombre_canton}>
            {ciudad.nombre_canton}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CiudadSelect;

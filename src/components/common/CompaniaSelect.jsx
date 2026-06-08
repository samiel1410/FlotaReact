import React, { useEffect, useState } from 'react';
import { getCompaniasAsociadas } from '../../services/destino.service';

const CompaniaSelect = ({ value, onChange, name = 'idfk_compania_asociada_destino', label = 'Compañía', ...props }) => {
  const [companias, setCompanias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanias = async () => {
      try {
        const data = await getCompaniasAsociadas();
        setCompanias(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanias();
  }, []);

  if (loading) return <p>Cargando compañías...</p>;
  if (error) return <p>Error al cargar compañías: {error.message}</p>;

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
        <option value="">Seleccione una compañía...</option>
        {companias.map((compania) => (
          <option key={compania.id_compania_asociada} value={compania.id_compania_asociada}>
            {compania.nombre_compania_asociada}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CompaniaSelect;

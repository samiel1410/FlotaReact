import React, { useState } from 'react';
import EstadoSelect from '../../../components/common/EstadoSelect';

const DestinoSearchBar = ({ onSearch, onRefresh }) => {
  const [filters, setFilters] = useState({
    nombre: '',
    estado: '2', // '2' para "Todos"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleRefresh = () => {
    setFilters({ nombre: '', estado: '2' });
    onRefresh();
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">Búsqueda de Destino</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-bold text-gray-700 mb-2">
            Nombre:
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={filters.nombre}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Buscar por nombre..."
          />
        </div>
        <div>
          <EstadoSelect
            value={filters.estado}
            onChange={handleChange}
            name="estado"
            label="Estado:"
            options={[
              { value: '1', label: 'Activo' },
              { value: '0', label: 'Inactivo' },
              { value: '2', label: 'Todos' },
            ]}
          />
        </div>
        <div className="flex items-end justify-start md:justify-end space-x-2 mt-4 md:mt-0">
          <button
            type="button"
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            <i className="x-fa fa-search mr-2"></i>Buscar
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            <i className="x-fa fa-eraser mr-2"></i>Refrescar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinoSearchBar;

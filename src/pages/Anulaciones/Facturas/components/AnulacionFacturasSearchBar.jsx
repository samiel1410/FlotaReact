import React, { useState } from 'react';
import MesSelect from '../../../components/common/MesSelect';
import AnioSelect from '../../../components/common/AnioSelect';
import UsuarioSelect from '../../../components/common/UsuarioSelect';

const AnulacionFacturasSearchBar = ({ onSearch, onRefresh }) => {
  const [filters, setFilters] = useState({
    nombrecliente: '',
    rucliente: '',
    factura: '',
    numeroguia: '',
    mes: '',
    anio: '',
    fechaini: '',
    fechalast: '',
    idusuario: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleRefresh = () => {
    setFilters({
      nombrecliente: '',
      rucliente: '',
      factura: '',
      numeroguia: '',
      mes: '',
      anio: '',
      fechaini: '',
      fechalast: '',
      idusuario: '',
    });
    onRefresh();
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">Búsqueda de Facturas para Anulación</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="nombrecliente" className="block text-sm font-bold text-gray-700 mb-2">
            Nombre Cliente:
          </label>
          <input
            type="text"
            id="nombrecliente"
            name="nombrecliente"
            value={filters.nombrecliente}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Buscar por nombre..."
          />
        </div>
        <div>
          <label htmlFor="rucliente" className="block text-sm font-bold text-gray-700 mb-2">
            RUC Cliente:
          </label>
          <input
            type="text"
            id="rucliente"
            name="rucliente"
            value={filters.rucliente}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Buscar por RUC..."
          />
        </div>
        <div>
          <label htmlFor="factura" className="block text-sm font-bold text-gray-700 mb-2">
            Factura:
          </label>
          <input
            type="text"
            id="factura"
            name="factura"
            value={filters.factura}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Buscar por número de factura..."
          />
        </div>
        <div>
          <label htmlFor="numeroguia" className="block text-sm font-bold text-gray-700 mb-2">
            Número Guía:
          </label>
          <input
            type="text"
            id="numeroguia"
            name="numeroguia"
            value={filters.numeroguia}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Buscar por número de guía..."
          />
        </div>
        <div>
          <MesSelect value={filters.mes} onChange={handleChange} />
        </div>
        <div>
          <AnioSelect value={filters.anio} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="fechaini" className="block text-sm font-bold text-gray-700 mb-2">
            Fecha Desde:
          </label>
          <input
            type="date"
            id="fechaini"
            name="fechaini"
            value={filters.fechaini}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div>
          <label htmlFor="fechalast" className="block text-sm font-bold text-gray-700 mb-2">
            Fecha Hasta:
          </label>
          <input
            type="date"
            id="fechalast"
            name="fechalast"
            value={filters.fechalast}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div>
          <UsuarioSelect value={filters.idusuario} onChange={handleChange} />
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

export default AnulacionFacturasSearchBar;

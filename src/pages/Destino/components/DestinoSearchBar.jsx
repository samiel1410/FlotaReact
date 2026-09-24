import React, { useState, useEffect } from 'react';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { getCompaniasAsociadas, getCiudades } from '../../../services/destino.service';

const DestinoSearchBar = ({ filters, onSearch, onRefresh, loading }) => {
  const [localFilters, setLocalFilters] = useState({
    nombre: filters?.nombre || '',
    estado: filters?.estado || '2',
    id_compania: filters?.id_compania || '',
    lugar: filters?.lugar || '',
  });

  const [companias, setCompanias] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (filters) {
      setLocalFilters({
        nombre: filters.nombre || '',
        estado: filters.estado || '2',
        id_compania: filters.id_compania || '',
        lugar: filters.lugar || '',
      });
    }
  }, [filters]);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingData(true);
      try {
        const [companiasRes, ciudadesRes] = await Promise.allSettled([
          getCompaniasAsociadas(),
          getCiudades()
        ]);

        if (companiasRes.status === 'fulfilled' && Array.isArray(companiasRes.value)) {
          setCompanias(companiasRes.value);
        }

        if (ciudadesRes.status === 'fulfilled' && Array.isArray(ciudadesRes.value)) {
          // Filtrar y ordenar lugares únicos
          const uniquePlaces = [];
          const seen = new Set();
          ciudadesRes.value.forEach((c) => {
            const name = (c.nombre_canton || c.nombre || c.lugar_destino || '').trim().toUpperCase();
            if (name && !seen.has(name)) {
              seen.add(name);
              uniquePlaces.push({ value: name, label: name });
            }
          });
          uniquePlaces.sort((a, b) => a.label.localeCompare(b.label));
          setCiudades(uniquePlaces);
        }
      } catch (err) {
        console.error('Error cargando opciones de filtro:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadOptions();
  }, []);

  const handleChange = (name, value) => {
    setLocalFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    onSearch(localFilters);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleReset = () => {
    const resetValues = {
      nombre: '',
      estado: '2',
      id_compania: '',
      lugar: '',
    };
    setLocalFilters(resetValues);
    onRefresh();
  };

  const companiaOptions = [
    { value: '', label: 'Todas las compañías' },
    ...companias.map((c) => ({
      value: String(c.id_compania_asociada || c.id || ''),
      label: c.nombre_compania_asociada || c.nombre || '',
    })),
  ];

  const lugarOptions = [
    { value: '', label: 'Todos los lugares' },
    ...ciudades,
  ];

  const estadoOptions = [
    { value: '2', label: 'Todos los estados' },
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 mb-6">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            <i className="fas fa-filter text-xs" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Filtros de Búsqueda</h2>
            <p className="text-[11px] text-slate-400 font-medium">Filtra los destinos por nombre, compañía, lugar y estado</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Limpiar todos los filtros"
          >
            <i className="fas fa-undo text-[10px] text-slate-400" />
            <span>Limpiar</span>
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <i className={`fas fa-search text-[11px] ${loading ? 'animate-spin' : ''}`} />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Búsqueda por Nombre / Dirección / Contacto */}
        <div>
          <label htmlFor="filtro-nombre" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
            Búsqueda General
          </label>
          <div className="relative">
            <input
              type="text"
              id="filtro-nombre"
              name="nombre"
              value={localFilters.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-9 pl-8 pr-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white placeholder:text-slate-400"
              placeholder="Nombre, dirección, contacto..."
            />
            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            {localFilters.nombre && (
              <button
                type="button"
                onClick={() => handleChange('nombre', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>

        {/* Combo Compañía */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
            Compañía Asociada
          </label>
          <SearchableSelect
            name="id_compania"
            value={localFilters.id_compania}
            onChange={(val) => handleChange('id_compania', val)}
            options={companiaOptions}
            placeholder={loadingData ? 'Cargando compañías...' : 'Todas las compañías'}
            isClearable={true}
          />
        </div>

        {/* Combo Lugar */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
            Lugar / Ciudad
          </label>
          <SearchableSelect
            name="lugar"
            value={localFilters.lugar}
            onChange={(val) => handleChange('lugar', val)}
            options={lugarOptions}
            placeholder={loadingData ? 'Cargando lugares...' : 'Todos los lugares'}
            isClearable={true}
          />
        </div>

        {/* Combo Estado */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
            Estado
          </label>
          <SearchableSelect
            name="estado"
            value={localFilters.estado}
            onChange={(val) => handleChange('estado', val || '2')}
            options={estadoOptions}
            placeholder="Todos los estados"
            isClearable={false}
          />
        </div>
      </form>
    </div>
  );
};

export default DestinoSearchBar;

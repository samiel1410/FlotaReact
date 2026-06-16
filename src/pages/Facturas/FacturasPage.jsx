import { useState, useEffect, useCallback } from 'react';
import { FacturasService } from './services/facturas.service';
import { FacturasFilterPanel } from './components/FacturasFilterPanel';
import { FacturasGrid } from './components/FacturasGrid';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export const FacturasPage = () => {
  const { user } = useAuth();
  const id_usuario = user?.id_usuario_original || user?.id || 1;
  const rol_usuario = user?.rol_usuario || user?.rol || 0;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const limit = 25;

  // Cargar combo de usuarios al montar
  useEffect(() => {
    FacturasService.getComboUsuarios()
      .then(res => setUsuarios(res?.data || []))
      .catch(() => {}); // silencioso
  }, []);

  const loadData = useCallback(async (currentFiltros, currentPage) => {
    setLoading(true);
    try {
      const params = {
        ...currentFiltros,
        limit,
        page: currentPage,
      };
      const res = await FacturasService.listar(params);
      setData(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('Error cargando facturas:', err);
      toast.error('Error al cargar facturas');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filtros, page);
  }, [filtros, page, loadData]);

  const handleSearch = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPage(1);
  };

  const handleReload = () => {
    loadData(filtros, page);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-file-invoice-dollar text-blue-500"></i>
            Listado de Facturas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestión y consulta de facturas emitidas</p>
        </div>
      </div>

      {/* Filters */}
      <FacturasFilterPanel onSearch={handleSearch} usuarios={usuarios} />

      {/* Grid */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <FacturasGrid
          data={data}
          loading={loading}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onReload={handleReload}
          id_usuario={id_usuario}
          rol_usuario={rol_usuario}
        />
      </div>
    </div>
  );
};

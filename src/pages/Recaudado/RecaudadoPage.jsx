import { useState, useEffect } from 'react';
import { RecaudadoFilterPanel } from './components/RecaudadoFilterPanel';
import { RecaudadoGrid } from './components/RecaudadoGrid';
import { RecaudadoService } from '../../services/recaudado.service';
import toast from 'react-hot-toast';
import './RecaudadoPage.css';

export const RecaudadoPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Totales
  const [totales, setTotales] = useState({
    facturas: 0,
    venta: 0,
    retenido: 0
  });

  // Estado de filtros y paginación
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth(),
    anio: new Date().getFullYear()
  });
  
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 40; // Mismo pageSize que ExtJS

  const loadData = async (currentFiltros, currentPage) => {
    setLoading(true);
    try {
      const params = {
        ...currentFiltros,
        limit,
        start: (currentPage - 1) * limit
      };
      
      const response = await RecaudadoService.getRecaudacion(params);
      
      const realData = response.data || [];
      setData(realData);
      setTotalRecords(response.total || 0);
      
      // Calculamos totales de la data cargada o usamos los del backend
      let sumFacturas = response.sum_facturas !== undefined ? response.sum_facturas : 0;
      let sumVentas = response.sum_venta !== undefined ? response.sum_venta : 0;
      let sumRetenido = response.sum_retenido !== undefined ? response.sum_retenido : 0;
      
      if (response.sum_facturas === undefined) {
        realData.forEach(item => {
          sumFacturas += parseInt(item.cantidad_boletos) || 0;
          sumVentas += parseFloat(item.vendido) || 0;
          sumRetenido += parseFloat(item.retenido) || 0;
        });
      }

      setTotales({
        facturas: sumFacturas,
        venta: sumVentas,
        retenido: sumRetenido
      });

    } catch (error) {
      console.error('Error cargando recaudación:', error);
      toast.error('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filtros, page);
  }, [filtros, page]);

  const handleSearch = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPage(1);
  };

  return (
    <div className="recaudado-page-container">
      <div className="recaudado-header">
        <h2><i className="fas fa-coins"></i> Recaudado por Socios / Buseros</h2>
      </div>

      <div className="recaudado-content">
        <RecaudadoFilterPanel onSearch={handleSearch} />
        
        <div className="recaudado-grid-wrapper">
          <RecaudadoGrid 
            data={data} 
            loading={loading} 
            page={page} 
            limit={limit} 
            total={totalRecords} 
            totales={totales}
            onPageChange={setPage} 
            onReload={() => loadData(filtros, page)}
          />
        </div>
      </div>
    </div>
  );
};

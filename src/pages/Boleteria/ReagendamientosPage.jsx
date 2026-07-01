import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import './NuevoBoletoPage.css';

export const ReagendamientosPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);

  const fetchReagendamientos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/boleto/listarReagendados', {
        params: { page, limit }
      });
      if (response.data?.success) {
        setData(response.data.data);
        setTotal(response.data.total || 0);
      } else {
        toast.error('Error al cargar historial de reagendamientos');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReagendamientos();
  }, [page]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  return (
    <>
      <div className="module-container">
        <div className="module-header">
          <h2 className="module-title">
            <i className="fas fa-exchange-alt"></i> Historial de Boletos Reagendados
          </h2>
          <div className="module-actions">
            <button className="btn-secondary" onClick={() => fetchReagendamientos()} disabled={loading}>
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Actualizar
            </button>
          </div>
        </div>

        <div className="module-content">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nº Boleto</th>
                  <th>Pasajero</th>
                  <th>Identificación</th>
                  <th>Fecha Original</th>
                  <th>Fecha Nueva</th>
                  <th>Motivo</th>
                  <th>Fecha de Cambio</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">Cargando datos...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">No hay registros de reagendamientos.</td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id_reagendado}>
                      <td><span className="badge badge-info">{item.numero_boleto}</span></td>
                      <td>{item.nombres_boleto}</td>
                      <td>{item.identificacion_boleto}</td>
                      <td>{formatDate(item.fecha_anterior)}</td>
                      <td>{formatDate(item.fecha_nueva)}</td>
                      <td>{item.motivo}</td>
                      <td>{formatDate(item.fecha_registro)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-container mt-3 flex justify-between items-center">
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <i className="fas fa-chevron-left"></i> Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

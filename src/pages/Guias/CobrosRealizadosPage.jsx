import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuiaService } from '../../services/guia.service';
import toast from 'react-hot-toast';

export const CobrosRealizadosPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await GuiaService.getComprobantesPorCaja(id);
        if (res && res.data) {
          setCobros(Array.isArray(res.data) ? res.data : []);
        } else if (Array.isArray(res)) {
          setCobros(res);
        } else {
          setCobros([]);
        }
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar los cobros');
        setCobros([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="guias-page-container" style={{ padding: '20px' }}>
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Cobros Realizados</h2>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Volver
          </button>
        </div>

        {loading && <div className="text-center py-8 text-slate-500"><i className="fas fa-spinner fa-spin"></i> Cargando cobros...</div>}

        {!loading && cobros.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No se encontraron cobros para esta guía.
          </div>
        )}

        {!loading && cobros.length > 0 && (
          <div className="overflow-x-auto">
            <table className="guias-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Valor</th>
                  <th>Forma Pago</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map((c, i) => (
                  <tr key={c.id_comprobante || i}>
                    <td>{i + 1}</td>
                    <td>{c.fecha_comprobante || c.createdAt}</td>
                    <td className="font-mono text-right">${parseFloat(c.valor || c.monto || 0).toFixed(2)}</td>
                    <td>{c.forma_pago || c.tipo_pago || '-'}</td>
                    <td>{c.usuario_nombre || c.usuario || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
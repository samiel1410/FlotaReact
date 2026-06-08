import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GuiaService } from '../../services/guia.service';
import toast from 'react-hot-toast';

/**
 * Pantalla de edición de guía.
 * Carga los datos de la guía y los pasa a NuevaGuiaPage vía state.
 */
export const EditarGuiaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGuia = async () => {
      try {
        const res = await GuiaService.informacionGuia(id);
        if (res && (res.data || res.id_guia)) {
          // Navegar a NuevaGuiaPage con los datos de la guía completos en location state
          // Pasamos "res" completo para que NuevaGuiaPage tenga res.data y res.data_detalle
          navigate('/guias/nueva', { state: { editarGuia: res, idGuia: id }, replace: true });
        } else {
          toast.error('No se encontró la guía');
          navigate('/guias', { replace: true });
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar la guía para edición');
        navigate('/guias', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    loadGuia();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
        <p>Cargando datos de la guía...</p>
      </div>
    );
  }

  return null;
};
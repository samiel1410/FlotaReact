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
    toast.error('La edición de guías y facturas se encuentra deshabilitada');
    navigate('/guias', { replace: true });
  }, [navigate]);

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
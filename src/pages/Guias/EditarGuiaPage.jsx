import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Pantalla de edición de guía.
 * Carga los datos de la guía y los pasa a NuevaGuiaPage vía state.
 */
export const EditarGuiaPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast.error('La edición de guías y facturas se encuentra deshabilitada');
    navigate('/guias', { replace: true });
  }, [navigate]);

  return null;
};
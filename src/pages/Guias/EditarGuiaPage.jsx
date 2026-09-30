import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GuiaService } from '../../services/guia.service';

/**
 * Pantalla de edición de guía.
 * 1. Verifica que la guía no esté anulada/pendiente.
 * 2. Verifica que NO tenga factura AUTORIZADA (estado_factura = 4).
 * 3. Carga la guía + detalle y la pasa a NuevaGuiaPage vía state (modo edición).
 */
export const EditarGuiaPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const cargar = async () => {
      if (!id) {
        toast.error('ID de guía inválido');
        navigate('/guias', { replace: true });
        return;
      }
      try {
        // 1. Verificar anulación
        const verif = await GuiaService.verificarAnulacion(id);
        const msg = verif.message ?? verif.data?.message ?? verif.data;
        if (msg === 2 || msg === '2') {
          toast.error('La guía se encuentra anulada, no se puede editar');
          navigate('/guias', { replace: true });
          return;
        }
        if (msg === 3 || msg === '3') {
          toast.error('La guía está pendiente de anulación, no se puede editar');
          navigate('/guias', { replace: true });
          return;
        }

        // 2. Verificar factura autorizada (bloquea edición SRI)
        try {
          let factVerif = null;
          try {
            factVerif = await GuiaService.autorizadoFacturaPorGuia(id);
          } catch (err) {
            factVerif = await GuiaService.verificarFacturaAutorizada(id);
          }
          if (factVerif && (factVerif.tipo === 0 || (factVerif.data && factVerif.data.length > 0))) {
            toast.error('Esta guía tiene factura autorizada por el SRI, no se puede editar');
            navigate('/guias', { replace: true });
            return;
          }
        } catch (e) {
          console.warn('No se pudo verificar factura autorizada', e);
        }

        // 3. Cargar guía + detalle y pasar a modo edición
        const info = await GuiaService.informacionGuia(id);
        if (!info?.success || !info?.data?.length) {
          toast.error('No se pudo cargar la guía para editar');
          navigate('/guias', { replace: true });
          return;
        }
        navigate('/guias/nueva', {
          replace: true,
          state: { idGuia: id, editarGuia: info }
        });
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar la guía para editar');
        navigate('/guias', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [id, navigate]);

  if (!loading) return null;
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100/50">
      <div className="text-sm font-bold text-slate-600">
        <i className="fas fa-spinner fa-spin mr-2"></i> Cargando guía para editar...
      </div>
    </div>
  );
};

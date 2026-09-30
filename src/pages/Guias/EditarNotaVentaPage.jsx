import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GuiaNotaVentaService as GuiaService } from '../../services/guiaNotaVenta.service';

/**
 * Pantalla de edición de nota de venta.
 * 1. Verifica que la nota no esté anulada/pendiente.
 * 2. Verifica que NO tenga factura AUTORIZADA (estado_factura = 4).
 * 3. Carga la nota + detalle y la pasa a NuevaGuiaNotaVentaPage vía state (modo edición).
 */
export const EditarNotaVentaPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const cargar = async () => {
      if (!id) {
        toast.error('ID de nota inválido');
        navigate('/notas-venta', { replace: true });
        return;
      }
      try {
        // 1. Verificar anulación
        const verif = await GuiaService.verificarAnulacion(id);
        const msg = verif.message ?? verif.data?.message ?? verif.data;
        if (msg === 2 || msg === '2') {
          toast.error('La nota se encuentra anulada, no se puede editar');
          navigate('/notas-venta', { replace: true });
          return;
        }
        if (msg === 3 || msg === '3') {
          toast.error('La nota está pendiente de anulación, no se puede editar');
          navigate('/notas-venta', { replace: true });
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
            toast.error('Esta nota tiene factura autorizada por el SRI, no se puede editar');
            navigate('/notas-venta', { replace: true });
            return;
          }
        } catch (e) {
          console.warn('No se pudo verificar factura autorizada', e);
        }

        // 3. Cargar nota + detalle y pasar a modo edición
        const info = await GuiaService.informacionGuia(id);
        if (!info?.success || !info?.data?.length) {
          toast.error('No se pudo cargar la nota para editar');
          navigate('/notas-venta', { replace: true });
          return;
        }
        navigate('/notas-venta/nueva', {
          replace: true,
          state: { idGuia: id, editarGuia: info }
        });
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar la nota para editar');
        navigate('/notas-venta', { replace: true });
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
        <i className="fas fa-spinner fa-spin mr-2"></i> Cargando nota para editar...
      </div>
    </div>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { cajaCobrosService } from '../services/cajaCobros.service';

/**
 * Estado de la caja de COBROS (caja_retenciones) del usuario logueado.
 *
 * El backend liga cada cobro a una caja APERTURADA del propio usuario; si no
 * existe, el cobro se rechaza con `requiere_caja`. Este hook permite avisar
 * en pantalla y abrir la caja sin salir del módulo.
 */
export const useCajaCobros = () => {
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const montado = useRef(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cajaCobrosService.buscarCajaAperturada();
      if (montado.current) setCaja(res.data || null);
    } catch {
      if (montado.current) setCaja(null);
    } finally {
      if (montado.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    recargar();
    return () => {
      montado.current = false;
    };
  }, [recargar]);

  return { caja, loading, recargar, abierta: Boolean(caja?.id_caja_retenciones) };
};

export default useCajaCobros;

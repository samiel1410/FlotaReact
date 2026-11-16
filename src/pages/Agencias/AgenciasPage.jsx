import React, { useEffect, useMemo, useState } from 'react';
import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';
import { api } from '../../config/axios';

export const AgenciasPage = () => {
  const [retencionesPorFrecuencia, setRetencionesPorFrecuencia] = useState(false);

  useEffect(() => {
    let activo = true;
    api.get('/configuracion/selectconfiguracion')
      .then((res) => {
        if (!activo) return;
        const conf = res?.data?.data?.[0] || {};
        setRetencionesPorFrecuencia(
          Number(conf.retenciones_por_frecuencia) === 1 || conf.retenciones_por_frecuencia === true
        );
      })
      .catch(() => {
        // Si falla la configuración, la acción permanece oculta.
      });
    return () => { activo = false; };
  }, []);

  const config = useMemo(() => {
    const base = PAGES_CONFIG.sucursales;
    if (retencionesPorFrecuencia) return base;
    return {
      ...base,
      actions: {
        ...base.actions,
        custom: [],
      },
    };
  }, [retencionesPorFrecuencia]);

  return <GenericListPage config={config} />;
};


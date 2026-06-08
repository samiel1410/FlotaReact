import React, { useState } from 'react';
import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';
import MapaAsientosModal from './components/MapaAsientosModal';
import Swal from 'sweetalert2';

export const BusesPage = () => {
  const [mapaBus, setMapaBus] = useState(null);
  const [mapaOpen, setMapaOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDescargarPlantilla = () => {
    Swal.fire('Descarga', 'Descargando plantilla de buses...', 'success');
  };

  const handleMapaClick = (record) => {
    setMapaBus(record);
    setMapaOpen(true);
  };

  const handleMapaSaved = (nuevoMapaAsientos) => {
    if (mapaBus) {
      setMapaBus({ ...mapaBus, mapa_asientos: nuevoMapaAsientos });
    }
    setMapaOpen(false);
    setRefreshKey(k => k + 1);
  };

  const config = {
    ...PAGES_CONFIG.buses,
    actions: {
      ...PAGES_CONFIG.buses.actions,
      bulkActions: [
        {
          id: 'plantilla',
          icon: 'fas fa-file-excel',
          label: 'PLANTILLA',
          color: 'bg-emerald-500 text-white hover:bg-emerald-600',
          handler: handleDescargarPlantilla,
        }
      ],
      custom: [
        {
          id: 'mapa',
          icon: 'fas fa-chair',
          tooltip: 'Configurar Mapa de Asientos',
          color: 'text-blue-600',
          handler: handleMapaClick,
        }
      ]
    }
  };

  return (
    <>
      <GenericListPage key={refreshKey} config={config} />
      <MapaAsientosModal
        bus={mapaBus}
        isOpen={mapaOpen}
        onClose={() => setMapaOpen(false)}
        onSaved={handleMapaSaved}
      />
    </>
  );
};

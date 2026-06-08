import React, { useState } from 'react';
import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';
import GestionPermisosModal from './components/GestionPermisosModal';

export const RolesPage = () => {
  const [permisosModal, setPermisosModal] = useState({ open: false, record: null });

  const config = {
    ...PAGES_CONFIG.roles,
    actions: {
      ...PAGES_CONFIG.roles.actions,
      custom: [
        {
          id: 'permisos',
          icon: 'fas fa-shield-alt',
          tooltip: 'Gestionar Permisos',
          color: 'text-amber-600',
          handler: (record) => {
            setPermisosModal({ open: true, record });
          }
        }
      ]
    }
  };

  return (
    <>
      <GenericListPage config={config} />
      {permisosModal.open && permisosModal.record && (
        <GestionPermisosModal
          rol={permisosModal.record}
          onClose={() => setPermisosModal({ open: false, record: null })}
          onSuccess={() => {
            // Disparar evento para refrescar el listado
            window.dispatchEvent(new CustomEvent('refresh-list'));
          }}
        />
      )}
    </>
  );
};

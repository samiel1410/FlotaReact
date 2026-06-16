import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';

export const RolesPage = () => {
  const navigate = useNavigate();

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
            navigate(`/roles/permisos/${record.id_rol}`, { state: { rol: record } });
          }
        }
      ]
    }
  };

  return (
    <>
      <GenericListPage config={config} />
    </>
  );
};


import React from 'react';
import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';

export const AgenciasPage = () => {
  return <GenericListPage config={PAGES_CONFIG.sucursales} />;
};

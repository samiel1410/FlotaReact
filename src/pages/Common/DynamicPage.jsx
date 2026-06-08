import { GenericListPage } from '../../components/common/GenericListPage';
import { PAGES_CONFIG } from '../../config/pagesConfig';

// Wrapper genérico: recibe el configKey y renderiza la página
export const DynamicPage = ({ configKey }) => {
  const config = PAGES_CONFIG[configKey];
  if (!config) return <div className="p-8 text-red-500">Sin configuración para: {configKey}</div>;
  return <GenericListPage config={config} />;
};

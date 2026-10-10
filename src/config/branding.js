/**
 * Branding de la aplicación.
 *
 * El nombre/marca se define UNA sola vez en `FrontReact/branding.json` y desde
 * aquí se consume en toda la interfaz web (título, sidebar, login, inicio).
 * Los PDFs en PHP leen el mismo archivo mediante `php/branding.php`.
 *
 * No escriba el nombre de la marca directamente en los componentes: use BRAND.*
 */
import branding from '../../branding.json';

const name = String(branding?.name || 'Nexusplus');

export const BRAND = {
  /** Nombre visible de la marca (ej. "Nexusplus"). */
  name,
  /** Nombre en mayúsculas para títulos (ej. "NEXUSPLUS"). */
  nameUpper: name.toUpperCase(),
  /** Razón social para avisos legales (ej. "Nexusplus Solutions"). */
  legalName: String(branding?.legalName || `${name} Solutions`),
  /** Encabezado del panel de inicio (ej. "Sistema de Gestión"). */
  productTitle: String(branding?.productTitle || 'Sistema de Gestión'),
  /** Descripción corta usada en PDFs (ej. "Sistema de facturación electrónica"). */
  tagline: String(branding?.tagline || 'Sistema de facturación electrónica'),
  /** URL pública del logo horizontal. */
  logo: String(branding?.logo || '/images/transpaeasy.png'),
  /** URL pública del ícono/logo cuadrado. */
  logoIcon: String(branding?.logoIcon || '/images/transpaeasy_icon.png'),
  /** Etiqueta de la app móvil (referencia; se aplica en el proyecto Flutter). */
  mobileAppLabel: String(branding?.mobileAppLabel || name),
};

export default BRAND;

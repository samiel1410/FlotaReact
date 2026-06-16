const fs = require('fs');

function updateGuiasNotaVenta() {
  const fileGuias = 'c:/laragon/www/SistemaFlota/FrontReact/src/pages/Guias/GuiasNotaVentaPage.jsx';
  let guias = fs.readFileSync(fileGuias, 'utf8');

  // Replace GuiaService and component name
  guias = guias.replace(/import \{ GuiaService \}/g, 'import { GuiaNotaVentaService as GuiaService }');
  guias = guias.replace(/from '\.\.\/\.\.\/services\/guia\.service';/g, "from '../../services/guiaNotaVenta.service';");
  guias = guias.replace(/GuiasPage/g, 'GuiasNotaVentaPage');
  
  // Replace title
  guias = guias.replace(/>Listado de Guías</g, '>Listado de Notas de Venta<');
  guias = guias.replace(/<span className="text-gray-500">Gestión de Guías<\/span>/g, '<span className="text-gray-500">Gestión de Notas de Venta</span>');
  
  fs.writeFileSync(fileGuias, guias);


  const fileNueva = 'c:/laragon/www/SistemaFlota/FrontReact/src/pages/Guias/NuevaGuiaNotaVentaPage.jsx';
  let nueva = fs.readFileSync(fileNueva, 'utf8');

  nueva = nueva.replace(/import \{ GuiaService \}/g, 'import { GuiaNotaVentaService as GuiaService }');
  nueva = nueva.replace(/from '\.\.\/\.\.\/services\/guia\.service';/g, "from '../../services/guiaNotaVenta.service';");
  nueva = nueva.replace(/NuevaGuiaPage/g, 'NuevaGuiaNotaVentaPage');

  nueva = nueva.replace(/>Nueva Guía</g, '>Nueva Nota de Venta<');
  nueva = nueva.replace(/>Crear una nueva guía de remisión</g, '>Crear una nueva nota de venta<');
  
  // The backend already doesn't do factura for nota de venta so we can keep the logic calling insertarGuia (which maps to insertarGuiaNotaVenta in service)
  
  fs.writeFileSync(fileNueva, nueva);
}

updateGuiasNotaVenta();

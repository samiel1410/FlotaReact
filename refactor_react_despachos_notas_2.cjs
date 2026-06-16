const fs = require('fs');
const path = require('path');

const reactSrc = path.join(__dirname, 'src');
const despachoDir = path.join(reactSrc, 'pages', 'DespachoGuiasNotaVenta');

const filesToFix = [
  path.join(despachoDir, 'DespachoGuiasNotaVentaPage.jsx'),
  path.join(despachoDir, 'components', 'NuevoDespachoGuiaNotaVentaModal.jsx'),
  path.join(despachoDir, 'components', 'BusquedaGuiaDespachoNotaVentaModal.jsx'),
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/_convenios/g, '_nota_venta');
    fs.writeFileSync(file, content);
  }
}

console.log("Fixed _convenios suffixes");

const fs = require('fs');

const phpFile = 'c:/laragon/www/SistemaFlota/FrontReact/php/guiaNotaVentaPdfImpresion.php';
let code = fs.readFileSync(phpFile, 'utf8');

// Replace table references in queries
code = code.replace(/FROM guia /g, 'FROM guia_nota_venta ');
code = code.replace(/JOIN guia /g, 'JOIN guia_nota_venta ');
code = code.replace(/FROM detalle_guia /g, 'FROM detalle_guia_nota_venta ');

// Write back
fs.writeFileSync(phpFile, code);

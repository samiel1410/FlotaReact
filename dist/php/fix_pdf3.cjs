const fs = require('fs');

const path = 'c:/laragon/www/SistemaFlota/FrontReact/php/guiaNotaVentaPdfImpresion.php';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/SELECT SUM\(valor_factura\) AS monto FROM factura, guia_nota_venta WHERE id_guia = id_guia_nota_venta AND id_guia_nota_venta = \$id_guia AND tipo_factura = 'NORMAL' AND estado_factura = 1/g, "SELECT SUM(valor_factura) AS monto FROM factura, guia_nota_venta WHERE id_guia = id_fkguia_factura AND id_fkguia_factura = $id_guia AND tipo_factura = 'NORMAL' AND estado_factura = 1");

fs.writeFileSync(path, content);
console.log('Fixed PHP query 3');

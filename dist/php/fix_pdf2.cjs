const fs = require('fs');

const path = 'c:/laragon/www/SistemaFlota/FrontReact/php/guiaNotaVentaPdfImpresion.php';
let content = fs.readFileSync(path, 'utf8');

// For the details query:
content = content.replace(/contenido_detalle_guia_nota_venta/g, 'contenido_guia');
content = content.replace(/cantidad_detalle_guia_nota_venta/g, 'cantidad_detalle_guia');
content = content.replace(/id_fkguia_detalle_envio_nota_venta/g, 'id_fkguia_detalle_envio');
content = content.replace(/id_fktipo_envio_detalle_guia_nota_venta/g, 'id_fktipo_envio_detalle_guia');

fs.writeFileSync(path, content);
console.log('Fixed PHP columns');

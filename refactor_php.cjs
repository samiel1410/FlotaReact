const fs = require('fs');
const path = require('path');

const phpPath = path.join(__dirname, 'php', 'convenios', 'pdfDespachoNotasVenta.php');

if (fs.existsSync(phpPath)) {
  let content = fs.readFileSync(phpPath, 'utf8');
  content = content.replace(/despacho_maestro_convenios/g, 'despacho_maestro_nota_venta');
  content = content.replace(/despacho_detalle_convenios/g, 'despacho_detalle_nota_venta');
  content = content.replace(/guias_companias/g, 'guia_nota_venta');
  content = content.replace(/id_fkguia_despacho_detalle_convenios/g, 'id_fkguia_despacho_detalle');
  content = content.replace(/id_fksucursal_guias_companias/g, 'sucursal_guia');
  content = content.replace(/id_destino/g, 'id_fkdestino_despacho');
  content = content.replace(/DESPACHO CONVENIOS/g, 'DESPACHO NOTA VENTA');
  fs.writeFileSync(phpPath, content);
  console.log("PHP refactored");
}

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
  // It's using `guia_nota_venta`, let's make sure `id_fkguia_despacho_detalle` is the right field in `despacho_detalle_nota_venta`
  // Actually, the field names were copied from `despacho_detalle`, let's check `SHOW CREATE TABLE despacho_detalle`.
  // Wait, I used replace over `pdfDespachoConvenios.php`. This might be wrong if `pdfDespachoConvenios` uses `_convenios` suffix. 
  // I should check what is in the PHP file.
}

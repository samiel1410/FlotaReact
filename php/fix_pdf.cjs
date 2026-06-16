const fs = require('fs');

const path = 'c:/laragon/www/SistemaFlota/FrontReact/php/guiaNotaVentaPdfImpresion.php';
let content = fs.readFileSync(path, 'utf8');

const badBlock = `  $total_guia = $vals_guia["total_guia"];
  $descuento_guia = $vals_guia["descuento_guia"];
  $valor_tarifa_adicional_guia = $vals_guia["valor_tarifa_adicional_guia"]; tipo_envio WHERE id_fkguia_detalle_envio = $id_guia AND tipo_envio.id_tipo_envio =
detalle_guia_nota_venta.id_fktipo_envio_detalle_guia_nota_venta;"`;

const goodBlock = `  $total_guia = $vals_guia["total_guia"];
  $descuento_guia = $vals_guia["descuento_guia"];
  $valor_tarifa_adicional_guia = $vals_guia["valor_tarifa_adicional_guia"];
  $impuesto_iva_guia = $vals_guia["impuesto_iva_guia"];
  $punto_emision_sucursal_guia = $vals_guia["punto_emision_sucursal"];
  $punto_emision_guia = $vals_guia["punto_emision_usuario"];
  $id_fkcompania_asociada = $vals_guia["id_fkcompania_asociada"];
  $usuario = $vals_guia["usuario"];

  //COMPANIA ASOCIADA
  $nombre_compania = "";
  $direccion_compania_asociada = "";
  $direccion_exacta = "";
  $numero_contacto = "";
  
  if (!empty($id_fkcompania_asociada)) {
    $query_datos_compania = "SELECT nombre_compania_asociada,nombre_destino as direccion_compania_asociada,direccion_exacta,numero_contacto FROM compania_asociada,destino WHERE id_compania_asociada = $id_fkcompania_asociada AND lugar_destino ='$destino_guia'";
    $recuperar_detalles_compnai = mysqli_query($conn, $query_datos_compania) or die(mysqli_error($conn));
    if ($vals_detalle_compania = mysqli_fetch_array($recuperar_detalles_compnai)) {
      $nombre_compania = $vals_detalle_compania['nombre_compania_asociada'];
      $direccion_compania_asociada = $vals_detalle_compania['direccion_compania_asociada'];
      $direccion_exacta = $vals_detalle_compania['direccion_exacta'];
      $numero_contacto = $vals_detalle_compania['numero_contacto'];
    }
  }

  //NUMERO GUIA
  $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
  $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;
  $query_datos_detalles = "SELECT contenido_detalle_guia_nota_venta, cantidad_detalle_guia_nota_venta, tipo_envio.nombre_envio FROM detalle_guia_nota_venta, tipo_envio WHERE id_fkguia_detalle_envio = $id_guia AND tipo_envio.id_tipo_envio = detalle_guia_nota_venta.id_fktipo_envio_detalle_guia_nota_venta;";
`;

content = content.replace(/  \$total_guia = \$vals_guia\["total_guia"\];[\s\S]*?detalle_guia_nota_venta\.id_fktipo_envio_detalle_guia_nota_venta;";/g, goodBlock);

fs.writeFileSync(path, content);
console.log('Fixed PHP File formatting error');

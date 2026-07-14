<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
//include "barcode.php";

date_default_timezone_set('America/Guayaquil');
try {
  $fecha_actual = date('Y-m-d H:i:s');
  $id_usuario_global = (int) $_GET['id_usuario_global']; //1
  $id_guia = (int) $_GET['id_guia']; //76
  $reimpreso_por = isset($_GET['reimpreso_por']) ? $_GET['reimpreso_por'] : null;


  // create new PDF document
  $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(), true, 'UTF-8', false);

  $conn = conexion();
  $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa WHERE 1";
  $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
  $vals_empresa = mysqli_fetch_array($recuperar_empresa);



  $id_empresa = $vals_empresa["id_empresa"];
  $imagen_empresa = $vals_empresa["imagen_empresa"];
  $telefono_empresa = $vals_empresa["telefono_empresa"];
  $correo_empresa = $vals_empresa["correo_empresa"];
  $ruc_empresa = $vals_empresa["ruc_empresa"];
  $direccion_empresa = $vals_empresa["direccion_empresa"];
  $razon_social_empresa = $vals_empresa["razon_social_empresa"];

  $query_datos = "SELECT id_usuario, nombre_usuario, apellido_usuario FROM usuario, sucursal2 WHERE id_usuario =
$id_usuario_global AND id_fksucursal_usuario=suc_codigo_sucursal";
  $recuperar_datos = mysqli_query($conn, $query_datos) or die(mysqli_error($conn));
  $vals_datos = mysqli_fetch_array($recuperar_datos);

  $id_usuario = $vals_datos["id_usuario"];



  $query_guia = "SELECT origen_guia, sucursal2.nombre_sucursal,
destino_guia,numero_guia,numero_manual_guia,punto_emision_sucursal,observacion_guia,id_fkcompania_asociada,id_fkusuario_guia,UPPER(nombre_cliente_remitente)
as nombre_cliente_remitente,punto_emision_usuario,UPPER(nombre_cliente_receptor) as
nombre_cliente_receptor,cedula_cliente_remitente,cedula_cliente_receptor,telefono_cliente_emisor,telefono_cliente_receptor,subtotal_12_guia,subtotal_0_guia,subtotal_guia,total_guia,descuento_guia,valor_tarifa_adicional_guia,impuesto_iva_guia,estado_cobro_guia
,CONCAT(usuario.nombre_usuario,' ',usuario.apellido_usuario) as usuario FROM guia,sucursal2,usuario WHERE id_guia =
$id_guia AND sucursal_guia=suc_codigo_sucursal AND id_fkusuario_guia=id_usuario";
  $recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
  $vals_guia = mysqli_fetch_array($recuperar_guia);

  $origen_guia = $vals_guia["origen_guia"];
  $observacion_guia = $vals_guia["observacion_guia"];

  $destino_guia = $vals_guia["destino_guia"];
  $id_usuario_guia = $vals_guia["id_fkusuario_guia"];
  $nombre_cliente_remitente = $vals_guia["nombre_cliente_remitente"];
  $nombre_cliente_receptor = $vals_guia["nombre_cliente_receptor"];
  $cedula_cliente_remitente = $vals_guia["cedula_cliente_remitente"];
  $cedula_cliente_receptor = $vals_guia["cedula_cliente_receptor"];
  $telefono_cliente_emisor = $vals_guia["telefono_cliente_emisor"];
  $telefono_cliente_receptor = $vals_guia["telefono_cliente_receptor"];
  $subtotal_12_guia = $vals_guia["subtotal_12_guia"];
  $subtotal_0_guia = number_format((float) $vals_guia["subtotal_0_guia"]);
  $subtotal_guia = number_format($vals_guia["subtotal_guia"], 2);
  $total_guia = $vals_guia["total_guia"];
  $descuento_guia = $vals_guia["descuento_guia"];
  $valor_tarifa_adicional_guia = $vals_guia["valor_tarifa_adicional_guia"];
  $impuesto_iva_guia = $vals_guia["impuesto_iva_guia"];
  $punto_emision_sucursal_guia = $vals_guia["punto_emision_sucursal"];
  $punto_emision_guia = $vals_guia["punto_emision_usuario"];
  $id_fkcompania_asociada = $vals_guia["id_fkcompania_asociada"];
  $usuario = $vals_guia["usuario"];
  $numero_manual_guia = $vals_guia["numero_manual_guia"];

  //COMPANIA ASOCIADA
  $query_datos_compania = "SELECT nombre_compania_asociada,nombre_destino as
direccion_compania_asociada,direccion_exacta,numero_contacto FROM compania_asociada,destino WHERE id_compania_asociada =
$id_fkcompania_asociada AND lugar_destino ='$destino_guia'";
  $recuperar_detalles_compnai = mysqli_query($conn, $query_datos_compania) or die(mysqli_error($conn));
  $vals_detalle_compania = mysqli_fetch_array($recuperar_detalles_compnai);
  $nombre_compania = $vals_detalle_compania['nombre_compania_asociada'];
  $direccion_compania_asociada = $vals_detalle_compania['direccion_compania_asociada'];
  $numero_contacto = $vals_detalle_compania['numero_contacto'];

  //NUMERO GUIA
  $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
  $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;
  $query_datos_detalles = "SELECT contenido_guia, cantidad_detalle_guia, tipo_envio.nombre_envio FROM detalle_guia,
tipo_envio WHERE id_fkguia_detalle_envio = $id_guia AND tipo_envio.id_tipo_envio =
detalle_guia.id_fktipo_envio_detalle_guia;";
  $recuperar_detalles = mysqli_query($conn, $query_datos_detalles) or die(mysqli_error($conn));

  $contenido_detalle = '<p class="izquierda">';

  $posicion_codigo = 190;
  $espacio_codigo = '';

  while ($vals_detalle = mysqli_fetch_array($recuperar_detalles)) {

    $contenido_detalle .= 'CONTENIDO: ' . $vals_detalle["cantidad_detalle_guia"] . ' ' . $vals_detalle["nombre_envio"] . '
  ' . $vals_detalle["contenido_guia"] . ' <br>';

    $posicion_codigo = $posicion_codigo + 15;
    $espacio_codigo .= '
<p> </p>';

  }
  ;

  $contenido_detalle .= ' ';


  //UBICACION USUARIO GUIA


  $query_ubicacion = "SELECT lugar_destino FROM destino,usuario WHERE id_fkdestino_usuario = id_destino AND id_usuario=
$id_usuario_guia";
  $recuperar_ubicacion = mysqli_query($conn, $query_ubicacion) or die(mysqli_error($conn));
  $vals_ubicacion = mysqli_fetch_array($recuperar_ubicacion);
  $ubicacion_usuaurio = $vals_ubicacion['lugar_destino'];


  ///
  $sql_datos_factura = "SELECT
f.id_factura,
f.punto_emision_factura,
s.punto_emision_sucursal,
f.numero_factura,
f.fecha_creacion_factura,
f.clave_acceso_factura,
f.total_factura,
f.fecha_factura

FROM
guia g
LEFT JOIN
factura f ON f.id_fkguia_factura = g.id_guia
LEFT JOIN
sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
WHERE
g.id_guia = $id_guia
GROUP BY
f.id_factura,
f.clave_acceso_factura,
f.fecha_factura,
s.punto_emision_sucursal";




  $recuperar_datos_factura = mysqli_query($conn, $sql_datos_factura) or die(mysqli_error($conn));
  $vals_datos_factura = mysqli_fetch_array($recuperar_datos_factura);

  $detalles_forma_pago = "";
  $suma_total = 0;
  $suma_cobrada = 0;
  $total_cobrado = 0;

  $id_factura = (isset($vals_datos_factura) && isset($vals_datos_factura["id_factura"])) ? (int) $vals_datos_factura["id_factura"] : 0;

  if ($id_factura > 0) {
    $total_factura = $vals_datos_factura["total_factura"];
    $clave_acceso = $vals_datos_factura["clave_acceso_factura"];
    $punto_emision_factura = $vals_datos_factura["punto_emision_factura"];
    $punto_emision_sucursal = $vals_datos_factura["punto_emision_sucursal"];
    $fecha_factura = $vals_datos_factura["fecha_creacion_factura"];
    $resultado_factura = sprintf("%09s", $vals_datos_factura['numero_factura']);
    $numero_factura = $punto_emision_sucursal . '-' . $punto_emision_factura . '-' . $resultado_factura;

    $sql_pagos = "SELECT
    COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
    fp.id_forma_pago,
    fp.nombre_forma_pago,
    fp.tipo_forma_pago
    FROM
    comprobante_cobro cc
    LEFT JOIN
    forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
    WHERE
    cc.id_fkfactura_comprobante_cobro = $id_factura AND cc.estado_comprobante_cobro = 'COBRADA'
    GROUP BY
    fp.id_forma_pago";

    $recuperar_datos_factura_formas = mysqli_query($conn, $sql_pagos) or die(mysqli_error($conn));
    while ($vals_datos_facturaR = mysqli_fetch_array($recuperar_datos_factura_formas)) {
      $detalles_forma_pago .= '' . $vals_datos_facturaR["nombre_forma_pago"] . ': $' . number_format((float) $vals_datos_facturaR["total"], 2) . ' ';
      $suma_total = $suma_total + $vals_datos_facturaR["total"];
      // El crédito no es un pago real - no debe contar como cobrado
      if ((int)$vals_datos_facturaR["tipo_forma_pago"] != 4) {
        $suma_cobrada = $suma_cobrada + $vals_datos_facturaR["total"];
      }
    }
  } else {
    $total_factura = $total_guia;
    $numero_factura = "PENDIENTE";
    $fecha_factura = "S/N";
    $clave_acceso = "";
  }

  if ($detalles_forma_pago == "") {
    $detalles_forma_pago = "NINGUNA";
  }

  // Usar suma_cobrada (excluye crédito) para calcular el saldo pendiente
  $total_cobrado = $total_factura - $suma_cobrada;

  if ($id_factura > 0) {
      $estado_factura = ($total_cobrado <= 0) ? "COBRADA" : "POR COBRAR";
  } else {
      $estado_factura = ($vals_guia['estado_cobro_guia'] == 'COBRADA') ? "COBRADA" : "POR COBRAR";
  }

  // COMPROBANTES

  $sql_configuracion = "SELECT configuracion.leyendamensaje_configuracion,configuracion.mensajeleyenda_configuracion FROM
configuracion";
  $recuperar_configuracion = mysqli_query($conn, $sql_configuracion) or die(mysqli_error($conn));
  $vals_configuracion = mysqli_fetch_array($recuperar_configuracion);

  $leyendamensaje_configuracion = $vals_configuracion["leyendamensaje_configuracion"];
  $mensajeleyenda_configuracion = $vals_configuracion["mensajeleyenda_configuracion"];

  $validar_leyenda = $mensajeleyenda_configuracion;
  $mensaje = $leyendamensaje_configuracion;
  $leyenda = $mensaje;
  $rutaLogo = obtenerRutaLogoEmpresa($conn);
  // No longer using $pdf->Image('@' . $img) here as it's better handled in HTML or explicitly with a file path if needed.

  $html = '
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<style>
  .center {
    text-align: center;
  }

  .formas {
    font-weight: bold;
    font-size: 13px;
  }

  .borde_punto {
    width: 200px;
    /* Ajusta el ancho según tus necesidades */
    height: 200px;
    /* Ajusta la altura según tus necesidades */
    border: 1px dotted #000;
    /* Cambia el grosor y el color según tus necesidades */
    padding: 20px;
    /* Añade relleno para que el contenido no se pegue al borde */
  }

  .contenedor-imagen {
    border: solid black;
    display: inline-block;
    height: 220px;
    width: 200px;
    display: block;
  }


  .factura {
    font-size: 10px;
    font-weight: bold;
    color: gray
  }

  .center {

    text-align: center;

  }

  .titulo_inicio {
    font-size: 12px;

  }


  .linea {
    border-top: 1px dotted #000;
    /* 1px de ancho y puntos negros */
  }

  body {
    font-size: 11px;
  }
</style>

<body>



  <p class="center">
    ';
  if ($rutaLogo) {
    $html .= '<img width="64px" class="center" src="' . $rutaLogo . '" /><br>';
  }
  $html .= '
    <span class="titulo_inicio">' . $razon_social_empresa . '</span> <br>
    <span class="titulo_inicio">RUC:' . $ruc_empresa . '</span> <br>
    <span class="titulo_inicio">GUÍA DE DESPACHO ELECTRÓNICA</span> <br>
    <span class="titulo_inicio">N ° ' . $numero_guia . (!empty($numero_manual_guia) ? '<br>N ° MANUAL: ' . $numero_manual_guia : '') . '</span> <br>

  </p>
  <span class="center">OFICINA - ' . (!empty($ubicacion_usuaurio) ? $ubicacion_usuaurio : $vals_guia["nombre_sucursal"]) . '</span>

  <div class="linea"></div>

  <span class="center">
    <strong class=""><i class="fas fa-user"></i>CLIENTE</strong>

  </span>

  <br>RUC/CI: ' . $cedula_cliente_remitente . ' <br>Nombre:' . $nombre_cliente_remitente . '



  <div class="linea"></div>
  <span class="center">
    <strong class=""><i class="fas fa-user"></i>ORIGEN</strong>

  </span>



  <br>UBICACIÓN:' . $origen_guia . ' <br>CI:' . $cedula_cliente_remitente . ' <br>ENVÍA:
  ' . $nombre_cliente_remitente . '<br>TELÉFONO: ' . $telefono_cliente_emisor . '



  <div class="linea"></div>
  <span class="center">
    <strong class=""><i class="fas fa-user"></i>DESTINO</strong>

  </span>


  <br>UBICACIÓN:' . $destino_guia . ' <br>CI:' . $cedula_cliente_receptor . ' <br>RECIBE:'
  . $nombre_cliente_receptor . '<br>TELÉFONO: ' . $telefono_cliente_receptor . '' . $contenido_detalle . '

  <div class="linea"></div>
  <span class="center">
    <strong class=""><i class="fas fa-user"></i>RETIRAR EN:</strong>
  </span><br>DIRECCIÓN:' . $direccion_compania_asociada . ' <br>EMPRESA:' . $nombre_compania . '
   <br>CONTACTO:' . $numero_contacto . '
  <span>

  ' . (!empty($observacion_guia) && trim($observacion_guia) !== '' && strtolower(trim($observacion_guia)) !== 'null' ? '
  <div class="linea"></div>
  <span class="center">
    <strong class=""><i class="fas fa-user"></i>OBSERVACIÓN</strong>
  </span>
  <br>' . htmlspecialchars($observacion_guia) . '
  <span>' : '') . '


    <div class="linea"></div>
    <span class="center">
      <strong class=""><i class="fas fa-user"></i>DETALLE DEL PAGO</strong>
    </span>
    <br>OFICINISTA: ' . $usuario . '<br>FACTURA ELEC. N° ' . $numero_factura . '<br>GUÍA N° ' . $numero_guia . '
    <span>


      </p>

      <div class="center">
        <table style="text-align: left;">

          <tr>
            <td>SUBTOTAL:</td>
            <td>$' . number_format((float) $subtotal_12_guia, 2) . '</td>
          </tr>
          <tr>
            <td>SUBTOTAL 0%:</td>
            <td>$' . number_format((float) $subtotal_0_guia, 2) . '</td>
          </tr>
          <tr>
            <td>SUBTOTAL:</td>
            <td>$' . number_format((float) $subtotal_guia, 2) . '</td>
          </tr>
          <tr>
            <td>DESCUENTO:</td>
            <td>$' . number_format((float) $descuento_guia, 2) . '</td>
          </tr>
          <tr>
            <td>TARIFA ESPECIAL:</td>
            <td>$' . number_format((float) $valor_tarifa_adicional_guia, 2) . '</td>
          </tr>
          <tr>
            <td>IVA:</td>
            <td>$' . number_format((float) $impuesto_iva_guia, 2) . '</td>
          </tr>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td><strong>$' . number_format((float) $total_guia, 2) . '</strong></td>
          </tr>

        </table>
      </div>

      <strong>ESTADO:' . $estado_factura . '</strong>
      <span style="font-size:9px">
        <br>FORMAS DE PAGO:' . $detalles_forma_pago . '<br>POR COBRAR: $' . number_format((float) $total_cobrado, 2) . '<br>FECHA'
        . ' / HORA DE EMISIÓN:' . $fecha_factura . '<br>USUARIO: ' . $cedula_cliente_remitente . '
        <br>CONTRASEÑA:' . $cedula_cliente_remitente . '<br>IMPRESIÓN: ' . $fecha_actual . '
      </span>
      <br>
      <p class="center">

        _____________________
        <br>
        ' . $nombre_cliente_remitente . '



      </p>
      ' . $espacio_codigo . '
      <div class="linea"></div>

      <br>

      ' . $leyenda . ' <br>
      ' . ($reimpreso_por ? '<div style="text-align:center; font-style:italic; font-size:9px; margin-top:5px;">Reimpreso por: ' . htmlspecialchars($reimpreso_por) . '</div>' : '') . '

      <div style="height: 15px;"></div>
</body>

</html>
';

  $pdf->SetFont('helvetica', '', 5);
  $pdf->SetMargins(0, 0, 0, true);
  $pdf->SetAutoPageBreak(FALSE, 0); // Disable auto page break
  // add a page
  $pdf->AddPage('P', array(110, 800)); // Make height very large

  $pdf->SetLineStyle(array('width' => 0.1, 'cap' => 'butt', 'join' => 'miter', 'dash' => 3, 'color' => array(0, 0, 0)));

  // Dibujar un rectángulo con borde punteado
  $pdf->Rect(5, 30, 100, 25, 'D');

  // Write HTML content

  $pdf->writeHTML($html, true, false, true, false, '');

  $style = array(
    'position' => '',
    'align' => 'C',
    'stretch' => false,
    'fitwidth' => true,
    'cellfitalign' => '',
    'border' => false,
    'hpadding' => 'auto',
    'vpadding' => 'auto',
    'fgcolor' => array(
      0,
      0,
      0
    ),
    'bgcolor' => false, // array(255,255,255),
    'text' => true,
    'font' => 'helvetica',
    'fontsize' => 8,
    'stretchtext' => 4
  );
  // $pdf->SetXY(112, 65);

  // Obtener la posicion Y actual despues del contenido HTML
  $y_actual = $pdf->GetY();
  $pdf->SetXY(5, $y_actual + 5);
  // Codigo de barras
  if (!empty($clave_acceso)) {
    $pdf->write1DBarcode($clave_acceso, 'C128', '', '', '100', 18, 0.4, $style, 'N');
  }
  $pdf->Ln();

  $nombre_pdf = 'guiaImpresion_' . $id_guia . '.pdf';
  $pdf->Output(__DIR__ . '/tmp/' . $nombre_pdf, 'F');

  $array = array(
    "ruta" => $nombre_pdf,
    "success" => true,
    "borrar" => __DIR__ . '/tmp/' . $nombre_pdf,

  );

  echo json_encode($array);

} catch (Exception $e) {
  $array = array(
    "error" => $e->getMessage(),
    "success" => false,

  );

  echo json_encode($array);
}

//============================================================+
// END OF FILE
//============================================================+
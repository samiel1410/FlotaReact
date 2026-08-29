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
  $id_usuario_global = isset($_GET['id_usuario_global']) ? (int) $_GET['id_usuario_global'] : 0;
  $id_guia = isset($_GET['id_guia']) ? (int) $_GET['id_guia'] : 0;
  $reimpreso_por = isset($_GET['reimpreso_por']) ? $_GET['reimpreso_por'] : null;

  if ($id_guia <= 0) {
    die("ID de guía no válido");
  }

  $conn = conexion();

  // 1. EMPRESA (1 sola consulta rápida)
  $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
  $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
  $vals_empresa = mysqli_fetch_assoc($recuperar_empresa);

  $id_empresa = isset($vals_empresa["id_empresa"]) ? $vals_empresa["id_empresa"] : 0;
  $imagen_empresa = isset($vals_empresa["imagen_empresa"]) ? $vals_empresa["imagen_empresa"] : null;
  $telefono_empresa = isset($vals_empresa["telefono_empresa"]) ? $vals_empresa["telefono_empresa"] : '';
  $correo_empresa = isset($vals_empresa["correo_empresa"]) ? $vals_empresa["correo_empresa"] : '';
  $ruc_empresa = isset($vals_empresa["ruc_empresa"]) ? $vals_empresa["ruc_empresa"] : '';
  $direccion_empresa = isset($vals_empresa["direccion_empresa"]) ? $vals_empresa["direccion_empresa"] : '';
  $razon_social_empresa = isset($vals_empresa["razon_social_empresa"]) ? $vals_empresa["razon_social_empresa"] : '';

  // 2. CONFIGURACIÓN (1 sola consulta trayendo leyenda, formato de impresión y opciones)
  $sql_configuracion = "SELECT leyenda_nota_venta, mostrar_leyenda_nota_venta, imprimir_boucher_guia, formato_impresion FROM configuracion LIMIT 1";
  $recuperar_configuracion = mysqli_query($conn, $sql_configuracion) or die(mysqli_error($conn));
  $vals_configuracion = mysqli_fetch_assoc($recuperar_configuracion);

  $leyenda_nota_venta = isset($vals_configuracion["leyenda_nota_venta"]) ? $vals_configuracion["leyenda_nota_venta"] : '';
  $mostrar_leyenda_nota_venta = isset($vals_configuracion["mostrar_leyenda_nota_venta"]) ? $vals_configuracion["mostrar_leyenda_nota_venta"] : '';
  $imprimir_boucher_guia = isset($vals_configuracion["imprimir_boucher_guia"]) ? (int)$vals_configuracion["imprimir_boucher_guia"] : 1;
  $formato_impresion_db = isset($vals_configuracion["formato_impresion"]) ? $vals_configuracion["formato_impresion"] : null;

  $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 110, $formato_impresion_db);
  $metricas = obtenerMetricasImpresion($ancho_impresion, 110);
  $validar_leyenda = $mostrar_leyenda_nota_venta;
  $mensaje = $leyenda_nota_venta;
  $leyenda = $mensaje;
  $rutaLogo = obtenerRutaLogoEmpresa($conn, $imagen_empresa);

  // 3. CONSULTA PRINCIPAL DE GUIA NOTA VENTA (Unificada con JOINs explícitos e incluye destino de usuario)
  $query_guia = "SELECT 
    g.origen_guia, 
    s.nombre_sucursal,
    g.destino_guia,
    g.numero_guia,
    g.numero_manual_guia,
    s.punto_emision_sucursal,
    g.observacion_guia,
    g.id_fkcompania_asociada,
    g.id_fkusuario_guia,
    UPPER(g.nombre_cliente_remitente) AS nombre_cliente_remitente,
    u.punto_emision_usuario,
    UPPER(g.nombre_cliente_receptor) AS nombre_cliente_receptor,
    g.cedula_cliente_remitente,
    g.cedula_cliente_receptor,
    g.telefono_cliente_emisor,
    g.telefono_cliente_receptor,
    g.subtotal_12_guia,
    g.subtotal_0_guia,
    g.subtotal_guia,
    g.total_guia,
    g.descuento_guia,
    g.valor_tarifa_adicional_guia,
    g.impuesto_iva_guia,
    CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario,
    du.lugar_destino AS ubicacion_usuario
  FROM guia_nota_venta g
  LEFT JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
  LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
  LEFT JOIN destino du ON u.id_fkdestino_usuario = du.id_destino
  WHERE g.id_guia = $id_guia
  LIMIT 1";

  $recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
  $vals_guia = mysqli_fetch_assoc($recuperar_guia);

  if (!$vals_guia) {
    die("Guía no encontrada");
  }

  $origen_guia = isset($vals_guia["origen_guia"]) ? $vals_guia["origen_guia"] : '';
  $observacion_guia = isset($vals_guia["observacion_guia"]) ? $vals_guia["observacion_guia"] : '';
  $destino_guia = isset($vals_guia["destino_guia"]) ? $vals_guia["destino_guia"] : '';
  $id_usuario_guia = isset($vals_guia["id_fkusuario_guia"]) ? $vals_guia["id_fkusuario_guia"] : 0;
  $nombre_cliente_remitente = isset($vals_guia["nombre_cliente_remitente"]) ? $vals_guia["nombre_cliente_remitente"] : '';
  $nombre_cliente_receptor = isset($vals_guia["nombre_cliente_receptor"]) ? $vals_guia["nombre_cliente_receptor"] : '';
  $cedula_cliente_remitente = isset($vals_guia["cedula_cliente_remitente"]) ? $vals_guia["cedula_cliente_remitente"] : '';
  $cedula_cliente_receptor = isset($vals_guia["cedula_cliente_receptor"]) ? $vals_guia["cedula_cliente_receptor"] : '';
  $telefono_cliente_emisor = isset($vals_guia["telefono_cliente_emisor"]) ? $vals_guia["telefono_cliente_emisor"] : '';
  $telefono_cliente_receptor = isset($vals_guia["telefono_cliente_receptor"]) ? $vals_guia["telefono_cliente_receptor"] : '';
  $subtotal_12_guia = isset($vals_guia["subtotal_12_guia"]) ? $vals_guia["subtotal_12_guia"] : 0;
  $subtotal_0_guia = number_format((float) (isset($vals_guia["subtotal_0_guia"]) ? $vals_guia["subtotal_0_guia"] : 0));
  $subtotal_guia = number_format((float) (isset($vals_guia["subtotal_guia"]) ? $vals_guia["subtotal_guia"] : 0), 2);
  $total_guia = (float) (isset($vals_guia["total_guia"]) ? $vals_guia["total_guia"] : 0);
  $descuento_guia = isset($vals_guia["descuento_guia"]) ? $vals_guia["descuento_guia"] : 0;
  $valor_tarifa_adicional_guia = isset($vals_guia["valor_tarifa_adicional_guia"]) ? $vals_guia["valor_tarifa_adicional_guia"] : 0;
  $impuesto_iva_guia = isset($vals_guia["impuesto_iva_guia"]) ? $vals_guia["impuesto_iva_guia"] : 0;
  $punto_emision_sucursal_guia = isset($vals_guia["punto_emision_sucursal"]) ? $vals_guia["punto_emision_sucursal"] : '';
  $punto_emision_guia = isset($vals_guia["punto_emision_usuario"]) ? $vals_guia["punto_emision_usuario"] : '';
  $id_fkcompania_asociada = (int) (isset($vals_guia["id_fkcompania_asociada"]) ? $vals_guia["id_fkcompania_asociada"] : 0);
  $usuario = isset($vals_guia["usuario"]) ? $vals_guia["usuario"] : '';
  $numero_manual_guia = isset($vals_guia["numero_manual_guia"]) ? $vals_guia["numero_manual_guia"] : '';
  $ubicacion_usuaurio = isset($vals_guia["ubicacion_usuario"]) ? $vals_guia["ubicacion_usuario"] : '';

  // 4. COMPANIA ASOCIADA (Condicional y optimizada sin producto cartesiano)
  $nombre_compania = '';
  $direccion_compania_asociada = '';
  $direccion_exacta = '';
  $numero_contacto = '';
  if ($id_fkcompania_asociada > 0) {
    $destino_escaped = mysqli_real_escape_string($conn, $destino_guia);
    $query_datos_compania = "SELECT 
      ca.nombre_compania_asociada, 
      d.nombre_destino AS direccion_compania_asociada, 
      d.direccion_exacta, 
      d.numero_contacto 
    FROM compania_asociada ca
    LEFT JOIN destino d ON d.lugar_destino = '$destino_escaped'
    WHERE ca.id_compania_asociada = $id_fkcompania_asociada 
    LIMIT 1";
    $recuperar_detalles_compnai = mysqli_query($conn, $query_datos_compania);
    if ($recuperar_detalles_compnai && $vals_detalle_compania = mysqli_fetch_assoc($recuperar_detalles_compnai)) {
      $nombre_compania = isset($vals_detalle_compania['nombre_compania_asociada']) ? $vals_detalle_compania['nombre_compania_asociada'] : '';
      $direccion_compania_asociada = isset($vals_detalle_compania['direccion_compania_asociada']) ? $vals_detalle_compania['direccion_compania_asociada'] : '';
      $direccion_exacta = isset($vals_detalle_compania['direccion_exacta']) ? $vals_detalle_compania['direccion_exacta'] : '';
      $numero_contacto = isset($vals_detalle_compania['numero_contacto']) ? $vals_detalle_compania['numero_contacto'] : '';
    }
  }

  // 5. NUMERO GUIA Y DETALLES
  $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
  $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;

  $query_datos_detalles = "SELECT 
    dg.contenido_guia, 
    dg.cantidad_detalle_guia, 
    te.nombre_envio 
  FROM detalle_guia_nota_venta dg
  LEFT JOIN tipo_envio te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio 
  WHERE dg.id_fkguia_detalle_envio = $id_guia";

  $recuperar_detalles = mysqli_query($conn, $query_datos_detalles) or die(mysqli_error($conn));

  $contenido_detalle = '<p class="izquierda">';
  $posicion_codigo = 190;
  $espacio_codigo = '';
  $items_detalle = [];
  $total_copias_extra = 0;

  while ($vals_detalle = mysqli_fetch_assoc($recuperar_detalles)) {
    $cant = max(1, (int)$vals_detalle["cantidad_detalle_guia"]);
    $contenido_detalle .= 'CONTENIDO: ' . $vals_detalle["cantidad_detalle_guia"] . ' ' . $vals_detalle["nombre_envio"] . ' ' . $vals_detalle["contenido_guia"] . ' <br>';
    $posicion_codigo += 15;
    $espacio_codigo .= '<p> </p>';
    for ($ci = 1; $ci <= $cant; $ci++) {
      $items_detalle[] = [
        'nombre_envio' => isset($vals_detalle['nombre_envio']) ? $vals_detalle['nombre_envio'] : '',
        'contenido'    => isset($vals_detalle['contenido_guia']) ? $vals_detalle['contenido_guia'] : '',
        'cantidad'     => $cant,
        'unidad'       => $ci,
      ];
      $total_copias_extra++;
    }
  }
  $contenido_detalle .= ' ';

  // 6. FORMAS DE PAGO NOTA DE VENTA
  $detalles_forma_pago = "";
  $suma_total = 0;
  $suma_cobrada = 0;
  $total_cobrado = 0;
  $total_factura = $total_guia;
  $clave_acceso = "";
  $fecha_factura = "S/N";

  $sql_pagos = "SELECT
    COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
    fp.id_forma_pago,
    fp.nombre_forma_pago,
    fp.tipo_forma_pago
  FROM comprobante_cobro_nota_venta cc
  LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
  WHERE cc.id_fkfactura_comprobante_cobro = $id_guia AND cc.estado_comprobante_cobro != 'ANULADA'
  GROUP BY fp.id_forma_pago, fp.nombre_forma_pago, fp.tipo_forma_pago";

  $recuperar_datos_factura_formas = mysqli_query($conn, $sql_pagos) or die(mysqli_error($conn));
  while ($vals_datos_facturaR = mysqli_fetch_assoc($recuperar_datos_factura_formas)) {
    $monto_pago = (float) $vals_datos_facturaR["total"];
    $detalles_forma_pago .= $vals_datos_facturaR["nombre_forma_pago"] . ': $' . number_format($monto_pago, 2) . ' ';
    $suma_total += $monto_pago;
    if ((int)$vals_datos_facturaR["tipo_forma_pago"] != 4) {
      $suma_cobrada += $monto_pago;
    }
  }

  $total_cobrado = $total_factura - $suma_cobrada;
  $estado_factura = ($total_cobrado <= 0.001) ? "COBRADA" : "POR COBRAR";

  if (empty($detalles_forma_pago)) {
    $detalles_forma_pago = "NINGUNA";
  }

  // create new PDF document
  $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(), true, 'UTF-8', false);
  $pdf->setFontSubsetting(false);
  $pdf->setPrintHeader(false);
  $pdf->setPrintFooter(false);

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
    font-size: ' . $metricas['font_formas_px'] . 'px;
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
    font-size: ' . $metricas['font_pequeno_px'] . 'px;
    font-weight: bold;
    color: gray
  }

  .titulo_inicio {
    font-size: ' . $metricas['font_titulo_px'] . 'px;
    font-weight: bold;
  }

  .linea {
    border-top: 1px dotted #000;
    /* 1px de ancho y puntos negros */
  }

  body {
    font-size: ' . $metricas['font_base_px'] . 'px;
    margin: 0;
    padding: 0;
  }
</style>

<body>



  <p class="center">
    ';
  if ($rutaLogo) {
    $html .= '<img width="' . $metricas['logo_width_px'] . 'px" class="center" src="' . $rutaLogo . '" /><br>';
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


  <br>UBICACIÓN:' . $destino_guia . ' <br>CI:' . $cedula_cliente_receptor . ' <br>RECIBE:
  ' . $nombre_cliente_receptor . '<br>TELÉFONO: ' . $telefono_cliente_receptor . '' . $contenido_detalle . '

  <div class="linea"></div>
  <span class="center">
    <strong class=""><i class="fas fa-user"></i>RETIRAR EN:</strong>
  </span><br>DIRECCIÓN:' . $direccion_compania_asociada . ' <br>EMPRESA:' . $nombre_compania . '
  <br>DIR.EXACTA:' . $direccion_exacta . '<br>CONTACTO:' . $numero_contacto . '
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
    <br>OFICINISTA: ' . $usuario . '<br>GUÍA N° ' . $numero_guia . '
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
        <br>FORMAS DE PAGO:' . $detalles_forma_pago . '<br>POR COBRAR: $' . number_format((float) $total_cobrado, 2) . '<br>FECHA / HORA DE EMISIÓN:' . $fecha_factura . '<br>USUARIO: ' . $cedula_cliente_remitente . '
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

  // set document information

  // Print text using writeHTMLCell()




  // set default monospaced font


  // set auto page breaks


  // set some language-dependent strings (optional)

  // ---------------------------------------------------------

  $pdf->SetFont('helvetica', '', 5);
  $pdf->SetMargins($metricas['margen_mm'], 0, $metricas['margen_mm'], true);
  $pdf->SetAutoPageBreak(FALSE, 0); // Disable auto page break
  // add a page
  $pdf->AddPage('P', array($ancho_impresion, 800)); // Dynamic print width from config

  $pdf->SetLineStyle(array('width' => 0.1, 'cap' => 'butt', 'join' => 'miter', 'dash' => 3, 'color' => array(0, 0, 0)));

  // Dibujar un rectángulo con borde punteado
  $pdf->Rect($metricas['margen_mm'], 30, $metricas['ancho_util_mm'], 25, 'D');

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
    'fontsize' => $metricas['font_tcpdf_sub'],
    'stretchtext' => 4
  );
  // $pdf->SetXY(112, 65);

  // Obtener la posicion Y actual despues del contenido HTML
  $y_actual = $pdf->GetY();
  $pdf->SetXY($metricas['margen_mm'], $y_actual + 5);
  // Codigo de barras
  if (!empty($clave_acceso)) {
    $pdf->write1DBarcode($clave_acceso, 'C128', '', '', $metricas['ancho_util_mm'], $metricas['alto_barcode_mm'], 0.4, $style, 'N');
  }
  $pdf->Ln();

  // ── HOJAS EXTRA: una por cada unidad de cada item
  // El numero de pagina SOLO va en los slips, no en la hoja de factura principal
  if ($imprimir_boucher_guia === 1) {
    $pagina_actual = 1;
    $total_paginas = $total_copias_extra; // numeracion interna de los slips
    $fecha_slip = date('d/m/Y H:i');
    $sep_doble = str_repeat('=', 38);

    foreach ($items_detalle as $item) {

      // Pagina slip: formato configurable x 200mm para mejor uso del espacio
      $pdf->AddPage('P', array($ancho_impresion, 200));
      $pdf->SetMargins($metricas['margen_mm'], 5, $metricas['margen_mm'], true);
      $pdf->SetAutoPageBreak(FALSE, 0);
      $lw = $metricas['ancho_util_mm'];

      // ── LOGO ──
      if ($rutaLogo) {
        $pdf->Image($rutaLogo, ($ancho_impresion / 2) - 9, 4, 18, 0, '', '', 'T', false, 300, 'C');
        $pdf->SetY(23);
      } else {
        $pdf->SetY(5);
      }

      // ── EMPRESA ──
      $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
      $pdf->Cell($lw, 6, strtoupper($razon_social_empresa), 0, 1, 'C');

      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
      $pdf->Cell($lw, 4, $numero_guia, 0, 1, 'C');
      if (!empty($numero_manual_guia)) {
        $pdf->Cell($lw, 4, 'MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
      }

      // ── LINEA DOBLE ──
      $pdf->Ln(2);
      $y0 = $pdf->GetY();
      $pdf->SetDrawColor(0,0,0);
      $pdf->SetLineWidth(0.6);
      $pdf->Line($metricas['margen_mm'], $y0, $ancho_impresion - $metricas['margen_mm'], $y0);
      $pdf->SetLineWidth(0.2);
      $pdf->Line($metricas['margen_mm'], $y0 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y0 + 1.5);
      $pdf->SetY($y0 + 4);

      // ── FECHA ──
      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
      $pdf->Cell($lw, 5, $fecha_slip, 0, 1, 'C');
      $pdf->Ln(1);

      // ── REMITENTE ──
      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
      $pdf->Cell($lw, 4, 'Remitente', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
      $pdf->MultiCell($lw, 6, $nombre_cliente_remitente, 0, 'C', false, 1);
      $pdf->Ln(1);

      // ── DESTINATARIO ──
      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
      $pdf->Cell($lw, 4, 'Destinatario', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
      $pdf->MultiCell($lw, 6, $nombre_cliente_receptor, 0, 'C', false, 1);
      $pdf->Ln(1);

      // ── DESTINO ──
      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
      $pdf->Cell($lw, 4, 'Destino', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.15, 1));
      $pdf->Cell($lw, 7, strtoupper($destino_guia), 0, 1, 'C');
      $pdf->Ln(1);

      // ── TELEFONO ──
      $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
      $pdf->Cell($lw, 5, 'Fono: ' . $telefono_cliente_receptor, 0, 1, 'C');
      $pdf->Ln(1);

      // ── CONTENIDO ──
      $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
      $desc = strtoupper($item['nombre_envio']) . ': ' . strtoupper($item['contenido']);
      $pdf->MultiCell($lw, 6, $desc, 0, 'C', false, 1);
      $pdf->Ln(2);

      // ── LINEA DOBLE ──
      $y1 = $pdf->GetY();
      $pdf->SetLineWidth(0.6);
      $pdf->Line($metricas['margen_mm'], $y1, $ancho_impresion - $metricas['margen_mm'], $y1);
      $pdf->SetLineWidth(0.2);
      $pdf->Line($metricas['margen_mm'], $y1 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y1 + 1.5);
      $pdf->SetY($y1 + 5);

      // ── EMPRESA DESTINO ──
      if (!empty($nombre_compania)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 5, strtoupper($nombre_compania), 0, 1, 'C');
      }
      if (!empty($origen_guia)) {
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->Cell($lw, 4, strtoupper($origen_guia), 0, 1, 'C');
      }
      $pdf->Ln(3);

      // ── NUMERO DE PAGINA ──
      $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
      $pdf->Cell($lw, 5, $pagina_actual . ' / ' . $total_paginas, 0, 1, 'C');

      $pagina_actual++;
    }
  }

  $nombre_pdf = 'guiaNotaVentaImpresion_' . $id_guia . '.pdf';
  $pdf->Output($nombre_pdf, 'I');
  exit();

} catch (Exception $e) {
  $array = array(
    "error" => $e->getMessage(),
    "success" => false,

  );

  echo json_encode($array);
}



// Guardar el archivo en el servidor


// Limpiar el búfer de salida





//============================================================+
// END OF FILE
//============================================================+


?>
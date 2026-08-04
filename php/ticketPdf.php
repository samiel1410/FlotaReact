<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

try {
  $id_usuario_global = isset($_GET['id_usuario_global']) ? (int) $_GET['id_usuario_global'] : 0;
  $id_guia = isset($_GET['id_guia']) ? (int) $_GET['id_guia'] : 0;

  if ($id_guia <= 0) throw new Exception("ID de guía no válido");

  $conn = conexion();

  // ─── 1. EMPRESA ────────────────────────────────────────────────────────────
  $query_empresa = "SELECT razon_social_empresa, ruc_empresa, imagen_empresa FROM empresa LIMIT 1";
  $vals_empresa  = mysqli_fetch_assoc(mysqli_query($conn, $query_empresa));

  $razon_social  = !empty($vals_empresa["razon_social_empresa"]) ? strtoupper($vals_empresa["razon_social_empresa"]) : 'GRUPO TRAMACO';
  $rutaLogo      = obtenerRutaLogoEmpresa($conn);

  // ─── 2. GUÍA ───────────────────────────────────────────────────────────────
  $query_guia = "SELECT g.origen_guia, g.destino_guia, g.numero_guia, g.observacion_guia,
                        g.id_fkusuario_guia, g.fecha_creacion_guia,
                        UPPER(g.nombre_cliente_remitente) as remitente,
                        UPPER(g.nombre_cliente_receptor)  as receptor,
                        g.telefono_cliente_emisor, g.telefono_cliente_receptor,
                        g.total_guia, g.estado_cobro_guia,
                        u.punto_emision_usuario, s.punto_emision_sucursal
                 FROM guia g
                 JOIN  sucursal2 s ON g.sucursal_guia    = s.suc_codigo_sucursal
                 LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
                 WHERE g.id_guia = $id_guia";
  $vals_guia = mysqli_fetch_assoc(mysqli_query($conn, $query_guia));

  if (!$vals_guia) throw new Exception("Guía no encontrada");

  $origen_guia      = trim($vals_guia["origen_guia"] ?? '');
  $destino_guia     = trim($vals_guia["destino_guia"] ?? '');
  $observacion_guia = trim($vals_guia["observacion_guia"] ?? '');
  $observacion_guia = ($observacion_guia === '' || strtolower($observacion_guia) === 'null') ? '' : $observacion_guia;
  $remitente        = trim($vals_guia["remitente"] ?? '');
  $receptor         = trim($vals_guia["receptor"] ?? '');
  $tel_receptor     = trim($vals_guia["telefono_cliente_receptor"] ?? '');
  $fecha_guia       = !empty($vals_guia["fecha_creacion_guia"])
                      ? date('d/m/Y', strtotime($vals_guia["fecha_creacion_guia"]))
                      : date('d/m/Y');

  $resultado_guia        = sprintf("%09s", $vals_guia['numero_guia']);
  $numero_guia_completo  = $vals_guia["punto_emision_sucursal"] . '-' . $vals_guia["punto_emision_usuario"] . '-' . $resultado_guia;

  // ─── 3. DETALLES ──────────────────────────────────────────────────────────
  $query_det = "SELECT d.contenido_guia, d.cantidad_detalle_guia, d.peso_guia, t.nombre_envio
                FROM detalle_guia d
                LEFT JOIN tipo_envio t ON d.id_fktipo_envio_detalle_guia = t.id_tipo_envio
                WHERE d.id_fkguia_detalle_envio = $id_guia";
  $res_det   = mysqli_query($conn, $query_det);

  $total_bultos = 0;
  $total_peso   = 0.0;
  $contenidos   = [];

  while ($row = mysqli_fetch_assoc($res_det)) {
    $cant = max(1, (int)($row["cantidad_detalle_guia"] ?? 1));
    $peso = (float)($row["peso_guia"] ?? 0);
    $total_bultos += $cant;
    $total_peso   += $peso * $cant;
    $desc = trim(($row["nombre_envio"] ? $row["nombre_envio"] . ' ' : '') . $row["contenido_guia"]);
    if ($desc) $contenidos[] = $desc;
  }

  $str_detalle = implode(', ', $contenidos);
  if (strlen($str_detalle) > 45) $str_detalle = substr($str_detalle, 0, 42) . '...';

  // ─── 4. PDF  Landscape 152 × 102 mm (6" × 4")  ───────────────────────────
  $pdf = new TCPDF('L', 'mm', [102, 152], true, 'UTF-8', false);
  $pdf->SetCreator('SistemaFlota');
  $pdf->SetAuthor($razon_social);
  $pdf->SetTitle('Etiqueta Guía ' . $numero_guia_completo);
  $pdf->SetMargins(4, 3, 4);
  $pdf->SetAutoPageBreak(false, 0);
  $pdf->setPrintHeader(false);
  $pdf->setPrintFooter(false);
  $pdf->SetFont('helvetica', '', 8);
  $pdf->AddPage();

  // ─── Estilos de barcode ───────────────────────────────────────────────────
  $barcodeStyle = [
    'position'      => '',
    'align'         => 'C',
    'stretch'       => true,
    'fitwidth'      => true,
    'cellfitalign'  => '',
    'border'        => false,
    'hpadding'      => 0,
    'vpadding'      => 0,
    'fgcolor'       => [0,0,0],
    'bgcolor'       => false,
    'text'          => false,
  ];
  $qrStyle = [
    'border'        => 0,
    'vpadding'      => 0,
    'hpadding'      => 0,
    'fgcolor'       => [0,0,0],
    'bgcolor'       => false,
    'module_width'  => 1,
    'module_height' => 1,
  ];

  $datos_qr = json_encode([
    'g' => $numero_guia_completo,
    'o' => $origen_guia,
    'd' => $destino_guia,
  ]);

  // ─── CABECERA ─────────────────────────────────────────────────────────────
  //  Logo (si existe) — columna izquierda, y=3, h=14mm
  $xCursor = 4;
  if ($rutaLogo) {
    $pdf->Image($rutaLogo, $xCursor, 3, 0, 14, '', '', '', false);
    $xCursor = 4 + 18; // logo + gap
  }

  // Nombre empresa (bold grande)
  $pdf->SetFont('helvetica', 'B', 13);
  $pdf->SetXY($xCursor, 3);
  $pdf->Cell(0, 7, $razon_social, 0, 1, 'L');

  // RUC debajo
  if (!empty($vals_empresa['ruc_empresa'])) {
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetXY($xCursor, 10);
    $pdf->Cell(0, 4, 'RUC: ' . $vals_empresa['ruc_empresa'], 0, 1, 'L');
  }

  // Rastrea tu envío — columna derecha
  $pdf->SetFont('helvetica', 'B', 7);
  $pdf->SetXY(108, 3);
  $pdf->MultiCell(20, 3.5, "¡RASTREA\nTU ENVÍO\nAQUÍ!", 0, 'C', false);

  // QR pequeño arriba derecha
  $pdf->write2DBarcode($datos_qr, 'QRCODE,Q', 130, 2, 17, 17, $qrStyle, 'N');

  // Línea separadora
  $pdf->SetDrawColor(0, 0, 0);
  $pdf->SetLineWidth(0.5);
  $pdf->Line(4, 18, 148, 18);

  // ─── NÚMERO DE GUÍA ───────────────────────────────────────────────────────
  $pdf->SetFont('helvetica', 'B', 11.5);
  $pdf->SetXY(4, 19);
  $pdf->Cell(144, 6, 'GUIA: ' . $numero_guia_completo, 0, 1, 'C');

  // Código de barras
  $pdf->write1DBarcode($numero_guia_completo, 'C128', 14, 26, 120, 12, 0.45, $barcodeStyle, 'N');

  // Línea separadora
  $pdf->Line(4, 40, 148, 40);

  // ─── CUERPO ───────────────────────────────────────────────────────────────
  $yBody = 41;
  $pdf->SetFont('helvetica', 'B', 7.5);

  // Fila 1: ORIGEN | DESTINO + TELÉFONO
  $pdf->SetXY(4, $yBody);
  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->Cell(4,  4, '', 0, 0);
  $pdf->Cell(50, 4, 'ORIGEN: ', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->Cell(20, 4, $origen_guia, 0, 0);

  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY(78, $yBody);
  $pdf->Cell(18, 4, 'DESTINO: ', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->Cell(30, 4, $destino_guia, 0, 0);

  // Fila 1b: TEL receptor
  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY(110, $yBody);
  $pdf->Cell(14, 4, 'TEL:', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->Cell(28, 4, $tel_receptor, 0, 0);

  // Fila 2: nombre receptor
  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY(4, $yBody + 4.5);
  $pdf->Cell(16, 4, 'REMITENTE:', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->Cell(60, 4, $remitente, 0, 0);
  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY(78, $yBody + 4.5);
  $pdf->Cell(16, 4, 'DESTINATARIO:', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->Cell(60, 4, $receptor, 0, 0);

  // Línea divisora
  $pdf->Line(4, $yBody + 10, 148, $yBody + 10);

  // Fila 3: GESTOR ENTREGA (ancho completo)
  $pdf->SetFont('helvetica', 'B', 8);
  $pdf->SetXY(4, $yBody + 11);
  $pdf->Cell(30, 4.5, 'GESTOR ENTREGA:', 0, 0);
  $pdf->SetFont('helvetica', 'B', 9);
  $pdf->Cell(100, 4.5, strtoupper($destino_guia), 0, 0);

  // Línea divisora
  $pdf->Line(4, $yBody + 17, 148, $yBody + 17);

  // Fila 4: izquierda PESO / VAL ASEGURADO / COD COBRAR / ADJUNTO  |  derecha DETALLE / OBSERV
  $yDet = $yBody + 18;
  $leftCol  = 4;
  $rightCol = 78;

  // Columna izquierda
  $rows_izq = [
    ['PESO:', number_format($total_peso, 2) . ' kg'],
    ['VALOR ASEGURADO:', '0,00'],
    ['COD VALOR A COBRAR: $', ''],
    ['ADJUNTO:', ''],
  ];
  $yi = $yDet;
  foreach ($rows_izq as $r) {
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->SetXY($leftCol, $yi);
    $pdf->Cell(40, 4, $r[0], 0, 0);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(30, 4, $r[1], 0, 0);
    $yi += 4;
  }

  // Línea vertical divisora entre columnas (sutil)
  $pdf->SetDrawColor(180, 180, 180);
  $pdf->SetLineWidth(0.3);
  $pdf->Line(76, $yDet - 1, 76, $yi - 1);
  $pdf->SetDrawColor(0, 0, 0);
  $pdf->SetLineWidth(0.5);

  // Columna derecha
  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY($rightCol, $yDet);
  $pdf->Cell(16, 4, 'DETALLE:', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->MultiCell(68, 4, $str_detalle ?: '-', 0, 'L', false, 1, $rightCol + 16, $yDet);

  $pdf->SetFont('helvetica', 'B', 7.5);
  $pdf->SetXY($rightCol, $yDet + 8);
  $pdf->Cell(22, 4, 'OBSERVACIONES:', 0, 0);
  $pdf->SetFont('helvetica', '', 7.5);
  $pdf->MultiCell(60, 4, $observacion_guia ?: '-', 0, 'L', false, 1, $rightCol + 22, $yDet + 8);

  // ─── PIE: CANTIDAD y FECHA ────────────────────────────────────────────────
  $pdf->Line(4, $yDet + $yi - $yDet - 1, 148, $yDet + $yi - $yDet - 1);
  $yPie = $yDet + 17;
  $pdf->Line(4, $yPie, 148, $yPie);
  $yPie += 1;

  $pdf->SetFont('helvetica', 'B', 11);
  $pdf->SetXY(4, $yPie);
  $pdf->Cell(70, 6, 'CANTIDAD: 1/' . $total_bultos, 0, 0, 'L');

  $pdf->SetFont('helvetica', 'B', 8.5);
  $pdf->SetXY(78, $yPie);
  $pdf->Cell(18, 6, 'FECHA:', 0, 0);
  $pdf->SetFont('helvetica', '', 8.5);
  $pdf->Cell(60, 6, $fecha_guia, 0, 0);

  $fileName = 'ticketGuia_' . $id_guia . '.pdf';
  $pdf->Output($fileName, 'I');
  exit();

} catch (Exception $e) {
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}

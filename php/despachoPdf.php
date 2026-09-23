<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_maestro = (int)($_GET['id_maestro'] ?? 0);

    if ($id_maestro <= 0) {
        throw new Exception("ID de despacho maestro no proporcionado");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }

    $vals_empresa = null;
    $rutaLogo = null;

    
        $query_empresa = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_empresa = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_empresa ? mysqli_fetch_assoc($rec_empresa) : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'SISTEMA FLOTA',
                'ruc_empresa' => ''
            ];
        }

        $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
        $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
        if (esImagenValidaParaTcpdf($cachedLogoPng)) {
            $rutaLogo = $cachedLogoPng;
        } else if (esImagenValidaParaTcpdf($cachedLogoJpg)) {
            $rutaLogo = $cachedLogoJpg;
        } else {
            $query_img = "SELECT imagen_empresa FROM empresa LIMIT 1";
            $res_img = mysqli_query($conn, $query_img);
            if ($res_img && $row_img = mysqli_fetch_assoc($res_img)) {
                $rawLogo = procesarLogoParaTcpdf($row_img['imagen_empresa'], $dbKey);
                if ($rawLogo && esImagenValidaParaTcpdf($rawLogo)) {
                    $ext = pathinfo($rawLogo, PATHINFO_EXTENSION) ?: 'png';
                    $targetLogo = $logosDir . 'logo_tenant_' . $dbKey . '.' . $ext;
                    if ($rawLogo !== $targetLogo) {
                        @copy($rawLogo, $targetLogo);
                    }
                    $rutaLogo = esImagenValidaParaTcpdf($targetLogo) ? $targetLogo : $rawLogo;
                }
            }
        }

        

    if (empty($rutaLogo) || !esImagenValidaParaTcpdf($rutaLogo)) {
        $rutaLogo = obtenerRutaLogoEmpresa($conn);
    }

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? "SISTEMA FLOTA";
    $ruc_empresa          = $vals_empresa["ruc_empresa"] ?? "";

    // ─── QUERY DESPACHO MAESTRO ──────────────────────────────────────────────
    $query = "SELECT 
        dm.numero_despacho_maestro,
        dm.nombre_destino,
        dm.fecha_despacho_maestro,
        dm.nombre_oficinista,
        dm.nombre_bus,
        dm.tipo_despacho,
        dm.tipo_vehiculo,
        dm.placa_vehiculo,
        dm.numero_vehiculo,
        dm.id_fkorigen_despacho,
        dm.nombre_origen,
        dm.responsable_despacho,
        dm.id_fkusuario_despacho_maestro,
        dm.id_fkviaje_despacho_maestro,
        CONCAT(p.per_nombres_persona, ' ', p.per_apellidos_personal) as nombre_busero,
        u.nombre_usuario,
        u.apellido_usuario 
    FROM despacho_maestro dm
    LEFT JOIN usuario u ON dm.id_fkusuario_despacho_maestro = u.id_usuario
    LEFT JOIN personal p ON dm.id_fkbus_despacho_maestro = p.per_codigo_personal
    WHERE dm.id_despacho_maestro = $id_maestro";

    $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
    $vals = mysqli_fetch_array($recuperar);

    if (!$vals) {
        throw new Exception("No se encontró el despacho con ID: $id_maestro");
    }

    $nombre_oficinista_real = trim(($vals["nombre_usuario"] ?? '') . " " . ($vals["apellido_usuario"] ?? ''));
    if (empty($nombre_oficinista_real)) $nombre_oficinista_real = $vals["nombre_oficinista"] ?? '';

    $numero_despacho_maestro = $vals["numero_despacho_maestro"];
    $numero_viaje            = $vals["id_fkviaje_despacho_maestro"] ?? '';
    $nombre_destino          = $vals["nombre_destino"];
    $fecha_despacho_maestro  = $vals["fecha_despacho_maestro"];
    $tipo_despacho           = strtoupper($vals["tipo_despacho"] ?? 'BUS');
    $tipo_vehiculo           = $vals["tipo_vehiculo"] ?? '';
    $placa_vehiculo          = $vals["placa_vehiculo"] ?? '';
    $numero_vehiculo         = $vals["numero_vehiculo"] ?? '';
    $nombre_origen           = $vals["nombre_origen"] ?? '';
    $responsable_despacho    = $vals["responsable_despacho"] ?? '';
    $nombre_busero           = !empty(trim($vals["nombre_busero"] ?? '')) ? trim($vals["nombre_busero"]) : "N/A";
    $nombre_bus              = $vals["nombre_bus"];
    $id_fkusuario_despacho_maestro = $vals["id_fkusuario_despacho_maestro"];

    // Lugar Destino
    $query4 = "SELECT d.lugar_destino FROM destino d
    JOIN usuario u ON d.id_destino = u.id_fkdestino_usuario 
    WHERE u.id_usuario = $id_fkusuario_despacho_maestro LIMIT 1";
    $recuperar4 = mysqli_query($conn, $query4);
    $lugar_destino = "";
    if ($recuperar4 && $vals4 = mysqli_fetch_array($recuperar4)) {
        $lugar_destino = $vals4["lugar_destino"];
    }

    // ─── DETALLE DE ENCOMIENDAS / GUÍAS (Optimizado sin N+1) ─────────────────
    $query2 = "SELECT 
        dd.id_despacho_detalle,
        dd.observacion_despacho_detalle,
        g.id_guia,
        g.numero_guia,
        g.punto_emision_guia,
        s.punto_emision_sucursal, 
        g.total_guia,
        COALESCE(dg_sum.cantidad, 0) AS cant_item
    FROM despacho_detalle dd
    JOIN guia g ON dd.id_fkguia_despacho_detalle = g.id_guia 
    JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal 
    LEFT JOIN (
        SELECT id_fkguia_detalle_envio, SUM(cantidad_detalle_guia) as cantidad
        FROM detalle_guia
        GROUP BY id_fkguia_detalle_envio
    ) dg_sum ON dg_sum.id_fkguia_detalle_envio = g.id_guia
    WHERE dd.id_fkdespacho_maestro = $id_maestro 
    GROUP BY dd.id_despacho_detalle";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));

    $guias = [];
    $total_final = 0.0;
    $total_cantidad = 0;
    $total_guias = 0;
    $observacion_general = "";

    while ($vals2 = mysqli_fetch_array($recuperar2)) {
        $total_guias++;
        if (empty($observacion_general) && !empty($vals2["observacion_despacho_detalle"])) {
            $observacion_general = $vals2["observacion_despacho_detalle"];
        }
        
        $total_final += (float)$vals2['total_guia'];
        $resultado = sprintf("%09s", $vals2['numero_guia']);
        $codigoGuia = $vals2['punto_emision_sucursal'] . '-' . $vals2['punto_emision_guia'] . '-' . $resultado;
        $cantItem = (int)($vals2['cant_item'] ?? 0);
        $total_cantidad += $cantItem;

        $guias[] = [
            'codigo' => $codigoGuia,
            'total' => (float)$vals2['total_guia'],
            'cantidad' => $cantItem
        ];
    }

    // ─── CONFIGURACIÓN DE PÁGINA NATIVA (80mm) ──────────────────────────────
    $anchoPapel = 80;
    $margen = 4;
    $anchoUtil = $anchoPapel - ($margen * 2); // 72mm

    // Altura estimada dinámica para evitar saltos accidentales de página
    $altoEstimado = max(200, 140 + ($total_guias * 5.5));

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. LOGO Y CABECERA ──────────────────────────────────────────────────
    $pdf->SetY(4);
    if ($rutaLogo && file_exists($rutaLogo)) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoPapel, $margen, 28, 22, 1.5);
    }

    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($razon_social_empresa), 0, 1, 'C');

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 8);
        $pdf->Cell($anchoUtil, 3.8, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    if (!empty($lugar_destino)) {
        $pdf->SetFont('helvetica', 'B', 8.5);
        $pdf->Cell($anchoUtil, 4, 'OFICINA ' . strtoupper($lugar_destino), 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->Cell($anchoUtil, 5, 'DESPACHO #' . $numero_despacho_maestro, 0, 1, 'C');

    // Separador
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(2);

    // ─── 2. INFO DEL VIAJE / DESPACHO ─────────────────────────────────────────
    $wLabel = 23;
    $wVal = $anchoUtil - $wLabel;
    $hRow = 4.0;

    $infoRows = [];
    if ($tipo_despacho === 'VEHICULO' || $tipo_despacho === 'VEHÍCULO') {
        $infoRows[] = ['TIPO:', 'VEHÍCULO (' . ($tipo_vehiculo ?: 'General') . ')', true];
        if (!empty($numero_vehiculo)) $infoRows[] = ['N° VEHÍCULO:', (string)$numero_vehiculo, true];
        if (!empty($placa_vehiculo)) $infoRows[] = ['PLACA:', (string)$placa_vehiculo, true];
        $rutaStr = (!empty($nombre_origen) ? $nombre_origen . ' → ' : '') . $nombre_destino;
        $infoRows[] = ['RUTA:', $rutaStr, false];
        $infoRows[] = ['RESPONSABLE:', (string)($responsable_despacho ?: 'N/A'), false];
        $infoRows[] = ['OFICINISTA:', (string)$nombre_oficinista_real, false];
        $infoRows[] = ['FECHA:', (string)$fecha_despacho_maestro, false];
    } else if ($tipo_despacho === 'OFICINA') {
        $infoRows[] = ['TIPO:', 'TRASPASO ENTRE OFICINAS', true];
        $rutaStr = (!empty($nombre_origen) ? $nombre_origen . ' → ' : '') . $nombre_destino;
        $infoRows[] = ['RUTA:', $rutaStr, false];
        $infoRows[] = ['RESPONSABLE:', (string)($responsable_despacho ?: 'N/A'), false];
        $infoRows[] = ['OFICINISTA:', (string)$nombre_oficinista_real, false];
        $infoRows[] = ['FECHA:', (string)$fecha_despacho_maestro, false];
    } else {
        // BUS
        $infoRows[] = ['TIPO:', 'BUS', true];
        if (!empty($numero_viaje)) $infoRows[] = ['N° VIAJE:', (string)$numero_viaje, true];
        $infoRows[] = ['DESTINO:', (string)$nombre_destino, false];
        $infoRows[] = ['BUS:', (string)$nombre_bus, false];
        $infoRows[] = ['CONDUCTOR:', (string)$nombre_busero, false];
        $infoRows[] = ['OFICINISTA:', (string)$nombre_oficinista_real, false];
        $infoRows[] = ['FECHA:', (string)$fecha_despacho_maestro, false];
    }

    foreach ($infoRows as $ir) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($wLabel, $hRow, $ir[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', $ir[2] ? 'B' : '', 8);
        $pdf->Cell($wVal, $hRow, $ir[1], 0, 1, 'L');
    }

    $pdf->Ln(1);
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->Ln(1.5);

    // ─── 3. TABLA DE GUÍAS ───────────────────────────────────────────────────
    $wGuia = 36;
    $wTotal = 20;
    $wCant = 16;

    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($wGuia, 4.5, 'GUIA', 'B', 0, 'L');
    $pdf->Cell($wTotal, 4.5, 'TOTAL', 'B', 0, 'R');
    $pdf->Cell($wCant, 4.5, 'CANT.', 'B', 1, 'C');

    $pdf->SetFont('courier', '', 7.5);
    foreach ($guias as $g) {
        $pdf->Cell($wGuia, 4, $g['codigo'], 'B', 0, 'L');
        $pdf->Cell($wTotal, 4, '$' . number_format($g['total'], 2), 'B', 0, 'R');
        $pdf->Cell($wCant, 4, (string)$g['cantidad'], 'B', 1, 'C');
    }

    $pdf->Ln(1.5);

    // ─── 4. TOTALES ──────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($wGuia + $wTotal, 4.5, 'Total:', 0, 0, 'L');
    $pdf->Cell($wCant, 4.5, '$' . number_format($total_final, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wGuia + $wTotal, 4, 'Total Guías:', 0, 0, 'L');
    $pdf->Cell($wCant, 4, (string)$total_guias, 0, 1, 'R');

    $pdf->Cell($wGuia + $wTotal, 4, 'Total Cantidad:', 0, 0, 'L');
    $pdf->Cell($wCant, 4, (string)$total_cantidad, 0, 1, 'R');

    $pdf->Ln(1);
    if (!empty($observacion_general)) {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell(20, 3.8, 'Observación: ', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->MultiCell($anchoUtil - 20, 3.8, $observacion_general, 0, 'L', false, 1);
    }

    $pdf->SetFont('helvetica', '', 7);
    $pdf->Cell($anchoUtil, 3.5, 'Impresión: ' . $fecha_actual, 0, 1, 'L');

    // ─── 5. FIRMAS DE RESPONSABILIDAD ────────────────────────────────────────
    $pdf->Ln(2);
    $pdf->SetLineWidth(0.2);
    $pdf->SetLineStyle(['dash' => 2]);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->SetLineStyle(['dash' => 0]);
    $pdf->Ln(2);

    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($anchoUtil, 4, 'FIRMAS DE RESPONSABILIDAD', 0, 1, 'C');
    $pdf->Ln(7);

    $wFirma = $anchoUtil / 2;
    $yFirma = $pdf->GetY();

    // Línea oficinista
    $pdf->Line($margen + 2, $yFirma, $margen + $wFirma - 2, $yFirma);
    // Línea conductor
    $pdf->Line($margen + $wFirma + 2, $yFirma, $margen + $anchoUtil - 2, $yFirma);

    $pdf->SetXY($margen, $yFirma + 1);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wFirma, 3.5, 'OFICINISTA', 0, 0, 'C');
    $pdf->Cell($wFirma, 3.5, 'CONDUCTOR', 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 7);
    $pdf->Cell($wFirma, 3.2, '(Despacha)', 0, 0, 'C');
    $pdf->Cell($wFirma, 3.2, '(Recibe)', 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($wFirma, 3, $nombre_oficinista_real, 0, 0, 'C');
    $pdf->Cell($wFirma, 3, $nombre_busero, 0, 1, 'C');

    $pdf->IncludeJS("print();");

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'despacho_' . $id_maestro . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    $pdf->Output($fileName, 'I');
    exit();

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false,
    ]);
    exit();
}
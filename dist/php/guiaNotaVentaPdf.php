<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

try {
    $t0 = microtime(true);
    $id_guia = isset($_GET['id_guia']) ? (int)$_GET['id_guia'] : 0;
    $reimpreso_por = isset($_GET['reimpreso_por']) ? trim($_GET['reimpreso_por']) : null;

    if ($id_guia <= 0) {
        throw new Exception("ID de nota de venta inválido");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $reimpHash = $reimpreso_por ? md5($reimpreso_por) : '0';
    $pdfCacheFile = $pdfCacheDir . 'guia_nv_a4_' . $id_guia . '_r' . $reimpHash . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 1000) {
        $fileName = 'guiaNotaVenta_' . $id_guia . '.pdf';
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $fileName . '"');
        header('Content-Length: ' . filesize($pdfCacheFile));
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . round((microtime(true) - $t0) * 1000) . 'ms');
        header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
        readfile($pdfCacheFile);
        exit();
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA ──────────────────────────────────────────────
    $cacheDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $empresaCacheFile = $cacheDir . 'empresa_cfg_' . $dbKey . '.json';
    $vals_empresa = null;

    if (file_exists($empresaCacheFile) && (time() - filemtime($empresaCacheFile) < 300)) {
        $cachedData = @json_decode(file_get_contents($empresaCacheFile), true);
        if ($cachedData && !empty($cachedData['empresa'])) {
            $vals_empresa = $cachedData['empresa'];
        }
    }

    if (!$vals_empresa) {
        $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = ['razon_social_empresa' => 'SISTEMA FLOTA', 'ruc_empresa' => ''];
        }
        @file_put_contents($empresaCacheFile, json_encode(['empresa' => $vals_empresa]));
    }

    $nombre_empresa = $vals_empresa['razon_social_empresa'] ?? '';
    $direccion_empresa = $vals_empresa['direccion_empresa'] ?? '';
    $ruc_empresa = $vals_empresa['ruc_empresa'] ?? '';
    $imagen_empresa = $vals_empresa['imagen_empresa'] ?? null;
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $imagen_empresa);

    // ─── CONSULTA GUÍA NOTA VENTA ────────────────────────────────────────────
    $query = "SELECT
        g.id_guia, f.clave_acceso_factura, f.id_factura, g.subtotal_12_guia, g.subtotal_0_guia, g.total_guia, g.impuesto_iva_guia, g.descuento_guia, g.subtotal_guia,
        g.sucursal_guia, g.punto_emision_guia, g.valor_tarifa_adicional_guia, g.numero_guia,
        g.nombre_cliente_receptor, g.nombre_cliente_remitente, g.cedula_cliente_remitente,
        g.cedula_cliente_receptor, g.direccion_cliente_receptor, g.direccion_cliente_emisor, g.telefono_cliente_receptor, g.telefono_cliente_emisor,
        g.correo_cliente_emisor, g.correo_cliente_receptor,
        COALESCE(s2.nombre_sucursal, s.nombre_sucursal, '') AS nombre_sucursal,
        COALESCE(s2.direccion_sucursal, s.ubicacion_sucursal, '') AS ubicacion_sucursal,
        COALESCE(s2.punto_emision_sucursal, s.punto_emision_sucursal, '001') AS punto_emision_sucursal
    FROM guia_nota_venta g
    LEFT JOIN factura f ON f.id_fkguia_factura = g.id_guia AND f.estado_factura = 1
    LEFT JOIN sucursal2 s2 ON g.sucursal_guia = s2.suc_codigo_sucursal
    LEFT JOIN sucursal s ON g.sucursal_guia = s.id_sucursal
    WHERE g.id_guia = $id_guia LIMIT 1";

    $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
    $vals = mysqli_fetch_assoc($recuperar);

    if (empty($vals)) {
        throw new Exception("No se encontró la nota de venta con id = $id_guia");
    }

    $nombre_receptor = $vals["nombre_cliente_receptor"] ?? '';
    $cedula_receptor = $vals["cedula_cliente_receptor"] ?? '';
    $telefono_receptor = $vals["telefono_cliente_receptor"] ?? '';
    $direccion_receptor = $vals["direccion_cliente_receptor"] ?? '';
    $correo_receptor = $vals["correo_cliente_receptor"] ?? '';

    $nombre_emisor = $vals["nombre_cliente_remitente"] ?? '';
    $cedula_emisor = $vals["cedula_cliente_remitente"] ?? '';
    $telefono_emisor = $vals["telefono_cliente_emisor"] ?? '';
    $direccion_emisor = $vals["direccion_cliente_emisor"] ?? '';
    $correo_emisor = $vals["correo_cliente_emisor"] ?? '';

    $subtotal_12 = (float)($vals["subtotal_12_guia"] ?? 0);
    $subtotal_0 = (float)($vals["subtotal_0_guia"] ?? 0);
    $subtotal = (float)($vals["subtotal_guia"] ?? 0);
    $descuento_guia = (float)($vals["descuento_guia"] ?? 0);
    $iva_guia = (float)($vals["impuesto_iva_guia"] ?? 0);
    $total_guia = (float)($vals["total_guia"] ?? 0);
    $tarifa_guia = (float)($vals["valor_tarifa_adicional_guia"] ?? 0);

    $resultado = sprintf("%09s", $vals['numero_guia']);
    $punto_emision_sucursal = !empty($vals["punto_emision_sucursal"]) ? $vals["punto_emision_sucursal"] : '001';
    $punto_emision_guia = !empty($vals["punto_emision_guia"]) ? $vals["punto_emision_guia"] : '001';
    $numero_guia = $punto_emision_sucursal . '-' . $punto_emision_guia . '-' . $resultado;

    // DETALLES NOTA DE VENTA
    $query_detalles = "SELECT id_detalle_guia, total_tarifa_detalle_guia, cantidad_detalle_guia,
        costo_detalle_guia, tipo_descuento_detalle_guia, total_detalle_guia, subtotal_detalle_guia, contenido_guia
        FROM detalle_guia_nota_venta WHERE id_fkguia_detalle_envio = $id_guia";
    $recuperar_detalles = mysqli_query($conn, $query_detalles) or die(mysqli_error($conn));

    $items = [];
    while ($vals_detalles = mysqli_fetch_assoc($recuperar_detalles)) {
        $descuento = 0;
        if ($vals_detalles["tipo_descuento_detalle_guia"] == 1) {
            $descuento = ($vals_detalles["costo_detalle_guia"] * $vals_detalles["cantidad_detalle_guia"]) / 2;
        } elseif ($vals_detalles["tipo_descuento_detalle_guia"] == 2) {
            $descuento = ($vals_detalles["costo_detalle_guia"] * $vals_detalles["cantidad_detalle_guia"]);
        }
        $items[] = [
            'contenido' => $vals_detalles['contenido_guia'] ?? '',
            'cantidad'  => $vals_detalles['cantidad_detalle_guia'] ?? 1,
            'costo'     => (float)($vals_detalles['costo_detalle_guia'] ?? 0),
            'descuento' => (float)$descuento,
            'tarifa'    => (float)($vals_detalles['total_tarifa_detalle_guia'] ?? 0),
            'total'     => (float)($vals_detalles['total_detalle_guia'] ?? 0),
        ];
    }
    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO ──────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(15, 12, 15);
    $pdf->SetAutoPageBreak(true, 15);
    $pdf->AddPage();

    $anchoUtil = 180;

    // Logo & Header
    $dimLogo = ['w' => 0, 'h' => 0];
    if ($rutaLogo) {
        $dimLogo = imprimirLogoTcpdfA4($pdf, $rutaLogo, 15, 12, 32, 22);
    }
    $xEmp = ($dimLogo['w'] > 0) ? (15 + $dimLogo['w'] + 4) : 15;
    $wEmp = 133 - $xEmp;

    $pdf->SetXY($xEmp, 13);
    $pdf->SetFont('helvetica', 'B', 13);
    $pdf->MultiCell($wEmp, 5, strtoupper($nombre_empresa), 0, 'L', false, 1);
    if (!empty($ruc_empresa)) {
        $pdf->SetX($xEmp);
        $pdf->SetFont('helvetica', '', 8.5);
        $pdf->Cell($wEmp, 4, 'RUC: ' . $ruc_empresa, 0, 1, 'L');
    }
    if (!empty($direccion_empresa)) {
        $pdf->SetX($xEmp);
        $pdf->SetFont('helvetica', '', 8);
        $pdf->MultiCell($wEmp, 3.5, substr($direccion_empresa, 0, 80), 0, 'L', false, 1);
    }

    // Recuadro NOTA DE VENTA No.
    $pdf->SetXY(135, 12);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->SetFillColor(245, 245, 245);
    $pdf->Cell(60, 6, 'NOTA DE VENTA', 1, 1, 'C', true);
    $pdf->SetXY(135, 18);
    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->SetTextColor(200, 0, 0);
    $pdf->Cell(60, 7, 'No. ' . $numero_guia, 1, 1, 'C');
    $pdf->SetTextColor(0, 0, 0);

    $pdf->SetY(38);

    // Recuadros Datos Remitente / Destinatario
    $wBox = ($anchoUtil - 4) / 2;
    $yBoxes = $pdf->GetY();

    // Remitente
    $pdf->SetFillColor(240, 240, 240);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wBox, 5, ' DATOS REMITENTE', 1, 1, 'L', true);
    $pdf->SetFont('helvetica', '', 7.5);
    $txtRem = " Nombre: $nombre_emisor\n" .
              " Identificación: $cedula_emisor\n" .
              " Teléfono: $telefono_emisor\n" .
              " Correo: $correo_emisor\n" .
              " Dirección: $direccion_emisor";
    $pdf->MultiCell($wBox, 23, $txtRem, 1, 'L', false, 0);

    // Destinatario
    $pdf->SetXY(15 + $wBox + 4, $yBoxes);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wBox, 5, ' DATOS DESTINATARIO', 1, 1, 'L', true);
    $pdf->SetFont('helvetica', '', 7.5);
    $txtDest = " Nombre: $nombre_receptor\n" .
               " Identificación: $cedula_receptor\n" .
               " Teléfono: $telefono_receptor\n" .
               " Correo: $correo_receptor\n" .
               " Dirección: $direccion_receptor";
    $pdf->MultiCell($wBox, 23, $txtDest, 1, 'L', false, 1);

    $pdf->Ln(4);

    // Tabla de Items
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetFillColor(235, 235, 235);
    $colDesc = 70;
    $colCant = 18;
    $colUnit = 23;
    $colDescM = 23;
    $colTar  = 23;
    $colSub  = 23;

    $pdf->Cell($colDesc, 5, 'Descripción', 1, 0, 'L', true);
    $pdf->Cell($colCant, 5, 'Cant', 1, 0, 'C', true);
    $pdf->Cell($colUnit, 5, 'P. Unitario', 1, 0, 'R', true);
    $pdf->Cell($colDescM, 5, 'Descuento', 1, 0, 'R', true);
    $pdf->Cell($colTar, 5, 'Tarifa', 1, 0, 'R', true);
    $pdf->Cell($colSub, 5, 'Subtotal', 1, 1, 'R', true);

    $pdf->SetFont('helvetica', '', 7.5);
    foreach ($items as $item) {
        $pdf->Cell($colDesc, 4.5, ' ' . substr($item['contenido'], 0, 42), 1, 0, 'L');
        $pdf->Cell($colCant, 4.5, $item['cantidad'], 1, 0, 'C');
        $pdf->Cell($colUnit, 4.5, '$ ' . number_format($item['costo'], 2) . ' ', 1, 0, 'R');
        $pdf->Cell($colDescM, 4.5, '$ ' . number_format($item['descuento'], 2) . ' ', 1, 0, 'R');
        $pdf->Cell($colTar, 4.5, '$ ' . number_format($item['tarifa'], 2) . ' ', 1, 0, 'R');
        $pdf->Cell($colSub, 4.5, '$ ' . number_format($item['total'], 2) . ' ', 1, 1, 'R');
    }

    $pdf->Ln(3);

    // Tabla de Totales
    $wTotLabel = 40;
    $wTotVal = 25;
    $xTot = 15 + $anchoUtil - ($wTotLabel + $wTotVal);

    $totRow = function($label, $val, $isBold = false) use ($pdf, $xTot, $wTotLabel, $wTotVal) {
        $pdf->SetX($xTot);
        $pdf->SetFont('helvetica', $isBold ? 'B' : '', 7.5);
        $pdf->Cell($wTotLabel, 4.2, ' ' . $label, 1, 0, 'L');
        $pdf->Cell($wTotVal, 4.2, '$ ' . number_format($val, 2) . ' ', 1, 1, 'R');
    };

    $totRow('SUBTOTAL IVA', $subtotal_12);
    $totRow('SUBTOTAL 0%', $subtotal_0);
    $totRow('SUBTOTAL', $subtotal);
    $totRow('DESCUENTO', $descuento_guia);
    $totRow('TARIFA', $tarifa_guia);
    $totRow('IVA', $iva_guia);
    $totRow('TOTAL', $total_guia, true);

    if ($reimpreso_por) {
        $pdf->Ln(4);
        $pdf->SetFont('helvetica', 'I', 7.5);
        $pdf->Cell($anchoUtil, 4, 'Reimpreso por: ' . $reimpreso_por, 0, 1, 'R');
    }

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'guiaNotaVenta_' . $id_guia . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }

    $pdfContent = $pdf->Output($fileName, 'S');

    if (!empty($pdfContent) && strlen($pdfContent) > 1000) {
        @file_put_contents($pdfCacheFile, $pdfContent);
    }

    $tTotal = round((microtime(true) - $t0) * 1000);
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Content-Length: ' . strlen($pdfContent));
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotal . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false
    ]);
    exit();
}
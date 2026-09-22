<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    $id_guia = intval($_GET['id_guia'] ?? 0);

    if ($id_guia <= 0) {
        throw new Exception("ID de nota de venta no válido o no proporcionado");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $pdfCacheFile = $pdfCacheDir . 'qr_notaventa_' . $id_guia . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 500) {
        $fileName = 'qr_notaventa_' . $id_guia . '.pdf';
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
        $query_empresa = "SELECT id_empresa, ruc_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'SISTEMA FLOTA',
                'ruc_empresa' => ''
            ];
        }

        @file_put_contents($empresaCacheFile, json_encode([
            'empresa' => $vals_empresa
        ]));
    }

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';

    // ─── CONSULTA NOTA DE VENTA ──────────────────────────────────────────────
    $query = "SELECT g.id_guia, s.nombre_sucursal, s.punto_emision_sucursal, g.destino_guia, 
                     g.punto_emision_guia, g.numero_guia, g.sucursal_guia  
              FROM guia_nota_venta g
              JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal 
              WHERE g.id_guia = $id_guia LIMIT 1";

    $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
    $vals = mysqli_fetch_assoc($recuperar);
    $conn->close();

    if (!$vals) {
        throw new Exception("Nota de Venta #$id_guia no encontrada");
    }

    $resultado = sprintf("%09s", $vals['numero_guia']);
    $numero_guia = $vals["punto_emision_sucursal"] . '-' . $vals["punto_emision_guia"] . '-' . $resultado;
    $destino_guia = $vals["destino_guia"] ?? '';

    $datosQr = json_encode([
        'id_guia' => $id_guia,
        'numero_guia' => $numero_guia,
        'destino' => $destino_guia,
    ]);

    // ─── CONFIGURACIÓN DE PÁGINA NATIVA TCPDF (Sticker) ──────────────────────
    $anchoSticker = 80;
    $altoSticker = 90;
    $margen = 4;
    $anchoUtil = $anchoSticker - ($margen * 2);

    $pdf = new TCPDF('P', 'mm', array($anchoSticker, $altoSticker), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // Texto de cabecera
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($razon_social_empresa), 0, 1, 'C');

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil, 4, 'NOTA DE VENTA: ' . $numero_guia, 0, 1, 'C');

    if (!empty($destino_guia)) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 3.8, 'DESTINO: ' . strtoupper($destino_guia), 0, 1, 'C');
    }

    // Código QR 2D Nativo centrado
    $qrSize = 52;
    $xQr = $margen + ($anchoUtil - $qrSize) / 2;
    $yQr = $pdf->GetY() + 1;

    $qrStyle = [
        'border' => 0,
        'vpadding' => 0,
        'hpadding' => 0,
        'fgcolor' => [0, 0, 0],
        'bgcolor' => false,
        'module_width' => 1,
        'module_height' => 1
    ];

    $pdf->write2DBarcode($datosQr, 'QRCODE,Q', $xQr, $yQr, $qrSize, $qrSize, $qrStyle, 'N');

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'qr_notaventa_' . $id_guia . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }

    $pdfContent = $pdf->Output($fileName, 'S');

    if (!empty($pdfContent) && strlen($pdfContent) > 500) {
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
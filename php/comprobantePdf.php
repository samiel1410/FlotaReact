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
    $fecha_actual = date('Y-m-d H:i:s');
    $id_comprobante_cobro = (int)($_GET['id_comprobante'] ?? 0);

    if ($id_comprobante_cobro <= 0) {
        throw new Exception("ID de comprobante de cobro no válido o no proporcionado");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $pdfCacheFile = $pdfCacheDir . 'comprobante_' . $id_comprobante_cobro . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 500) {
        $fileName = 'comprobante_' . $id_comprobante_cobro . '.pdf';
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

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $cacheDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }

    $empresaCacheFile = $cacheDir . 'empresa_cfg_' . $dbKey . '.json';
    $vals_empresa = null;
    $rutaLogo = null;

    if (file_exists($empresaCacheFile) && (time() - filemtime($empresaCacheFile) < 300)) {
        $cachedData = @json_decode(file_get_contents($empresaCacheFile), true);
        if ($cachedData && !empty($cachedData['empresa'])) {
            $vals_empresa = $cachedData['empresa'];
            $rutaLogo = (!empty($cachedData['logo_path']) && esImagenValidaParaTcpdf($cachedData['logo_path'])) ? $cachedData['logo_path'] : null;
        }
    }

    if (!$vals_empresa) {
        $query_empresa = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'SISTEMA FLOTA',
                'ruc_empresa' => '',
                'direccion_empresa' => '',
                'telefono_empresa' => '',
                'correo_empresa' => ''
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

        @file_put_contents($empresaCacheFile, json_encode([
            'empresa' => $vals_empresa,
            'logo_path' => $rutaLogo
        ]));
    }

    if (empty($rutaLogo) || !esImagenValidaParaTcpdf($rutaLogo)) {
        $rutaLogo = obtenerRutaLogoEmpresa($conn);
    }

    $empresa = $vals_empresa;

    // ─── CONSULTA COMPROBANTE ────────────────────────────────────────────────
    $query_verificar = "SELECT id_comprobante_cobro, archivo_comprobante_cobro, factura.numero_factura,
        numero_comprobante_cobro, guia.numero_guia, usuario.nombre_usuario, usuario.apellido_usuario,
        sucursal.punto_emision_sucursal, comprobante_cobro.fecha_emision_comprobante_cobro,
        comprobante_cobro.monto_comprobante_cobro, sucursal.nombre_sucursal,
        comprobante_cobro.observacion_comprobante_cobro, guia.punto_emision_guia,
        factura.punto_emision_factura, comprobante_cobro.concepto_detalle_comprobante_cobro,
        forma_pago.nombre_forma_pago 
    FROM comprobante_cobro 
    JOIN factura ON comprobante_cobro.id_fkfactura_comprobante_cobro = factura.id_factura 
    JOIN guia ON factura.id_fkguia_factura = guia.id_guia 
    JOIN usuario ON comprobante_cobro.id_fkusuario_comprobante_cobro = usuario.id_usuario 
    JOIN sucursal ON guia.sucursal_guia = sucursal.id_sucursal 
    JOIN forma_pago ON comprobante_cobro.id_fkforma_pago = forma_pago.id_forma_pago 
    WHERE id_comprobante_cobro = $id_comprobante_cobro LIMIT 1";

    $recuperar2 = mysqli_query($conn, $query_verificar) or die(mysqli_error($conn));
    $vals2 = mysqli_fetch_assoc($recuperar2);

    if (!$vals2) {
        throw new Exception("No se encontró el comprobante de cobro #$id_comprobante_cobro");
    }

    $numero_comprobante_cobro = $vals2["numero_comprobante_cobro"];
    $resultado_guia = sprintf("%09s", $vals2['numero_guia']);
    $resultado_factura = sprintf("%09s", $vals2['numero_factura'] ?? 0);
    $nombre_usuario = trim(($vals2["nombre_usuario"] ?? '') . ' ' . ($vals2["apellido_usuario"] ?? ''));
    $fecha_emision = $vals2["fecha_emision_comprobante_cobro"];
    $monto_comprobante = number_format((float)$vals2["monto_comprobante_cobro"], 2);
    $nombre_sucursal = $vals2["nombre_sucursal"] ?? '';
    $observacion = $vals2["observacion_comprobante_cobro"] ?? '';
    $forma_pago = $vals2["nombre_forma_pago"] ?? '';
    $concepto = $vals2["concepto_detalle_comprobante_cobro"] ?? '';
    $archivo_voucher = $vals2["archivo_comprobante_cobro"] ?? null;

    $doc_factura = $vals2['punto_emision_sucursal'] . '-' . ($vals2['punto_emision_factura'] ?? '001') . '-' . $resultado_factura;
    $doc_guia = $vals2['punto_emision_sucursal'] . '-' . ($vals2['punto_emision_guia'] ?? '001') . '-' . $resultado_guia;

    // Procesar voucher si existe
    $rutaVoucher = null;
    if (!empty($archivo_voucher)) {
        $rutaVoucher = procesarLogoParaTcpdf($archivo_voucher, 'voucher_' . $id_comprobante_cobro);
    }
    $conn->close();

    // ─── CONFIGURACIÓN TCPDF A4 NATIVO ──────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetTitle('Comprobante de Ingreso - ' . $numero_comprobante_cobro);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(15, 12, 15);
    $pdf->SetAutoPageBreak(true, 15);
    $pdf->AddPage();

    $wUtil = 180;

    // ─── 1. CABECERA Y LOGO ──────────────────────────────────────────────────
    $yTop = $pdf->GetY();
    if ($rutaLogo && file_exists($rutaLogo)) {
        $pdf->Image($rutaLogo, 15, $yTop, 26, 0, '', '', '', true, 150);
    }

    $pdf->SetFont('helvetica', 'B', 13);
    $pdf->Cell($wUtil, 5.5, strtoupper($empresa['razon_social_empresa'] ?? 'SISTEMA FLOTA'), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wUtil, 4, 'RUC: ' . ($empresa['ruc_empresa'] ?? ''), 0, 1, 'C');
    $pdf->Cell($wUtil, 4, ($empresa['direccion_empresa'] ?? ''), 0, 1, 'C');
    $pdf->Cell($wUtil, 4, 'Tel: ' . ($empresa['telefono_empresa'] ?? '') . ' | Email: ' . ($empresa['correo_empresa'] ?? ''), 0, 1, 'C');

    $pdf->Ln(2);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell($wUtil, 5.5, 'COMPROBANTE DE INGRESO', 0, 1, 'C');
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($wUtil, 4.5, 'No.- ' . $numero_comprobante_cobro, 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wUtil, 4, 'Fecha emisión: ' . $fecha_emision . '  |  Usuario: ' . $nombre_usuario, 0, 1, 'R');
    $pdf->Ln(2);

    // ─── 2. TABLA ENMARCADA DE DETALLES ──────────────────────────────────────
    $pdf->SetDrawColor(0, 0, 0);
    $pdf->SetLineWidth(0.3);

    $wCol = $wUtil / 2;
    $hRow = 9;

    // Fila 1: Fecha | Monto Cobrado
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wCol, $hRow);
    $pdf->Rect(15 + $wCol, $yRow, $wCol, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Fecha:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $fecha_emision, 0, 0, 'L');

    $pdf->SetXY(15 + $wCol + 1, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Monto Cobrado:', 0, 1, 'L');
    $pdf->SetX(15 + $wCol + 1);
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($wCol - 2, 3.5, '$' . $monto_comprobante, 0, 0, 'L');

    // Fila 2: Recibido de (ancho completo)
    $pdf->SetY($yRow + $hRow);
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wUtil, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wUtil - 2, 3.5, 'Recibido de:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wUtil - 2, 3.5, $nombre_usuario, 0, 0, 'L');

    // Fila 3: FACTURA | Nro
    $pdf->SetY($yRow + $hRow);
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wCol, $hRow);
    $pdf->Rect(15 + $wCol, $yRow, $wCol, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Tipo de Documento:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'FACTURA', 0, 0, 'L');

    $pdf->SetXY(15 + $wCol + 1, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Nro Factura:', 0, 1, 'L');
    $pdf->SetX(15 + $wCol + 1);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $doc_factura, 0, 0, 'L');

    // Fila 4: GUIA | Nro
    $pdf->SetY($yRow + $hRow);
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wCol, $hRow);
    $pdf->Rect(15 + $wCol, $yRow, $wCol, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Tipo de Documento:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'GUIA', 0, 0, 'L');

    $pdf->SetXY(15 + $wCol + 1, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Nro Guía:', 0, 1, 'L');
    $pdf->SetX(15 + $wCol + 1);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $doc_guia, 0, 0, 'L');

    // Fila 5: Sucursal | Observaciones
    $pdf->SetY($yRow + $hRow);
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wCol, $hRow);
    $pdf->Rect(15 + $wCol, $yRow, $wCol, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Sucursal:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $nombre_sucursal, 0, 0, 'L');

    $pdf->SetXY(15 + $wCol + 1, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Observaciones:', 0, 1, 'L');
    $pdf->SetX(15 + $wCol + 1);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $observacion ?: '-', 0, 0, 'L');

    // Fila 6: Forma de pago | Detalle
    $pdf->SetY($yRow + $hRow);
    $yRow = $pdf->GetY();
    $pdf->Rect(15, $yRow, $wCol, $hRow);
    $pdf->Rect(15 + $wCol, $yRow, $wCol, $hRow);
    $pdf->SetXY(16, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Forma de pago:', 0, 1, 'L');
    $pdf->SetX(16);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $forma_pago, 0, 0, 'L');

    $pdf->SetXY(15 + $wCol + 1, $yRow + 1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wCol - 2, 3.5, 'Detalle:', 0, 1, 'L');
    $pdf->SetX(15 + $wCol + 1);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell($wCol - 2, 3.5, $concepto ?: '-', 0, 0, 'L');

    $pdf->SetY($yRow + $hRow + 4);

    // ─── 3. IMAGEN DEL COMPROBANTE / VOUCHER ─────────────────────────────────
    if ($rutaVoucher && file_exists($rutaVoucher)) {
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell($wUtil, 5, 'Imagen del Comprobante / Voucher:', 0, 1, 'L');
        $yImg = $pdf->GetY();
        $pdf->Image($rutaVoucher, 15, $yImg, 80, 0, '', '', '', true, 150);
    }

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'comprobante_' . $id_comprobante_cobro . '.pdf';
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
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

// Caché rápida (<20ms): sirve el PDF recién generado sin tocar DB ni cargar TCPDF.
// TTL corto (60s) porque el crédito puede anularse o recibir pagos justo después de imprimirse.
define('CREDIMP_FAST_TTL', 60);

try {
    $t0 = microtime(true);
    $fecha_actual = date('d/m/Y H:i:s');
    $id_deuda = isset($_GET['id_deuda']) ? (int)$_GET['id_deuda'] : 0;
    $tenantId = isset($_GET['tenantId']) ? (int)$_GET['tenantId'] : 1;

    if ($id_deuda <= 0) {
        throw new Exception("ID de crédito inválido");
    }

    $claveCredito = (string)$id_deuda;

    // ─── CACHÉ NIVEL 0: copia TTL corto ──────────────────────────────────────
    $tenantIdStrFast = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? $tenantId ?? '1';
    $dbNameStrFast = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStrFast);
    $dbKeyFast = md5($dbNameStrFast . '_t' . $tenantIdStrFast);
    $pdfCacheDirFast = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDirFast)) @mkdir($pdfCacheDirFast, 0777, true);
    $fastPdfFile = $pdfCacheDirFast . 'credito_imp_' . $claveCredito . '_' . $dbKeyFast . '_latest.pdf';
    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < CREDIMP_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="credito_' . $claveCredito . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT-FAST');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($fastPdfFile);
        exit;
    }

    require_once('library/tcpdf.php');

    $conn = conexion();
    $tConn = microtime(true);

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ─────────────────────
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? $tenantId ?? '1';
    $dbNameStr = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStr);
    $dbKey = md5($dbNameStr . '_t' . $tenantIdStr);
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) @mkdir($logosDir, 0777, true);

    $vals_empresa = [];
    $vals_configuracion = [];
    $empresaCfgCached = null;

    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa       = $empresaCfgCached;
        $vals_configuracion = $empresaCfgCached;
        $rutaLogo = $empresaCfgCached['logo_path'] ?? null;
        if (!empty($rutaLogo) && !esImagenValidaParaTcpdf($rutaLogo)) {
            $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
            $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
            if (esImagenValidaParaTcpdf($cachedLogoPng)) {
                $rutaLogo = $cachedLogoPng;
            } elseif (esImagenValidaParaTcpdf($cachedLogoJpg)) {
                $rutaLogo = $cachedLogoJpg;
            } else {
                $rec_img = mysqli_query($conn, "SELECT imagen_empresa FROM empresa LIMIT 1");
                $row_img = $rec_img ? mysqli_fetch_assoc($rec_img) : [];
                $rutaLogo = null;
                if (!empty($row_img['imagen_empresa'])) {
                    $rawLogo = procesarLogoParaTcpdf($row_img['imagen_empresa'], $dbKey);
                    if ($rawLogo && esImagenValidaParaTcpdf($rawLogo)) {
                        $ext = strtolower(pathinfo($rawLogo, PATHINFO_EXTENSION) ?: 'png');
                        $targetLogo = $logosDir . 'logo_tenant_' . $dbKey . '.' . $ext;
                        if ($rawLogo !== $targetLogo) @copy($rawLogo, $targetLogo);
                        $rutaLogo = esImagenValidaParaTcpdf($targetLogo) ? $targetLogo : $rawLogo;
                    }
                }
            }
            $empresaCfgCached['logo_path'] = $rutaLogo;
            @file_put_contents($cacheCfgFile, json_encode($empresaCfgCached));
        }
    } else {
        // 1 solo roundtrip: empresa + configuracion (sin BLOB) vía LEFT JOIN ON 1=1
        $rec_emp = mysqli_query($conn, "SELECT e.id_empresa, e.telefono_empresa, e.correo_empresa, e.ruc_empresa, e.direccion_empresa, e.razon_social_empresa, c.formato_impresion FROM empresa e LEFT JOIN configuracion c ON 1=1 LIMIT 1");
        $row_emp = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        $vals_empresa = $row_emp ?: [];
        $vals_configuracion = $row_emp ?: [];

        $rutaLogo = null;
        $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
        $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
        if (esImagenValidaParaTcpdf($cachedLogoPng)) {
            $rutaLogo = $cachedLogoPng;
        } elseif (esImagenValidaParaTcpdf($cachedLogoJpg)) {
            $rutaLogo = $cachedLogoJpg;
        } else {
            $rec_img = mysqli_query($conn, "SELECT imagen_empresa FROM empresa LIMIT 1");
            $row_img = $rec_img ? mysqli_fetch_assoc($rec_img) : [];
            if (!empty($row_img['imagen_empresa'])) {
                $rawLogo = procesarLogoParaTcpdf($row_img['imagen_empresa'], $dbKey);
                if ($rawLogo && esImagenValidaParaTcpdf($rawLogo)) {
                    $ext = strtolower(pathinfo($rawLogo, PATHINFO_EXTENSION) ?: 'png');
                    $targetLogo = $logosDir . 'logo_tenant_' . $dbKey . '.' . $ext;
                    if ($rawLogo !== $targetLogo) @copy($rawLogo, $targetLogo);
                    $rutaLogo = esImagenValidaParaTcpdf($targetLogo) ? $targetLogo : $rawLogo;
                }
            }
            if (empty($rutaLogo)) {
                $rutaLogo = obtenerRutaLogoEmpresa($conn, null);
            }
        }
        $toCache = array_merge($vals_empresa, $vals_configuracion, ['logo_path' => $rutaLogo]);
        @file_put_contents($cacheCfgFile, json_encode($toCache));
    }
    $tCfg = microtime(true);

    // Logo gigante ralentiza TCPDF->Image() varios segundos: reducir una vez a 500px
    $rutaLogo = reducirLogoGigante($rutaLogo ?? null, 500);

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa          = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa    = $vals_empresa["direccion_empresa"] ?? '';
    $formato_impresion_db = $vals_configuracion["formato_impresion"] ?? null;

    // Métricas de impresión (antes de cerrar la conexión: puede consultar configuracion)
    $anchoPapel = obtenerAnchoFormatoImpresion($conn, 80, $formato_impresion_db);
    $metricas   = obtenerMetricasImpresion($anchoPapel, 80);

    // ─── CONSULTA DEL CRÉDITO ─────────────────────────────────────────────────
    $query_credito = "SELECT d.id_deuda, d.concepto, d.valor_original, d.valor_pagado, d.saldo_pendiente,
                             d.fecha_creacion, d.fecha_ultimo_pago, d.estado, d.observacion,
                             td.nombre AS tipo_nombre,
                             bus.disco_buses, bus.placa_buses,
                             p.per_nombres_persona, p.per_apellidos_personal, p.per_cedula_personal,
                             u.nombre_usuario, u.apellido_usuario
                      FROM deudas d
                      LEFT JOIN tipo_deudas td ON d.id_tipo_deuda = td.id_tipo_deuda
                      LEFT JOIN buses bus ON d.id_bus = bus.id_buses
                      LEFT JOIN personal p ON d.id_socio = p.id_personal
                      LEFT JOIN usuario u ON d.id_usuario_crea = u.id_usuario
                      WHERE d.id_deuda = $id_deuda
                      LIMIT 1";

    $res_credito = mysqli_query($conn, $query_credito);
    if (!$res_credito) {
        throw new Exception("Error al consultar el crédito: " . mysqli_error($conn));
    }
    $credito = mysqli_fetch_assoc($res_credito);
    if (!$credito) {
        throw new Exception("Crédito no encontrado (id $id_deuda)");
    }

    $numero_credito = 'N° ' . str_pad((string)$id_deuda, 6, '0', STR_PAD_LEFT);
    $socio_nombre   = limpiarTextoPdf(trim(($credito['per_nombres_persona'] ?? '') . ' ' . ($credito['per_apellidos_personal'] ?? '')), '-');
    $socio_cedula   = limpiarTextoPdf($credito['per_cedula_personal'] ?? '', '-');
    $bus_disco      = limpiarTextoPdf($credito['disco_buses'] ?? '', '-');
    $bus_placa      = limpiarTextoPdf($credito['placa_buses'] ?? '', '-');
    $concepto       = limpiarTextoPdf($credito['concepto'] ?? '', '-');
    $observacion    = limpiarTextoPdf($credito['observacion'] ?? '', '-');
    $tipo_nombre    = limpiarTextoPdf($credito['tipo_nombre'] ?? '', 'CREDITO_ADMIN');
    $valor_total    = number_format((float)($credito['valor_original'] ?? 0), 2);
    $valor_pagado   = number_format((float)($credito['valor_pagado'] ?? 0), 2);
    $valor_saldo    = number_format((float)($credito['saldo_pendiente'] ?? 0), 2);
    $estado_credito = strtoupper(limpiarTextoPdf($credito['estado'] ?? 'pendiente', 'PENDIENTE'));
    $usuario_nombre = limpiarTextoPdf(trim(($credito['nombre_usuario'] ?? '') . ' ' . ($credito['apellido_usuario'] ?? '')), '-');

    $fecha_credito = limpiarTextoPdf($credito['fecha_creacion'] ?? '', '');
    if ($fecha_credito !== '' && $fecha_credito !== '0000-00-00 00:00:00') {
        $ts = strtotime($fecha_credito);
        $fecha_credito = $ts ? date('d/m/Y', $ts) : $fecha_credito;
    } else {
        $fecha_credito = $fecha_actual;
    }

    $conn->close();
    $tData = microtime(true);

    // ─── CACHÉ NIVEL 2: PDF por hash de datos ────────────────────────────────
    $datosHash = md5(json_encode([
        $id_deuda, $concepto, $valor_total, $valor_pagado, $valor_saldo,
        $estado_credito, $bus_disco, $socio_nombre, $socio_cedula, $fecha_credito, $observacion
    ]));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'credito_imp_' . $claveCredito . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        @copy($cachePdfFile, $fastPdfFile);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="credito_' . $claveCredito . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        header('X-PDF-T-conn: ' . round(($tConn - $t0) * 1000) . 'ms');
        header('X-PDF-T-cfg: ' . round(($tCfg - $tConn) * 1000) . 'ms');
        header('X-PDF-T-data: ' . round(($tData - $tCfg) * 1000) . 'ms');
        header('X-PDF-T-tcpdf: 0ms');
        readfile($cachePdfFile);
        exit;
    }
    $tTcpdfStart = microtime(true);

    // ─── TCPDF NATIVO (Ticket POS térmico) ───────────────────────────────────
    $margen       = $metricas['margen_mm'];
    $anchoUtil    = $metricas['ancho_util_mm'];
    $altoEstimado = 160;

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    $fBase = $metricas['font_tcpdf_base'];
    $fBold = $metricas['font_tcpdf_bold'];
    $fSub  = $metricas['font_tcpdf_sub'];
    $hLn   = round($fBase * 0.42, 1);

    // 1. Logo
    $pdf->SetY(4);
    imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoPapel, $margen, 28, 22, 1.5);

    // 2. Cabecera de empresa
    $pdf->SetFont('helvetica', 'B', $fBold);
    $pdf->MultiCell($anchoUtil, $hLn + 0.6, strtoupper(limpiarTextoPdf($razon_social_empresa, 'SISTEMA FLOTA')), 0, 'C', false, 1);
    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', $fSub);
        $pdf->Cell($anchoUtil, $hLn, 'RUC: ' . limpiarTextoPdf($ruc_empresa), 0, 1, 'C');
    }
    if (!empty($direccion_empresa)) {
        $pdf->SetFont('helvetica', '', $fSub);
        $pdf->MultiCell($anchoUtil, $hLn, limpiarTextoPdf($direccion_empresa), 0, 'C', false, 1);
    }

    $pdf->SetLineWidth(0.3);
    $ySep = $pdf->GetY() + 0.6;
    $pdf->Line($margen, $ySep, $margen + $anchoUtil, $ySep);
    $pdf->SetY($ySep + 1.8);

    // 3. Título
    $pdf->SetFont('helvetica', 'B', $fBold);
    $pdf->Cell($anchoUtil, $hLn + 1, 'CREDITO ADMINISTRATIVO', 0, 1, 'C');
    $pdf->SetFont('helvetica', 'B', $fBase);
    $pdf->Cell($anchoUtil, $hLn + 0.6, $numero_credito, 0, 1, 'C');

    if ($estado_credito === 'ANULADO') {
        $pdf->SetFont('helvetica', 'B', $fBase);
        $pdf->SetTextColor(200, 0, 0);
        $pdf->Cell($anchoUtil, $hLn + 0.5, '*** ANULADO ***', 0, 1, 'C');
        $pdf->SetTextColor(0, 0, 0);
    }

    $pdf->SetFont('helvetica', '', $fSub);
    $pdf->Cell($anchoUtil, $hLn, 'Impreso: ' . $fecha_actual, 0, 1, 'R');
    $pdf->Ln(1);

    // 4. Detalles en celdas nativas (clave-valor)
    $wK = round($anchoUtil * 0.38, 1);
    $wV = $anchoUtil - $wK;
    $hR = round($fBase * 0.46, 1);

    $rows = [
        ['Fecha:', $fecha_credito],
        ['Socio:', $socio_nombre],
        ['Cédula:', $socio_cedula],
        ['Bus:', $bus_disco . ' - ' . $bus_placa],
        ['Concepto:', $concepto],
        ['Tipo:', $tipo_nombre],
        ['Observación:', $observacion],
        ['Estado:', $estado_credito],
        ['Registrado por:', $usuario_nombre],
    ];

    foreach ($rows as $r) {
        $pdf->SetFont('helvetica', 'B', $fBase);
        $pdf->Cell($wK, $hR, $r[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', $fBase);
        $xVal = $margen + $wK;
        $yVal = $pdf->GetY();
        $pdf->SetXY($xVal, $yVal);
        $pdf->MultiCell($wV, $hR, $r[1], 0, 'L', false, 1);
    }

    // 5. Totales destacados
    $pdf->Ln(1.2);
    $pdf->SetLineWidth(0.2);
    $yValTot = $pdf->GetY();
    $pdf->Line($margen, $yValTot, $margen + $anchoUtil, $yValTot);
    $pdf->Ln(1);

    $pdf->SetFont('helvetica', 'B', $fBold);
    $pdf->Cell($wK, $hLn + 1.2, 'VALOR:', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', $fBold + 2);
    $pdf->Cell($wV, $hLn + 1.2, '$' . $valor_total, 0, 1, 'R');

    $pdf->SetFont('helvetica', '', $fBase);
    $pdf->Cell($wK, $hR, 'Pagado:', 0, 0, 'L');
    $pdf->Cell($wV, $hR, '$' . $valor_pagado, 0, 1, 'R');
    $pdf->SetFont('helvetica', 'B', $fBase);
    $pdf->Cell($wK, $hR, 'Saldo:', 0, 0, 'L');
    $pdf->Cell($wV, $hR, '$' . $valor_saldo, 0, 1, 'R');

    // 6. Firmas
    $pdf->Ln(8);
    $wFirma = $anchoUtil / 2;
    $yF = $pdf->GetY();
    $pdf->SetLineWidth(0.2);
    $pdf->Line($margen + 1.5, $yF, $margen + $wFirma - 1.5, $yF);
    $pdf->Line($margen + $wFirma + 1.5, $yF, $margen + $anchoUtil - 1.5, $yF);

    $pdf->SetXY($margen, $yF + 1);
    $pdf->SetFont('helvetica', 'B', $fSub);
    $pdf->Cell($wFirma, $hLn, 'RECIBÍ CONFORME', 0, 0, 'C');
    $pdf->Cell($wFirma, $hLn, 'RESPONSABLE', 0, 1, 'C');

    $pdf->SetFont('helvetica', '', $fSub);
    $pdf->Cell($wFirma, $hLn, substr($socio_nombre, 0, 26), 0, 0, 'C');
    $pdf->Cell($wFirma, $hLn, substr($usuario_nombre, 0, 26), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', $fSub - 1);
    $pdf->Ln(1);
    $pdf->Cell($anchoUtil, $hLn, 'Cédula: ' . substr($socio_cedula, 0, 20), 0, 0, 'C');

    // ─── SALIDA CON CACHÉ NIVEL 2 ─────────────────────────────────────────────
    $fileName = 'credito_' . $claveCredito . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Eliminar PDFs anteriores de este crédito (los datos cambiaron)
    foreach (glob($pdfCacheDir . 'credito_imp_' . $claveCredito . '_*.pdf') as $oldPdf) {
        @unlink($oldPdf);
    }
    @file_put_contents($cachePdfFile, $pdfContent);
    @copy($cachePdfFile, $fastPdfFile);

    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Cache-Control: public, max-age=60');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-T-conn: ' . round(($tConn - $t0) * 1000) . 'ms');
    header('X-PDF-T-cfg: ' . round(($tCfg - $tConn) * 1000) . 'ms');
    header('X-PDF-T-data: ' . round(($tData - $tCfg) * 1000) . 'ms');
    header('X-PDF-T-tcpdf: ' . round((microtime(true) - $tTcpdfStart) * 1000) . 'ms');
    header('X-PDF-Logo: ' . basename($rutaLogo ?? 'none'));
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit;

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

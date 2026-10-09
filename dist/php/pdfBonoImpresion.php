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
// TTL corto (60s) porque un bono puede pasar a ANULADO justo después de imprimirse.
define('BONOIMP_FAST_TTL', 60);

try {
    $t0 = microtime(true);
    $fecha_actual = date('d/m/Y H:i:s');
    $id_bono = isset($_GET['id_bono']) ? (int)$_GET['id_bono'] : 0;
    $numero_ticket = isset($_GET['numero_ticket']) ? trim($_GET['numero_ticket']) : '';
    $tenantId = isset($_GET['tenantId']) ? (int)$_GET['tenantId'] : 1;

    if ($id_bono <= 0 && $numero_ticket === '') {
        throw new Exception("Debe indicar id_bono o numero_ticket");
    }

    // Clave estable para el archivo de caché (sirve con id o con número de ticket)
    $claveBono = $id_bono > 0 ? (string)$id_bono : preg_replace('/[^0-9A-Za-z_-]/', '', $numero_ticket);

    // ─── CACHÉ NIVEL 0: copia TTL corto ──────────────────────────────────────
    $tenantIdStrFast = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? $tenantId ?? '1';
    $dbNameStrFast = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStrFast);
    $dbKeyFast = md5($dbNameStrFast . '_t' . $tenantIdStrFast);
    $pdfCacheDirFast = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDirFast)) @mkdir($pdfCacheDirFast, 0777, true);
    $fastPdfFile = $pdfCacheDirFast . 'bono_imp_' . $claveBono . '_' . $dbKeyFast . '_latest.pdf';
    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < BONOIMP_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="bono_' . $claveBono . '.pdf"');
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

    // ─── CONSULTA DEL BONO ────────────────────────────────────────────────────
    if ($id_bono > 0) {
        $filtroBono = "b.id_bono = " . (int)$id_bono;
    } else {
        $filtroBono = "b.numero_ticket = '" . mysqli_real_escape_string($conn, $numero_ticket) . "'";
    }

    $query_bono = "SELECT b.id_bono, b.valor, b.motivo, b.observacion, b.fecha, b.numero_ticket,
                          b.estado, b.fecha_creacion,
                          bus.disco_buses, bus.placa_buses,
                          p.per_nombres_persona, p.per_apellidos_personal, p.per_cedula_personal,
                          u.nombre_usuario, u.apellido_usuario
                   FROM bonos b
                   LEFT JOIN buses bus ON b.id_bus = bus.id_buses
                   LEFT JOIN personal p ON b.id_socio = p.id_personal
                   LEFT JOIN usuario u ON b.id_usuario_crea = u.id_usuario
                   WHERE $filtroBono
                   ORDER BY b.id_bono DESC LIMIT 1";

    $res_bono = mysqli_query($conn, $query_bono);
    if (!$res_bono) {
        throw new Exception("Error al consultar el bono: " . mysqli_error($conn));
    }
    $bono = mysqli_fetch_assoc($res_bono);
    if (!$bono) {
        throw new Exception("Bono no encontrado (" . ($id_bono > 0 ? "id $id_bono" : "ticket $numero_ticket") . ")");
    }

    $id_bono_final = (int)$bono['id_bono'];
    $numero_ticket = limpiarTextoPdf($bono['numero_ticket'] ?? '', 'S/N');
    $claveBono = (string)$id_bono_final;

    $socio_nombre = limpiarTextoPdf(trim(($bono['per_nombres_persona'] ?? '') . ' ' . ($bono['per_apellidos_personal'] ?? '')), '-');
    $socio_cedula = limpiarTextoPdf($bono['per_cedula_personal'] ?? '', '-');
    $bus_disco    = limpiarTextoPdf($bono['disco_buses'] ?? '', '-');
    $bus_placa    = limpiarTextoPdf($bono['placa_buses'] ?? '', '-');
    $valor        = number_format((float)($bono['valor'] ?? 0), 2);
    $motivo       = limpiarTextoPdf($bono['motivo'] ?? '', '-');
    $observacion  = limpiarTextoPdf($bono['observacion'] ?? '', '');
    $estado_bono  = strtoupper(limpiarTextoPdf($bono['estado'] ?? 'activo', 'ACTIVO'));
    $usuario_nombre = limpiarTextoPdf(trim(($bono['nombre_usuario'] ?? '') . ' ' . ($bono['apellido_usuario'] ?? '')), '-');

    $fecha_bono = limpiarTextoPdf($bono['fecha'] ?? '', '');
    if ($fecha_bono !== '' && $fecha_bono !== '0000-00-00') {
        $ts = strtotime($fecha_bono);
        $fecha_bono = $ts ? date('d/m/Y', $ts) : $fecha_bono;
    } else {
        $fecha_bono = $fecha_actual;
    }

    $conn->close();
    $tData = microtime(true);

    // ─── CACHÉ NIVEL 2: PDF por hash de datos ────────────────────────────────
    $datosHash = md5(json_encode([
        $id_bono_final, $numero_ticket, $valor, $motivo, $observacion,
        $estado_bono, $bus_disco, $bus_placa, $socio_nombre, $socio_cedula, $fecha_bono
    ]));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'bono_imp_' . $claveBono . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        @copy($cachePdfFile, $fastPdfFile);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="bono_' . $claveBono . '.pdf"');
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

    // ─── TCPDF NATIVO (Ticket térmico) ───────────────────────────────────────
    $margen       = $metricas['margen_mm'];
    $anchoUtil    = $metricas['ancho_util_mm'];
    $altoEstimado = 150;

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
    $pdf->Cell($anchoUtil, $hLn + 1, 'BONO N° ' . $numero_ticket, 0, 1, 'C');

    if ($estado_bono === 'ANULADO') {
        $pdf->SetFont('helvetica', 'B', $fBase);
        $pdf->SetTextColor(200, 0, 0);
        $pdf->Cell($anchoUtil, $hLn + 0.5, '*** BONO ANULADO ***', 0, 1, 'C');
        $pdf->SetTextColor(0, 0, 0);
    }

    $pdf->SetFont('helvetica', '', $fSub);
    $pdf->Cell($anchoUtil, $hLn, 'Impreso: ' . $fecha_actual, 0, 1, 'R');
    $pdf->Ln(1);

    // 4. Detalles en celdas nativas (clave-valor)
    $wK = round($anchoUtil * 0.38, 1);
    $wV = $anchoUtil - $wK;
    $hR = round($fBase * 0.46, 1);

    if ($observacion === '') {
        $observacion = '-';
    }

    $rows = [
        ['Fecha:', $fecha_bono],
        ['Bus:', $bus_disco . ' - ' . $bus_placa],
        ['Socio:', $socio_nombre],
        ['Cédula:', $socio_cedula],
        ['Motivo:', $motivo],
        ['Observación:', $observacion],
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

    // 5. Valor destacado
    $pdf->Ln(1.2);
    $pdf->SetLineWidth(0.2);
    $yValTot = $pdf->GetY();
    $pdf->Line($margen, $yValTot, $margen + $anchoUtil, $yValTot);
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', $fBold);
    $pdf->Cell($wK, $hLn + 1, 'VALOR:', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', $fBold + 2);
    $pdf->Cell($wV, $hLn + 1, '$' . $valor, 0, 1, 'R');

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
    $fileName = 'bono_' . $claveBono . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Eliminar PDFs anteriores de este bono (los datos cambiaron: p.ej. quedó ANULADO)
    foreach (glob($pdfCacheDir . 'bono_imp_' . $claveBono . '_*.pdf') as $oldPdf) {
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

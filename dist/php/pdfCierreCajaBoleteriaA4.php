<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";

date_default_timezone_set('America/Guayaquil');

// Reimpresión inmediata del mismo cierre desde disco (sin tocar la BD ni TCPDF)
define('CIERRE_BOL_FAST_TTL', 60);

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_caja = (int)($_GET['id_caja'] ?? 0);

    if ($id_caja <= 0) {
        throw new Exception("ID de caja no proporcionado o inválido");
    }

    // ─── CLAVES DE CACHÉ ─────────────────────────────────────────────────────
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $fastPdfFile = $pdfCacheDir . 'cierre_bol_' . $id_caja . '_' . $dbKey . '_latest.pdf';

    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < CIERRE_BOL_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="cierreCajaBoleteria_' . $id_caja . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT-FAST');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($fastPdfFile);
        exit;
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA + LOGO ────────────────────────────────────────
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) @mkdir($logosDir, 0777, true);

    $vals_empresa = [];
    $empresaCfgCached = null;
    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa = $empresaCfgCached;
        $rutaLogo = $empresaCfgCached['logo_path'] ?? null;
    } else {
        $rec_emp = mysqli_query($conn, "SELECT razon_social_empresa, ruc_empresa, direccion_empresa, telefono_empresa FROM empresa LIMIT 1");
        $vals_empresa = $rec_emp ? (mysqli_fetch_assoc($rec_emp) ?: []) : [];
        if (!$vals_empresa) {
            $vals_empresa = ['razon_social_empresa' => 'SISTEMA FLOTA', 'ruc_empresa' => ''];
        }

        $rutaLogo = null;
        $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
        $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
        if (esImagenValidaParaTcpdf($cachedLogoPng)) {
            $rutaLogo = $cachedLogoPng;
        } elseif (esImagenValidaParaTcpdf($cachedLogoJpg)) {
            $rutaLogo = $cachedLogoJpg;
        } else {
            $res_img = mysqli_query($conn, "SELECT imagen_empresa FROM empresa LIMIT 1");
            $row_img = $res_img ? mysqli_fetch_assoc($res_img) : [];
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
        $toCache = array_merge($vals_empresa, ['logo_path' => $rutaLogo]);
        @file_put_contents($cacheCfgFile, json_encode($toCache));
    }
    $rutaLogo = reducirLogoGigante($rutaLogo ?? null, 500);

    $razon_social_empresa = $vals_empresa['razon_social_empresa'] ?? 'SISTEMA FLOTA';
    $ruc_empresa          = $vals_empresa['ruc_empresa'] ?? '';

    // ─── DATOS DE LA CAJA ────────────────────────────────────────────────────
    $sqlCaja = "SELECT cb.id_caja_boleteria AS id_caja, cb.fecha_caja, cb.fecha_hora_cierre,
                       cb.apertura_total_caja, cb.cierre_total_caja, cb.estado_caja, cb.cuadre_caja,
                       cb.id_fksucursal_caja, cb.id_fkusuario_caja,
                       CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS oficinista,
                       s.nombre_sucursal
                FROM caja_boleteria cb
                INNER JOIN usuario u ON u.id_usuario = cb.id_fkusuario_caja
                LEFT JOIN sucursal2 s ON (s.suc_codigo_sucursal = cb.id_fksucursal_caja OR s.id_sucursal = cb.id_fksucursal_caja)
                WHERE cb.id_caja_boleteria = $id_caja LIMIT 1";
    $recCaja = mysqli_query($conn, $sqlCaja) or die(mysqli_error($conn));
    $caja = mysqli_fetch_assoc($recCaja);
    if (!$caja) {
        throw new Exception("No se encontró la caja de boletería con ID: $id_caja");
    }

    $id_usuario_caja = (int)$caja['id_fkusuario_caja'];
    $fecha_caja_txt  = $caja['fecha_caja'] ? date('Y-m-d', strtotime($caja['fecha_caja'])) : date('Y-m-d');
    $oficinista      = $caja['oficinista'] ?? 'OFICINISTA';
    $nombre_sucursal = $caja['nombre_sucursal'] ?? '';
    $fecha_apertura  = $caja['fecha_caja'] ? date('Y-m-d H:i', strtotime($caja['fecha_caja'])) : '';
    $fecha_cierre    = ($caja['fecha_hora_cierre'] && $caja['fecha_hora_cierre'] != '0000-00-00 00:00:00')
        ? date('Y-m-d H:i', strtotime($caja['fecha_hora_cierre'])) : 'EN PROCESO';

    // ─── DESPACHOS DEL OFICINISTA (período de la caja) ───────────────────────
    $sqlDesp = "SELECT
            dv.id_despacho_viaje,
            dv.id_fkviaje_despacho_viaje AS id_viaje,
            dv.motivo_despacho_viaje,
            dv.tarifa_despacho_viaje AS retenido_total,
            b.disco_buses,
            v.fecha_cierre,
            v.hora_origen_salida,
            CONCAT(COALESCE(u2.nombre_usuario,''), ' ', COALESCE(u2.apellido_usuario,'')) AS oficinista_desp,
            (SELECT COALESCE(SUM(bd.total_boleto_detalle), 0)
               FROM boleto_detalle bd JOIN boletos bo ON bd.id_fkboleto_boleto_detalle = bo.id_boleto
              WHERE bo.id_fkviaje_boleto = dv.id_fkviaje_despacho_viaje AND bo.estado_boleto != 3) AS facturado,
            (SELECT COUNT(bd.total_boleto_detalle)
               FROM boleto_detalle bd JOIN boletos bo ON bd.id_fkboleto_boleto_detalle = bo.id_boleto
              WHERE bo.id_fkviaje_boleto = dv.id_fkviaje_despacho_viaje AND bo.estado_boleto != 3) AS asientos,
            (SELECT COALESCE(SUM(drl.monto_aplicado), 0) FROM despacho_retencion_log drl
              WHERE drl.id_despacho_viaje = dv.id_despacho_viaje AND drl.tipo = 'retencion_porcentual') AS cuota_adm,
            (SELECT COALESCE(SUM(drl.monto_aplicado), 0) FROM despacho_retencion_log drl
              WHERE drl.id_despacho_viaje = dv.id_despacho_viaje AND drl.tipo IN ('deuda','accidentes','tumurahua')) AS multas,
            (SELECT COALESCE(SUM(drl.monto_aplicado), 0) FROM despacho_retencion_log drl
              WHERE drl.id_despacho_viaje = dv.id_despacho_viaje
                AND drl.tipo NOT IN ('retencion_porcentual','deuda','accidentes','tumurahua')) AS otros
        FROM despacho_viaje dv
        LEFT JOIN buses b ON b.id_buses = dv.id_fkbus_despacho_viaje
        LEFT JOIN viajes v ON v.id_viajes = dv.id_fkviaje_despacho_viaje
        LEFT JOIN usuario u2 ON u2.id_usuario = dv.id_fkusuario_aprueba
        WHERE dv.id_fkusuario_aprueba = $id_usuario_caja
          AND DATE(dv.fecha_creacion_despacho_viaje) = '$fecha_caja_txt'
        ORDER BY dv.id_despacho_viaje ASC";

    $despachos = [];
    $recDesp = mysqli_query($conn, $sqlDesp);
    if ($recDesp) {
        while ($d = mysqli_fetch_assoc($recDesp)) {
            $despachos[] = $d;
        }
        mysqli_free_result($recDesp);
    }

    // ─── BONOS DEL OFICINISTA (período) ──────────────────────────────────────
    $bonos = [];
    $recBonos = mysqli_query($conn, "SELECT numero_ticket, valor, motivo, fecha FROM bonos
                                     WHERE id_usuario_crea = $id_usuario_caja AND DATE(fecha) = '$fecha_caja_txt'
                                     ORDER BY fecha ASC");
    if ($recBonos) {
        while ($bo = mysqli_fetch_assoc($recBonos)) {
            $bonos[] = $bo;
        }
        mysqli_free_result($recBonos);
    }

    // ─── EGRESOS / INGRESOS DE LA CAJA ───────────────────────────────────────
    $egresos_ingresos = [];
    $recEI = mysqli_query($conn, "SELECT tipo_caja_detalle, SUM(monto_caja_detalle) AS total
                                  FROM caja_detalle_boleteria
                                  WHERE id_fkcaja_boleteria = $id_caja AND estado_caja_detalle != 'ANULADO'
                                  GROUP BY tipo_caja_detalle");
    if ($recEI) {
        while ($ei = mysqli_fetch_assoc($recEI)) {
            $egresos_ingresos[] = $ei;
        }
        mysqli_free_result($recEI);
    }

    $conn->close();

    // ─── TOTALES ─────────────────────────────────────────────────────────────
    $tot_facturado = 0.0; $tot_cuota = 0.0; $tot_multas = 0.0; $tot_otros = 0.0;
    $tot_retenido = 0.0; $tot_asientos = 0;
    foreach ($despachos as $d) {
        $tot_facturado += (float)$d['facturado'];
        $tot_cuota     += (float)$d['cuota_adm'];
        $tot_multas    += (float)$d['multas'];
        $tot_otros     += (float)$d['otros'];
        $tot_retenido  += (float)$d['retenido_total'];
        $tot_asientos  += (int)$d['asientos'];
    }
    $tot_bonos = 0.0;
    foreach ($bonos as $b) {
        $tot_bonos += (float)$b['valor'];
    }
    $tot_ingresos = 0.0; $tot_egresos = 0.0;
    foreach ($egresos_ingresos as $ei) {
        $tipo = strtoupper(trim((string)$ei['tipo_caja_detalle']));
        if ($tipo === 'INGRESO') $tot_ingresos += (float)$ei['total'];
        else $tot_egresos += (float)$ei['total'];
    }

    // ─── CACHÉ NIVEL 2: PDF POR HASH DE DATOS ────────────────────────────────
    $datosHash = md5(json_encode([
        $id_caja, $oficinista, count($despachos), $tot_facturado, $tot_retenido,
        $tot_cuota, $tot_multas, $tot_otros, $tot_bonos, $tot_ingresos, $tot_egresos,
        (string)$caja['estado_caja'], (string)$fecha_cierre
    ]));
    $cachePdfFile = $pdfCacheDir . 'cierre_bol_' . $id_caja . '_' . $datosHash . '.pdf';
    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        @copy($cachePdfFile, $fastPdfFile);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="cierreCajaBoleteria_' . $id_caja . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($cachePdfFile);
        exit;
    }
    $tTcpdfStart = microtime(true);

    // ─── PDF A4 (MÉTODOS NATIVOS) ────────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetTitle('Cierre de Caja Boletería #' . $id_caja);
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetAutoPageBreak(true, 12);
    $pdf->AddPage();

    $anchoUtil = 190.0;
    $x0 = 10.0;

    // Logo + empresa
    if (!empty($rutaLogo) && file_exists($rutaLogo)) {
        imprimirLogoTcpdfA4($pdf, $rutaLogo, 88.0, 10.0, 34.0, 20.0);
        $pdf->SetY(32);
    }
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell($anchoUtil, 6, strtoupper($razon_social_empresa), 0, 1, 'C');
    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 9);
        $pdf->Cell($anchoUtil, 4.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    // Banda de título
    $pdf->Ln(1.5);
    $pdf->SetFillColor(31, 41, 55);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->Cell($anchoUtil, 7.5, 'CIERRE DE CAJA - BOLETERÍA', 0, 1, 'C', true);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Ln(1.5);

    // Datos de la caja
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(95, 4.5, 'Oficinista: ' . $oficinista, 0, 0, 'L');
    $pdf->Cell(95, 4.5, 'Caja N°: ' . $id_caja, 0, 1, 'L');
    $pdf->Cell(95, 4.5, 'Sucursal: ' . ($nombre_sucursal ?: '-'), 0, 0, 'L');
    $pdf->Cell(95, 4.5, 'Estado: ' . ($caja['estado_caja'] ?? '-'), 0, 1, 'L');
    $pdf->Cell(95, 4.5, 'Apertura: ' . $fecha_apertura, 0, 0, 'L');
    $pdf->Cell(95, 4.5, 'Cierre: ' . $fecha_cierre, 0, 1, 'L');
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(95, 4.5, 'Apertura caja: $' . number_format((float)$caja['apertura_total_caja'], 2), 0, 0, 'L');
    $pdf->Cell(95, 4.5, 'Cierre caja: $' . number_format((float)$caja['cierre_total_caja'], 2), 0, 1, 'L');
    $pdf->Ln(3);

    // ── TABLA: DESPACHOS ─────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 5.5, 'DESPACHOS DEL PERÍODO', 0, 1, 'L');
    $pdf->Ln(0.5);

    // Anchuras (suman 190)
    $c = [15, 14, 30, 12, 13, 24, 23, 21, 14, 24];
    $hHead = ['N° Desp', 'N° Viaje', 'Oficinista', 'Unidad', 'Asientos', 'Facturado', 'Cuota Adm.', 'Multas', 'Otros', 'Retenido'];

    $pdf->SetFillColor(241, 245, 249);
    $pdf->SetFont('helvetica', 'B', 6.5);
    foreach ($hHead as $i => $h) {
        $align = ($i >= 4) ? 'R' : 'C';
        $pdf->Cell($c[$i], 6, $h, 1, ($i === count($hHead) - 1) ? 1 : 0, $align, true);
    }

    $pdf->SetFont('helvetica', '', 6.5);
    if (count($despachos) === 0) {
        $pdf->Cell($anchoUtil, 6, 'Sin despachos registrados en el período', 1, 1, 'C');
    } else {
        foreach ($despachos as $d) {
            $ofic = trim((string)$d['oficinista_desp']);
            if (strlen($ofic) > 22) $ofic = substr($ofic, 0, 22);
            $unidad = $d['disco_buses'] ?? '-';
            $vals = [
                '#' . $d['id_despacho_viaje'],
                (string)$d['id_viaje'],
                $ofic,
                (string)$unidad,
                (string)$d['asientos'],
                '$' . number_format((float)$d['facturado'], 2),
                '$' . number_format((float)$d['cuota_adm'], 2),
                '$' . number_format((float)$d['multas'], 2),
                '$' . number_format((float)$d['otros'], 2),
                '$' . number_format((float)$d['retenido_total'], 2),
            ];
            foreach ($vals as $i => $v) {
                $align = ($i >= 4) ? 'R' : 'C';
                $pdf->Cell($c[$i], 5, $v, 1, ($i === count($vals) - 1) ? 1 : 0, $align);
            }
        }
    }

    // Fila de totales
    $pdf->SetFont('helvetica', 'B', 6.5);
    $pdf->Cell($c[0] + $c[1] + $c[2], 6, 'TOTALES', 1, 0, 'C', true);
    $pdf->Cell($c[3], 6, 'Uds: ' . count($despachos), 1, 0, 'C', true);
    $pdf->Cell($c[4], 6, (string)$tot_asientos, 1, 0, 'R', true);
    $pdf->Cell($c[5], 6, '$' . number_format($tot_facturado, 2), 1, 0, 'R', true);
    $pdf->Cell($c[6], 6, '$' . number_format($tot_cuota, 2), 1, 0, 'R', true);
    $pdf->Cell($c[7], 6, '$' . number_format($tot_multas, 2), 1, 0, 'R', true);
    $pdf->Cell($c[8], 6, '$' . number_format($tot_otros, 2), 1, 0, 'R', true);
    $pdf->Cell($c[9], 6, '$' . number_format($tot_retenido, 2), 1, 1, 'R', true);
    $pdf->Ln(4);

    // ── TABLA: EGRESOS POR BONOS ─────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 5.5, 'EGRESOS POR BONOS (del oficinista)', 0, 1, 'L');
    $pdf->Ln(0.5);

    $pdf->SetFillColor(241, 245, 249);
    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->Cell(30, 6, 'Ticket', 1, 0, 'C', true);
    $pdf->Cell(110, 6, 'Motivo', 1, 0, 'L', true);
    $pdf->Cell(50, 6, 'Valor', 1, 1, 'R', true);

    $pdf->SetFont('helvetica', '', 7);
    if (count($bonos) === 0) {
        $pdf->Cell($anchoUtil, 6, 'Sin bonos registrados en el período', 1, 1, 'C');
    } else {
        foreach ($bonos as $b) {
            $motivo = trim((string)($b['motivo'] ?? ''));
            if (strlen($motivo) > 70) $motivo = substr($motivo, 0, 70);
            $pdf->Cell(30, 5, (string)($b['numero_ticket'] ?? '-'), 1, 0, 'C');
            $pdf->Cell(110, 5, $motivo, 1, 0, 'L');
            $pdf->Cell(50, 5, '$' . number_format((float)$b['valor'], 2), 1, 1, 'R');
        }
    }
    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->Cell(140, 6, 'TOTAL BONOS', 1, 0, 'R', true);
    $pdf->Cell(50, 6, '$' . number_format($tot_bonos, 2), 1, 1, 'R', true);
    $pdf->Ln(4);

    // ── RESUMEN ──────────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 5.5, 'RESUMEN', 0, 1, 'L');
    $pdf->Ln(0.5);

    $wK = 120; $wV = 70;
    $resumen = [
        ['Total facturado (asientos vendidos):', '$' . number_format($tot_facturado, 2)],
        ['Retenido por cuota administrativa:', '$' . number_format($tot_cuota, 2)],
        ['Retenido por multas / deudas:', '$' . number_format($tot_multas, 2)],
        ['Otras retenciones:', '$' . number_format($tot_otros, 2)],
        ['TOTAL RETENIDO (despachos):', '$' . number_format($tot_retenido, 2)],
        ['Egresos por bonos:', '$' . number_format($tot_bonos, 2)],
        ['Ingresos de caja:', '$' . number_format($tot_ingresos, 2)],
        ['Egresos de caja:', '$' . number_format($tot_egresos, 2)],
    ];
    foreach ($resumen as $r) {
        $pdf->SetFont('helvetica', '', 8.5);
        $pdf->Cell($wK, 5, $r[0], 1, 0, 'L');
        $pdf->Cell($wV, 5, $r[1], 1, 1, 'R');
    }
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($wK, 6, 'TOTAL CAJA', 1, 0, 'L', true);
    $pdf->Cell($wV, 6, '$' . number_format((float)$caja['cierre_total_caja'], 2), 1, 1, 'R', true);

    $pdf->Ln(3);
    $pdf->SetFont('helvetica', '', 7);
    $pdf->Cell($anchoUtil, 4, 'Impresión: ' . $fecha_actual, 0, 1, 'C');

    // ─── SALIDA CON CACHÉ ────────────────────────────────────────────────────
    $fileName = 'cierreCajaBoleteria_' . $id_caja . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    foreach (glob($pdfCacheDir . 'cierre_bol_' . $id_caja . '_*.pdf') as $oldPdf) {
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
    header('X-PDF-T-tcpdf: ' . round((microtime(true) - $tTcpdfStart) * 1000) . 'ms');
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

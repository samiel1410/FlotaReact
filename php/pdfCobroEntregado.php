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
    $fecha_actual = date('d/m/Y H:i:s');
    $id_cobros = intval($_GET['id_cobros'] ?? 0);
    $id_usuario = intval($_GET['id_usuario'] ?? 0);

    if ($id_cobros <= 0) {
        throw new Exception("ID de cobro no válido o no proporcionado");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

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
    $vals_config = null;

    if (file_exists($empresaCacheFile) && (time() - filemtime($empresaCacheFile) < 300)) {
        $cachedData = @json_decode(file_get_contents($empresaCacheFile), true);
        if ($cachedData && !empty($cachedData['empresa'])) {
            $vals_empresa = $cachedData['empresa'];
            $vals_config  = $cachedData['config'] ?? [];
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
                'telefono_empresa' => ''
            ];
        }

        $query_config = "SELECT formato_impresion FROM configuracion LIMIT 1";
        $rec_cfg = mysqli_query($conn, $query_config);
        $vals_config = $rec_cfg ? mysqli_fetch_assoc($rec_cfg) : [];

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
            'config' => $vals_config,
            'logo_path' => $rutaLogo
        ]));
    }

    if (empty($rutaLogo) || !esImagenValidaParaTcpdf($rutaLogo)) {
        $rutaLogo = obtenerRutaLogoEmpresa($conn);
    }

    $empresa = $vals_empresa;

    // ─── CONSULTA COBRO ──────────────────────────────────────────────────────
    $query = "SELECT c.*, u.nombre_usuario, u.apellido_usuario, b.placa_buses, b.disco_buses, 
              s.nombre_sucursal, ca.id_caja_boleteria, tc.nombre_tipo_cobros,
              p.per_nombres_persona, p.per_apellidos_personal,
              ue.nombre_usuario AS nombre_usuario_entrego, ue.apellido_usuario AS apellido_usuario_entrego
              FROM cobros c
              LEFT JOIN usuario u ON c.id_fkusuario_cobros = u.id_usuario
              LEFT JOIN usuario ue ON c.id_usuario_entrego = ue.id_usuario
              LEFT JOIN buses b ON c.id_fkbus_cobros = b.id_buses
              LEFT JOIN personal p ON p.id_personal = COALESCE(b.id_fksocio_buses, b.id_fkpersonal_buses)
              LEFT JOIN sucursal2 s ON c.id_fksucursal_cobros = s.suc_codigo_sucursal
              LEFT JOIN caja_boleteria ca ON c.id_fkcaja_cobros = ca.id_caja_boleteria
              LEFT JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
              WHERE c.id_cobros = $id_cobros LIMIT 1";

    $res = mysqli_query($conn, $query);
    $cobro = $res ? mysqli_fetch_assoc($res) : null;

    if (!$cobro) {
        throw new Exception("Cobro #$id_cobros no encontrado");
    }

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $cobroHash = md5(($cobro['estado_cobros'] ?? '') . '_' . ($cobro['monto_cobros'] ?? '') . '_' . ($cobro['fecha_entrego'] ?? ''));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $pdfCacheFile = $pdfCacheDir . 'cobro_entregado_' . $id_cobros . '_' . $cobroHash . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 500) {
        $fileName = 'cobro_entregado_' . $id_cobros . '.pdf';
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

    $nombre_usuario = '';
    if ($id_usuario > 0) {
        $query_usuario = "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario";
        $res_u = mysqli_query($conn, $query_usuario);
        if ($res_u && $u = mysqli_fetch_assoc($res_u)) {
            $nombre_usuario = trim(($u['nombre_usuario'] ?? '') . ' ' . ($u['apellido_usuario'] ?? ''));
        }
    }
    if (empty($nombre_usuario)) {
        $nombre_usuario = trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''));
    }

    $fecha_crea = $cobro['fecha_creacion_cobros'] ?? $cobro['fecha_cobros'] ?? null;
    $fecha_cobro = ($fecha_crea && $fecha_crea !== '0000-00-00' && $fecha_crea !== '0000-00-00 00:00:00')
        ? date('d/m/Y H:i:s', strtotime($fecha_crea))
        : $fecha_actual;

    // Comprobantes asociados
    $query_comprobantes = "SELECT 
        cc.numero_comprobante_cobro,
        cc.monto_comprobante_cobro,
        s.nombre_sucursal,
        u.nombre_usuario,
        u.apellido_usuario
    FROM comprobante_cobro_retenciones cc
    LEFT JOIN sucursal2 s ON cc.id_fksucursal_comprobante_cobro = s.suc_codigo_sucursal
    LEFT JOIN usuario u ON cc.id_fkusuario_comprobante_cobro = u.id_usuario
    WHERE cc.id_fkcobro_comprobante_cobro = $id_cobros
      AND (cc.estado_comprobante_cobro = 'COBRADA' OR cc.estado_comprobante_cobro = 'COBRADO')";

    $res_comprobantes = mysqli_query($conn, $query_comprobantes);
    $comprobantes = [];
    while ($comp = mysqli_fetch_assoc($res_comprobantes)) {
        $comprobantes[] = $comp;
    }
    $conn->close();

    // ─── CONFIGURACIÓN DE PÁGINA TCPDF NATIVA (80mm) ────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion(null, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    $altoEstimado = max(180, 140 + (count($comprobantes) * 4.5) + 30);

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA ─────────────────────────────────────────────────────────
    $pdf->SetY(4);
    if ($rutaLogo && file_exists($rutaLogo)) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoPapel, $margen, 28, 22, 1.5);
    }

    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($anchoUtil, 4.2, strtoupper($empresa['razon_social_empresa'] ?? 'SISTEMA FLOTA'), 0, 1, 'C');

    if (!empty($empresa['ruc_empresa'])) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.4, 'RUC: ' . $empresa['ruc_empresa'], 0, 1, 'C');
    }
    if (!empty($empresa['direccion_empresa'])) {
        $pdf->SetFont('helvetica', '', 7);
        $pdf->MultiCell($anchoUtil, 3.2, $empresa['direccion_empresa'], 0, 'C', false, 1);
    }

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(1.5);

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 4, 'RECIBO DE COBRO #' . $id_cobros, 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.8);
    $pdf->Cell($anchoUtil, 3.2, 'Impreso: ' . $fecha_actual, 0, 1, 'R');
    $pdf->Ln(1);

    // ─── 2. DETALLES DEL COBRO ───────────────────────────────────────────────
    $wK = round($anchoUtil * 0.38, 1);
    $wV = $anchoUtil - $wK;
    $hR = 3.6;

    $estadoText = $cobro['estado_cobros'] == 0 ? 'NO PAGADO' :
        ($cobro['estado_cobros'] == 1 ? 'PAGADO' :
        ($cobro['estado_cobros'] == 2 ? 'ANULADO' : (string)$cobro['estado_cobros']));

    $rows = [
        ['Recibido de:', trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''))],
        ['Sucursal:', (string)($cobro['nombre_sucursal'] ?? '')],
        ['Bus:', ($cobro['disco_buses'] ?? '') . ' - ' . ($cobro['placa_buses'] ?? '')],
        ['Tipo cobro:', (string)($cobro['nombre_tipo_cobros'] ?? '')],
        ['Personal:', trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? ''))],
        ['Estado cobro:', $estadoText],
        ['Fecha:', (string)$fecha_cobro],
        ['Usuario Entregó:', trim(($cobro['nombre_usuario_entrego'] ?? '') . ' ' . ($cobro['apellido_usuario_entrego'] ?? ''))],
        ['Fecha Entrega:', $cobro['fecha_entrego'] ? date('d/m/Y', strtotime($cobro['fecha_entrego'])) : ''],
        ['Observación:', (string)($cobro['observacion_cobros'] ?? '')],
    ];

    foreach ($rows as $r) {
        $pdf->SetFont('helvetica', 'B', 7.2);
        $pdf->Cell($wK, $hR, $r[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.2);
        $pdf->Cell($wV, $hR, $r[1], 0, 1, 'L');
    }

    // Monto Destacado
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wK, 4.5, 'MONTO:', 0, 0, 'L');
    $pdf->Cell($wV, 4.5, '$' . number_format((float)($cobro['monto_cobros'] ?? 0), 2), 0, 1, 'R');

    // Motivo Anulación si aplica
    if ($cobro['estado_cobros'] == 2 && !empty($cobro['motivo_anulacion_cobros'])) {
        $pdf->Ln(1);
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->SetTextColor(200, 0, 0);
        $pdf->MultiCell($anchoUtil, 3.5, 'Motivo Anulación: ' . $cobro['motivo_anulacion_cobros'], 1, 'L', false, 1);
        $pdf->SetTextColor(0, 0, 0);
    }

    // ─── 3. COMPROBANTES ASOCIADOS ───────────────────────────────────────────
    if (count($comprobantes) > 0) {
        $pdf->Ln(1.5);
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil, 3.8, 'Comprobantes cobrados asociados:', 'B', 1, 'L');

        $wNum = round($anchoUtil * 0.28, 1);
        $wMon = round($anchoUtil * 0.22, 1);
        $wSuc = round($anchoUtil * 0.26, 1);
        $wUsu = $anchoUtil - ($wNum + $wMon + $wSuc);

        $pdf->SetFont('helvetica', 'B', 6.8);
        $pdf->Cell($wNum, 3.5, 'N° Comp.', 0, 0, 'L');
        $pdf->Cell($wMon, 3.5, 'Monto', 0, 0, 'R');
        $pdf->Cell($wSuc, 3.5, 'Sucursal', 0, 0, 'L');
        $pdf->Cell($wUsu, 3.5, 'Usuario', 0, 1, 'L');

        $pdf->SetFont('helvetica', '', 6.5);
        foreach ($comprobantes as $comp) {
            $pdf->Cell($wNum, 3.2, (string)$comp['numero_comprobante_cobro'], 0, 0, 'L');
            $pdf->Cell($wMon, 3.2, '$' . number_format((float)$comp['monto_comprobante_cobro'], 2), 0, 0, 'R');
            $pdf->Cell($wSuc, 3.2, substr($comp['nombre_sucursal'] ?? '', 0, 12), 0, 0, 'L');
            $pdf->Cell($wUsu, 3.2, substr(($comp['nombre_usuario'] ?? '') . ' ' . ($comp['apellido_usuario'] ?? ''), 0, 12), 0, 1, 'L');
        }
    }

    // ─── 4. FIRMAS ───────────────────────────────────────────────────────────
    $pdf->Ln(6);
    $wFirma = $anchoUtil / 2;
    $yF = $pdf->GetY();

    $pdf->SetLineWidth(0.2);
    $pdf->Line($margen + 2, $yF, $margen + $wFirma - 2, $yF);
    $pdf->Line($margen + $wFirma + 2, $yF, $margen + $anchoUtil - 2, $yF);

    $pdf->SetXY($margen, $yF + 1);
    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->Cell($wFirma, 3.2, 'PERSONAL', 0, 0, 'C');
    $pdf->Cell($wFirma, 3.2, 'USUARIO', 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.5);
    $nomPersonal = trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? ''));
    $pdf->Cell($wFirma, 3, substr($nomPersonal, 0, 22), 0, 0, 'C');
    $pdf->Cell($wFirma, 3, substr($nombre_usuario, 0, 22), 0, 1, 'C');

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'cobro_entregado_' . $id_cobros . '.pdf';
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
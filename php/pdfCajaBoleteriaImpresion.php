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

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_caja = (int)($_GET['id_caja'] ?? 0);

    if ($id_caja <= 0) {
        throw new Exception("ID de caja no proporcionado o inválido");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CONSULTA DATOS CAJA BOLETERIA ───────────────────────────────────────
    $query_caja = "SELECT suc.nombre_sucursal,
        cb.estado_solicitud, cb.id_caja_boleteria as id_caja, cb.fecha_caja,
        cb.apertura_total_caja, cb.cierre_total_caja, cb.id_fksucursal_caja,
        cb.estado_caja, cb.cuadre_caja,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) as usuario,
        cb.fecha_hora_cierre, cb.id_fkusuario_caja 
    FROM caja_boleteria cb
    INNER JOIN usuario u ON cb.id_fkusuario_caja = u.id_usuario
    LEFT JOIN sucursal2 suc ON cb.id_fksucursal_caja = suc.suc_codigo_sucursal
    WHERE cb.id_caja_boleteria = $id_caja LIMIT 1";

    $recuperar_caja = mysqli_query($conn, $query_caja) or die(mysqli_error($conn));
    $vals_caja = mysqli_fetch_assoc($recuperar_caja);

    if (!$vals_caja) {
        throw new Exception("No se encontró la caja de boletería con ID: $id_caja");
    }

    $fecha_apertura = $vals_caja['fecha_caja'] ? date('Y-m-d H:i:s', strtotime($vals_caja['fecha_caja'])) : '';
    $total_apertura = (float)$vals_caja['apertura_total_caja'];
    $fecha_hora_cierre = ($vals_caja['fecha_hora_cierre'] && $vals_caja['fecha_hora_cierre'] != '0000-00-00 00:00:00') ? date('Y-m-d H:i:s', strtotime($vals_caja['fecha_hora_cierre'])) : 'EN PROCESO';
    $cierre_total_caja = (float)$vals_caja['cierre_total_caja'];
    $usuario = $vals_caja['usuario'] ?? 'OFICINISTA';

    

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }

    $empresaCacheFile = $cacheDir . 'empresa_cfg_' . $dbKey . '.json';
    $vals_empresa = null;
    $vals_config = null;
    $rutaLogo = null;

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
                'ruc_empresa' => ''
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

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa          = $vals_empresa["ruc_empresa"] ?? '';

    // ─── CONSULTA DE BOLETOS DE LA CAJA ───────────────────────────────────────
    $query2 = "SELECT 
        b.id_boleto,
        b.punto_emision_boleto,
        b.sucursal_emision_boleto,
        b.numero_boleto,
        b.total_boleto as cobrado,
        COALESCE(COUNT(bd.id_boleto_detalle), 1) as cantidad
    FROM boletos b
    LEFT JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
    WHERE b.id_fkcaja_boleto = $id_caja AND b.estado_boleto IN (0, 1, 2)
    GROUP BY b.id_boleto, b.punto_emision_boleto, b.sucursal_emision_boleto, b.numero_boleto, b.total_boleto
    ORDER BY b.id_boleto DESC";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));

    $boletos = [];
    $total_final = 0.0;
    $total_cantidad = 0;

    while ($vals2 = mysqli_fetch_assoc($recuperar2)) {
        $resultado = sprintf("%09s", $vals2['numero_boleto']);
        $sucursal_str = sprintf("%03s", $vals2['sucursal_emision_boleto']);
        $punto_str = sprintf("%03s", $vals2['punto_emision_boleto']);
        $num_boleto = $sucursal_str . "-" . $punto_str . "-" . $resultado;
        $cobrado = (float)$vals2['cobrado'];
        $cant = (int)$vals2['cantidad'];

        $total_final += $cobrado;
        $total_cantidad += $cant;

        $boletos[] = [
            'boleto' => $num_boleto,
            'cobrado' => $cobrado,
            'cantidad' => $cant
        ];
    }

    // ─── EGRESOS / INGRESOS ──────────────────────────────────────────────────
    $query_egresos_ingresos = "SELECT tipo_caja_detalle, SUM(monto_caja_detalle) as total 
    FROM caja_detalle_boleteria 
    WHERE id_fkcaja_boleteria = $id_caja 
    GROUP BY tipo_caja_detalle";

    $recuperar_egresos = mysqli_query($conn, $query_egresos_ingresos) or die(mysqli_error($conn));
    $egresos_ingresos = [];
    $total_egresos = 0.0;
    $total_ingresos = 0.0;

    while ($vals_egresos = mysqli_fetch_assoc($recuperar_egresos)) {
        $monto_ei = (float)$vals_egresos['total'];
        if ($vals_egresos['tipo_caja_detalle'] === "Egreso") {
            $total_egresos += $monto_ei;
        } else if ($vals_egresos['tipo_caja_detalle'] === "Ingreso") {
            $total_ingresos += $monto_ei;
        }
        $egresos_ingresos[] = [
            'tipo' => $vals_egresos['tipo_caja_detalle'],
            'total' => $monto_ei
        ];
    }

    $total_cobrado = $total_final;
    $total_final_final = $total_cobrado + $total_ingresos - $total_egresos;

    // ─── SALDO CAJA BOLETERIA ───────────────────────────────────────────────
    $sqlSaldoCaja = "CALL saldoCajaBoleteria($id_caja)";
    $recuperar_saldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));
    $estado_cuadre = 'DESCONOCIDO';
    $saldo = 0.0;

    while ($vals_saldo = mysqli_fetch_assoc($recuperar_saldo)) {
        $estado_cuadre = $vals_saldo['estado_cuadre'] ?? '';
        $saldo = (float)($vals_saldo['total_diferencia'] ?? 0);
    }
    mysqli_free_result($recuperar_saldo);
    while (mysqli_more_results($conn) && mysqli_next_result($conn)) {
        $extra = mysqli_store_result($conn);
        if ($extra) mysqli_free_result($extra);
    }
    $conn->close();

    // ─── CONFIGURACIÓN DE PÁGINA TCPDF NATIVA ────────────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion(null, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    $totalItems = count($boletos) + count($egresos_ingresos);
    $altoEstimado = max(240, 180 + ($totalItems * 4.5));

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA Y LOGO ──────────────────────────────────────────────────
    $pdf->SetY(4);
    if ($rutaLogo && file_exists($rutaLogo)) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoPapel, $margen, 28, 22, 1.5);
    }

    $pdf->SetFont('helvetica', 'B', 10.5);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($razon_social_empresa), 0, 1, 'C');

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil, 4.5, 'CAJA BOLETERIA', 0, 1, 'C');

    // ─── 2. CUADRO DE APERTURA Y CIERRE ──────────────────────────────────────
    $pdf->Ln(1);
    $yBox = $pdf->GetY();
    $pdf->SetFont('helvetica', '', 7.5);

    $hLine = 3.6;
    $pdf->SetXY($margen + 1, $yBox + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Oficinista: ' . $usuario, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Fecha y Hora: ' . $fecha_apertura, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Fecha y Hora Cierre: ' . $fecha_hora_cierre, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil - 2, $hLine, 'APERTURA: $' . number_format($total_apertura, 2), 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'CIERRE: $' . number_format($cierre_total_caja, 2), 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'SALDO ==> $' . number_format($saldo, 2) . ' ' . $estado_cuadre, 0, 1, 'L');

    $altoBox = ($pdf->GetY() - $yBox) + 1;
    $pdf->SetLineStyle(['dash' => 2]);
    $pdf->Rect($margen, $yBox, $anchoUtil, $altoBox, 'D');
    $pdf->SetLineStyle(['dash' => 0]);
    $pdf->Ln(2);

    // ─── 3. SECCIÓN BOLETOS ──────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil, 4.2, 'BOLETOS', 0, 1, 'C');

    $wBol  = round($anchoUtil * 0.50, 1);
    $wCob  = round($anchoUtil * 0.28, 1);
    $wCant = $anchoUtil - ($wBol + $wCob);

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wBol, 4, 'BOLETO', 'B', 0, 'L');
    $pdf->Cell($wCob, 4, 'COBRADO', 'B', 0, 'R');
    $pdf->Cell($wCant, 4, 'CANT.', 'B', 1, 'C');

    $pdf->SetFont('courier', '', 7);
    foreach ($boletos as $b) {
        $pdf->Cell($wBol, 3.6, $b['boleto'], 0, 0, 'L');
        $pdf->Cell($wCob, 3.6, '$' . number_format($b['cobrado'], 2), 0, 0, 'R');
        $pdf->Cell($wCant, 3.6, (string)$b['cantidad'], 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wBol, 4, 'TOTAL:', 'T', 0, 'L');
    $pdf->Cell($wCob, 4, '$' . number_format($total_final, 2), 'T', 0, 'R');
    $pdf->Cell($wCant, 4, '', 'T', 1, 'C');
    $pdf->Ln(1.5);

    // ─── 4. EGRESOS / INGRESOS ───────────────────────────────────────────────
    if (count($egresos_ingresos) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'EGRESOS / INGRESOS', 0, 1, 'C');

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil * 0.6, 4, 'TIPO', 'B', 0, 'L');
        $pdf->Cell($anchoUtil * 0.4, 4, 'TOTAL', 'B', 1, 'R');

        $pdf->SetFont('helvetica', '', 7.5);
        foreach ($egresos_ingresos as $ei) {
            $pdf->Cell($anchoUtil * 0.6, 3.6, $ei['tipo'], 0, 0, 'L');
            $pdf->Cell($anchoUtil * 0.4, 3.6, '$' . number_format($ei['total'], 2), 0, 1, 'R');
        }
        $pdf->Ln(1.5);
    }

    // ─── 5. RESUMEN FINAL ────────────────────────────────────────────────────
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->Ln(1);

    $wK = round($anchoUtil * 0.65, 1);
    $wV = $anchoUtil - $wK;
    $hTot = 3.6;

    $totalesSummary = [
        ['TOTAL COBRADO:', '$' . number_format($total_cobrado, 2)],
        ['TOTAL EGRESOS:', '$' . number_format($total_egresos, 2)],
        ['TOTAL CANTIDAD:', (string)$total_cantidad],
        ['TOTAL CAJA:', '$' . number_format($total_final_final, 2)],
    ];

    foreach ($totalesSummary as $idx => $ts) {
        $pdf->SetFont('helvetica', ($idx === 3) ? 'B' : '', 7.5);
        $pdf->Cell($wK, $hTot, $ts[0], 0, 0, 'L');
        $pdf->Cell($wV, $hTot, $ts[1], 0, 1, 'R');
    }

    $pdf->Ln(2);
    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($anchoUtil, 3.2, 'Impresión: ' . $fecha_actual, 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'caja_boleteria_' . $id_caja . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    $pdf->Output($fileName, 'I');
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
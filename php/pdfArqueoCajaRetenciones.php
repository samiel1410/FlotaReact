<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    $id_caja = intval($_GET['id_caja'] ?? 0);

    if ($id_caja <= 0) {
        throw new Exception("ID de caja retenciones no válido o no especificado.");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: CONFIGURACIÓN EMPRESA ─────────────────────────────────
    $vals_empresa = null;

    
        $query_empresa = "SELECT id_empresa, razon_social_empresa, ruc_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = ['razon_social_empresa' => 'FLOTA PELLILEO', 'ruc_empresa' => ''];
        }
        

    $razon_social = $vals_empresa['razon_social_empresa'] ?? 'FLOTA PELLILEO';

    // Obtener información de la caja y usuario
    $sqlCaja = "SELECT c.id_caja_retenciones as id_caja, c.fecha_caja, CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) as cajero,
                c.apertura_100_caja, c.apertura_50_caja, c.apertura_20_caja, c.apertura_10_caja, c.apertura_5_caja, c.apertura_1_caja, 
                c.apertura_moneda_caja, c.apertura_moneda_50_caja, c.apertura_moneda_25_caja, c.apertura_moneda_10_caja, c.apertura_moneda_5_caja, c.apertura_moneda_1_caja, c.apertura_total_caja, 
                c.cierre_100_caja, c.cierre_50_caja, c.cierre_20_caja, c.cierre_10_caja, c.cierre_5_caja, c.cierre_1_caja, 
                c.cierre_moneda_caja, c.cierre_moneda_50_caja, c.cierre_moneda_25_caja, c.cierre_moneda_10_caja, c.cierre_moneda_5_caja, c.cierre_moneda_1_caja, c.cierre_total_caja, 
                c.sucursal_caja, c.punto_emision_caja, c.id_fksucursal_caja, c.id_fkusuario_caja, c.estado_caja, c.cuadre_caja, c.fecha_hora_cierre, c.tipo_registro_caja, c.configuracion_reporte_caja, c.logs_edicion_caja, c.estado_arqueo_caja, c.total_estado_arqueo 
                FROM caja_retenciones c
                JOIN usuario u ON c.id_fkusuario_caja = u.id_usuario 
                WHERE c.id_caja_retenciones = $id_caja LIMIT 1";

    $resultCaja = mysqli_query($conn, $sqlCaja) or die(mysqli_error($conn));

    if (mysqli_num_rows($resultCaja) == 0) {
        throw new Exception("No se encontró la caja retenciones especificada (#$id_caja).");
    }

    $caja = mysqli_fetch_assoc($resultCaja);

    $fecha_caja = date('Y-m-d H:i:s', strtotime($caja['fecha_caja']));
    $cajero = $caja['cajero'];
    $fecha_hora_cierre = !empty($caja['fecha_hora_cierre']) ? date('Y-m-d H:i:s', strtotime($caja['fecha_hora_cierre'])) : '';

    // APERTURA
    $apertura_100_caja = $caja['apertura_100_caja'];
    $apertura_50_caja = $caja['apertura_50_caja'];
    $apertura_20_caja = $caja['apertura_20_caja'];
    $apertura_10_caja = $caja['apertura_10_caja'];
    $apertura_5_caja = $caja['apertura_5_caja'];
    $apertura_1_caja = $caja['apertura_1_caja'];
    $apertura_moneda_caja = $caja['apertura_moneda_caja'];
    $apertura_moneda_50_caja = $caja['apertura_moneda_50_caja'];
    $apertura_moneda_25_caja = $caja['apertura_moneda_25_caja'];
    $apertura_moneda_10_caja = $caja['apertura_moneda_10_caja'];
    $apertura_moneda_5_caja = $caja['apertura_moneda_5_caja'];
    $apertura_moneda_1_caja = $caja['apertura_moneda_1_caja'];
    $apertura_total_caja = number_format((float)$caja['apertura_total_caja'], 2, '.', '');

    $_apertura_100_caja = number_format($apertura_100_caja * 100, 2, '.', '');
    $_apertura_50_caja = number_format($apertura_50_caja * 50, 2, '.', '');
    $_apertura_20_caja = number_format($apertura_20_caja * 20, 2, '.', '');
    $_apertura_10_caja = number_format($apertura_10_caja * 10, 2, '.', '');
    $_apertura_5_caja = number_format($apertura_5_caja * 5, 2, '.', '');
    $_apertura_1_caja = number_format($apertura_1_caja, 2, '.', '');
    $_apertura_moneda_caja = number_format($apertura_moneda_caja, 2, '.', '');
    $_apertura_moneda_50_caja = number_format($apertura_moneda_50_caja * 0.50, 2, '.', '');
    $_apertura_moneda_25_caja = number_format($apertura_moneda_25_caja * 0.25, 2, '.', '');
    $_apertura_moneda_10_caja = number_format($apertura_moneda_10_caja * 0.10, 2, '.', '');
    $_apertura_moneda_5_caja = number_format($apertura_moneda_50_caja * 0.05, 2, '.', '');
    $_apertura_moneda_1_caja = number_format($apertura_moneda_1_caja * 0.01, 2, '.', '');

    // CIERRE
    $cierre_100_caja = $caja['cierre_100_caja'];
    $cierre_50_caja = $caja['cierre_50_caja'];
    $cierre_20_caja = $caja['cierre_20_caja'];
    $cierre_10_caja = $caja['cierre_10_caja'];
    $cierre_5_caja = $caja['cierre_5_caja'];
    $cierre_1_caja = $caja['cierre_1_caja'];
    $cierre_moneda_caja = $caja['cierre_moneda_caja'];
    $cierre_moneda_50_caja = $caja['cierre_moneda_50_caja'];
    $cierre_moneda_25_caja = $caja['cierre_moneda_25_caja'];
    $cierre_moneda_10_caja = $caja['cierre_moneda_10_caja'];
    $cierre_moneda_5_caja = $caja['cierre_moneda_5_caja'];
    $cierre_moneda_1_caja = $caja['cierre_moneda_1_caja'];
    $cierre_total_caja = number_format((float)$caja['cierre_total_caja'], 2, '.', '');

    $_cierre_100_caja = number_format($cierre_100_caja * 100, 2, '.', '');
    $_cierre_50_caja = number_format($cierre_50_caja * 50, 2, '.', '');
    $_cierre_20_caja = number_format($cierre_20_caja * 20, 2, '.', '');
    $_cierre_10_caja = number_format($cierre_10_caja * 10, 2, '.', '');
    $_cierre_5_caja = number_format($cierre_5_caja * 5, 2, '.', '');
    $_cierre_1_caja = number_format($cierre_1_caja, 2, '.', '');
    $_cierre_moneda_caja = number_format($cierre_moneda_caja, 2, '.', '');
    $_cierre_moneda_50_caja = number_format($cierre_moneda_50_caja * 0.50, 2, '.', '');
    $_cierre_moneda_25_caja = number_format($cierre_moneda_25_caja * 0.25, 2, '.', '');
    $_cierre_moneda_10_caja = number_format($cierre_moneda_10_caja * 0.10, 2, '.', '');
    $_cierre_moneda_5_caja = number_format($cierre_moneda_5_caja * 0.05, 2, '.', '');
    $_cierre_moneda_1_caja = number_format($cierre_moneda_1_caja * 0.01, 2, '.', '');

    // SALDOS (CALL saldoCajaBoleteria)
    $sqlSaldoCaja = "CALL saldoCajaBoleteria($id_caja)";
    $resultSaldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));
    $saldoCaja = mysqli_fetch_assoc($resultSaldo);

    while (mysqli_next_result($conn)) {
        if ($res = mysqli_store_result($conn)) {
            mysqli_free_result($res);
        }
    }

    $totalIngresosDetalle = number_format((float)($saldoCaja['total_ingreso_detalle'] ?? 0), 2, '.', '');
    $totalEgresosDetalle = number_format((float)($saldoCaja['total_egreso_detalle'] ?? 0), 2, '.', '');
    $totalEfectivoDetalle = number_format((float)($saldoCaja['total_efectivo_caja'] ?? 0), 2, '.', '');
    $total_documentos = number_format((float)($saldoCaja['total_documento'] ?? 0), 2, '.', '');
    $estado_cuadre = $saldoCaja['estado_cuadre'] ?? '';
    $saldo = number_format((float)($saldoCaja['total_diferencia'] ?? 0), 2, '.', '');

    $total_apertura = isset($saldoCaja['_tot_apertura']) ? number_format((float)$saldoCaja['_tot_apertura'], 2, '.', '') : '0.00';
    $total_cierre = isset($saldoCaja['_tot_cierre']) ? number_format((float)$saldoCaja['_tot_cierre'], 2, '.', '') : '0.00';
    $total_general_efectivo = number_format((float)($saldoCaja['_total_arqueo'] ?? 0), 2, '.', '');
    $ventas_ingreso = number_format((float)($totalIngresosDetalle + $totalEfectivoDetalle), 2, '.', '');

    // DETALLES INGRESOS Y EGRESOS
    $sqlDetalleCajaIngreso = "SELECT id_caja_detalle_retenciones as id_caja_detalle, fecha_caja_detalle, tipo_caja_detalle, monto_caja_detalle, observacion_caja_detalle, id_fkcaja_retenciones as id_fkcaja, estado_caja_detalle FROM caja_detalle_retenciones WHERE tipo_caja_detalle='Ingreso' AND id_fkcaja_retenciones=$id_caja";
    $resultIngresos = mysqli_query($conn, $sqlDetalleCajaIngreso) or die(mysqli_error($conn));
    $ingresosRows = [];
    while ($r = mysqli_fetch_assoc($resultIngresos)) {
        $ingresosRows[] = $r;
    }

    $sqlDetalleCajaEgreso = "SELECT id_caja_detalle_retenciones as id_caja_detalle, fecha_caja_detalle, tipo_caja_detalle, monto_caja_detalle, observacion_caja_detalle, id_fkcaja_retenciones as id_fkcaja, estado_caja_detalle FROM caja_detalle_retenciones WHERE tipo_caja_detalle='Egreso' AND id_fkcaja_retenciones=$id_caja";
    $resultEgresos = mysqli_query($conn, $sqlDetalleCajaEgreso) or die(mysqli_error($conn));
    $egresosRows = [];
    while ($r = mysqli_fetch_assoc($resultEgresos)) {
        $egresosRows[] = $r;
    }
    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO ──────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetAuthor('SistemaFlota');
    $pdf->SetTitle('Arqueo de Caja Retenciones ' . $id_caja);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(12, 10, 12);
    $pdf->SetAutoPageBreak(TRUE, 12);
    $pdf->AddPage();

    $anchoUtil = 186; // 210 - 24

    // ─── CABECERA ─────────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->Cell($anchoUtil, 6, strtoupper($razon_social), 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->Cell($anchoUtil, 5, $fecha_caja, 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell($anchoUtil, 5.5, 'ARQUEO DE CAJA COBROS / RETENCIONES', 0, 1, 'C');
    $pdf->Ln(2);

    // Metadata de Arqueo
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(25, 4.5, 'CAJERO:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(80, 4.5, $cajero, 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(35, 4.5, 'ARQUEO N°:', 0, 0, 'R');
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(46, 4.5, ' ' . $id_caja, 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(32, 4.5, 'FECHA APERTURA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(73, 4.5, $fecha_caja, 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(35, 4.5, 'FECHA CIERRE:', 0, 0, 'R');
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(46, 4.5, ' ' . $fecha_hora_cierre, 0, 1, 'L');
    $pdf->Ln(2);

    // ─── FUNCIÓN AUXILIAR PARA TABLA DE DENOMINACIONES ───────────────────────
    $renderDenominaciones = function($titulo, $subtitulo, $total, $d100, $d50, $d20, $d10, $d5, $d1, $m1, $m50, $m25, $m10, $m05, $m01,
                                     $t100, $t50, $t20, $t10, $t5, $t1, $tm1, $tm50, $tm25, $tm10, $tm05, $tm01) use ($pdf, $anchoUtil) {
        $pdf->SetFillColor(204, 204, 204);
        $pdf->SetFont('helvetica', 'B', 9.5);
        $pdf->Cell($anchoUtil * 0.45, 5.5, ' ' . $titulo, 1, 0, 'L', true);
        $pdf->Cell($anchoUtil * 0.55, 5.5, '$ ' . $total . ' ', 1, 1, 'R', true);

        $pdf->SetFont('helvetica', 'B', 8.5);
        $pdf->Cell($anchoUtil * 0.45, 4.8, ' ' . $subtitulo, 'LR', 0, 'L');
        $pdf->Cell($anchoUtil * 0.55, 4.8, $total . ' ', 'LR', 1, 'R');
        $pdf->Cell($anchoUtil, 0.5, '', 'T', 1);

        $colLabel = 26;
        $colVal = ($anchoUtil - $colLabel) / 12;

        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->SetFillColor(235, 235, 235);
        $pdf->Cell($colLabel, 4, 'DENOMINACIÓN', 1, 0, 'C', true);
        $pdf->Cell($colVal * 6, 4, 'BILLETES', 1, 0, 'C', true);
        $pdf->Cell($colVal * 6, 4, 'MONEDAS', 1, 1, 'C', true);

        $pdf->SetFont('helvetica', 'B', 6.5);
        $pdf->Cell($colLabel, 3.8, 'VALOR NOMINAL', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '100', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '50', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '20', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '10', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '5', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '1', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '1.00', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '0.50', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '0.25', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '0.10', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '0.05', 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, '0.01', 1, 1, 'C');

        $pdf->SetFont('helvetica', '', 6.5);
        $pdf->Cell($colLabel, 3.8, 'CANTIDAD', 1, 0, 'L');
        $pdf->Cell($colVal, 3.8, (string)$d100, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$d50, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$d20, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$d10, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$d5, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$d1, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m1, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m50, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m25, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m10, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m05, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$m01, 1, 1, 'C');

        $pdf->SetFont('helvetica', 'B', 6.5);
        $pdf->Cell($colLabel, 3.8, 'TOTAL', 1, 0, 'L');
        $pdf->Cell($colVal, 3.8, (string)$t100, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$t50, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$t20, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$t10, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$t5, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$t1, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm1, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm50, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm25, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm10, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm05, 1, 0, 'C');
        $pdf->Cell($colVal, 3.8, (string)$tm01, 1, 1, 'C');
        $pdf->Ln(2);
    };

    // ─── SECCIÓN 1: SALDO APERTURA ────────────────────────────────────────────
    $renderDenominaciones('1. SALDO APERTURA', 'APERTURA DE CAJA', $apertura_total_caja,
        $apertura_100_caja, $apertura_50_caja, $apertura_20_caja, $apertura_10_caja, $apertura_5_caja, $apertura_1_caja,
        $apertura_moneda_caja, $apertura_moneda_50_caja, $apertura_moneda_25_caja, $apertura_moneda_10_caja, $apertura_moneda_5_caja, $apertura_moneda_1_caja,
        $_apertura_100_caja, $_apertura_50_caja, $_apertura_20_caja, $_apertura_10_caja, $_apertura_5_caja, $_apertura_1_caja,
        $_apertura_moneda_caja, $_apertura_moneda_50_caja, $_apertura_moneda_25_caja, $_apertura_moneda_10_caja, $_apertura_moneda_5_caja, $_apertura_moneda_1_caja
    );

    // ─── SECCIÓN 2: DOCUMENTOS ───────────────────────────────────────────────
    $pdf->SetFillColor(204, 204, 204);
    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil * 0.45, 5.5, ' 2. DOCUMENTOS', 1, 0, 'L', true);
    $pdf->Cell($anchoUtil * 0.55, 5.5, '$ ' . $total_documentos . ' ', 1, 1, 'R', true);

    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil * 0.45, 4.8, ' VENTAS - INGRESOS', 'LR', 0, 'L');
    $pdf->Cell($anchoUtil * 0.55, 4.8, $ventas_ingreso . ' ', 'LR', 1, 'R');
    $pdf->Cell($anchoUtil, 0.5, '', 'T', 1);

    // Mini tabla resumen ventas efectivo / otros ingresos
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(65, 4, ' Facturas pago Efectivo', 1, 0, 'L');
    $pdf->Cell(25, 4, '$ ' . $totalEfectivoDetalle . ' ', 1, 1, 'R');
    $pdf->Cell(65, 4, ' Otros Ingresos', 1, 0, 'L');
    $pdf->Cell(25, 4, '$ ' . $totalIngresosDetalle . ' ', 1, 1, 'R');
    $pdf->Ln(1);

    // Tabla Resumen Otros Ingresos
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil, 4, 'Resumen Otros Ingresos', 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 6.5);
    $pdf->SetFillColor(240, 240, 240);
    $pdf->Cell(12, 4, '#', 1, 0, 'C', true);
    $pdf->Cell(35, 4, 'Fecha Hora', 1, 0, 'C', true);
    $pdf->Cell(114, 4, 'Observación', 1, 0, 'L', true);
    $pdf->Cell(25, 4, 'Monto', 1, 1, 'R', true);

    $pdf->SetFont('helvetica', '', 6.5);
    if (empty($ingresosRows)) {
        $pdf->Cell($anchoUtil, 4, 'Sin otros ingresos registrados', 1, 1, 'C');
    } else {
        foreach ($ingresosRows as $ing) {
            $pdf->Cell(12, 3.8, $ing['id_caja_detalle'], 1, 0, 'C');
            $pdf->Cell(35, 3.8, date('Y-m-d H:i:s', strtotime($ing['fecha_caja_detalle'])), 1, 0, 'C');
            $pdf->Cell(114, 3.8, ' ' . substr($ing['observacion_caja_detalle'], 0, 75), 1, 0, 'L');
            $pdf->Cell(25, 3.8, '$ ' . number_format((float)$ing['monto_caja_detalle'], 2, '.', '') . ' ', 1, 1, 'R');
        }
    }
    $pdf->Ln(1);

    // GASTOS - EGRESOS
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($anchoUtil * 0.45, 4.5, ' GASTOS - EGRESOS', 1, 0, 'L');
    $pdf->Cell($anchoUtil * 0.55, 4.5, '$ ' . $totalEgresosDetalle . ' ', 1, 1, 'R');

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil, 4, 'Resumen Otros Gastos', 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 6.5);
    $pdf->SetFillColor(240, 240, 240);
    $pdf->Cell(12, 4, '#', 1, 0, 'C', true);
    $pdf->Cell(35, 4, 'Fecha Hora', 1, 0, 'C', true);
    $pdf->Cell(114, 4, 'Observación', 1, 0, 'L', true);
    $pdf->Cell(25, 4, 'Monto', 1, 1, 'R', true);

    $pdf->SetFont('helvetica', '', 6.5);
    if (empty($egresosRows)) {
        $pdf->Cell($anchoUtil, 4, 'Sin otros gastos registrados', 1, 1, 'C');
    } else {
        foreach ($egresosRows as $egr) {
            $pdf->Cell(12, 3.8, $egr['id_caja_detalle'], 1, 0, 'C');
            $pdf->Cell(35, 3.8, date('Y-m-d H:i:s', strtotime($egr['fecha_caja_detalle'])), 1, 0, 'C');
            $pdf->Cell(114, 3.8, ' ' . substr($egr['observacion_caja_detalle'], 0, 75), 1, 0, 'L');
            $pdf->Cell(25, 3.8, '$ ' . number_format((float)$egr['monto_caja_detalle'], 2, '.', '') . ' ', 1, 1, 'R');
        }
    }
    $pdf->Ln(2);

    // ─── SECCIÓN 3: EFECTIVO CIERRE ──────────────────────────────────────────
    $renderDenominaciones('3. EFECTIVO - EQUIVALENTE A EFECTIVO', 'CIERRE DE CAJA', $cierre_total_caja,
        $cierre_100_caja, $cierre_50_caja, $cierre_20_caja, $cierre_10_caja, $cierre_5_caja, $cierre_1_caja,
        $cierre_moneda_caja, $cierre_moneda_50_caja, $cierre_moneda_25_caja, $cierre_moneda_10_caja, $cierre_moneda_5_caja, $cierre_moneda_1_caja,
        $_cierre_100_caja, $_cierre_50_caja, $_cierre_20_caja, $_cierre_10_caja, $_cierre_5_caja, $_cierre_1_caja,
        $_cierre_moneda_caja, $_cierre_moneda_50_caja, $_cierre_moneda_25_caja, $_cierre_moneda_10_caja, $_cierre_moneda_5_caja, $_cierre_moneda_1_caja
    );

    // ─── SECCIÓN 4: RESUMEN GENERAL Y FIRMAS ─────────────────────────────────
    $pdf->Ln(2);
    $ySignatures = $pdf->GetY();

    // Columna Derecha: Totales
    $wTotLabel = 50;
    $wTotVal = 30;
    $xRight = $anchoUtil - ($wTotLabel + $wTotVal) + 12;

    $pdf->SetXY($xRight, $ySignatures);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($wTotLabel, 4.2, '1. TOTAL APERTURA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wTotVal, 4.2, '$ ' . $total_apertura, 0, 1, 'R');

    $pdf->SetX($xRight);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($wTotLabel, 4.2, '2. TOTAL DOCUMENTOS:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wTotVal, 4.2, '$ ' . $total_documentos, 0, 1, 'R');

    $pdf->SetX($xRight);
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wTotLabel, 4.2, 'TOTAL EFECTIVO:', 0, 0, 'L');
    $pdf->Cell($wTotVal, 4.2, '$ ' . $total_general_efectivo, 0, 1, 'R');

    $pdf->SetX($xRight);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($wTotLabel, 4.2, '3. TOTAL CIERRE:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wTotVal, 4.2, '$ ' . $total_cierre, 0, 1, 'R');

    $pdf->SetX($xRight);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wTotLabel, 4.5, 'SALDO ==>', 0, 0, 'L');
    $pdf->Cell($wTotVal, 4.5, '$ ' . $saldo . ' (' . $estado_cuadre . ')', 0, 1, 'R');

    // Columna Izquierda: Firmas
    $pdf->SetXY(12, $ySignatures + 4);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(70, 4, '__________________________________', 0, 1, 'C');
    $pdf->Cell(70, 4, 'CAJERO: ' . $cajero, 0, 1, 'C');
    $pdf->Ln(4);
    $pdf->Cell(70, 4, '__________________________________', 0, 1, 'C');
    $pdf->Cell(70, 4, 'GERENTE / ADMINISTRACIÓN', 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'ArqueoCajaRetenciones_' . $id_caja . '.pdf';
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

<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once('../library/tcpdf.php');
require_once("../db.php");
require_once("../pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

try {
    $t0 = microtime(true);
    $fecha_actual = date('d/m/Y H:i:s');
    $numero_comprobante = isset($_GET['numero_comprobante']) ? intval($_GET['numero_comprobante']) : 0;

    if ($numero_comprobante <= 0) {
        throw new Exception("Número de comprobante no válido");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    $query_empresa = "SELECT razon_social_empresa, ruc_empresa, direccion_empresa, telefono_empresa FROM empresa LIMIT 1";
    $res_empresa = mysqli_query($conn, $query_empresa);
    $vals_empresa = $res_empresa ? mysqli_fetch_assoc($res_empresa) : [];
    if (!$vals_empresa) {
        $vals_empresa = [
            'razon_social_empresa' => 'SISTEMA FLOTA',
            'ruc_empresa' => '',
            'direccion_empresa' => '',
            'telefono_empresa' => ''
        ];
    }

    $empresa = $vals_empresa;

    // ─── CONSULTA COMPROBANTES ───────────────────────────────────────────────
    $query = "SELECT 
        ccr.id_comprobante_cobro_retenciones,
        ccr.numero_comprobante_cobro,
        ccr.fecha_emision_comprobante_cobro,
        ccr.monto_comprobante_cobro,
        ccr.concepto_detalle_comprobante_cobro,
        ccr.estado_comprobante_cobro,
        ccr.observacion_comprobante_cobro,
        u.nombre_usuario,
        u.apellido_usuario,
        b.placa_buses,
        b.disco_buses,
        s.nombre_sucursal,
        fp.nombre_forma_pago
    FROM comprobante_cobro_retenciones ccr
    LEFT JOIN usuario u ON ccr.id_fkusuario_comprobante_cobro = u.id_usuario
    LEFT JOIN buses b ON ccr.id_fkbus_comprobante_cobro = b.id_buses
    LEFT JOIN sucursal2 s ON ccr.id_fksucursal_comprobante_cobro = s.suc_codigo_sucursal
    LEFT JOIN forma_pago fp ON ccr.id_fkforma_pago = fp.id_forma_pago
    WHERE ccr.numero_comprobante_cobro = $numero_comprobante
    ORDER BY ccr.fecha_creacion_comprobante_cobro ASC";

    $res = mysqli_query($conn, $query) or die(mysqli_error($conn));

    $comprobantes = [];
    $total = 0.0;
    while ($row = mysqli_fetch_assoc($res)) {
        $comprobantes[] = $row;
        $total += (float)$row['monto_comprobante_cobro'];
    }
    $conn->close();

    if (count($comprobantes) === 0) {
        throw new Exception("No se encontraron comprobantes con el número $numero_comprobante");
    }

    $usuario = trim(($comprobantes[0]['nombre_usuario'] ?? '') . ' ' . ($comprobantes[0]['apellido_usuario'] ?? ''));
    $sucursal = $comprobantes[0]['nombre_sucursal'] ?? '';

    // ─── CONFIGURACIÓN TCPDF 80mm NATIVO ────────────────────────────────────
    $anchoPapel = 80;
    $margen = 4;
    $anchoUtil = $anchoPapel - ($margen * 2);

    $altoEstimado = max(180, 120 + (count($comprobantes) * 6));

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA ─────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($empresa['razon_social_empresa'] ?? 'SISTEMA FLOTA'), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 7.5);
    if (!empty($empresa['ruc_empresa'])) {
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $empresa['ruc_empresa'], 0, 1, 'C');
    }
    if (!empty($empresa['direccion_empresa'])) {
        $pdf->MultiCell($anchoUtil, 3.2, $empresa['direccion_empresa'], 0, 'C', false, 1);
    }
    if (!empty($empresa['telefono_empresa'])) {
        $pdf->Cell($anchoUtil, 3.2, 'Tel: ' . $empresa['telefono_empresa'], 0, 1, 'C');
    }

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(2);

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 4, 'Comprobante de Cobro N° ' . $numero_comprobante, 0, 1, 'C');
    $pdf->Ln(1);

    // ─── 2. TABLA DE DETALLES ────────────────────────────────────────────────
    $wFec = 14;
    $wBus = 16;
    $wCon = 26;
    $wMon = 16;

    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->Cell($wFec, 3.8, 'Fecha', 'B', 0, 'L');
    $pdf->Cell($wBus, 3.8, 'Bus', 'B', 0, 'L');
    $pdf->Cell($wCon, 3.8, 'Concepto', 'B', 0, 'L');
    $pdf->Cell($wMon, 3.8, 'Monto', 'B', 1, 'R');

    $pdf->SetFont('helvetica', '', 6.8);
    foreach ($comprobantes as $c) {
        $fecha = date('d/m/y', strtotime($c['fecha_emision_comprobante_cobro']));
        $bus = ($c['disco_buses'] ?? '') . '-' . ($c['placa_buses'] ?? '');
        $concepto = substr($c['concepto_detalle_comprobante_cobro'] ?? '', 0, 18);
        $monto = (float)($c['monto_comprobante_cobro'] ?? 0);

        $pdf->Cell($wFec, 3.5, $fecha, 0, 0, 'L');
        $pdf->Cell($wBus, 3.5, substr($bus, 0, 10), 0, 0, 'L');
        $pdf->Cell($wCon, 3.5, $concepto, 0, 0, 'L');
        $pdf->Cell($wMon, 3.5, '$' . number_format($monto, 2), 0, 1, 'R');
    }

    // ─── 3. TOTALES Y PIE ────────────────────────────────────────────────────
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($wFec + $wBus + $wCon, 4.5, 'Total Comprobante:', 'T', 0, 'L');
    $pdf->Cell($wMon, 4.5, '$' . number_format($total, 2), 'T', 1, 'R');

    $pdf->Ln(1.5);
    $pdf->SetFont('helvetica', '', 7);
    if (!empty($sucursal)) {
        $pdf->Cell($anchoUtil, 3.2, 'Sucursal: ' . $sucursal, 0, 1, 'L');
    }
    if (!empty($usuario)) {
        $pdf->Cell($anchoUtil, 3.2, 'Usuario: ' . $usuario, 0, 1, 'L');
    }
    $pdf->Cell($anchoUtil, 3.2, 'Impresión: ' . $fecha_actual, 0, 1, 'R');

    $pdf->IncludeJS("print();");

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'comprobanteCobro_' . $numero_comprobante . '.pdf';
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
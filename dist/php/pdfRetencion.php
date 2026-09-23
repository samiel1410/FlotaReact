<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
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
    $id_cobros  = intval($_GET['id_cobros'] ?? 0);
    $id_usuario = intval($_GET['id_usuario'] ?? 0);

    if ($id_cobros <= 0) {
        throw new Exception("ID de cobro / retención no válido o no proporcionado");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = ['razon_social_empresa' => 'SISTEMA FLOTA', 'ruc_empresa' => '', 'direccion_empresa' => ''];
        }

    $empresa = $vals_empresa;
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $empresa["imagen_empresa"] ?? null);

    // Datos del usuario (si viene por GET)
    $nombre_usuario = '';
    if ($id_usuario > 0) {
        $res_u = mysqli_query($conn, "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario");
        if ($res_u && $u = mysqli_fetch_assoc($res_u)) {
            $nombre_usuario = trim(($u['nombre_usuario'] ?? '') . ' ' . ($u['apellido_usuario'] ?? ''));
        }
    }

    // Datos del cobro
    $query = "SELECT c.*,
                     u.nombre_usuario, u.apellido_usuario,
                     b.placa_buses, b.disco_buses,
                     s.nombre_sucursal,
                     ca.id_caja_boleteria,
                     tc.nombre_tipo_cobros,
                     p.per_nombres_persona,
                     p.per_apellidos_personal
              FROM cobros c
              LEFT JOIN usuario  u  ON c.id_fkusuario_cobros = u.id_usuario
              LEFT JOIN buses    b  ON c.id_fkbus_cobros = b.id_buses
              LEFT JOIN personal p  ON p.id_personal = COALESCE(b.id_fksocio_buses, b.id_fkpersonal_buses)
              LEFT JOIN sucursal2 s ON c.id_fksucursal_cobros = s.suc_codigo_sucursal
              LEFT JOIN caja_boleteria ca ON c.id_fkcaja_cobros = ca.id_caja_boleteria
              LEFT JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
              WHERE c.id_cobros = $id_cobros LIMIT 1";

    $res = mysqli_query($conn, $query);
    $cobro = $res ? mysqli_fetch_assoc($res) : null;
    $conn->close();

    if (!$cobro) {
        throw new Exception("Cobro/Retención #$id_cobros no encontrado");
    }

    if (empty($nombre_usuario)) {
        $nombre_usuario = trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''));
    }

    // Fecha cobro
    $fecha_str = $cobro['fecha_cobros'] ?? $cobro['fecha_creacion_cobros'] ?? null;
    if ($fecha_str && $fecha_str !== '0000-00-00' && $fecha_str !== '0000-00-00 00:00:00') {
        $ts = strtotime($fecha_str);
        $fecha_cobro = $ts ? date('d/m/Y H:i:s', $ts) : $fecha_actual;
    } else {
        $fecha_cobro = $fecha_actual;
    }

    $razon    = limpiarTextoPdf($empresa['razon_social_empresa'] ?? '', 'SISTEMA FLOTA');
    $ruc      = limpiarTextoPdf($empresa['ruc_empresa'] ?? '');
    $dir      = limpiarTextoPdf($empresa['direccion_empresa'] ?? '');
    $socio_n  = limpiarTextoPdf(trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? '')), '-');
    $bus_inf  = ($cobro['disco_buses'] ?? '-') . ' - ' . ($cobro['placa_buses'] ?? '-');
    $monto    = number_format(floatval($cobro['monto_cobros'] ?? 0), 2);
    $tipo_c   = limpiarTextoPdf($cobro['nombre_tipo_cobros'] ?? '', 'Cobro');
    $sucursal = limpiarTextoPdf($cobro['nombre_sucursal'] ?? '', '-');
    $obs      = limpiarTextoPdf($cobro['observacion_cobros'] ?? '', '-');
    $recibido = limpiarTextoPdf($nombre_usuario ?: trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? '')), '-');

    // ─── CONFIGURACIÓN TCPDF (Ticket 80mm Nativo) ─────────────────────────────
    $anchoPapel = 80;
    $margen = 4;
    $anchoUtil = $anchoPapel - ($margen * 2);
    $altoEstimado = 185;

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // 1. Logo
    $pdf->SetY(4);
    if ($rutaLogo) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoPapel, $margen, 28, 22, 1.5);
    }

    // 2. Cabecera
    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil, 4.2, strtoupper($razon), 0, 1, 'C');

    if (!empty($ruc)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc, 0, 1, 'C');
    }
    if (!empty($dir)) {
        $pdf->SetFont('helvetica', '', 7);
        $pdf->MultiCell($anchoUtil, 3.2, $dir, 0, 'C', false, 1);
    }

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(1.5);

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 4, 'RECIBO DE RETENCIÓN #' . $id_cobros, 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.8);
    $pdf->Cell($anchoUtil, 3.2, 'Impreso: ' . $fecha_actual, 0, 1, 'R');
    $pdf->Ln(1);

    // 3. Detalles en celdas nativas
    $wK = round($anchoUtil * 0.35, 1);
    $wV = $anchoUtil - $wK;
    $hR = 3.6;

    $rows = [
        ['Recibido de:', $recibido],
        ['Sucursal:', $sucursal],
        ['Bus:', $bus_inf],
        ['Tipo cobro:', $tipo_c],
        ['Personal:', $socio_n],
        ['Fecha:', $fecha_cobro],
        ['Observación:', $obs],
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
    $pdf->Cell($wV, 4.5, '$' . $monto, 0, 1, 'R');

    // Motivo Anulación si aplica
    if (($cobro['estado_cobros'] ?? '') == 2 && !empty($cobro['motivo_anulacion_cobros'])) {
        $pdf->Ln(1);
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->SetTextColor(200, 0, 0);
        $pdf->MultiCell($anchoUtil, 3.5, 'Motivo Anulación: ' . $cobro['motivo_anulacion_cobros'], 1, 'L', false, 1);
        $pdf->SetTextColor(0, 0, 0);
    }

    // 4. Firmas
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
    $pdf->Cell($wFirma, 3, substr($socio_n, 0, 22), 0, 0, 'C');
    $pdf->Cell($wFirma, 3, substr($nombre_usuario, 0, 22), 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'retencion_' . $id_cobros . '.pdf';
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
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
    $id_cobros = intval($_GET['id_cobros'] ?? 0);
    $id_usuario = intval($_GET['id_usuario'] ?? 0);

    if ($id_cobros <= 0) {
        throw new Exception("ID de cobro no válido o no proporcionado");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }

    $vals_empresa = null;
    $rutaLogo = null;

    
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
    $total_comprobantes = 0.0;
    while ($comp = mysqli_fetch_assoc($res_comprobantes)) {
        $comprobantes[] = $comp;
        $total_comprobantes += (float)$comp['monto_comprobante_cobro'];
    }
    $conn->close();

    // ─── CONFIGURACIÓN TCPDF A4 NATIVO ──────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetTitle('Comprobante de Cobro - ' . $id_cobros);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(15, 12, 15);
    $pdf->SetAutoPageBreak(true, 15);
    $pdf->AddPage();

    $wUtil = 180; // 210 - 30

    // ─── 1. CABECERA Y LOGO ──────────────────────────────────────────────────
    $yTop = $pdf->GetY();
    if ($rutaLogo && file_exists($rutaLogo)) {
        $pdf->Image($rutaLogo, 15, $yTop, 28, 0, '', '', '', true, 150);
    }

    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetTextColor(44, 62, 80);
    $pdf->Cell($wUtil, 6, strtoupper($empresa['razon_social_empresa'] ?? 'SISTEMA FLOTA'), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetTextColor(127, 140, 141);
    $contacto = 'RUC: ' . ($empresa['ruc_empresa'] ?? '') . ' | ' . ($empresa['direccion_empresa'] ?? '');
    $pdf->Cell($wUtil, 4.5, $contacto, 0, 1, 'C');
    $subcontacto = 'Tel: ' . ($empresa['telefono_empresa'] ?? '') . ' | Email: ' . ($empresa['correo_empresa'] ?? '');
    $pdf->Cell($wUtil, 4.5, $subcontacto, 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($wUtil, 4, 'Documento generado: ' . $fecha_actual, 0, 1, 'R');
    $pdf->Ln(2);

    // ─── 2. TÍTULO DE SECCIÓN ────────────────────────────────────────────────
    $pdf->SetFillColor(236, 240, 241);
    $pdf->SetTextColor(52, 73, 94);
    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->Cell($wUtil, 7, '  COMPROBANTE DE ENTREGA DE COBRO N° ' . $id_cobros, 0, 1, 'L', true);
    $pdf->Ln(2);

    // ─── 3. TABLA DE DETALLES PRINCIPALES ────────────────────────────────────
    $estadoText = $cobro['estado_cobros'] == 0 ? 'NO PAGADO' :
        ($cobro['estado_cobros'] == 1 ? 'PAGADO' :
        ($cobro['estado_cobros'] == 2 ? 'ANULADO' : (string)$cobro['estado_cobros']));

    $detalles1 = [
        ['Recibido de:', trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''))],
        ['Sucursal:', (string)($cobro['nombre_sucursal'] ?? '')],
        ['Bus asignado:', 'Disco: ' . ($cobro['disco_buses'] ?? '') . ' - Placa: ' . ($cobro['placa_buses'] ?? '')],
        ['Tipo de cobro:', (string)($cobro['nombre_tipo_cobros'] ?? '')],
        ['Personal responsable:', trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? ''))],
        ['Estado del cobro:', $estadoText],
    ];

    $wLbl = 45;
    $wVal = $wUtil - $wLbl;
    $pdf->SetDrawColor(189, 195, 199);

    foreach ($detalles1 as $d) {
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell($wLbl, 6, $d[0], 'B', 0, 'L');
        $pdf->SetFont('helvetica', '', 9);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell($wVal, 6, $d[1], 'B', 1, 'L');
    }

    // ─── 4. MONTO DESTACADO ──────────────────────────────────────────────────
    $pdf->Ln(3);
    $yMonto = $pdf->GetY();
    $pdf->SetFillColor(232, 248, 245);
    $pdf->SetDrawColor(39, 174, 96);
    $pdf->SetLineWidth(0.4);
    $pdf->Rect(15, $yMonto, $wUtil, 10, 'DF');

    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->SetTextColor(39, 174, 96);
    $pdf->SetXY(15, $yMonto + 2);
    $pdf->Cell($wUtil, 6, 'MONTO TOTAL: $' . number_format((float)($cobro['monto_cobros'] ?? 0), 2), 0, 1, 'C');
    $pdf->SetTextColor(52, 73, 94);
    $pdf->SetDrawColor(189, 195, 199);
    $pdf->SetLineWidth(0.2);
    $pdf->Ln(3);

    // ─── 5. DETALLES ADICIONALES ─────────────────────────────────────────────
    $detalles2 = [
        ['Fecha de registro:', (string)$fecha_cobro],
        ['Usuario que entregó:', trim(($cobro['nombre_usuario_entrego'] ?? '') . ' ' . ($cobro['apellido_usuario_entrego'] ?? ''))],
        ['Fecha de entrega:', $cobro['fecha_entrego'] ? date('d/m/Y', strtotime($cobro['fecha_entrego'])) : ''],
        ['Observaciones:', (string)($cobro['observacion_cobros'] ?? '')],
    ];

    foreach ($detalles2 as $d) {
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell($wLbl, 6, $d[0], 'B', 0, 'L');
        $pdf->SetFont('helvetica', '', 9);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell($wVal, 6, $d[1], 'B', 1, 'L');
    }

    if ($cobro['estado_cobros'] == 2 && !empty($cobro['motivo_anulacion_cobros'])) {
        $pdf->Ln(2);
        $pdf->SetFont('helvetica', 'B', 9.5);
        $pdf->SetTextColor(231, 76, 60);
        $pdf->MultiCell($wUtil, 6, 'MOTIVO DE ANULACIÓN: ' . $cobro['motivo_anulacion_cobros'], 1, 'L', false, 1);
        $pdf->SetTextColor(52, 73, 94);
    }

    // ─── 6. COMPROBANTES ASOCIADOS ───────────────────────────────────────────
    if (count($comprobantes) > 0) {
        $pdf->Ln(3);
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell($wUtil, 6, 'Comprobantes cobrados asociados:', 0, 1, 'L');

        $wN = 35;
        $wM = 30;
        $wS = 55;
        $wU = 60;

        $pdf->SetFillColor(52, 152, 219);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell($wN, 6, 'N° Comprobante', 1, 0, 'C', true);
        $pdf->Cell($wM, 6, 'Monto', 1, 0, 'C', true);
        $pdf->Cell($wS, 6, 'Sucursal', 1, 0, 'C', true);
        $pdf->Cell($wU, 6, 'Usuario', 1, 1, 'C', true);

        $pdf->SetTextColor(52, 73, 94);
        $pdf->SetFont('helvetica', '', 8.5);
        foreach ($comprobantes as $comp) {
            $pdf->Cell($wN, 5.5, $comp['numero_comprobante_cobro'], 1, 0, 'C');
            $pdf->Cell($wM, 5.5, '$' . number_format((float)$comp['monto_comprobante_cobro'], 2), 1, 0, 'R');
            $pdf->Cell($wS, 5.5, substr($comp['nombre_sucursal'] ?? '', 0, 25), 1, 0, 'L');
            $pdf->Cell($wU, 5.5, substr(($comp['nombre_usuario'] ?? '') . ' ' . ($comp['apellido_usuario'] ?? ''), 0, 28), 1, 1, 'L');
        }

        $pdf->SetFillColor(236, 240, 241);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell($wN + $wM + $wS, 6, 'TOTAL COMPROBANTES: ', 1, 0, 'R', true);
        $pdf->Cell($wU, 6, '$' . number_format($total_comprobantes, 2), 1, 1, 'R', true);
    }

    // ─── 7. FIRMAS ───────────────────────────────────────────────────────────
    $pdf->Ln(20);
    $wF = 80;
    $x1 = 15;
    $x2 = 115;
    $yFirma = $pdf->GetY();

    $pdf->SetDrawColor(44, 62, 80);
    $pdf->SetLineWidth(0.4);
    $pdf->Line($x1, $yFirma, $x1 + $wF, $yFirma);
    $pdf->Line($x2, $yFirma, $x2 + $wF, $yFirma);

    $pdf->SetXY($x1, $yFirma + 2);
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetTextColor(44, 62, 80);
    $nomPersonal = trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? ''));
    $pdf->Cell($wF, 5, $nomPersonal, 0, 1, 'C');
    $pdf->SetX($x1);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->SetTextColor(127, 140, 141);
    $pdf->Cell($wF, 4, 'PERSONAL RESPONSABLE', 0, 1, 'C');

    $pdf->SetXY($x2, $yFirma + 2);
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetTextColor(44, 62, 80);
    $pdf->Cell($wF, 5, $nombre_usuario, 0, 1, 'C');
    $pdf->SetX($x2);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->SetTextColor(127, 140, 141);
    $pdf->Cell($wF, 4, 'USUARIO DEL SISTEMA', 0, 1, 'C');

    // ─── 8. PIE DE PÁGINA ────────────────────────────────────────────────────
    $pdf->Ln(10);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->SetTextColor(127, 140, 141);
    $pdf->Cell($wUtil, 3.5, 'Este documento fue generado automáticamente por el Sistema de Gestión de Flota', 0, 1, 'C');
    $pdf->Cell($wUtil, 3.5, 'Fecha y hora de generación: ' . $fecha_actual, 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'ComprobanteCobroA4_' . $id_cobros . '.pdf';
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
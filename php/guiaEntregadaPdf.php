<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    $fecha_actual = date('d-m-Y H:i:s');
    $id_usuario = intval($_GET['id_usuario'] ?? 0);
    $id_guia = intval($_GET['id_guia'] ?? 0);

    if ($id_guia <= 0) {
        throw new Exception("ID de guía no válido o no proporcionado");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        if (!$vals_empresa) {
            $vals_empresa = ['razon_social_empresa' => 'SISTEMA FLOTA', 'ruc_empresa' => ''];
        }

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $vals_empresa["imagen_empresa"] ?? null);

    // ─── CONSULTAS ───────────────────────────────────────────────────────────
    $sql_verificar = "SELECT 
        ge.numero_guia_guias_entregadas,
        ge.ruc_destinatario_guias_entregadas,
        ge.nombre_destinatario_guias_entregadas,
        ge.punto_emision_guia_guias_entregadas,
        ge.punto_emision_sucursal_guias_entregadas,
        ge.fecha_hora_entrega,
        ge.id_fkguia_guias_entregadas,
        u.nombre_usuario,
        u.apellido_usuario
    FROM guias_entregadas ge
    LEFT JOIN usuario u ON ge.id_usuario_entrego = u.id_usuario
    WHERE ge.id_fkguia_guias_entregadas = $id_guia LIMIT 1";

    $recuperar_guia = mysqli_query($conn, $sql_verificar) or die(mysqli_error($conn));
    $vals_guia = mysqli_fetch_assoc($recuperar_guia);

    if (!$vals_guia) {
        throw new Exception("No se encontró registro de entrega para la guía #$id_guia");
    }

    $resultado = sprintf("%09s", $vals_guia["numero_guia_guias_entregadas"] ?? 0);
    $punto_emision_guia = limpiarTextoPdf($vals_guia["punto_emision_guia_guias_entregadas"] ?? '', '001');
    $punto_emision_sucursal = limpiarTextoPdf($vals_guia["punto_emision_sucursal_guias_entregadas"] ?? '', '001');
    $fecha_hora_entrega = limpiarTextoPdf($vals_guia["fecha_hora_entrega"] ?? '');
    $cliente = limpiarTextoPdf($vals_guia["nombre_destinatario_guias_entregadas"] ?? '');
    $cedula_cliente = limpiarTextoPdf($vals_guia["ruc_destinatario_guias_entregadas"] ?? '');
    $usuario_entrego = limpiarTextoPdf(trim(($vals_guia["nombre_usuario"] ?? '') . ' ' . ($vals_guia["apellido_usuario"] ?? '')));
    $numero_guia = $punto_emision_sucursal . '-' . $punto_emision_guia . '-' . $resultado;

    // Oficinista que imprime
    $nombre_usuario = '';
    $apellido_usuario = '';
    if ($id_usuario > 0) {
        $sql_ofic = "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario LIMIT 1";
        $rec_ofic = mysqli_query($conn, $sql_ofic);
        if ($rec_ofic && $vals_ofic = mysqli_fetch_assoc($rec_ofic)) {
            $nombre_usuario = limpiarTextoPdf($vals_ofic["nombre_usuario"] ?? '');
            $apellido_usuario = limpiarTextoPdf($vals_ofic["apellido_usuario"] ?? '');
        }
    }

    $ubicacion_usuario = '';
    if ($id_usuario > 0) {
        $query_ubicacion = "SELECT d.lugar_destino FROM destino d JOIN usuario u ON u.id_fkdestino_usuario = d.id_destino WHERE u.id_usuario = $id_usuario LIMIT 1";
        $rec_ub = mysqli_query($conn, $query_ubicacion);
        if ($rec_ub && $row_ub = mysqli_fetch_assoc($rec_ub)) {
            $ubicacion_usuario = limpiarTextoPdf($row_ub['lugar_destino'] ?? '');
        }
    }

    // Contenido
    $query_contenido = "SELECT contenido_guia, cantidad_detalle_guia FROM detalle_guia WHERE id_fkguia_detalle_envio = $id_guia";
    $recuperar_contenido = mysqli_query($conn, $query_contenido) or die(mysqli_error($conn));
    $items = [];
    while ($r = mysqli_fetch_assoc($recuperar_contenido)) {
        $items[] = [
            'contenido_guia' => limpiarTextoPdf($r['contenido_guia'] ?? ''),
            'cantidad_detalle_guia' => $r['cantidad_detalle_guia'] ?? 1
        ];
    }
    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO (Ticket 80mm) ───────────────────────────
    $anchoTicket = 80;
    $altoTicket = 200;
    $margen = 4;
    $anchoUtil = $anchoTicket - ($margen * 2);

    $pdf = new TCPDF('P', 'mm', array($anchoTicket, $altoTicket), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // Logo
    $pdf->SetY(4);
    if ($rutaLogo) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $anchoTicket, $margen, 24, 18, 1.5);
    }

    // Empresa
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->MultiCell($anchoUtil, 4, strtoupper($razon_social_empresa), 0, 'C', false, 1);
    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }
    if (!empty($ubicacion_usuario)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'OFICINA - ' . $ubicacion_usuario, 0, 1, 'C');
    }

    // Línea divisoria
    $pdf->Ln(1);
    $y = $pdf->GetY();
    $pdf->SetLineStyle(array('width' => 0.2, 'dash' => 2));
    $pdf->Line($margen, $y, $anchoTicket - $margen, $y);
    $pdf->SetLineStyle(array('width' => 0.2, 'dash' => 0));
    $pdf->SetY($y + 2);

    // Datos Entrega
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(32, 4, 'GUÍA ENTREGADA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell($anchoUtil - 32, 4, $numero_guia, 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(22, 3.8, 'OFICINISTA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 22, 3.8, $nombre_usuario . ' ' . $apellido_usuario, 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(18, 3.8, 'CLIENTE:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 18, 3.8, $cliente, 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(18, 3.8, 'CÉDULA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 18, 3.8, $cedula_cliente, 0, 1, 'L');

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(32, 3.8, 'F. HORA ENTREGA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 32, 3.8, $fecha_hora_entrega, 0, 1, 'L');

    // Contenido
    $pdf->Ln(2);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($anchoUtil, 4, 'CONTENIDO', 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->SetFillColor(240, 240, 240);
    $pdf->Cell(12, 3.8, 'CANT', 1, 0, 'C', true);
    $pdf->Cell($anchoUtil - 12, 3.8, 'DESCRIPCIÓN', 1, 1, 'L', true);

    $pdf->SetFont('helvetica', '', 7);
    foreach ($items as $it) {
        $pdf->Cell(12, 3.8, $it['cantidad_detalle_guia'], 1, 0, 'C');
        $pdf->Cell($anchoUtil - 12, 3.8, ' ' . substr($it['contenido_guia'], 0, 38), 1, 1, 'L');
    }

    // Firmas
    $pdf->Ln(5);
    $wSig = ($anchoUtil - 4) / 2;

    $pdf->SetFont('helvetica', '', 7);
    $pdf->Cell($wSig, 3.5, '__________________', 0, 0, 'C');
    $pdf->Cell(4, 3.5, '', 0, 0);
    $pdf->Cell($wSig, 3.5, '__________________', 0, 1, 'C');

    $pdf->Cell($wSig, 3.5, 'CLIENTE', 0, 0, 'C');
    $pdf->Cell(4, 3.5, '', 0, 0);
    $pdf->Cell($wSig, 3.5, 'RESPONSABLE', 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($wSig, 3.2, substr($cliente, 0, 22), 0, 0, 'C');
    $pdf->Cell(4, 3.2, '', 0, 0);
    $pdf->Cell($wSig, 3.2, substr($usuario_entrego, 0, 22), 0, 1, 'C');

    // Pie de página
    $pdf->Ln(3);
    $pdf->SetFont('helvetica', 'I', 6.5);
    $pdf->Cell($anchoUtil * 0.6, 3.2, 'Impreso por: ' . $nombre_usuario . ' ' . $apellido_usuario, 0, 0, 'L');
    $pdf->Cell($anchoUtil * 0.4, 3.2, $fecha_actual, 0, 1, 'R');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'guia_entregada_' . $id_guia . '.pdf';
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
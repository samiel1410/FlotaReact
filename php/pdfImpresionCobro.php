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
    $fecha_actual = date('Y-m-d H:i:s');
    $id_comprobante_cobro = (int)($_GET['id_comprobante'] ?? 0);

    if ($id_comprobante_cobro <= 0) {
        throw new Exception("ID de comprobante no válido o no proporcionado");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
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

    // ─── CONSULTA COMPROBANTE ────────────────────────────────────────────────
    $query_verificar = "SELECT id_comprobante_cobro, archivo_comprobante_cobro, factura.numero_factura,
        numero_comprobante_cobro, guia.numero_guia, usuario.nombre_usuario, usuario.apellido_usuario,
        sucursal.punto_emision_sucursal, comprobante_cobro.fecha_emision_comprobante_cobro,
        comprobante_cobro.monto_comprobante_cobro, sucursal.nombre_sucursal,
        comprobante_cobro.observacion_comprobante_cobro, guia.punto_emision_guia,
        factura.punto_emision_factura, comprobante_cobro.concepto_detalle_comprobante_cobro,
        forma_pago.nombre_forma_pago 
    FROM comprobante_cobro 
    JOIN factura ON comprobante_cobro.id_fkfactura_comprobante_cobro = factura.id_factura 
    JOIN guia ON factura.id_fkguia_factura = guia.id_guia 
    JOIN usuario ON comprobante_cobro.id_fkusuario_comprobante_cobro = usuario.id_usuario 
    JOIN sucursal ON guia.sucursal_guia = sucursal.id_sucursal 
    JOIN forma_pago ON comprobante_cobro.id_fkforma_pago = forma_pago.id_forma_pago 
    WHERE id_comprobante_cobro = $id_comprobante_cobro LIMIT 1";

    $recuperar2 = mysqli_query($conn, $query_verificar) or die(mysqli_error($conn));
    $vals2 = mysqli_fetch_assoc($recuperar2);

    if (!$vals2) {
        throw new Exception("No se encontró el comprobante de cobro #$id_comprobante_cobro");
    }

    $numero_comprobante_cobro = $vals2["numero_comprobante_cobro"];
    $resultado_guia = sprintf("%09s", $vals2['numero_guia']);
    $resultado_factura = sprintf("%09s", $vals2['numero_factura'] ?? 0);
    $nombre_usuario = trim(($vals2["nombre_usuario"] ?? '') . ' ' . ($vals2["apellido_usuario"] ?? ''));
    $fecha_emision = $vals2["fecha_emision_comprobante_cobro"];
    $monto_comprobante = number_format((float)$vals2["monto_comprobante_cobro"], 2);
    $nombre_sucursal = $vals2["nombre_sucursal"] ?? '';
    $observacion = $vals2["observacion_comprobante_cobro"] ?? '';
    $forma_pago = $vals2["nombre_forma_pago"] ?? '';
    $concepto = $vals2["concepto_detalle_comprobante_cobro"] ?? '';

    $doc_factura = $vals2['punto_emision_sucursal'] . '-' . ($vals2['punto_emision_factura'] ?? '001') . '-' . $resultado_factura;
    $doc_guia = $vals2['punto_emision_sucursal'] . '-' . ($vals2['punto_emision_guia'] ?? '001') . '-' . $resultado_guia;
    $conn->close();

    // ─── CONFIGURACIÓN TCPDF NATIVA (80mm) ──────────────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion(null, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, 200), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA Y LOGO ──────────────────────────────────────────────────
    if ($rutaLogo && file_exists($rutaLogo)) {
        $logoW = 28;
        $xLogo = $margen + ($anchoUtil - $logoW) / 2;
        $pdf->Image($rutaLogo, $xLogo, $pdf->GetY(), $logoW, 0, '', '', '', true, 150);
        $pdf->Ln(12);
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
    $pdf->Cell($anchoUtil, 4, 'COMPROBANTE DE INGRESO', 0, 1, 'C');
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil, 3.8, 'No.- ' . $numero_comprobante_cobro, 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 6.8);
    $pdf->Cell($anchoUtil, 3.2, 'Fecha: ' . $fecha_emision . '  |  Usuario: ' . $nombre_usuario, 0, 1, 'R');
    $pdf->Ln(1.5);

    // ─── 2. DETALLES ─────────────────────────────────────────────────────────
    $wK = round($anchoUtil * 0.40, 1);
    $wV = $anchoUtil - $wK;
    $hR = 3.6;

    $items = [
        ['Monto Cobrado:', '$' . $monto_comprobante],
        ['Recibido de:', $nombre_usuario],
        ['Nro Factura:', $doc_factura],
        ['Nro Guía:', $doc_guia],
        ['Sucursal:', $nombre_sucursal],
        ['Forma de pago:', $forma_pago],
        ['Detalle:', $concepto ?: '-'],
        ['Observaciones:', $observacion ?: '-'],
    ];

    foreach ($items as $it) {
        $pdf->SetFont('helvetica', 'B', 7.2);
        $pdf->Cell($wK, $hR, $it[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.2);
        $pdf->Cell($wV, $hR, $it[1], 0, 1, 'L');
    }

    $pdf->Ln(2);
    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($anchoUtil, 3.2, 'Impresión: ' . $fecha_actual, 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'impresionCobro_' . $id_comprobante_cobro . '.pdf';
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
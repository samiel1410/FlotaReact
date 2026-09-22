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
    $fecha_actual = date('Y-m-d H:i:s');
    $id_guia = isset($_GET['id_guia']) ? (int)$_GET['id_guia'] : 0;
    $reimpreso_por = isset($_GET['reimpreso_por']) ? trim($_GET['reimpreso_por']) : null;

    if ($id_guia <= 0) {
        throw new Exception("ID de guía nota de venta inválido");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $reimpHash = $reimpreso_por ? md5($reimpreso_por) : '0';
    $pdfCacheFile = $pdfCacheDir . 'guia_nv_imp_' . $id_guia . '_r' . $reimpHash . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 1000) {
        $fileName = 'guiaNotaVentaImpresion_' . $id_guia . '.pdf';
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

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: CONFIG & EMPRESA ─────────────────────────────────────
    $cacheDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $cfgCacheFile = $cacheDir . 'empresa_cfg_' . $dbKey . '.json';
    $cachedCfg = null;

    if (file_exists($cfgCacheFile) && (time() - filemtime($cfgCacheFile) < 300)) {
        $cachedCfg = @json_decode(file_get_contents($cfgCacheFile), true);
    }

    if ($cachedCfg && !empty($cachedCfg['empresa'])) {
        $vals_empresa = $cachedCfg['empresa'];
        $vals_configuracion = $cachedCfg['configuracion'] ?? [];
    } else {
        $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];

        $sql_configuracion = "SELECT leyenda_nota_venta, mostrar_leyenda_nota_venta, imprimir_boucher_guia, formato_impresion FROM configuracion LIMIT 1";
        $rec_cfg = mysqli_query($conn, $sql_configuracion);
        $vals_configuracion = $rec_cfg ? mysqli_fetch_assoc($rec_cfg) : [];

        @file_put_contents($cfgCacheFile, json_encode([
            'empresa' => $vals_empresa,
            'configuracion' => $vals_configuracion
        ]));
    }

    $id_empresa = $vals_empresa["id_empresa"] ?? 0;
    $imagen_empresa = $vals_empresa["imagen_empresa"] ?? null;
    $telefono_empresa = $vals_empresa["telefono_empresa"] ?? '';
    $correo_empresa = $vals_empresa["correo_empresa"] ?? '';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa = $vals_empresa["direccion_empresa"] ?? '';
    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? '';

    $leyenda_nota_venta = $vals_configuracion["leyenda_nota_venta"] ?? '';
    $imprimir_boucher_guia = isset($vals_configuracion["imprimir_boucher_guia"]) ? (int)$vals_configuracion["imprimir_boucher_guia"] : 1;
    $formato_impresion_db = $vals_configuracion["formato_impresion"] ?? null;

    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 110, $formato_impresion_db);
    $metricas = obtenerMetricasImpresion($ancho_impresion, 110);
    $leyenda = $leyenda_nota_venta;
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $imagen_empresa);

    // ─── CONSULTA PRINCIPAL DE GUIA NOTA VENTA ───────────────────────────────
    $query_guia = "SELECT 
        g.origen_guia, 
        s.nombre_sucursal,
        g.destino_guia,
        g.numero_guia,
        g.numero_manual_guia,
        s.punto_emision_sucursal,
        g.observacion_guia,
        g.id_fkcompania_asociada,
        g.id_fkusuario_guia,
        UPPER(g.nombre_cliente_remitente) AS nombre_cliente_remitente,
        u.punto_emision_usuario,
        UPPER(g.nombre_cliente_receptor) AS nombre_cliente_receptor,
        g.cedula_cliente_remitente,
        g.cedula_cliente_receptor,
        g.telefono_cliente_emisor,
        g.telefono_cliente_receptor,
        g.subtotal_12_guia,
        g.subtotal_0_guia,
        g.subtotal_guia,
        g.total_guia,
        g.descuento_guia,
        g.valor_tarifa_adicional_guia,
        g.impuesto_iva_guia,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario,
        du.lugar_destino AS ubicacion_usuario
    FROM guia_nota_venta g
    LEFT JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
    LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
    LEFT JOIN destino du ON u.id_fkdestino_usuario = du.id_destino
    WHERE g.id_guia = $id_guia
    LIMIT 1";

    $recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
    $vals_guia = mysqli_fetch_assoc($recuperar_guia);

    if (!$vals_guia) {
        throw new Exception("Guía nota de venta no encontrada");
    }

    $origen_guia = $vals_guia["origen_guia"] ?? '';
    $observacion_guia = $vals_guia["observacion_guia"] ?? '';
    $destino_guia = $vals_guia["destino_guia"] ?? '';
    $nombre_cliente_remitente = $vals_guia["nombre_cliente_remitente"] ?? '';
    $nombre_cliente_receptor = $vals_guia["nombre_cliente_receptor"] ?? '';
    $cedula_cliente_remitente = $vals_guia["cedula_cliente_remitente"] ?? '';
    $cedula_cliente_receptor = $vals_guia["cedula_cliente_receptor"] ?? '';
    $telefono_cliente_emisor = $vals_guia["telefono_cliente_emisor"] ?? '';
    $telefono_cliente_receptor = $vals_guia["telefono_cliente_receptor"] ?? '';
    $subtotal_12_guia = (float)($vals_guia["subtotal_12_guia"] ?? 0);
    $subtotal_0_guia = (float)($vals_guia["subtotal_0_guia"] ?? 0);
    $subtotal_guia = (float)($vals_guia["subtotal_guia"] ?? 0);
    $total_guia = (float)($vals_guia["total_guia"] ?? 0);
    $descuento_guia = (float)($vals_guia["descuento_guia"] ?? 0);
    $valor_tarifa_adicional_guia = (float)($vals_guia["valor_tarifa_adicional_guia"] ?? 0);
    $impuesto_iva_guia = (float)($vals_guia["impuesto_iva_guia"] ?? 0);
    $punto_emision_sucursal_guia = $vals_guia["punto_emision_sucursal"] ?? '';
    $punto_emision_guia = $vals_guia["punto_emision_usuario"] ?? '';
    $id_fkcompania_asociada = (int)($vals_guia["id_fkcompania_asociada"] ?? 0);
    $usuario = $vals_guia["usuario"] ?? '';
    $numero_manual_guia = $vals_guia["numero_manual_guia"] ?? '';
    $ubicacion_usuario = !empty($vals_guia["ubicacion_usuario"]) ? $vals_guia["ubicacion_usuario"] : ($vals_guia["nombre_sucursal"] ?? '');

    // Compañía asociada
    $nombre_compania = '';
    $direccion_compania_asociada = '';
    $numero_contacto = '';
    if ($id_fkcompania_asociada > 0) {
        $destino_escaped = mysqli_real_escape_string($conn, $destino_guia);
        $query_datos_compania = "SELECT 
            ca.nombre_compania_asociada, 
            d.nombre_destino AS direccion_compania_asociada, 
            d.direccion_exacta, 
            d.numero_contacto 
        FROM compania_asociada ca
        LEFT JOIN destino d ON d.lugar_destino = '$destino_escaped'
        WHERE ca.id_compania_asociada = $id_fkcompania_asociada 
        LIMIT 1";
        $rec_comp = mysqli_query($conn, $query_datos_compania);
        if ($rec_comp && $row_comp = mysqli_fetch_assoc($rec_comp)) {
            $nombre_compania = $row_comp['nombre_compania_asociada'] ?? '';
            $direccion_compania_asociada = $row_comp['direccion_compania_asociada'] ?? '';
            $numero_contacto = $row_comp['numero_contacto'] ?? '';
        }
    }

    $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
    $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;

    // Detalles Guía Nota Venta
    $query_detalles = "SELECT 
        dg.contenido_guia, 
        dg.cantidad_detalle_guia, 
        te.nombre_envio 
    FROM detalle_guia_nota_venta dg
    LEFT JOIN tipo_envio te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio 
    WHERE dg.id_fkguia_detalle_envio = $id_guia";

    $rec_det = mysqli_query($conn, $query_detalles) or die(mysqli_error($conn));
    $items_detalle = [];
    $total_copias_extra = 0;
    $lista_contenido = [];

    while ($vals_detalle = mysqli_fetch_assoc($rec_det)) {
        $cant = max(1, (int)$vals_detalle["cantidad_detalle_guia"]);
        $lista_contenido[] = $cant . ' ' . ($vals_detalle["nombre_envio"] ?? '') . ' ' . ($vals_detalle["contenido_guia"] ?? '');
        for ($ci = 1; $ci <= $cant; $ci++) {
            $items_detalle[] = [
                'nombre_envio' => $vals_detalle['nombre_envio'] ?? '',
                'contenido'    => $vals_detalle['contenido_guia'] ?? '',
                'cantidad'     => $cant,
                'unidad'       => $ci,
            ];
            $total_copias_extra++;
        }
    }

    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO ──────────────────────────────────────────
    $lw = $metricas['ancho_util_mm'];
    $pdf = new TCPDF('P', 'mm', array($ancho_impresion, 800), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($metricas['margen_mm'], 4, $metricas['margen_mm'], true);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // ─── PÁGINA 1: TICKET NOTA DE VENTA ──────────────────────────────────────
    if ($rutaLogo) {
        $pdf->Image($rutaLogo, ($ancho_impresion / 2) - 12, 4, 24, 0, '', '', 'T', false, 300, 'C');
        $pdf->SetY(22);
    } else {
        $pdf->SetY(4);
    }

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
    $pdf->MultiCell($lw, 4.5, strtoupper($razon_social_empresa), 0, 'C', false, 1);

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    $pdf->Cell($lw, 4, 'NOTA DE VENTA ELECTRÓNICA', 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.05, 1));
    $pdf->Cell($lw, 4.5, 'N° ' . $numero_guia, 0, 1, 'C');
    if (!empty($numero_manual_guia)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 3.8, 'N° MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'OFICINA - ' . $ubicacion_usuario, 0, 1, 'C');

    $drawLine = function() use ($pdf, $metricas, $ancho_impresion) {
        $pdf->Ln(1);
        $y = $pdf->GetY();
        $pdf->SetLineStyle(array('width' => 0.2, 'cap' => 'butt', 'join' => 'miter', 'dash' => 2, 'color' => array(0, 0, 0)));
        $pdf->Line($metricas['margen_mm'], $y, $ancho_impresion - $metricas['margen_mm'], $y);
        $pdf->SetLineStyle(array('width' => 0.2, 'dash' => 0));
        $pdf->SetY($y + 1.5);
    };

    // CLIENTE
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'CLIENTE', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 3.5, 'RUC/CI: ' . $cedula_cliente_remitente . "\n" . 'Nombre: ' . $nombre_cliente_remitente, 0, 'L', false, 1);

    // ORIGEN
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'ORIGEN', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 3.5, 'UBICACIÓN: ' . $origen_guia . "\n" . 'CI: ' . $cedula_cliente_remitente . "\n" . 'ENVÍA: ' . $nombre_cliente_remitente . "\n" . 'TELÉFONO: ' . $telefono_cliente_emisor, 0, 'L', false, 1);

    // DESTINO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'DESTINO', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $txtDest = 'UBICACIÓN: ' . $destino_guia . "\n" . 'CI: ' . $cedula_cliente_receptor . "\n" . 'RECIBE: ' . $nombre_cliente_receptor . "\n" . 'TELÉFONO: ' . $telefono_cliente_receptor;
    foreach ($lista_contenido as $cnt) {
        $txtDest .= "\n" . 'CONTENIDO: ' . $cnt;
    }
    $pdf->MultiCell($lw, 3.5, $txtDest, 0, 'L', false, 1);

    // RETIRAR EN
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'RETIRAR EN:', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 3.5, 'DIRECCIÓN: ' . $direccion_compania_asociada . "\n" . 'EMPRESA: ' . $nombre_compania . "\n" . 'CONTACTO: ' . $numero_contacto, 0, 'L', false, 1);

    // OBSERVACIÓN
    if (!empty($observacion_guia) && trim($observacion_guia) !== '' && strtolower(trim($observacion_guia)) !== 'null') {
        $drawLine();
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 3.8, 'OBSERVACIÓN', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 3.5, $observacion_guia, 0, 'L', false, 1);
    }

    // DETALLE DEL PAGO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 3.8, 'DETALLE DEL PAGO', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 3.5, 'OFICINISTA: ' . $usuario . "\n" . 'GUÍA N° ' . $numero_guia, 0, 'L', false, 1);

    // TOTALES
    $pdf->Ln(1);
    $wTotL = $lw * 0.65;
    $wTotV = $lw * 0.35;

    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 3.5, 'SUBTOTAL:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($subtotal_12_guia, 2), 0, 1, 'R');

    $pdf->Cell($wTotL, 3.5, 'SUBTOTAL 0%:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($subtotal_0_guia, 2), 0, 1, 'R');

    $pdf->Cell($wTotL, 3.5, 'SUBTOTAL:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($subtotal_guia, 2), 0, 1, 'R');

    $pdf->Cell($wTotL, 3.5, 'DESCUENTO:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($descuento_guia, 2), 0, 1, 'R');

    $pdf->Cell($wTotL, 3.5, 'TARIFA ESPECIAL:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($valor_tarifa_adicional_guia, 2), 0, 1, 'R');

    $pdf->Cell($wTotL, 3.5, 'IVA:', 0, 0, 'L');
    $pdf->Cell($wTotV, 3.5, '$' . number_format($impuesto_iva_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($wTotL, 4.2, 'TOTAL', 0, 0, 'L');
    $pdf->Cell($wTotV, 4.2, '$' . number_format($total_guia, 2), 0, 1, 'R');

    // FIRMA CLIENTE
    $pdf->Ln(4);
    $pdf->Cell($lw, 3.8, '_____________________', 0, 1, 'C');
    $pdf->MultiCell($lw, 3.5, $nombre_cliente_remitente, 0, 'C', false, 1);

    // LEYENDA Y REIMPRESIÓN
    if (!empty($leyenda)) {
        $drawLine();
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 3.5, $leyenda, 0, 'C', false, 1);
    }
    if ($reimpreso_por) {
        $pdf->SetFont('helvetica', 'I', $metricas['font_tcpdf_sub']);
        $pdf->Cell($lw, 4, 'Reimpreso por: ' . $reimpreso_por, 0, 1, 'C');
    }

    // ─── PÁGINAS EXTRA: SLIPS / TICKETS POR BULTO ────────────────────────────
    if ($imprimir_boucher_guia === 1 && !empty($items_detalle)) {
        $pagina_actual = 1;
        $total_paginas = $total_copias_extra;
        $fecha_slip = date('d/m/Y H:i');

        foreach ($items_detalle as $item) {
            $pdf->AddPage('P', array($ancho_impresion, 200));
            $pdf->SetMargins($metricas['margen_mm'], 5, $metricas['margen_mm'], true);
            $pdf->SetAutoPageBreak(false, 0);

            if ($rutaLogo) {
                $pdf->Image($rutaLogo, ($ancho_impresion / 2) - 9, 4, 18, 0, '', '', 'T', false, 300, 'C');
                $pdf->SetY(23);
            } else {
                $pdf->SetY(5);
            }

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->Cell($lw, 6, strtoupper($razon_social_empresa), 0, 1, 'C');

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 4, $numero_guia, 0, 1, 'C');
            if (!empty($numero_manual_guia)) {
                $pdf->Cell($lw, 4, 'MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
            }

            $pdf->Ln(2);
            $y0 = $pdf->GetY();
            $pdf->SetDrawColor(0, 0, 0);
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y0, $ancho_impresion - $metricas['margen_mm'], $y0);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y0 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y0 + 1.5);
            $pdf->SetY($y0 + 4);

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 5, $fecha_slip, 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Remitente', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->MultiCell($lw, 6, $nombre_cliente_remitente, 0, 'C', false, 1);
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Destinatario', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->MultiCell($lw, 6, $nombre_cliente_receptor, 0, 'C', false, 1);
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Destino', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.15, 1));
            $pdf->Cell($lw, 7, strtoupper($destino_guia), 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 5, 'Fono: ' . $telefono_cliente_receptor, 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $desc = strtoupper($item['nombre_envio']) . ': ' . strtoupper($item['contenido']);
            $pdf->MultiCell($lw, 6, $desc, 0, 'C', false, 1);
            $pdf->Ln(2);

            $y1 = $pdf->GetY();
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y1, $ancho_impresion - $metricas['margen_mm'], $y1);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y1 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y1 + 1.5);
            $pdf->SetY($y1 + 5);

            if (!empty($nombre_compania)) {
                $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
                $pdf->Cell($lw, 5, strtoupper($nombre_compania), 0, 1, 'C');
            }
            if (!empty($origen_guia)) {
                $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
                $pdf->Cell($lw, 4, strtoupper($origen_guia), 0, 1, 'C');
            }
            $pdf->Ln(3);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 5, $pagina_actual . ' / ' . $total_paginas, 0, 1, 'C');

            $pagina_actual++;
        }
    }

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'guiaNotaVentaImpresion_' . $id_guia . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }

    $pdfContent = $pdf->Output($fileName, 'S');

    if (!empty($pdfContent) && strlen($pdfContent) > 1000) {
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
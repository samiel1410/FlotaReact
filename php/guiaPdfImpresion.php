<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

//(<20ms): sirve el PDF recién generado sin tocar DB ni cargar TCPDF.
// TTL corto (60s): ventana pequeña de posible stale si la guía se cobra justo después de imprimir.
define('GUIAIMP_FAST_TTL', 60);
// Cambiar la versión invalida los PDFs cacheados cuando cambia el diseño del ticket.
define('GUIAIMP_LAYOUT_VERSION', 'cliente-dir-grande-v2');

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_guia = isset($_GET['id_guia']) ? (int)$_GET['id_guia'] : 0;
    $reimpreso_por = isset($_GET['reimpreso_por']) ? trim($_GET['reimpreso_por']) : null;
    $tenantId = isset($_GET['tenantId']) ? (int)$_GET['tenantId'] : 1;

    if ($id_guia <= 0) {
        throw new Exception("ID de guía inválido");
    }

    $tenantIdStrFast = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? $tenantId ?? '1';
    $dbNameStrFast = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStrFast);
    $dbKeyFast = md5($dbNameStrFast . '_t' . $tenantIdStrFast);
    $pdfCacheDirFast = __DIR__ . '/tmp/pdfs/';
    $fastPdfFile = $pdfCacheDirFast . 'guia_imp_' . $id_guia . '_' . $dbKeyFast . '_latest.pdf';
    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < GUIAIMP_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="guiaImpresion_' . $id_guia . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT-FAST');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($fastPdfFile);
        exit;
    }

    require_once('library/tcpdf.php');

    $conn = conexion();
    // Sin SET SESSION sql_mode: este script es solo-lectura (SELECTs) y sus
    // GROUP BY ya listan todas las columnas no agregadas. Ahorra 1 roundtrip (~100ms).
    $tConn = microtime(true);

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ─────────────────────
    // Aislamiento multi-tenant: db_name + tenantId (igual que boletoFactura.php)
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? $tenantId ?? '1';
    $dbNameStr = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStr);
    $dbKey = md5($dbNameStr . '_t' . $tenantIdStr);
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';

    $vals_empresa = [];
    $vals_configuracion = [];
    $empresaCfgCached = null;

    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa       = $empresaCfgCached;
        $vals_configuracion = $empresaCfgCached;
    } else {
        // 1 solo roundtrip: empresa + configuracion (sin BLOB) vía LEFT JOIN ON 1=1
        // (CROSS JOIN devolvería 0 filas si configuracion está vacía)
        $rec_emp = mysqli_query($conn, "SELECT e.id_empresa, e.telefono_empresa, e.correo_empresa, e.ruc_empresa, e.direccion_empresa, e.razon_social_empresa, c.leyendamensaje_configuracion, c.mensajeleyenda_configuracion, c.imprimir_boucher_guia, c.formato_impresion FROM empresa e LEFT JOIN configuracion c ON 1=1 LIMIT 1");
        $row_emp = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        $vals_empresa = $row_emp ?: [];
        $vals_configuracion = $row_emp ?: [];
        @file_put_contents($cacheCfgFile, json_encode($vals_empresa));
    }
    $tCfg = microtime(true);

    $id_empresa           = $vals_empresa["id_empresa"] ?? 0;
    $telefono_empresa     = $vals_empresa["telefono_empresa"] ?? '';
    $correo_empresa       = $vals_empresa["correo_empresa"] ?? '';
    $ruc_empresa          = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa    = $vals_empresa["direccion_empresa"] ?? '';
    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? '';

    $leyendamensaje_configuracion = $vals_configuracion["leyendamensaje_configuracion"] ?? '';
    $mensajeleyenda_configuracion = $vals_configuracion["mensajeleyenda_configuracion"] ?? '';
    $imprimir_boucher_guia        = isset($vals_configuracion["imprimir_boucher_guia"]) ? (int)$vals_configuracion["imprimir_boucher_guia"] : 1;
    $formato_impresion_db         = $vals_configuracion["formato_impresion"] ?? null;

    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 110, $formato_impresion_db);
    $metricas        = obtenerMetricasImpresion($ancho_impresion, 110);
    $leyenda         = $leyendamensaje_configuracion;

    // ─── CONSULTA PRINCIPAL DE GUIA ──────────────────────────────────────────
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
        COALESCE(NULLIF(g.direccion_cliente_receptor, ''), cr.direccion_cliente, '') AS direccion_cliente_receptor,
        g.telefono_cliente_emisor,
        g.telefono_cliente_receptor,
        g.subtotal_12_guia,
        g.subtotal_0_guia,
        g.subtotal_guia,
        g.total_guia,
        g.descuento_guia,
        g.valor_tarifa_adicional_guia,
        g.impuesto_iva_guia,
        g.estado_cobro_guia,
        g.cancelado_por_guia,
        g.estado_guia,
        g.motivo_anulacion_guia,
        g.fecha_anulacion_guia,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario,
        COALESCE(NULLIF(TRIM(s.ciudad_sucursal), ''), NULLIF(TRIM(s.nombre_sucursal), '')) AS ubicacion_usuario
    FROM guia g
    LEFT JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
    LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
    LEFT JOIN cliente cr ON cr.id_cliente = g.id_fkcliente_receptor
    WHERE g.id_guia = $id_guia
    LIMIT 1";

    $recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
    $vals_guia = mysqli_fetch_assoc($recuperar_guia);

    if (!$vals_guia) {
        throw new Exception("Guía no encontrada");
    }

    $origen_guia = limpiarTextoPdf($vals_guia["origen_guia"] ?? '');
    $observacion_guia = limpiarTextoPdf($vals_guia["observacion_guia"] ?? '');
    $destino_guia = limpiarTextoPdf($vals_guia["destino_guia"] ?? '');
    $nombre_cliente_remitente = limpiarTextoPdf($vals_guia["nombre_cliente_remitente"] ?? '');
    $nombre_cliente_receptor = limpiarTextoPdf($vals_guia["nombre_cliente_receptor"] ?? '');
    $cedula_cliente_remitente = limpiarTextoPdf($vals_guia["cedula_cliente_remitente"] ?? '');
    $cedula_cliente_receptor = limpiarTextoPdf($vals_guia["cedula_cliente_receptor"] ?? '');
    $direccion_cliente_receptor = limpiarTextoPdf($vals_guia["direccion_cliente_receptor"] ?? '');
    $telefono_cliente_emisor = limpiarTextoPdf($vals_guia["telefono_cliente_emisor"] ?? '');
    $telefono_cliente_receptor = limpiarTextoPdf($vals_guia["telefono_cliente_receptor"] ?? '');
    $subtotal_12_guia = (float)($vals_guia["subtotal_12_guia"] ?? 0);
    $subtotal_0_guia = (float)($vals_guia["subtotal_0_guia"] ?? 0);
    $subtotal_guia = (float)($vals_guia["subtotal_guia"] ?? 0);
    $total_guia = (float)($vals_guia["total_guia"] ?? 0);
    $descuento_guia = (float)($vals_guia["descuento_guia"] ?? 0);
    $valor_tarifa_adicional_guia = (float)($vals_guia["valor_tarifa_adicional_guia"] ?? 0);
    $impuesto_iva_guia = (float)($vals_guia["impuesto_iva_guia"] ?? 0);
    $punto_emision_sucursal_guia = limpiarTextoPdf($vals_guia["punto_emision_sucursal"] ?? '', '001');
    $punto_emision_guia = limpiarTextoPdf($vals_guia["punto_emision_usuario"] ?? '', '001');
    $id_fkcompania_asociada = (int)($vals_guia["id_fkcompania_asociada"] ?? 0);
    $usuario = limpiarTextoPdf($vals_guia["usuario"] ?? '');
    $numero_manual_guia = limpiarTextoPdf($vals_guia["numero_manual_guia"] ?? '');
    $ubicacion_usuario = limpiarTextoPdf(!empty($vals_guia["ubicacion_usuario"]) ? $vals_guia["ubicacion_usuario"] : ($vals_guia["nombre_sucursal"] ?? ''));

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
            $nombre_compania = limpiarTextoPdf($row_comp['nombre_compania_asociada'] ?? '');
            $direccion_compania_asociada = limpiarTextoPdf($row_comp['direccion_compania_asociada'] ?? '');
            $numero_contacto = limpiarTextoPdf($row_comp['numero_contacto'] ?? '');
        }
    }

    $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
    $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;

    // Detalles Guía
    $query_detalles = "SELECT 
        dg.contenido_guia, 
        dg.cantidad_detalle_guia, 
        te.nombre_envio 
    FROM detalle_guia dg
    LEFT JOIN tipo_envio te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio 
    WHERE dg.id_fkguia_detalle_envio = $id_guia";

    $rec_det = mysqli_query($conn, $query_detalles) or die(mysqli_error($conn));
    $items_detalle = [];
    $total_copias_extra = 0;
    $lista_contenido = [];

    while ($vals_detalle = mysqli_fetch_assoc($rec_det)) {
        $cant = max(1, (int)$vals_detalle["cantidad_detalle_guia"]);
        $nomEnv = limpiarTextoPdf($vals_detalle["nombre_envio"] ?? '');
        $contGuia = limpiarTextoPdf($vals_detalle["contenido_guia"] ?? '');
        $lista_contenido[] = $cant . ' ' . $nomEnv . ' ' . $contGuia;
        for ($ci = 1; $ci <= $cant; $ci++) {
            $items_detalle[] = [
                'nombre_envio' => $nomEnv,
                'contenido'    => $contGuia,
                'cantidad'     => $cant,
                'unidad'       => $ci,
            ];
            $total_copias_extra++;
        }
    }

    // Datos Factura
    $sql_datos_factura = "SELECT
        f.id_factura,
        f.punto_emision_factura,
        s.punto_emision_sucursal,
        f.numero_factura,
        f.fecha_creacion_factura,
        f.clave_acceso_factura,
        f.total_factura,
        f.fecha_factura
    FROM factura f
    LEFT JOIN sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
    WHERE f.id_fkguia_factura = $id_guia
    ORDER BY f.id_factura DESC
    LIMIT 1";

    $rec_fac = mysqli_query($conn, $sql_datos_factura) or die(mysqli_error($conn));
    $vals_datos_factura = mysqli_fetch_assoc($rec_fac);

    $detalles_forma_pago = "";
    $suma_cobrada = 0;
    $id_factura = ($vals_datos_factura && isset($vals_datos_factura["id_factura"])) ? (int)$vals_datos_factura["id_factura"] : 0;

    if ($id_factura > 0) {
        $total_factura = (float)$vals_datos_factura["total_factura"];
        $clave_acceso = limpiarTextoPdf($vals_datos_factura["clave_acceso_factura"] ?? '');
        $punto_emision_factura = limpiarTextoPdf($vals_datos_factura["punto_emision_factura"] ?? '', '001');
        $punto_emision_sucursal = limpiarTextoPdf($vals_datos_factura["punto_emision_sucursal"] ?? '', '001');
        $fecha_factura = limpiarTextoPdf($vals_datos_factura["fecha_creacion_factura"] ?? '');
        $resultado_factura = sprintf("%09s", $vals_datos_factura['numero_factura'] ?? 0);
        $numero_factura = $punto_emision_sucursal . '-' . $punto_emision_factura . '-' . $resultado_factura;

        $sql_pagos = "SELECT
            COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
            fp.id_forma_pago,
            fp.nombre_forma_pago,
            fp.tipo_forma_pago
        FROM comprobante_cobro cc
        LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
        WHERE cc.id_fkfactura_comprobante_cobro = $id_factura AND cc.estado_comprobante_cobro != 'ANULADA'
        GROUP BY fp.id_forma_pago, fp.nombre_forma_pago, fp.tipo_forma_pago";

        $rec_pagos = mysqli_query($conn, $sql_pagos);
        if ($rec_pagos) {
            while ($vPago = mysqli_fetch_assoc($rec_pagos)) {
                $monto_pago = (float)$vPago["total"];
                $detalles_forma_pago .= ($vPago["nombre_forma_pago"] ?? '') . ': $' . number_format($monto_pago, 2) . ' ';
                if ((int)$vPago["tipo_forma_pago"] != 4) {
                    $suma_cobrada += $monto_pago;
                }
            }
        }
    } else {
        $total_factura = $total_guia;
        $numero_factura = "PENDIENTE";
        $fecha_factura = "S/N";
        $clave_acceso = "";
    }

    $total_cobrado = max(0.0, $total_factura - $suma_cobrada);
    $estado_cobro_raw = strtoupper(trim((string)($vals_guia['estado_cobro_guia'] ?? '')));
    $cancelado_por_raw = strtoupper(trim((string)($vals_guia['cancelado_por_guia'] ?? '')));
    $esDestinatario = ($cancelado_por_raw === '1' || $cancelado_por_raw === 'DESTINATARIO' || $cancelado_por_raw === 'DESTINO' || $estado_cobro_raw === 'AL COBRO');

    if ($esDestinatario) {
        $estado_factura = "POR COBRAR";
        $total_cobrado = max(0.0, $total_factura - $suma_cobrada);
    } else if ($id_factura > 0) {
        $estado_factura = ($total_cobrado <= 0.001 && $total_factura > 0) ? "COBRADA" : "POR COBRAR";
    } else if ($suma_cobrada >= ($total_guia - 0.001) && $total_guia > 0) {
        $estado_factura = "COBRADA";
        $total_cobrado = 0.00;
    } else if ($suma_cobrada > 0.001) {
        $estado_factura = "POR COBRAR";
        $total_cobrado = max(0.0, $total_guia - $suma_cobrada);
    } else if ($estado_cobro_raw === 'NO COBRADA' || $estado_cobro_raw === 'POR COBRAR' || $estado_cobro_raw === 'PENDIENTE') {
        $estado_factura = "POR COBRAR";
        $total_cobrado = $total_guia;
    } else if ($suma_cobrada <= 0.001 && $total_guia > 0) {
        $estado_factura = "POR COBRAR";
        $total_cobrado = $total_guia;
    } else {
        $estado_factura = (($vals_guia['estado_cobro_guia'] ?? '') == 'COBRADA') ? "COBRADA" : "POR COBRAR";
    }

    if (empty(trim($detalles_forma_pago))) {
        if ($estado_factura === 'COBRADA') {
            $detalles_forma_pago = "EFECTIVO: $" . number_format($total_factura, 2);
        } else {
            $detalles_forma_pago = "PENDIENTE";
        }
    }
    // Logo de la empresa (se resuelve antes de cerrar la conexión y del hash).
    $rutaLogo = logoEmpresaParaPdf($conn, $dbKey);
    $conn->close();
    $tData = microtime(true);

    // ─── CACHÉ NIVEL 2: PDF por hash de datos (rápido si nada cambió) ───────────
    $datosHash = md5(json_encode([
        $id_guia, $numero_guia, $total_guia, $estado_factura,
        $numero_factura, $detalles_forma_pago, $total_cobrado,
        count($items_detalle), (string)$reimpreso_por, $imprimir_boucher_guia,
        $ubicacion_usuario, $rutaLogo, (int)($vals_guia['estado_guia'] ?? 0),
        GUIAIMP_LAYOUT_VERSION
    ]));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'guia_imp_' . $id_guia . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        // Refrescar copia rápida para que reimpresiones seguidas no toquen la DB
        @copy($cachePdfFile, $pdfCacheDir . 'guia_imp_' . $id_guia . '_' . $dbKey . '_latest.pdf');
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="guiaImpresion_' . $id_guia . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        header('X-PDF-T-conn: ' . round(($tConn - $t0) * 1000) . 'ms');
        header('X-PDF-T-cfg: ' . round(($tCfg - $tConn) * 1000) . 'ms');
        header('X-PDF-T-data: ' . round(($tData - $tCfg) * 1000) . 'ms');
        header('X-PDF-T-tcpdf: 0ms');
        readfile($cachePdfFile);
        exit;
    }
    $tTcpdfStart = microtime(true);

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

    // ─── PÁGINA 1: TICKET GUÍA DE DESPACHO ────────────────────────────────────
    $pdf->SetY(4);

    // Logo de la empresa
    imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $ancho_impresion, $metricas['margen_mm'], 32.0, 20.0, 1.5);

    // 2. Encabezado Empresa y Guía
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
    $pdf->MultiCell($lw, 5.0, strtoupper($razon_social_empresa), 0, 'C', false, 1);

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    if (!empty($ruc_empresa)) {
        $pdf->Cell($lw, 4.2, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }
    $pdf->Cell($lw, 4.5, 'GUÍA DE DESPACHO ELECTRÓNICA', 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.05, 1));
    $pdf->Cell($lw, 5.0, 'N° ' . $numero_guia, 0, 1, 'C');
    if (!empty($numero_manual_guia)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'N° MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
    }

    if (!empty($ubicacion_usuario)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'OFICINA - ' . $ubicacion_usuario, 0, 1, 'C');
    }

    // Función auxiliar para línea divisoria
    $drawLine = function() use ($pdf, $metricas, $ancho_impresion) {
        $pdf->Ln(1);
        $y = $pdf->GetY();
        $pdf->SetLineStyle(array('width' => 0.35, 'cap' => 'butt', 'join' => 'miter', 'dash' => 2, 'color' => array(0, 0, 0)));
        $pdf->Line($metricas['margen_mm'], $y, $ancho_impresion - $metricas['margen_mm'], $y);
        $pdf->SetLineStyle(array('width' => 0.35, 'dash' => 0));
        $pdf->SetY($y + 1.8);
    };

    // 3. CLIENTE (remitente)
    $drawLine();
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_base'] * 1.15, 1));
    $pdf->Cell($lw, 4.6, 'CLIENTE', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.4, 'RUC/CI: ' . $cedula_cliente_remitente, 0, 1, 'L');
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.10, 1));
    $pdf->MultiCell($lw, 5.2, 'Nombre: ' . $nombre_cliente_remitente, 0, 'L', false, 1);

    // 4. ORIGEN
    $drawLine();
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_base'] * 1.15, 1));
    $pdf->Cell($lw, 4.6, 'ORIGEN', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
    $pdf->MultiCell($lw, 4.4, 'UBICACIÓN: ' . $origen_guia . "\n" . 'CI: ' . $cedula_cliente_remitente . "\n" . 'TELÉFONO: ' . $telefono_cliente_emisor, 0, 'L', false, 1);
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.05, 1));
    $pdf->MultiCell($lw, 5.0, 'ENVÍA: ' . $nombre_cliente_remitente, 0, 'L', false, 1);

    // 5. DESTINO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_base'] * 1.15, 1));
    $pdf->Cell($lw, 4.6, 'DESTINO', 0, 1, 'C');

    // Nombre del destino en letras grandes (se reduce si no cabe en el ancho del ticket)
    if ($destino_guia !== '') {
        $fontDestino = max(round($metricas['font_tcpdf_bold'] * 1.9, 1), 12.0);
        $textoDestino = strtoupper($destino_guia);
        $pdf->SetFont('helvetica', 'B', $fontDestino);
        while ($fontDestino > 6 && $pdf->GetStringWidth($textoDestino) > $lw) {
            $fontDestino = round($fontDestino - 0.5, 1);
            $pdf->SetFont('helvetica', 'B', $fontDestino);
        }
        $pdf->MultiCell($lw, round($fontDestino * 0.42, 1), $textoDestino, 0, 'C', false, 1);
    }

    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.4, 'CI: ' . $cedula_cliente_receptor, 0, 1, 'L');
    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.15, 1));
    $pdf->MultiCell($lw, 5.4, 'RECIBE: ' . $nombre_cliente_receptor, 0, 'L', false, 1);
    if ($direccion_cliente_receptor !== '') {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.4, 'DIRECCIÓN:', 0, 1, 'L');
        $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.10, 1));
        $pdf->MultiCell($lw, 5.2, strtoupper($direccion_cliente_receptor), 0, 'L', false, 1);
    }
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
    $txtDest = 'TELÉFONO: ' . $telefono_cliente_receptor;
    foreach ($lista_contenido as $cnt) {
        $txtDest .= "\n" . 'CONTENIDO: ' . $cnt;
    }
    $pdf->MultiCell($lw, 4.4, $txtDest, 0, 'L', false, 1);

    // 6. RETIRAR EN
    if (!empty($direccion_compania_asociada) || !empty($nombre_compania)) {
        $drawLine();
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'RETIRAR EN:', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, 'DIRECCIÓN: ' . $direccion_compania_asociada . "\n" . 'EMPRESA: ' . $nombre_compania . "\n" . 'CONTACTO: ' . $numero_contacto, 0, 'L', false, 1);
    }

    // 7. OBSERVACIÓN (si existe)
    if (!empty($observacion_guia)) {
        $drawLine();
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'OBSERVACIÓN', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, $observacion_guia, 0, 'L', false, 1);
    }

    // 8. DETALLE DEL PAGO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.2, 'DETALLE DEL PAGO', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, 'OFICINISTA: ' . $usuario . "\n" . 'FACTURA ELEC. N° ' . $numero_factura . "\n" . 'GUÍA N° ' . $numero_guia, 0, 'L', false, 1);

    // 9. TABLA DE TOTALES
    $pdf->Ln(1);
    $wTotL = $lw * 0.30;
    $wTotV = $lw * 0.50;

    $fontTotal = round($metricas['font_tcpdf_bold'] * 1.45, 1);
    $pdf->SetFont('helvetica', 'B', $fontTotal);
    $pdf->Cell($wTotL, 6.8, 'TOTAL:', 0, 0, 'L');
    $pdf->Cell($wTotV, 6.8, '$ ' . number_format($total_guia, 2), 0, 1, 'R');

    // 10. ESTADO Y METADATA EMISIÓN
    $pdf->Ln(1.5);
    $fontEstado = round($metricas['font_tcpdf_bold'] * 1.30, 1);
    $pdf->SetFont('helvetica', 'B', $fontEstado);
    $pdf->Cell($lw, 6.2, 'ESTADO: ' . $estado_factura, 0, 1, 'L');

    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $txtMeta = 'FORMAS DE PAGO: ' . $detalles_forma_pago . "\n" .
               'POR COBRAR: $' . number_format((float)$total_cobrado, 2) . "\n" .
               'FECHA / HORA EMISIÓN: ' . $fecha_factura . "\n" .
               'USUARIO: ' . $cedula_cliente_remitente . "\n" .
               'CONTRASEÑA: ' . $cedula_cliente_remitente . "\n" .
               'IMPRESIÓN: ' . $fecha_actual;
    $pdf->MultiCell($lw, 4.0, $txtMeta, 0, 'L', false, 1);

    // 11. FIRMA CLIENTE
    $pdf->Ln(4);
    $pdf->Cell($lw, 4.0, '_____________________', 0, 1, 'C');
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, $nombre_cliente_remitente, 0, 'C', false, 1);

    // 12. CÓDIGO DE BARRAS NATIVO
    if (!empty($clave_acceso)) {
        $pdf->Ln(2);
        $styleBc = [
            'position' => '',
            'align' => 'C',
            'stretch' => false,
            'fitwidth' => true,
            'cellfitalign' => '',
            'border' => false,
            'hpadding' => 'auto',
            'vpadding' => 'auto',
            'fgcolor' => [0, 0, 0],
            'bgcolor' => false,
            'text' => true,
            'font' => 'helvetica',
            'fontsize' => $metricas['font_tcpdf_sub'],
            'stretchtext' => 4
        ];
        $pdf->write1DBarcode($clave_acceso, 'C128', $metricas['margen_mm'], $pdf->GetY(), $lw, $metricas['alto_barcode_mm'], 0.4, $styleBc, 'N');
        $pdf->Ln();
    }

    // 13. LEYENDA Y REIMPRESIÓN
    if (!empty($leyenda)) {
        $drawLine();
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, $leyenda, 0, 'C', false, 1);
    }
    if ($reimpreso_por) {
        $pdf->SetFont('helvetica', 'BI', $metricas['font_tcpdf_sub']);
        $pdf->Cell($lw, 4.5, 'Reimpreso por: ' . $reimpreso_por, 0, 1, 'C');
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

            $pdf->SetY(4);

            // EMPRESA
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->Cell($lw, 5, strtoupper($razon_social_empresa), 0, 1, 'C');

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 4.5, $numero_guia, 0, 1, 'C');
            if (!empty($numero_manual_guia)) {
                $pdf->Cell($lw, 4.2, 'MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
            }

            // LÍNEA DOBLE
            $pdf->Ln(2);
            $y0 = $pdf->GetY();
            $pdf->SetDrawColor(0, 0, 0);
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y0, $ancho_impresion - $metricas['margen_mm'], $y0);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y0 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y0 + 1.5);
            $pdf->SetY($y0 + 4);

            // FECHA
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 5, $fecha_slip, 0, 1, 'C');
            $pdf->Ln(1);

            // REMITENTE
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_base'] * 1.10, 1));
            $pdf->Cell($lw, 4.4, 'Remitente', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.25, 1));
            $pdf->MultiCell($lw, 5.6, $nombre_cliente_remitente, 0, 'C', false, 1);
            $pdf->Ln(1);

            // DESTINATARIO
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_base'] * 1.10, 1));
            $pdf->Cell($lw, 4.4, 'Destinatario', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.25, 1));
            $pdf->MultiCell($lw, 5.6, $nombre_cliente_receptor, 0, 'C', false, 1);
            $pdf->Ln(1);

            // DESTINO
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Destino', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.35, 1));
            $pdf->Cell($lw, 6.5, strtoupper($destino_guia), 0, 1, 'C');
            if ($direccion_cliente_receptor !== '') {
                $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.10, 1));
                $pdf->MultiCell($lw, 5.2, strtoupper($direccion_cliente_receptor), 0, 'C', false, 1);
            }
            $pdf->Ln(1);

            // TELÉFONO
            if (!empty($telefono_cliente_receptor)) {
                $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
                $pdf->Cell($lw, 5, 'Fono: ' . $telefono_cliente_receptor, 0, 1, 'C');
                $pdf->Ln(1);
            }

            // CONTENIDO
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $desc = trim(strtoupper($item['nombre_envio']) . ' ' . strtoupper($item['contenido']));
            $pdf->MultiCell($lw, 5, $desc, 0, 'C', false, 1);
            $pdf->Ln(2);

            // LÍNEA DOBLE
            $y1 = $pdf->GetY();
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y1, $ancho_impresion - $metricas['margen_mm'], $y1);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y1 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y1 + 1.5);
            $pdf->SetY($y1 + 5);

            // EMPRESA DESTINO
            if (!empty($nombre_compania)) {
                $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
                $pdf->Cell($lw, 5, strtoupper($nombre_compania), 0, 1, 'C');
            }
            if (!empty($origen_guia)) {
                $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
                $pdf->Cell($lw, 4, strtoupper($origen_guia), 0, 1, 'C');
            }
            $pdf->Ln(3);

            // NÚMERO DE PÁGINA
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 5, $pagina_actual . ' / ' . $total_paginas, 0, 1, 'C');

            $pagina_actual++;
        }
    }

    // ─── GUÍA ANULADA: MARCA DE AGUA EN TODAS LAS PÁGINAS ────────────────────
    if ((int)($vals_guia['estado_guia'] ?? 0) === 2) {
        marcarPdfAnulado($pdf, 'ANULADA', 'DOCUMENTO SIN VALIDEZ');
    }

    // ─── SALIDA CON CACHÉ NIVEL 2 ─────────────────────────────────────────────
    $fileName  = 'guiaImpresion_' . $id_guia . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Eliminar PDFs anteriores de esta guía (los datos cambiaron)
    foreach (glob($pdfCacheDir . 'guia_imp_' . $id_guia . '_*.pdf') as $oldPdf) {
        @unlink($oldPdf);
    }
    @file_put_contents($cachePdfFile, $pdfContent);
    // Copia rápida TTL 60s: la reimpresión inmediata no toca DB ni TCPDF
    @copy($cachePdfFile, $pdfCacheDir . 'guia_imp_' . $id_guia . '_' . $dbKey . '_latest.pdf');
    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Cache-Control: public, max-age=60');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-T-conn: ' . round(($tConn - $t0) * 1000) . 'ms');
    header('X-PDF-T-cfg: ' . round(($tCfg - $tConn) * 1000) . 'ms');
    header('X-PDF-T-data: ' . round(($tData - $tCfg) * 1000) . 'ms');
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
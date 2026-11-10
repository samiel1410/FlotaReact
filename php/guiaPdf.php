<?php
/**
 * Guía de remisión en formato A4 (RIDE) para el botón "Visualizar PDF".
 *
 * La impresión térmica se mantiene en guiaPdfImpresion.php.
 */
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

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
require_once("ride_layout.php");
require_once("guiaA4_render.php");
date_default_timezone_set('America/Guayaquil');

// Cambiar la versión invalida los PDFs cacheados cuando cambia el diseño.
define('GUIA_A4_LAYOUT_VERSION', 'ride-a4-v1');

try {
    $t0 = microtime(true);

    $id_guia = isset($_GET['id_guia']) ? (int)$_GET['id_guia'] : 0;
    $reimpresoPor = isset($_GET['reimpreso_por']) ? trim($_GET['reimpreso_por']) : '';

    if ($id_guia <= 0) {
        throw new Exception('ID de guía inválido');
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? '1';
    $dbNameStr = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey = md5($dbNameStr . '_t' . $tenantIdStr);

    require_once('library/tcpdf.php');
    $conn = conexion();

    $query = "SELECT
        g.id_guia, g.numero_guia, g.numero_manual_guia, g.origen_guia, g.destino_guia,
        g.fecha_guia, g.fecha_creacion_guia, g.observacion_guia,
        g.subtotal_12_guia, g.subtotal_0_guia, g.subtotal_guia, g.total_guia,
        g.descuento_guia, g.valor_tarifa_adicional_guia, g.impuesto_iva_guia,
        g.nombre_cliente_remitente, g.nombre_cliente_receptor,
        g.cedula_cliente_remitente, g.cedula_cliente_receptor,
        g.direccion_cliente_emisor, g.direccion_cliente_receptor,
        g.telefono_cliente_emisor, g.telefono_cliente_receptor,
        g.correo_cliente_emisor, g.correo_cliente_receptor,
        g.punto_emision_guia, g.sucursal_guia,
        g.estado_guia, g.motivo_anulacion_guia, g.fecha_anulacion_guia,
        f.clave_acceso_factura, f.id_factura,
        COALESCE(s2.nombre_sucursal, s.nombre_sucursal, '') AS nombre_sucursal,
        COALESCE(s2.direccion_sucursal, s.ubicacion_sucursal, '') AS ubicacion_sucursal,
        COALESCE(s2.punto_emision_sucursal, s.punto_emision_sucursal, '001') AS punto_emision_sucursal
    FROM guia g
    LEFT JOIN factura f ON f.id_fkguia_factura = g.id_guia AND f.estado_factura = 1
    LEFT JOIN sucursal2 s2 ON g.sucursal_guia = s2.suc_codigo_sucursal
    LEFT JOIN sucursal s ON g.sucursal_guia = s.id_sucursal
    WHERE g.id_guia = {$id_guia}
    LIMIT 1";

    $resGuia = mysqli_query($conn, $query);
    if (!$resGuia) {
        throw new Exception('Error en consulta de guía: ' . mysqli_error($conn));
    }
    $guia = mysqli_fetch_assoc($resGuia);
    if (!$guia) {
        throw new Exception("No se encontró la guía con id = {$id_guia}");
    }

    // ─── DETALLES ─────────────────────────────────────────────────────────────
    $queryDetalles = "SELECT id_detalle_guia, total_tarifa_detalle_guia, cantidad_detalle_guia,
        costo_detalle_guia, tipo_descuento_detalle_guia, total_detalle_guia,
        subtotal_detalle_guia, contenido_guia
        FROM detalle_guia
        WHERE id_fkguia_detalle_envio = {$id_guia}
        ORDER BY id_detalle_guia ASC";

    $resDetalles = mysqli_query($conn, $queryDetalles);
    if (!$resDetalles) {
        throw new Exception('Error en consulta de detalles: ' . mysqli_error($conn));
    }

    $items = [];
    while ($detalle = mysqli_fetch_assoc($resDetalles)) {
        $cantidad = (float)($detalle['cantidad_detalle_guia'] ?? 0);
        $costo = (float)($detalle['costo_detalle_guia'] ?? 0);
        $descuento = 0.0;

        if ((int)($detalle['tipo_descuento_detalle_guia'] ?? 0) === 1) {
            $descuento = ($costo * $cantidad) / 2;
        } elseif ((int)($detalle['tipo_descuento_detalle_guia'] ?? 0) === 2) {
            $descuento = $costo * $cantidad;
        }

        $items[] = [
            'contenido' => $detalle['contenido_guia'] ?? '',
            'cantidad' => $cantidad,
            'costo' => $costo,
            'descuento' => $descuento,
            'tarifa' => (float)($detalle['total_tarifa_detalle_guia'] ?? 0),
            'total' => (float)($detalle['total_detalle_guia'] ?? 0),
        ];
    }

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ────────────────────
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';

    $cfg = null;
    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $cfg = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    $clavesRequeridas = ['razon_social_empresa', 'ruc_empresa', 'leyendamensaje_configuracion', 'obligado_contabilidad', 'regimen_fiscal', 'ambiente_sri'];
    $cfgCompleta = is_array($cfg);
    if ($cfgCompleta) {
        foreach ($clavesRequeridas as $clave) {
            if (!array_key_exists($clave, $cfg)) {
                $cfgCompleta = false;
                break;
            }
        }
    }

    if (!$cfgCompleta) {
        $queryEmpresa = ride_select_empresa($conn);
        $resEmpresa = mysqli_query($conn, $queryEmpresa);
        $empresa = $resEmpresa ? mysqli_fetch_assoc($resEmpresa) : [];
        if (!$empresa) {
            $empresa = [
                'razon_social_empresa' => 'EMPRESA DE TRANSPORTE',
                'ruc_empresa' => '',
                'direccion_empresa' => '',
            ];
        }

        $queryConfig = "SELECT leyendamensaje_configuracion, mensajeleyenda_configuracion FROM configuracion LIMIT 1";
        $resConfig = @mysqli_query($conn, $queryConfig);
        $config = $resConfig ? mysqli_fetch_assoc($resConfig) : [];

        $cfg = array_merge([
            'obligado_contabilidad' => 'NO',
            'regimen_fiscal' => '',
            'contribuyente_especial' => '',
            'ambiente_sri' => '2',
            'leyenda_boleteria' => '',
            'mostrar_leyenda_boleteria' => 0,
            'leyendamensaje_configuracion' => '',
        ], $empresa, $config ?: []);
        @file_put_contents($cacheCfgFile, json_encode($cfg));
    }

    $cfg += [
        'obligado_contabilidad' => 'NO',
        'regimen_fiscal' => '',
        'contribuyente_especial' => '',
        'ambiente_sri' => '2',
        'leyendamensaje_configuracion' => '',
    ];

    // Se resuelve fuera del JSON cacheado para que un cambio de logo se refleje.
    $cfg['logo'] = logoEmpresaParaPdf($conn, $dbKey);

    $leyenda = trim((string)($cfg['leyendamensaje_configuracion'] ?? ''));

    // ─── FORMA DE PAGO ────────────────────────────────────────────────────────
    $formaPago = 'SIN UTILIZACION DEL SISTEMA FINANCIERO';
    $idFactura = (int)($guia['id_factura'] ?? 0);
    if ($idFactura > 0) {
        try {
            $resPago = @mysqli_query(
                $conn,
                "SELECT fp.nombre_forma_pago
                   FROM comprobante_cobro c
                   LEFT JOIN forma_pago fp ON (c.id_fkforma_pago = fp.id_forma_pago OR c.id_fkforma_pago = fp.codigo_forma_pago)
                  WHERE c.id_fkfactura_comprobante_cobro = {$idFactura}
                  ORDER BY c.id_comprobante_cobro DESC
                  LIMIT 1"
            );
            if ($resPago && ($filaPago = mysqli_fetch_assoc($resPago)) && !empty($filaPago['nombre_forma_pago'])) {
                $formaPago = mb_strtoupper($filaPago['nombre_forma_pago'], 'UTF-8');
            }
        } catch (Throwable $e) {
            // Se conserva el valor por defecto del SRI.
        }
    }

    // ─── CACHÉ NIVEL 2: PDF por hash de datos ─────────────────────────────────
    $datosHash = md5(GUIA_A4_LAYOUT_VERSION . json_encode([
        $id_guia,
        $guia,
        $items,
        $cfg,
        $leyenda,
        $formaPago,
        $reimpresoPor,
    ], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR));

    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'guia_a4_' . $id_guia . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="guia_a4_' . $id_guia . '.pdf"');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($cachePdfFile);
        exit;
    }

    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetCreator(PDF_CREATOR);
    $pdf->SetTitle('Guía de Remisión');
    $pdf->SetSubject('Guía de Remisión - Formato A4');
    $pdf->SetMargins(RIDE_MARGEN, RIDE_MARGEN, RIDE_MARGEN, true);
    $pdf->SetAutoPageBreak(false, 0);

    render_guia_a4($pdf, $guia, $items, $cfg, [
        'reimpreso_por' => $reimpresoPor,
        'forma_pago' => $formaPago,
        'leyenda' => $leyenda,
    ]);

    // Guía anulada: marca de agua sobre todas las páginas.
    if ((int)($guia['estado_guia'] ?? 0) === 2) {
        marcarPdfAnulado($pdf, 'ANULADA', 'DOCUMENTO SIN VALIDEZ');
    }

    $pdfContent = $pdf->Output('', 'S');

    foreach (glob($pdfCacheDir . 'guia_a4_' . $id_guia . '_*.pdf') as $pdfViejo) {
        @unlink($pdfViejo);
    }
    @file_put_contents($cachePdfFile, $pdfContent);

    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="guia_a4_' . $id_guia . '.pdf"');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    error_log('[guiaPdf] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $e->getMessage(),
        'success' => false,
    ]);
    exit();
}

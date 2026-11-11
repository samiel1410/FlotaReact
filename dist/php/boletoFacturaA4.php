<?php
/**
 * Boleto de viaje en formato A4 (RIDE) para el botón "Visualizar PDF".
 *
 * El ticket térmico (boletoFactura.php) se mantiene para la impresora de
 * boletería; este documento es la vista imprimible en hoja A4.
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

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

ob_start();
require_once("db.php");
require_once("pdf_utils.php");
require_once("boleto_datos.php");
require_once("ride_layout.php");
require_once("boletoA4_render.php");
date_default_timezone_set('America/Guayaquil');

// Cambiar la versión invalida los PDFs cacheados cuando cambia el diseño.
define('BOLETO_A4_LAYOUT_VERSION', 'ride-a4-v1');

try {
    $t0 = microtime(true);

    $id_boleto = isset($_GET['id_boleto']) ? (int)$_GET['id_boleto'] : 0;
    if ($id_boleto <= 0) {
        throw new Exception('Parámetro id_boleto inválido o faltante');
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey = md5($dbNameStr . '_t' . $tenantIdStr);

    require_once('library/tcpdf.php');

    $conn = conexion();
    $datos = obtener_datos_factura($id_boleto, $conn);
    $boleto = $datos['boleto'];
    $detalles = $datos['detalles'];

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ────────────────────
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';

    $cfg = null;
    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $cfg = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    $clavesRequeridas = ['razon_social_empresa', 'ruc_empresa', 'leyenda_boleteria', 'mostrar_leyenda_boleteria', 'obligado_contabilidad', 'regimen_fiscal', 'ambiente_sri'];
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

        $queryConfig = "SELECT leyenda_boleteria, mostrar_leyenda_boleteria FROM configuracion LIMIT 1";
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
        'leyenda_boleteria' => '',
        'mostrar_leyenda_boleteria' => 0,
    ];

    // Se resuelve fuera del JSON cacheado para que un cambio de logo se refleje.
    $cfg['logo'] = logoEmpresaParaPdf($conn, $dbKey);

    $leyenda = ((int)($cfg['mostrar_leyenda_boleteria'] ?? 0) === 1) ? trim((string)($cfg['leyenda_boleteria'] ?? '')) : '';

    // ─── FORMA DE PAGO (la boletería cobra en efectivo) ───────────────────────
    $formaPago = 'EFECTIVO';
    try {
        $resPago = @mysqli_query(
            $conn,
            "SELECT fp.nombre_forma_pago
               FROM comprobante_cobro_boleteria c
               LEFT JOIN forma_pago fp ON fp.id_forma_pago = c.id_fkforma_pago
              WHERE c.id_fkfactura_comprobante_cobro = {$id_boleto}
                AND (c.estado_comprobante_cobro IS NULL OR UPPER(c.estado_comprobante_cobro) <> 'ANULADA')
              ORDER BY c.id_comprobante_cobro DESC
              LIMIT 1"
        );
        if ($resPago && ($filaPago = mysqli_fetch_assoc($resPago)) && !empty($filaPago['nombre_forma_pago'])) {
            $formaPago = mb_strtoupper($filaPago['nombre_forma_pago'], 'UTF-8');
        }
    } catch (Throwable $e) {
        // Bases sin la tabla de comprobantes de boletería: se mantiene EFECTIVO.
    }

    $textoRetirar = obtener_texto_productos_retirar($conn, $boleto, $detalles);

    // ─── CACHÉ NIVEL 2: PDF por hash de datos ─────────────────────────────────
    $datosHash = md5(BOLETO_A4_LAYOUT_VERSION . json_encode([
        $id_boleto,
        $boleto,
        $detalles,
        $cfg,
        $leyenda,
        $formaPago,
        $textoRetirar,
    ], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR));

    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'boleto_a4_' . $id_boleto . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="boleto_a4_' . $id_boleto . '.pdf"');
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
    $pdf->SetTitle('Boleto de Viaje');
    $pdf->SetSubject('Boleto de Transporte - Formato A4');
    $pdf->SetMargins(RIDE_MARGEN, RIDE_MARGEN, RIDE_MARGEN, true);
    $pdf->SetAutoPageBreak(false, 0);

    render_boleto_a4($pdf, $boleto, $detalles, $cfg, [
        'leyenda' => $leyenda,
        'texto_retirar' => $textoRetirar,
        'forma_pago' => $formaPago,
    ]);

    $pdfContent = $pdf->Output('', 'S');

    foreach (glob($pdfCacheDir . 'boleto_a4_' . $id_boleto . '_*.pdf') as $pdfViejo) {
        @unlink($pdfViejo);
    }
    @file_put_contents($cachePdfFile, $pdfContent);

    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="boleto_a4_' . $id_boleto . '.pdf"');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    error_log('[boletoFacturaA4] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Error al generar boleto A4</title></head><body style='font-family:sans-serif;padding:30px;background:#f8f9fa;'>";
    echo "<div style='max-width:800px;margin:0 auto;background:#fff;border:1px solid #e74c3c;border-radius:8px;padding:20px;'>";
    echo "<h2 style='color:#c0392b;margin-top:0;'>Error al generar el boleto A4 (ID: " . htmlspecialchars($_GET['id_boleto'] ?? '0') . ")</h2>";
    echo "<p style='font-size:15px;'><strong>Mensaje:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>Archivo:</strong> <code>" . htmlspecialchars($e->getFile()) . "</code> (Línea <strong>" . (int)$e->getLine() . "</strong>)</p>";
    echo "</div></body></html>";
    exit();
}

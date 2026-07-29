<?php
/**
 * verXml.php
 * Muestra el XML de una factura de forma legible en el navegador.
 *
 * Parámetros GET:
 *   id_factura — ID de la factura
 *   formato    — "xml" (default) | "json" | "raw"
 *
 * Ejemplos:
 *   /php/verXml.php?id_factura=51              → XML formateado (highlight)
 *   /php/verXml.php?id_factura=51&formato=raw  → XML puro descargable
 *   /php/verXml.php?id_factura=51&formato=json → JSON completo con clave
 */

ob_start();
require_once('db.php');
$dbOut = trim(ob_get_clean());

ini_set('display_errors', 1);
error_reporting(E_ALL);

$id_factura = isset($_GET['id_factura']) ? (int)$_GET['id_factura'] : 0;
$formato    = isset($_GET['formato'])    ? strtolower(trim($_GET['formato'])) : 'xml';

if ($id_factura <= 0) {
    header('Content-Type: text/html; charset=utf-8');
    echo '<h2 style="font-family:sans-serif;color:red">Parámetro id_factura requerido</h2>';
    echo '<p style="font-family:sans-serif">Ejemplo: <code>verXml.php?id_factura=51</code></p>';
    exit;
}

if (!empty($dbOut)) {
    header('Content-Type: text/html; charset=utf-8');
    echo '<h2 style="font-family:sans-serif;color:red">Error de conexión: ' . htmlspecialchars($dbOut) . '</h2>';
    echo '<p style="font-family:sans-serif">Asegúrese de estar logueado en la app (sesión activa).</p>';
    exit;
}

require_once('armarXml.php');

try {
    $xmlObj = new meotodoXml();
    $resultado = $xmlObj->armarXml($id_factura);

    if (!$resultado || empty($resultado['comprobante'])) {
        header('Content-Type: text/html; charset=utf-8');
        echo '<h2 style="font-family:sans-serif;color:red">No se pudo generar el XML para la factura #' . $id_factura . '</h2>';
        echo '<p style="font-family:sans-serif">Posibles causas:</p><ul style="font-family:sans-serif">';
        echo '<li>La guía asociada no tiene detalles en <code>detalle_guia</code></li>';
        echo '<li>La factura no existe</li>';
        echo '<li>Error en la firma o empresa</li>';
        echo '</ul>';
        exit;
    }

    $xmlString = $resultado['comprobante'];
    $claveAcceso = $resultado['clave_acceso_factura'] ?? '';

    // ── Formato RAW: descarga el XML puro ─────────────────────────────────────
    if ($formato === 'raw') {
        // Formatear con indentación
        $domDoc = new DOMDocument('1.0', 'UTF-8');
        $domDoc->preserveWhiteSpace = false;
        $domDoc->formatOutput = true;
        @$domDoc->loadXML($xmlString);
        $xmlFormateado = $domDoc->saveXML();
        header('Content-Type: application/xml; charset=utf-8');
        header('Content-Disposition: attachment; filename="factura_' . $id_factura . '_' . $claveAcceso . '.xml"');
        echo $xmlFormateado;
        exit;
    }

    // ── Formato JSON: devuelve el mismo que negocioXml.php ───────────────────
    if ($formato === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success'       => true,
            'id_factura'    => $id_factura,
            'clave_acceso'  => $claveAcceso,
            'xml'           => $xmlString,
            'longitud_xml'  => strlen($xmlString),
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    // ── Formato XML (default): renderizar en HTML con highlight ──────────────
    $domDoc = new DOMDocument('1.0', 'UTF-8');
    $domDoc->preserveWhiteSpace = false;
    $domDoc->formatOutput = true;
    $cargadoOk = @$domDoc->loadXML($xmlString);
    $xmlIndentado = $cargadoOk ? htmlspecialchars($domDoc->saveXML()) : htmlspecialchars($xmlString);

    // Contar nodos clave
    $numDetalles = 0;
    if ($cargadoOk) {
        $numDetalles = $domDoc->getElementsByTagName('detalle')->length;
    }

    header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>XML Factura #<?= $id_factura ?></title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
        .header {
            background: linear-gradient(135deg, #1e3a5f, #0f2744);
            padding: 20px 30px;
            border-bottom: 1px solid #334155;
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .header h1 { font-size: 1.3rem; color: #60a5fa; }
        .header .info { font-size: 0.82rem; color: #94a3b8; }
        .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .badge {
            display: inline-block; padding: 3px 10px; border-radius: 20px;
            font-size: 0.75rem; font-weight: 600;
        }
        .badge-ok  { background: #064e3b; color: #6ee7b7; border: 1px solid #047857; }
        .badge-err { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; }
        .badge-info{ background: #1e3a5f; color: #93c5fd; border: 1px solid #1d4ed8; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn {
            padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
            font-size: 0.83rem; font-weight: 600; text-decoration: none; display: inline-block;
            transition: opacity .2s;
        }
        .btn:hover { opacity: .85; }
        .btn-blue   { background: #2563eb; color: #fff; }
        .btn-green  { background: #059669; color: #fff; }
        .btn-slate  { background: #334155; color: #cbd5e1; }
        .clave-box {
            background: #1e293b; margin: 16px 30px; padding: 12px 16px;
            border-radius: 10px; border: 1px solid #334155;
            font-family: monospace; font-size: 0.85rem; color: #a5f3fc;
            word-break: break-all;
        }
        .clave-box span { color: #64748b; font-size: 0.75rem; display: block; margin-bottom: 4px; }
        .stats { display: flex; gap: 12px; margin: 0 30px 16px; flex-wrap: wrap; }
        .stat { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 16px; }
        .stat-val { font-size: 1.4rem; font-weight: 700; color: #60a5fa; }
        .stat-lbl { font-size: 0.72rem; color: #64748b; }
        .xml-container {
            margin: 0 30px 30px;
            background: #0d1117; border: 1px solid #334155;
            border-radius: 12px; overflow: auto; max-height: 72vh;
        }
        pre {
            padding: 20px; font-size: 0.8rem; line-height: 1.7;
            font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            white-space: pre;
        }
        /* Syntax highlighting */
        .tag    { color: #60a5fa; }
        .attr   { color: #fbbf24; }
        .val    { color: #34d399; }
        .decl   { color: #a78bfa; }
        .txt    { color: #f1f5f9; }
    </style>
</head>
<body>
<div class="header">
    <div>
        <h1>🗂 XML Factura #<?= $id_factura ?></h1>
        <div class="badges">
            <span class="badge <?= $numDetalles > 0 ? 'badge-ok' : 'badge-err' ?>">
                <?= $numDetalles ?> detalle(s) en XML
            </span>
            <span class="badge badge-info">
                <?= strlen($xmlString) ?> bytes
            </span>
            <?php if (!$cargadoOk): ?>
            <span class="badge badge-err">⚠ XML con errores de estructura</span>
            <?php else: ?>
            <span class="badge badge-ok">✓ XML bien formado</span>
            <?php endif; ?>
        </div>
    </div>
    <div class="actions">
        <a class="btn btn-green"
           href="verXml.php?id_factura=<?= $id_factura ?>&formato=raw">
            ⬇ Descargar XML
        </a>
        <a class="btn btn-blue"
           href="verXml.php?id_factura=<?= $id_factura ?>&formato=json">
            { } Ver JSON
        </a>
        <a class="btn btn-slate"
           href="verificarGuiaFactura.php?id_factura=<?= $id_factura ?>">
            🔍 Verificar Guía
        </a>
    </div>
</div>

<div class="clave-box">
    <span>CLAVE DE ACCESO (<?= strlen($claveAcceso) ?> dígitos)</span>
    <?= htmlspecialchars($claveAcceso) ?>
</div>

<div class="stats">
    <div class="stat">
        <div class="stat-val"><?= $numDetalles ?></div>
        <div class="stat-lbl">Líneas de detalle</div>
    </div>
    <div class="stat">
        <div class="stat-val"><?= number_format(strlen($xmlString) / 1024, 1) ?> KB</div>
        <div class="stat-lbl">Tamaño XML</div>
    </div>
    <div class="stat">
        <div class="stat-val"><?= $domDoc->getElementsByTagName('infoFactura')->length > 0 ? '✓' : '✗' ?></div>
        <div class="stat-lbl">infoFactura</div>
    </div>
    <div class="stat">
        <div class="stat-val"><?= $domDoc->getElementsByTagName('pagos')->length > 0 ? '✓' : '✗' ?></div>
        <div class="stat-lbl">pagos</div>
    </div>
</div>

<div class="xml-container">
    <pre id="xmlContent"><?php
        // Simple syntax highlight
        $highlighted = preg_replace_callback(
            '/<\?xml[^?]*\?>|<\/?[a-zA-Z][a-zA-Z0-9_:-]*(?:\s+[a-zA-Z][a-zA-Z0-9_:-]*="[^"]*")*\s*\/?>|[^<>]+/',
            function($m) {
                $t = $m[0];
                if (str_starts_with($t, '<?')) {
                    return '<span class="decl">' . $t . '</span>';
                } elseif (str_starts_with($t, '<')) {
                    // tag con atributos
                    $t2 = preg_replace('/([a-zA-Z][a-zA-Z0-9_:-]*)="([^"]*)"/', '<span class="attr">$1</span>=<span class="val">"$2"</span>', $t);
                    $t2 = preg_replace('/^(<\/?)([a-zA-Z][a-zA-Z0-9_:-]*)/', '$1<span class="tag">$2</span>', $t2);
                    return $t2;
                } else {
                    return '<span class="txt">' . $t . '</span>';
                }
            },
            $xmlIndentado
        );
        echo $highlighted;
    ?></pre>
</div>
</body>
</html>
<?php
} catch (Exception $e) {
    header('Content-Type: text/html; charset=utf-8');
    echo '<h2 style="font-family:sans-serif;color:red">Error: ' . htmlspecialchars($e->getMessage()) . '</h2>';
}
?>

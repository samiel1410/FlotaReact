<?php
/**
 * repararDetallesGuia.php  v2
 *
 * Repara guías que tienen 0 registros en detalle_guia pero su factura sí tiene detalles.
 *
 * ESTRATEGIA:
 *  1. Primero intenta REUSAR registros huérfanos (id_fkguia_detalle_envio = 0)
 *     haciendo UPDATE con el id_guia correcto → preserva id_fktipo_envio_detalle_guia
 *     (campo crítico para el INNER JOIN de armarXml.php).
 *  2. Si no hay huérfanos disponibles, inserta nuevos desde factura_detalle
 *     tomando el tipo_envio del campo id_fktipo_envio_guia de la guía.
 *
 * MODOS:
 *   ?modo=preview   → muestra qué guías serían reparadas (sin modificar BD)
 *   ?modo=fix       → ejecuta la reparación real
 *   ?modo=huerfanos → lista registros huérfanos en detalle_guia (id_fkguia=0)
 */

ob_start();
require_once('db.php');
$dbOut = trim(ob_get_clean());

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 1);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_OFF);

function jsonResp($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if (!empty($dbOut)) {
    jsonResp(['success' => false, 'error' => 'Error de conexion BD: ' . $dbOut]);
}

$conn = null;
try { $conn = conexion(); } catch (Exception $e) {}
if (!$conn) {
    jsonResp(['success' => false, 'error' => 'No se pudo conectar a la BD. Asegurese de estar logueado.']);
}

$modo = isset($_GET['modo']) ? strtolower(trim($_GET['modo'])) : 'preview';

// ── MODO HUERFANOS ─────────────────────────────────────────────────────────────
if ($modo === 'huerfanos') {
    $sql = "
        SELECT dg.*
        FROM detalle_guia dg
        WHERE dg.id_fkguia_detalle_envio = 0 OR dg.id_fkguia_detalle_envio IS NULL
        ORDER BY dg.id_detalle_guia ASC
        LIMIT 500
    ";
    $res = $conn->query($sql);
    $huerfanos = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jsonResp([
        'success'   => true,
        'modo'      => 'huerfanos',
        'total'     => count($huerfanos),
        'registros' => $huerfanos,
        'nota'      => count($huerfanos) > 0
            ? 'Estos registros tienen id_fkguia=0 (huerfanos del bug). El modo=fix los reasignara a sus guias correctas y preservara su tipo_envio.'
            : 'No hay registros huerfanos. El modo=fix insertara registros nuevos desde factura_detalle.',
    ]);
}

// ── CONSULTA BASE: guías afectadas ────────────────────────────────────────────
$sqlAfectadas = "
    SELECT
        g.id_guia,
        g.numero_guia,
        g.fecha_guia,
        g.sucursal_guia,
        s.punto_emision_sucursal,
        g.punto_emision_guia,
        g.id_fktipo_envio_guia,
        f.id_factura,
        f.numero_factura,
        f.estado_sri,
        f.observacion_factura,
        COUNT(fd.id_factura_detalle) AS n_detalles_factura,
        (
            SELECT COUNT(*) FROM detalle_guia dg
            WHERE dg.id_fkguia_detalle_envio = g.id_guia
        ) AS n_detalles_guia
    FROM guia g
    INNER JOIN factura f           ON f.id_fkguia_factura = g.id_guia
    INNER JOIN factura_detalle fd  ON fd.id_fkfactura_factura_detalle = f.id_factura
    LEFT  JOIN sucursal2 s         ON s.suc_codigo_sucursal = g.sucursal_guia
    GROUP BY g.id_guia, f.id_factura
    HAVING n_detalles_guia = 0 AND n_detalles_factura > 0
    ORDER BY g.id_guia ASC
";

$resAfectadas = $conn->query($sqlAfectadas);
if (!$resAfectadas) {
    jsonResp(['success' => false, 'error' => 'Error consultando guias: ' . $conn->error]);
}
$guiasAfectadas = $resAfectadas->fetch_all(MYSQLI_ASSOC);
$totalAfectadas = count($guiasAfectadas);

// Contar huérfanos disponibles
$resH = $conn->query("SELECT COUNT(*) as total FROM detalle_guia WHERE id_fkguia_detalle_envio = 0 OR id_fkguia_detalle_envio IS NULL");
$totalHuerfanos = $resH ? (int)$resH->fetch_assoc()['total'] : 0;

// tipo_envio por defecto como fallback (primer registro de la tabla)
$resTipo = $conn->query("SELECT id_tipo_envio FROM tipo_envio ORDER BY id_tipo_envio ASC LIMIT 1");
$tipoEnvioDefault = $resTipo ? (int)$resTipo->fetch_assoc()['id_tipo_envio'] : 1;

// ── MODO PREVIEW ──────────────────────────────────────────────────────────────
if ($modo === 'preview') {
    $preview = [];
    foreach ($guiasAfectadas as $g) {
        $id_fac     = (int)$g['id_factura'];
        $tipoEnvio  = (int)($g['id_fktipo_envio_guia'] ?: $tipoEnvioDefault);

        $resDet = $conn->query("
            SELECT nombre_producto_factura_detalle AS contenido,
                   cantidad_factura_detalle        AS cantidad,
                   total_factura_detalle           AS total
            FROM factura_detalle
            WHERE id_fkfactura_factura_detalle = $id_fac
        ");
        $detalles = $resDet ? $resDet->fetch_all(MYSQLI_ASSOC) : [];

        $preview[] = [
            'id_guia'            => (int)$g['id_guia'],
            'secuencial'         => ($g['punto_emision_sucursal'] ?? '?') . '-' . $g['punto_emision_guia'] . '-' . str_pad($g['numero_guia'], 9, '0', STR_PAD_LEFT),
            'id_factura'         => $id_fac,
            'estado_sri'         => $g['estado_sri'],
            'observacion'        => $g['observacion_factura'],
            'tipo_envio_guia'    => $tipoEnvio,
            'n_detalles_factura' => (int)$g['n_detalles_factura'],
            'estrategia'         => $totalHuerfanos > 0
                ? 'UPDATE huerfanos — preserva tipo_envio original'
                : 'INSERT nuevo — usa tipo_envio=' . $tipoEnvio,
            'detalles_a_crear'   => $detalles,
        ];
    }

    jsonResp([
        'success'            => true,
        'modo'               => 'preview',
        'total_guias'        => $totalAfectadas,
        'huerfanos_en_bd'    => $totalHuerfanos,
        'tipo_envio_default' => $tipoEnvioDefault,
        'aviso'              => $totalAfectadas > 0
            ? "Hay $totalAfectadas guia(s) sin detalles. Use ?modo=fix para reparar."
            : 'No se encontraron guias afectadas. Todo esta bien.',
        'guias'              => $preview,
    ]);
}

// ── MODO FIX ──────────────────────────────────────────────────────────────────
if ($modo === 'fix') {
    if ($totalAfectadas === 0) {
        jsonResp([
            'success'   => true,
            'modo'      => 'fix',
            'reparadas' => 0,
            'mensaje'   => 'No habia guias que reparar. Todo estaba bien.',
        ]);
    }

    $reparadas    = [];
    $errores      = [];
    $totalCreados = 0;

    // Cargar pool de huérfanos ordenados por id (FIFO)
    $resPool = $conn->query("
        SELECT id_detalle_guia, id_fktipo_envio_detalle_guia, contenido_guia
        FROM detalle_guia
        WHERE id_fkguia_detalle_envio = 0 OR id_fkguia_detalle_envio IS NULL
        ORDER BY id_detalle_guia ASC
    ");
    $huerfanosPool = $resPool ? $resPool->fetch_all(MYSQLI_ASSOC) : [];
    $huerfanoIdx   = 0;

    foreach ($guiasAfectadas as $g) {
        $id_guia       = (int)$g['id_guia'];
        $id_fac        = (int)$g['id_factura'];
        $tipoEnvioGuia = (int)($g['id_fktipo_envio_guia'] ?: $tipoEnvioDefault);

        // Detalles de factura_detalle para esta factura
        $resDet = $conn->query("
            SELECT nombre_producto_factura_detalle AS contenido_guia,
                   cantidad_factura_detalle        AS cantidad_detalle_guia,
                   tarifa_factura_detalle          AS costo_detalle_guia,
                   descuento_factura_detalle       AS tipo_descuento_detalle_guia,
                   total_factura_detalle           AS total_detalle_guia,
                   subtotal_factura_detalle        AS subtotal_detalle_guia,
                   total_factura_detalle           AS total_tarifa_detalle_guia
            FROM factura_detalle
            WHERE id_fkfactura_factura_detalle = $id_fac
            ORDER BY id_factura_detalle ASC
        ");

        if (!$resDet) {
            $errores[] = ['id_guia' => $id_guia, 'error' => 'Error leyendo factura_detalle: ' . $conn->error];
            continue;
        }
        $detalles = $resDet->fetch_all(MYSQLI_ASSOC);

        if (empty($detalles)) {
            $errores[] = ['id_guia' => $id_guia, 'error' => 'No hay detalles en factura_detalle'];
            continue;
        }

        $actualizados = 0;
        $insertados   = 0;

        foreach ($detalles as $det) {
            $contenido = $conn->real_escape_string($det['contenido_guia'] ?? '');
            $cantidad  = (float)($det['cantidad_detalle_guia'] ?? 1);
            $costo     = (float)($det['costo_detalle_guia'] ?? 0);
            $descuento = (float)($det['tipo_descuento_detalle_guia'] ?? 0);
            $total     = (float)($det['total_detalle_guia'] ?? 0);
            $subtotal  = (float)($det['subtotal_detalle_guia'] ?? 0);
            $tarifa    = (float)($det['total_tarifa_detalle_guia'] ?? 0);

            // ── ESTRATEGIA 1: reusar huérfano ────────────────────────────────
            if ($huerfanoIdx < count($huerfanosPool)) {
                $h          = $huerfanosPool[$huerfanoIdx];
                $idDet      = (int)$h['id_detalle_guia'];
                // Preservar tipo_envio del huérfano si es válido, sino usar el de la guía
                $tipoEnvioH = (int)($h['id_fktipo_envio_detalle_guia'] ?: $tipoEnvioGuia);

                $sqlUpd = "
                    UPDATE detalle_guia SET
                        id_fkguia_detalle_envio      = $id_guia,
                        id_fktipo_envio_detalle_guia = $tipoEnvioH,
                        contenido_guia               = '$contenido',
                        cantidad_detalle_guia        = $cantidad,
                        costo_detalle_guia           = $costo,
                        tipo_descuento_detalle_guia  = $descuento,
                        total_detalle_guia           = $total,
                        subtotal_detalle_guia        = $subtotal,
                        total_tarifa_detalle_guia    = $tarifa,
                        estado_detalle_guia          = 1
                    WHERE id_detalle_guia = $idDet
                ";

                if ($conn->query($sqlUpd)) {
                    $actualizados++;
                    $totalCreados++;
                    $huerfanoIdx++;
                } else {
                    $errores[] = [
                        'id_guia'    => $id_guia,
                        'estrategia' => 'UPDATE_huerfano',
                        'error'      => $conn->error,
                    ];
                }

            } else {
                // ── ESTRATEGIA 2: INSERT nuevo desde factura_detalle ─────────
                $sqlIns = "
                    INSERT INTO detalle_guia (
                        id_fkguia_detalle_envio,
                        id_fktipo_envio_detalle_guia,
                        contenido_guia,
                        cantidad_detalle_guia,
                        costo_detalle_guia,
                        tipo_descuento_detalle_guia,
                        total_detalle_guia,
                        subtotal_detalle_guia,
                        total_tarifa_detalle_guia,
                        peso_guia,
                        tipo_iva_detalle_guia,
                        documento_detalle_guia,
                        estado_detalle_guia,
                        fecha_creacion_detalle_guia
                    ) VALUES (
                        $id_guia,
                        $tipoEnvioGuia,
                        '$contenido',
                        $cantidad,
                        $costo,
                        $descuento,
                        $total,
                        $subtotal,
                        $tarifa,
                        0,
                        0,
                        '',
                        1,
                        NOW()
                    )
                ";

                if ($conn->query($sqlIns)) {
                    $insertados++;
                    $totalCreados++;
                } else {
                    $errores[] = [
                        'id_guia'    => $id_guia,
                        'estrategia' => 'INSERT_nuevo',
                        'error'      => $conn->error,
                    ];
                }
            }
        }

        $reparadas[] = [
            'id_guia'      => $id_guia,
            'id_factura'   => $id_fac,
            'actualizados' => $actualizados,
            'insertados'   => $insertados,
        ];
    }

    jsonResp([
        'success'          => true,
        'modo'             => 'fix',
        'guias_reparadas'  => count($reparadas),
        'detalles_totales' => $totalCreados,
        'errores'          => $errores,
        'detalle'          => $reparadas,
        'mensaje'          => count($errores) === 0
            ? "OK - Reparacion completada. $totalCreados detalle(s) procesados en " . count($reparadas) . " guia(s)."
            : "Reparacion parcial. Revise el campo 'errores'.",
    ]);
}

jsonResp([
    'success' => false,
    'error'   => "Modo '$modo' no valido. Use: ?modo=preview | ?modo=fix | ?modo=huerfanos",
]);
?>

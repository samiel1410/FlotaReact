<?php
/**
 * repararDetallesGuia.php
 *
 * Repara todas las guías que tienen 0 registros en detalle_guia
 * pero cuya factura asociada SÍ tiene detalle en factura_detalle.
 *
 * Causa: bug en insert_detalleguia donde id_guia llegaba en 0
 * y los detalles quedaban huérfanos.
 *
 * MODOS:
 *   ?modo=preview  → solo muestra qué guías serían reparadas (SIN modificar BD)
 *   ?modo=fix      → ejecuta la reparación real (CUIDADO: modifica BD)
 *   ?modo=huerfanos→ muestra registros huérfanos en detalle_guia (id_fkguia=0)
 *
 * Ejemplo:
 *   /php/repararDetallesGuia.php?modo=preview
 *   /php/repararDetallesGuia.php?modo=fix
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
    jsonResp(['success' => false, 'error' => 'Error de conexion a BD: ' . $dbOut]);
}

$conn = null;
try { $conn = conexion(); } catch (Exception $e) {}
if (!$conn) {
    jsonResp(['success' => false, 'error' => 'No se pudo conectar a la BD. Asegurese de estar logueado en la app.']);
}

$modo = isset($_GET['modo']) ? strtolower(trim($_GET['modo'])) : 'preview';

// ── MODO: mostrar huérfanos en detalle_guia (id_fkguia_detalle_envio = 0 o NULL) ──
if ($modo === 'huerfanos') {
    $sql = "
        SELECT dg.*
        FROM detalle_guia dg
        WHERE dg.id_fkguia_detalle_envio = 0 OR dg.id_fkguia_detalle_envio IS NULL
        ORDER BY dg.id_detalle_guia ASC
        LIMIT 200
    ";
    $res = $conn->query($sql);
    $huerfanos = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jsonResp([
        'success'   => true,
        'modo'      => 'huerfanos',
        'total'     => count($huerfanos),
        'registros' => $huerfanos,
    ]);
}

// ── PASO 1: Encontrar guías afectadas ──────────────────────────────────────────
// Guías que tienen facturas con detalle pero ellas mismas no tienen detalle_guia
$sqlAfectadas = "
    SELECT
        g.id_guia,
        g.numero_guia,
        g.sucursal_guia,
        s.punto_emision_sucursal,
        g.punto_emision_guia,
        g.fecha_guia,
        g.estado_guia,
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
    INNER JOIN factura f ON f.id_fkguia_factura = g.id_guia
    INNER JOIN factura_detalle fd ON fd.id_fkfactura_factura_detalle = f.id_factura
    LEFT JOIN sucursal2 s ON s.suc_codigo_sucursal = g.sucursal_guia
    GROUP BY g.id_guia, f.id_factura
    HAVING n_detalles_guia = 0 AND n_detalles_factura > 0
    ORDER BY g.id_guia ASC
";

$resAfectadas = $conn->query($sqlAfectadas);
if (!$resAfectadas) {
    jsonResp(['success' => false, 'error' => 'Error consultando guias afectadas: ' . $conn->error]);
}
$guiasAfectadas = $resAfectadas->fetch_all(MYSQLI_ASSOC);
$totalAfectadas = count($guiasAfectadas);

// ── MODO PREVIEW ───────────────────────────────────────────────────────────────
if ($modo === 'preview') {
    // Para cada guía afectada, traer sus detalles de factura_detalle
    $detalle_preview = [];
    foreach ($guiasAfectadas as $g) {
        $idFac = (int)$g['id_factura'];
        $sqlDet = "
            SELECT
                nombre_producto_factura_detalle AS contenido,
                cantidad_factura_detalle        AS cantidad,
                tarifa_factura_detalle          AS costo,
                descuento_factura_detalle       AS descuento,
                total_factura_detalle           AS total
            FROM factura_detalle
            WHERE id_fkfactura_factura_detalle = $idFac
        ";
        $resDet = $conn->query($sqlDet);
        $detalles = $resDet ? $resDet->fetch_all(MYSQLI_ASSOC) : [];
        $detalle_preview[] = [
            'id_guia'          => (int)$g['id_guia'],
            'secuencial_guia'  => ($g['punto_emision_sucursal'] ?? '?') . '-' . $g['punto_emision_guia'] . '-' . str_pad($g['numero_guia'], 9, '0', STR_PAD_LEFT),
            'id_factura'       => (int)$g['id_factura'],
            'estado_sri'       => $g['estado_sri'],
            'observacion'      => $g['observacion_factura'],
            'n_detalles_fac'   => (int)$g['n_detalles_factura'],
            'detalles_a_crear' => $detalles,
        ];
    }

    jsonResp([
        'success'       => true,
        'modo'          => 'preview',
        'total_guias'   => $totalAfectadas,
        'aviso'         => $totalAfectadas > 0
            ? "Se encontraron $totalAfectadas guia(s) sin detalles. Use ?modo=fix para reparar."
            : 'No se encontraron guias afectadas. Todo parece estar bien.',
        'guias'         => $detalle_preview,
    ]);
}

// ── MODO FIX ───────────────────────────────────────────────────────────────────
if ($modo === 'fix') {
    if ($totalAfectadas === 0) {
        jsonResp([
            'success'     => true,
            'modo'        => 'fix',
            'reparadas'   => 0,
            'mensaje'     => 'No habia guias que reparar.',
        ]);
    }

    $reparadas    = [];
    $errores      = [];
    $totalCreados = 0;

    foreach ($guiasAfectadas as $g) {
        $id_guia = (int)$g['id_guia'];
        $id_fac  = (int)$g['id_factura'];

        // Obtener los detalles de factura_detalle para esta factura
        $sqlDet = "
            SELECT
                nombre_producto_factura_detalle AS contenido_guia,
                cantidad_factura_detalle        AS cantidad_detalle_guia,
                tarifa_factura_detalle          AS costo_detalle_guia,
                descuento_factura_detalle       AS tipo_descuento_detalle_guia,
                total_factura_detalle           AS total_detalle_guia,
                total_factura_detalle           AS subtotal_detalle_guia,
                total_factura_detalle           AS total_tarifa_detalle_guia
            FROM factura_detalle
            WHERE id_fkfactura_factura_detalle = $id_fac
        ";
        $resDet = $conn->query($sqlDet);
        if (!$resDet) {
            $errores[] = [
                'id_guia' => $id_guia,
                'error'   => 'Error leyendo factura_detalle: ' . $conn->error,
            ];
            continue;
        }
        $detalles = $resDet->fetch_all(MYSQLI_ASSOC);

        if (empty($detalles)) {
            $errores[] = ['id_guia' => $id_guia, 'error' => 'No habia detalles en factura_detalle'];
            continue;
        }

        $creados = 0;
        foreach ($detalles as $det) {
            $contenido  = $conn->real_escape_string($det['contenido_guia'] ?? '');
            $cantidad   = (float)($det['cantidad_detalle_guia'] ?? 1);
            $costo      = (float)($det['costo_detalle_guia'] ?? 0);
            $descuento  = (float)($det['tipo_descuento_detalle_guia'] ?? 0);
            $total      = (float)($det['total_detalle_guia'] ?? 0);
            $subtotal   = (float)($det['subtotal_detalle_guia'] ?? 0);
            $tarifa     = (float)($det['total_tarifa_detalle_guia'] ?? 0);

            $sqlIns = "
                INSERT INTO detalle_guia (
                    id_fkguia_detalle_envio,
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
                $creados++;
                $totalCreados++;
            } else {
                $errores[] = [
                    'id_guia'  => $id_guia,
                    'error'    => 'Error insertando detalle: ' . $conn->error,
                    'contenido'=> $det['contenido_guia'],
                ];
            }
        }

        $reparadas[] = [
            'id_guia'        => $id_guia,
            'id_factura'     => $id_fac,
            'detalles_creados' => $creados,
        ];
    }

    jsonResp([
        'success'          => true,
        'modo'             => 'fix',
        'guias_reparadas'  => count($reparadas),
        'detalles_creados' => $totalCreados,
        'errores'          => $errores,
        'detalle'          => $reparadas,
        'mensaje'          => count($errores) === 0
            ? "Reparacion completada. $totalCreados detalle(s) creados en " . count($reparadas) . " guia(s)."
            : "Reparacion parcial. Revise el campo 'errores'.",
    ]);
}

// Modo no reconocido
jsonResp([
    'success' => false,
    'error'   => "Modo '$modo' no valido. Use: ?modo=preview | ?modo=fix | ?modo=huerfanos",
]);
?>

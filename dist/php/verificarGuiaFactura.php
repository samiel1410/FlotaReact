<?php
/**
 * verificarGuiaFactura.php
 * Verifica la consistencia entre una factura y su guía asociada.
 * Compara cabecera y detalles de ambos documentos.
 *
 * Parámetros GET:
 *   id_factura   — ID de la factura a verificar
 *
 * Ejemplo: /php/verificarGuiaFactura.php?id_factura=51
 */

require_once('db.php');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

mysqli_report(MYSQLI_REPORT_OFF);

function jsonError($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Parámetros ──────────────────────────────────────────────
$id_factura = isset($_GET['id_factura']) ? (int)$_GET['id_factura'] : 0;
if ($id_factura <= 0) {
    jsonError('Parámetro id_factura requerido y debe ser un número válido.');
}

try {
    $conn = conexion();

    // ── 1. Obtener la FACTURA ────────────────────────────────
    $sqlFac = "
        SELECT f.*,
               s.nombre_sucursal,
               s.punto_emision_sucursal,
               u.nombre_usuario
        FROM factura f
        LEFT JOIN sucursal2 s ON s.suc_codigo_sucursal = f.id_fksucursal_factura
        LEFT JOIN usuario u   ON u.id_usuario = f.id_fkusuario_factura
        WHERE f.id_factura = ?
        LIMIT 1
    ";
    $stmtFac = $conn->prepare($sqlFac);
    if (!$stmtFac) jsonError('Error preparando consulta factura: ' . $conn->error, 500);
    $stmtFac->bind_param('i', $id_factura);
    $stmtFac->execute();
    $resFac = $stmtFac->get_result();
    $factura = $resFac->fetch_assoc();
    $stmtFac->close();

    if (!$factura) {
        jsonError("Factura con id_factura=$id_factura no encontrada.", 404);
    }

    $id_guia = (int)($factura['id_fkguia_factura'] ?? 0);
    if ($id_guia <= 0) {
        jsonError("La factura $id_factura no tiene una guía asociada (id_fkguia_factura es nulo o 0).", 422);
    }

    // ── 2. Obtener la GUÍA ──────────────────────────────────
    $sqlGuia = "
        SELECT g.*,
               s.nombre_sucursal,
               s.punto_emision_sucursal,
               u.nombre_usuario
        FROM guia g
        LEFT JOIN sucursal2 s ON s.suc_codigo_sucursal = g.sucursal_guia
        LEFT JOIN usuario u   ON u.id_usuario = g.id_fkusuario_guia
        WHERE g.id_guia = ?
        LIMIT 1
    ";
    $stmtGuia = $conn->prepare($sqlGuia);
    if (!$stmtGuia) jsonError('Error preparando consulta guía: ' . $conn->error, 500);
    $stmtGuia->bind_param('i', $id_guia);
    $stmtGuia->execute();
    $resGuia = $stmtGuia->get_result();
    $guia = $resGuia->fetch_assoc();
    $stmtGuia->close();

    if (!$guia) {
        jsonError("Guía con id_guia=$id_guia no encontrada en la base de datos.", 404);
    }

    // ── 3. Obtener DETALLES DE LA FACTURA ───────────────────
    $sqlDetFac = "
        SELECT id_factura_detalle,
               nombre_producto_factura_detalle AS descripcion,
               cantidad_factura_detalle        AS cantidad,
               costo_detalle_guia              AS costo,
               descuento_factura_detalle       AS descuento,
               tarifa_factura_detalle          AS tarifa,
               subtotal_factura_detalle        AS subtotal,
               total_factura_detalle           AS total
        FROM factura_detalle
        WHERE id_fkfactura_factura_detalle = ?
        ORDER BY id_factura_detalle ASC
    ";
    $stmtDetFac = $conn->prepare($sqlDetFac);
    if (!$stmtDetFac) {
        // Columna costo_detalle_guia puede no existir en factura_detalle, intentamos sin ella
        $sqlDetFac = "
            SELECT id_factura_detalle,
                   nombre_producto_factura_detalle AS descripcion,
                   cantidad_factura_detalle        AS cantidad,
                   descuento_factura_detalle       AS descuento,
                   tarifa_factura_detalle          AS tarifa,
                   subtotal_factura_detalle        AS subtotal,
                   total_factura_detalle           AS total
            FROM factura_detalle
            WHERE id_fkfactura_factura_detalle = ?
            ORDER BY id_factura_detalle ASC
        ";
        $stmtDetFac = $conn->prepare($sqlDetFac);
    }
    $stmtDetFac->bind_param('i', $id_factura);
    $stmtDetFac->execute();
    $detallesFactura = $stmtDetFac->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtDetFac->close();

    // ── 4. Obtener DETALLES DE LA GUÍA ──────────────────────
    $sqlDetGuia = "
        SELECT id_detalle_guia,
               contenido_guia                 AS descripcion,
               cantidad_detalle_guia          AS cantidad,
               peso_guia                      AS peso,
               costo_detalle_guia             AS costo,
               tipo_descuento_detalle_guia    AS tipo_descuento,
               total_tarifa_detalle_guia      AS tarifa,
               subtotal_detalle_guia          AS subtotal,
               total_detalle_guia             AS total,
               tipo_iva_detalle_guia          AS tipo_iva,
               documento_detalle_guia         AS documento
        FROM detalle_guia
        WHERE id_fkguia_detalle_envio = ?
        ORDER BY id_detalle_guia ASC
    ";
    $stmtDetGuia = $conn->prepare($sqlDetGuia);
    if (!$stmtDetGuia) jsonError('Error preparando consulta detalles guía: ' . $conn->error, 500);
    $stmtDetGuia->bind_param('i', $id_guia);
    $stmtDetGuia->execute();
    $detallesGuia = $stmtDetGuia->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtDetGuia->close();

    // ── 5. COMPARACIONES DE CABECERA ────────────────────────
    $diferencias_cabecera = [];

    $comparaciones = [
        ['campo' => 'Total',      'factura' => (float)$factura['total_factura'],   'guia' => (float)$guia['total_guia']],
        ['campo' => 'Subtotal',   'factura' => (float)$factura['subtotal_factura'],'guia' => (float)$guia['subtotal_guia']],
        ['campo' => 'IVA',        'factura' => (float)$factura['iva_factura'],     'guia' => (float)$guia['impuesto_iva_guia']],
        ['campo' => 'Descuento',  'factura' => (float)$factura['descuento_total_factura'], 'guia' => (float)$guia['descuento_guia']],
        ['campo' => 'Subtotal 12%','factura' => (float)$factura['subtotal_12_factura'],    'guia' => (float)$guia['subtotal_12_guia']],
        ['campo' => 'Subtotal 0%', 'factura' => (float)$factura['subtotal_0_factura'],     'guia' => (float)$guia['subtotal_0_guia']],
    ];

    foreach ($comparaciones as $c) {
        $ok = abs($c['factura'] - $c['guia']) < 0.01;
        if (!$ok) {
            $diferencias_cabecera[] = [
                'campo'       => $c['campo'],
                'en_factura'  => $c['factura'],
                'en_guia'     => $c['guia'],
                'diferencia'  => round($c['factura'] - $c['guia'], 4),
            ];
        }
    }

    // ── 6. COMPARACIONES DE DETALLES ────────────────────────
    $diferencias_detalles = [];
    $resumen_detalles = [];

    $cntFac  = count($detallesFactura);
    $cntGuia = count($detallesGuia);

    if ($cntFac !== $cntGuia) {
        $diferencias_detalles[] = [
            'tipo'        => 'cantidad_de_lineas',
            'descripcion' => "La factura tiene $cntFac línea(s) y la guía tiene $cntGuia línea(s).",
            'en_factura'  => $cntFac,
            'en_guia'     => $cntGuia,
        ];
    }

    $maxLineas = max($cntFac, $cntGuia);
    for ($i = 0; $i < $maxLineas; $i++) {
        $df = $detallesFactura[$i] ?? null;
        $dg = $detallesGuia[$i]    ?? null;

        $lineaNum = $i + 1;

        if (!$df) {
            $diferencias_detalles[] = [
                'tipo'        => "linea_$lineaNum",
                'descripcion' => "Línea $lineaNum existe en la GUÍA pero NO en la factura.",
                'en_guia'     => $dg,
                'en_factura'  => null,
            ];
            continue;
        }
        if (!$dg) {
            $diferencias_detalles[] = [
                'tipo'        => "linea_$lineaNum",
                'descripcion' => "Línea $lineaNum existe en la FACTURA pero NO en la guía.",
                'en_factura'  => $df,
                'en_guia'     => null,
            ];
            continue;
        }

        // Comparar descripción
        $descFac = mb_strtoupper(trim($df['descripcion'] ?? ''));
        $descGui = mb_strtoupper(trim($dg['descripcion'] ?? ''));
        if ($descFac !== $descGui) {
            $diferencias_detalles[] = [
                'tipo'        => "linea_{$lineaNum}_descripcion",
                'descripcion' => "Línea $lineaNum: descripción diferente.",
                'en_factura'  => $df['descripcion'],
                'en_guia'     => $dg['descripcion'],
            ];
        }

        // Comparar cantidad
        if ((float)$df['cantidad'] !== (float)$dg['cantidad']) {
            $diferencias_detalles[] = [
                'tipo'        => "linea_{$lineaNum}_cantidad",
                'descripcion' => "Línea $lineaNum: cantidad diferente.",
                'en_factura'  => (float)$df['cantidad'],
                'en_guia'     => (float)$dg['cantidad'],
            ];
        }

        // Comparar total de línea
        $totalFac = (float)($df['total'] ?? 0);
        $totalGui = (float)($dg['total'] ?? 0);
        if (abs($totalFac - $totalGui) >= 0.01) {
            $diferencias_detalles[] = [
                'tipo'        => "linea_{$lineaNum}_total",
                'descripcion' => "Línea $lineaNum: total diferente.",
                'en_factura'  => $totalFac,
                'en_guia'     => $totalGui,
                'diferencia'  => round($totalFac - $totalGui, 4),
            ];
        }

        $resumen_detalles[] = [
            'linea'          => $lineaNum,
            'descripcion_fac'=> $df['descripcion'],
            'descripcion_gui'=> $dg['descripcion'],
            'cantidad_fac'   => (float)$df['cantidad'],
            'cantidad_gui'   => (float)$dg['cantidad'],
            'total_fac'      => (float)($df['total'] ?? 0),
            'total_gui'      => (float)($dg['total'] ?? 0),
            'coincide'       => (mb_strtoupper(trim($df['descripcion'])) === mb_strtoupper(trim($dg['descripcion'])))
                                && ((float)$df['cantidad'] == (float)$dg['cantidad'])
                                && (abs((float)($df['total'] ?? 0) - (float)($dg['total'] ?? 0)) < 0.01),
        ];
    }

    // ── 7. Resultado final ──────────────────────────────────
    $hayDiferencias = !empty($diferencias_cabecera) || !empty($diferencias_detalles);

    // Secuencial formateado de la factura
    $numFac = str_pad($factura['numero_factura'] ?? '', 9, '0', STR_PAD_LEFT);
    $secFac = ($factura['punto_emision_sucursal'] ?? '???') . '-'
            . ($factura['punto_emision_factura']  ?? '???') . '-'
            . $numFac;

    // Secuencial formateado de la guía
    $numGui = str_pad($guia['numero_guia'] ?? '', 9, '0', STR_PAD_LEFT);
    $secGui = ($guia['punto_emision_sucursal'] ?? '???') . '-'
            . ($guia['punto_emision_guia']     ?? '???') . '-'
            . $numGui;

    $resultado = [
        'success'          => true,
        'consistente'      => !$hayDiferencias,
        'resumen'          => $hayDiferencias
            ? '⚠️  Se encontraron diferencias entre la factura y la guía.'
            : '✅  La factura y la guía son CONSISTENTES, no hay diferencias.',

        // Cabecera de los documentos
        'factura' => [
            'id_factura'        => (int)$factura['id_factura'],
            'secuencial'        => $secFac,
            'fecha'             => $factura['fecha_factura'],
            'cliente'           => $factura['nombre_cliente_factura'],
            'ruc_cliente'       => $factura['ruc_cliente_factura'],
            'total'             => (float)$factura['total_factura'],
            'subtotal'          => (float)$factura['subtotal_factura'],
            'iva'               => (float)$factura['iva_factura'],
            'descuento'         => (float)$factura['descuento_total_factura'],
            'estado_factura'    => (int)$factura['estado_factura'],
            'estado_sri'        => $factura['estado_sri'],
            'observacion'       => $factura['observacion_factura'],
            'clave_acceso'      => $factura['clave_acceso_factura'],
            'id_guia_asociada'  => $id_guia,
            'n_detalles'        => $cntFac,
        ],
        'guia' => [
            'id_guia'           => (int)$guia['id_guia'],
            'secuencial'        => $secGui,
            'fecha'             => $guia['fecha_guia'],
            'remitente'         => $guia['nombre_cliente_remitente'],
            'receptor'          => $guia['nombre_cliente_receptor'],
            'origen'            => $guia['origen_guia'],
            'destino'           => $guia['destino_guia'],
            'total'             => (float)$guia['total_guia'],
            'subtotal'          => (float)$guia['subtotal_guia'],
            'iva'               => (float)$guia['impuesto_iva_guia'],
            'descuento'         => (float)$guia['descuento_guia'],
            'estado_guia'       => (int)$guia['estado_guia'],
            'n_detalles'        => $cntGuia,
        ],

        // Diferencias encontradas
        'diferencias_cabecera' => $diferencias_cabecera,
        'diferencias_detalles' => $diferencias_detalles,

        // Comparación línea a línea
        'comparacion_detalles' => $resumen_detalles,

        // Detalles raw para inspección
        'detalles_factura' => $detallesFactura,
        'detalles_guia'    => $detallesGuia,
    ];

    echo json_encode($resultado, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    jsonError('Error interno: ' . $e->getMessage(), 500);
}
?>

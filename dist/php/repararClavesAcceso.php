<?php
/**
 * repararClavesAcceso.php
 * Repara la clave_acceso_factura tomando el numero_factura real de la BD,
 * reconstruyendo la clave de acceso SRI (49 dígitos) con el secuencial correcto
 * y recalculando el dígito verificador con el algoritmo Módulo 11 del SRI.
 *
 * Modo de uso:
 *   GET /php/repararClavesAcceso.php                       → Simulación (muestra qué cambiaría)
 *   GET /php/repararClavesAcceso.php?ejecutar=1            → Aplica corrección en BD
 *   GET /php/repararClavesAcceso.php?id_factura=48         → Simula solo una factura
 *   GET /php/repararClavesAcceso.php?id_factura=48&ejecutar=1 → Corrige solo una factura
 */

ob_start();
require_once('db.php');
ini_set('display_errors', 1);
error_reporting(E_ALL);
ob_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ── Algoritmo Módulo 11 del SRI ─────────────────────────────────────────────
function calcularDigitoVerificadorSRI(string $clave48): int {
    $coeficientes = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7,
                     2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7,
                     2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
    $suma = 0;
    for ($i = 0; $i < 48; $i++) {
        $suma += (int)$clave48[$i] * $coeficientes[$i];
    }
    $residuo = $suma % 11;
    if ($residuo === 0) return 0;
    if ($residuo === 1) return 1;
    return 11 - $residuo;
}

// ── Conexión ─────────────────────────────────────────────────────────────────
$conn = conexion();
if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar a la base de datos']);
    exit;
}

$ejecutar          = isset($_GET['ejecutar']) && ((int)$_GET['ejecutar'] === 1);
$id_factura_target = isset($_GET['id_factura']) ? (int)$_GET['id_factura'] : 0;

// ── Query ────────────────────────────────────────────────────────────────────
$where = "WHERE LENGTH(f.clave_acceso_factura) = 49";
if ($id_factura_target > 0) {
    $where .= " AND f.id_factura = " . (int)$id_factura_target;
}

$sql = "
    SELECT f.id_factura,
           f.numero_factura,
           f.punto_emision_factura,
           f.clave_acceso_factura,
           f.nombre_cliente_factura,
           s.punto_emision_sucursal
    FROM factura f
    LEFT JOIN sucursal2 s ON s.suc_codigo_sucursal = f.id_fksucursal_factura
    $where
    ORDER BY f.id_factura DESC
";

$res = $conn->query($sql);
if (!$res) {
    echo json_encode(['success' => false, 'error' => $conn->error]);
    exit;
}

$corregidos = [];
$sin_cambio = [];

while ($row = $res->fetch_assoc()) {
    $id_factura    = (int)$row['id_factura'];
    $claveOriginal = $row['clave_acceso_factura'];
    $numFactura    = (int)$row['numero_factura'];     // ← FUENTE DE VERDAD

    // Secuencial actual en la clave (posiciones 30-38, 9 dígitos)
    $secuencialEnClave = (int)substr($claveOriginal, 30, 9);

    // Si ya coincide, no hace falta reparar
    if ($secuencialEnClave === $numFactura) {
        $sin_cambio[] = $id_factura;
        continue;
    }

    // Construir los primeros 48 dígitos con el secuencial correcto
    $parte1         = substr($claveOriginal, 0, 30);               // fecha+tipoDoc+RUC+ambiente+estab+ptoEmi (30 chars)
    $nuevoSecuencial = str_pad($numFactura, 9, '0', STR_PAD_LEFT);  // 9 dígitos
    $codigoNumerico = substr($claveOriginal, 39, 8);               // Código numérico (8 dígitos, posiciones 39-46)
    $clave48         = $parte1 . $nuevoSecuencial . $codigoNumerico; // 48 dígitos

    // Recalcular dígito verificador con Módulo 11
    $digitoVerificador = calcularDigitoVerificadorSRI($clave48);
    $claveNueva        = $clave48 . $digitoVerificador;             // 49 dígitos

    $item = [
        'id_factura'          => $id_factura,
        'cliente'             => $row['nombre_cliente_factura'],
        'numero_factura_bd'   => $numFactura,
        'secuencial_bd'       => sprintf("%s-%s-%09d",
                                    $row['punto_emision_sucursal'],
                                    $row['punto_emision_factura'],
                                    $numFactura),
        'clave_original'      => $claveOriginal,
        'secuencial_en_clave' => sprintf('%09d', $secuencialEnClave),
        'clave_reparada'      => $claveNueva,
        'estado'              => $ejecutar ? 'REPARADO' : 'PENDIENTE (Simulación)'
    ];

    if ($ejecutar) {
        $stmt = $conn->prepare("UPDATE factura SET clave_acceso_factura = ? WHERE id_factura = ?");
        if ($stmt) {
            $stmt->bind_param('si', $claveNueva, $id_factura);
            $stmt->execute();
            $stmt->close();
        } else {
            $item['error_sql'] = $conn->error;
        }
    }

    $corregidos[] = $item;
}

$conn->close();

echo json_encode([
    'success'                       => true,
    'modo'                          => $ejecutar ? 'EJECUCION_REAL' : 'SIMULACION',
    'total_evaluadas'               => count($corregidos) + count($sin_cambio),
    'con_descalce'                  => count($corregidos),
    'sin_cambio'                    => count($sin_cambio),
    'detalle'                       => $corregidos,
    'instruccion'                   => $ejecutar
        ? 'Claves de acceso corregidas en la BD.'
        : 'Para aplicar los cambios añada ?ejecutar=1 a la URL.'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

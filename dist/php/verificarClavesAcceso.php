<?php
/**
 * verificarClavesAcceso.php
 * Script PHP de diagnóstico para verificar la consistencia entre:
 * - numero_factura (secuencial en BD)
 * - clave_acceso_factura (clave SRI de 49 dígitos)
 * - id_fkguia_factura y numero_guia
 *
 * Se puede invocar por GET:
 *   /php/verificarClavesAcceso.php?id_factura=48
 *   /php/verificarClavesAcceso.php?buscar=004-010-23
 *   /php/verificarClavesAcceso.php?todas=1 (Audita las últimas 50 facturas)
 */

ob_start();
require_once('db.php');
ini_set('display_errors', 1);
error_reporting(E_ALL);
ob_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$conn = conexion();
if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar a la base de datos']);
    exit;
}

$id_factura = isset($_GET['id_factura']) ? (int)$_GET['id_factura'] : 0;
$buscar = isset($_GET['buscar']) ? trim($_GET['buscar']) : '';
$todas = isset($_GET['todas']) ? (int)$_GET['todas'] : 0;

$where = "WHERE 1=1";
$params = [];
$types = "";

if ($id_factura > 0) {
    $where .= " AND f.id_factura = ?";
    $params[] = $id_factura;
    $types .= "i";
} elseif (!empty($buscar)) {
    $clean = preg_replace('/\D/', '', $buscar);
    $sec = (int)$clean;
    $where .= " AND (f.numero_factura = ? OR f.clave_acceso_factura LIKE ? OR f.id_factura = ?)";
    $params[] = $sec;
    $params[] = "%$clean%";
    $params[] = $sec;
    $types .= "isi";
} else {
    $where .= " ORDER BY f.id_factura DESC LIMIT 50";
}

$sql = "
    SELECT 
        f.id_factura,
        f.fecha_factura,
        f.numero_factura,
        f.punto_emision_factura,
        s.punto_emision_sucursal,
        f.clave_acceso_factura,
        f.estado_sri,
        f.id_fkguia_factura,
        g.numero_guia,
        g.punto_emision_guia,
        sg.punto_emision_sucursal as punto_emision_sucursal_guia,
        f.nombre_cliente_factura,
        f.total_factura
    FROM factura f
    LEFT JOIN sucursal2 s ON s.suc_codigo_sucursal = f.id_fksucursal_factura
    LEFT JOIN guia g ON g.id_guia = f.id_fkguia_factura
    LEFT JOIN sucursal2 sg ON sg.suc_codigo_sucursal = g.sucursal_guia
    $where
";

$stmt = $conn->prepare($sql);
if (!empty($types)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$res = $stmt->get_result();

$analisis = [];

while ($row = $res->fetch_assoc()) {
    $clave = $row['clave_acceso_factura'] ?? '';
    $claveValida = (strlen($clave) === 49);

    $estabClave = $claveValida ? substr($clave, 24, 3) : null;
    $ptoEmiClave = $claveValida ? substr($clave, 27, 3) : null;
    $secuencialClave = $claveValida ? substr($clave, 30, 9) : null;
    $secuencialClaveInt = $claveValida ? (int)$secuencialClave : null;

    $numFacturaBD = (int)$row['numero_factura'];
    $secuencialFormateadoBD = sprintf("%s-%s-%09d", $row['punto_emision_sucursal'], $row['punto_emision_factura'], $numFacturaBD);

    $descalceSecuencial = false;
    if ($claveValida && $secuencialClaveInt !== $numFacturaBD) {
        $descalceSecuencial = true;
    }

    $numGuiaBD = sprintf("%s-%s-%09d", $row['punto_emision_sucursal_guia'], $row['punto_emision_guia'], (int)$row['numero_guia']);

    $analisis[] = [
        'id_factura' => (int)$row['id_factura'],
        'fecha' => $row['fecha_factura'],
        'cliente' => $row['nombre_cliente_factura'],
        'total' => (float)$row['total_factura'],
        'estado_sri' => $row['estado_sri'],
        'secuencial_bd' => $secuencialFormateadoBD,
        'numero_factura_bd' => $numFacturaBD,
        'clave_acceso_sri' => $clave,
        'clave_desglosada' => $claveValida ? [
            'establecimiento' => $estabClave,
            'punto_emision' => $ptoEmiClave,
            'secuencial' => $secuencialClave,
            'secuencial_num' => $secuencialClaveInt
        ] : 'Clave no tiene 49 dígitos',
        'descalce_secuencial_detectado' => $descalceSecuencial,
        'explicacion' => $descalceSecuencial 
            ? "¡ATENCIÓN! La clave de acceso del SRI contiene el secuencial N° $secuencialClaveInt ($secuencialClave), pero el campo numero_factura en la BD tiene guardado N° $numFacturaBD." 
            : "Consistente. El secuencial en BD coincide con la clave de acceso del SRI.",
        'guia_asociada' => [
            'id_guia' => (int)$row['id_fkguia_factura'],
            'codigo_guia' => $numGuiaBD
        ]
    ];
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'total_analizados' => count($analisis),
    'resultados' => $analisis
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

<?php
/**
 * repararClavesAcceso.php
 * Script PHP de mantenimiento para reparar automáticamente los descalces entre:
 * - El secuencial contenido en la clave_acceso_factura (49 dígitos SRI)
 * - El campo numero_factura en la tabla factura
 * - El punto_emision_factura y la sucursal de la factura
 *
 * Modo de uso:
 *   GET /php/repararClavesAcceso.php            (Modo Simulación / Audit - Muestra qué cambiaría)
 *   GET /php/repararClavesAcceso.php?ejecutar=1 (Modo Corrección Real - Aplica UPDATE en BD)
 *   GET /php/repararClavesAcceso.php?id_factura=48&ejecutar=1 (Modo Corrección de una factura específica)
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

$ejecutar = isset($_GET['ejecutar']) && ((int)$_GET['ejecutar'] === 1 || $_GET['ejecutar'] === 'true');
$id_factura_target = isset($_GET['id_factura']) ? (int)$_GET['id_factura'] : 0;

$where = "WHERE LENGTH(f.clave_acceso_factura) = 49 AND f.estado_factura IN (1, 4)";
if ($id_factura_target > 0) {
    $where .= " AND f.id_factura = $id_factura_target";
}

$sql = "
    SELECT 
        f.id_factura,
        f.numero_factura,
        f.punto_emision_factura,
        f.id_fksucursal_factura,
        s.punto_emision_sucursal,
        f.clave_acceso_factura,
        f.estado_sri,
        f.nombre_cliente_factura
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
    $id_factura = (int)$row['id_factura'];
    $clave = $row['clave_acceso_factura'];
    
    // Extraer valores desde la clave de acceso de 49 dígitos del SRI:
    // Posiciones en string 1-indexed (0-indexed en PHP):
    // RUC (10-22) -> substr(9, 13)
    // TipoDoc (23-24) -> substr(22, 2)
    // Estab (25-27) -> substr(24, 3)
    // PtoEmi (28-30) -> substr(27, 3)
    // Secuencial (31-39) -> substr(30, 9)
    $estabClave = substr($clave, 24, 3);
    $ptoEmiClave = substr($clave, 27, 3);
    $secuencialClaveStr = substr($clave, 30, 9);
    $secuencialClaveInt = (int)$secuencialClaveStr;

    $numFacturaBD = (int)$row['numero_factura'];
    $ptoEmiBD = $row['punto_emision_factura'];

    $necesitaReparacion = false;
    $motivo = [];

    if ($secuencialClaveInt !== $numFacturaBD) {
        $necesitaReparacion = true;
        $motivo[] = "numero_factura BD era $numFacturaBD y en clave SRI es $secuencialClaveInt";
    }

    if ($ptoEmiClave !== $ptoEmiBD) {
        $necesitaReparacion = true;
        $motivo[] = "punto_emision_factura BD era '$ptoEmiBD' y en clave SRI es '$ptoEmiClave'";
    }

    if ($necesitaReparacion) {
        $item = [
            'id_factura' => $id_factura,
            'cliente' => $row['nombre_cliente_factura'],
            'clave_acceso_sri' => $clave,
            'valores_anteriores' => [
                'numero_factura' => $numFacturaBD,
                'punto_emision_factura' => $ptoEmiBD,
                'secuencial_formateado' => sprintf("%s-%s-%09d", $row['punto_emision_sucursal'], $ptoEmiBD, $numFacturaBD)
            ],
            'valores_corregidos' => [
                'numero_factura' => $secuencialClaveInt,
                'punto_emision_factura' => $ptoEmiClave,
                'secuencial_formateado' => sprintf("%s-%s-%09d", $estabClave, $ptoEmiClave, $secuencialClaveInt)
            ],
            'motivos' => implode(' | ', $motivo),
            'estado_ejecucion' => $ejecutar ? 'REPARADO' : 'PENDIENTE (Simulación)'
        ];

        if ($ejecutar) {
            $stmtUpd = $conn->prepare("UPDATE factura SET numero_factura = ?, punto_emision_factura = ? WHERE id_factura = ?");
            if ($stmtUpd) {
                $stmtUpd->bind_param("isi", $secuencialClaveInt, $ptoEmiClave, $id_factura);
                $stmtUpd->execute();
                $stmtUpd->close();
            } else {
                $item['error_sql'] = $conn->error;
            }
        }

        $corregidos[] = $item;
    } else {
        $sin_cambio[] = $id_factura;
    }
}

$conn->close();

echo json_encode([
    'success' => true,
    'modo' => $ejecutar ? 'EJECUCION_REAL' : 'SIMULACION_PREVIA',
    'total_evaluadas' => count($corregidos) + count($sin_cambio),
    'facturas_descalzadas_encontradas' => count($corregidos),
    'detalle_reparaciones' => $corregidos,
    'mensaje_ayuda' => $ejecutar 
        ? "Las facturas descalzadas han sido corregidas en la base de datos." 
        : "Para aplicar las correcciones en la BD, agregue ?ejecutar=1 a la URL."
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

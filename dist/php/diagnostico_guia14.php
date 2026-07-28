<?php
header('Content-Type: application/json');
require_once('db.php');
$conn = conexion();

$res = [
    'guias_con_secuencial_14' => [],
    'facturas_con_secuencial_14' => [],
    'guia_id_39' => [],
    'factura_id_39' => [],
    'detalles_guia_39' => [],
    'detalles_factura_39' => []
];

// 1. Guias con numero_guia = 14
$r1 = mysqli_query($conn, "SELECT * FROM guia WHERE numero_guia = 14 OR numero_guia = '000000014'");
if ($r1) { while($row = mysqli_fetch_assoc($r1)) { $res['guias_con_secuencial_14'][] = $row; } }

// 2. Facturas con numero_factura = 14
$r2 = mysqli_query($conn, "SELECT * FROM factura WHERE numero_factura = 14 OR numero_factura = '000000014'");
if ($r2) { while($row = mysqli_fetch_assoc($r2)) { $res['facturas_con_secuencial_14'][] = $row; } }

// 3. Guia id 39
$r3 = mysqli_query($conn, "SELECT * FROM guia WHERE id_guia = 39");
if ($r3) { while($row = mysqli_fetch_assoc($r3)) { $res['guia_id_39'][] = $row; } }

// 4. Factura id 39
$r4 = mysqli_query($conn, "SELECT * FROM factura WHERE id_factura = 39");
if ($r4) { while($row = mysqli_fetch_assoc($r4)) { $res['factura_id_39'][] = $row; } }

// 5. Detalles de guia 39 y de guia con numero 14
$r5 = mysqli_query($conn, "SELECT * FROM detalle_guia WHERE id_fkguia_detalle_envio IN (39, (SELECT id_guia FROM guia WHERE numero_guia = 14 LIMIT 1))");
if ($r5) { while($row = mysqli_fetch_assoc($r5)) { $res['detalles_guia_39'][] = $row; } }

// 6. Detalles de factura 39
$r6 = mysqli_query($conn, "SELECT * FROM factura_detalle WHERE id_fkfactura_factura_detalle = 39");
if ($r6) { while($row = mysqli_fetch_assoc($r6)) { $res['detalles_factura_39'][] = $row; } }

echo json_encode($res, JSON_PRETTY_PRINT);
?>

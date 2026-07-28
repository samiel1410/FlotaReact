<?php
header('Content-Type: application/json');
require_once('db.php');
$conn = conexion();

$res = [
    'guias_cliente_altamirano' => [],
    'guias_monto_22_50' => [],
    'detalles_monto_22_50_o_6_cant' => [],
    'guias_creadas_22_y_23_julio' => []
];

// 1. Guias del cliente IMPORTADORA ALTAMIRANO E HIJOS (RUC 1891764649001)
$r1 = mysqli_query($conn, "SELECT g.*, (SELECT COUNT(*) FROM detalle_guia dg WHERE dg.id_fkguia_detalle_envio = g.id_guia) as num_detalles FROM guia g WHERE cedula_cliente_remitente = '1891764649001' OR cedula_cliente_receptor = '1891764649001' OR nombre_cliente_remitente LIKE '%ALTAMIRANO%' ORDER BY id_guia DESC LIMIT 50");
if ($r1) { while($row = mysqli_fetch_assoc($r1)) { $res['guias_cliente_altamirano'][] = $row; } }

// 2. Guias con monto total = 22.50
$r2 = mysqli_query($conn, "SELECT * FROM guia WHERE total_guia = '22.50' OR total_guia = '22.5' OR subtotal_guia = '22.50' OR subtotal_guia = '22.5' ORDER BY id_guia DESC LIMIT 50");
if ($r2) { while($row = mysqli_fetch_assoc($r2)) { $res['guias_monto_22_50'][] = $row; } }

// 3. Detalles de guia con cantidad = 6 o total = 22.50
$r3 = mysqli_query($conn, "SELECT * FROM detalle_guia WHERE cantidad_detalle_guia = '6' OR total_detalle_guia = '22.5' OR total_detalle_guia = '22.50' ORDER BY id_detalle_guia DESC LIMIT 50");
if ($r3) { while($row = mysqli_fetch_assoc($r3)) { $res['detalles_monto_22_50_o_6_cant'][] = $row; } }

// 4. Guias creadas el 22 o 23 de julio de 2026
$r4 = mysqli_query($conn, "SELECT id_guia, numero_guia, punto_emision_guia, total_guia, fecha_guia, fecha_creacion_guia, nombre_cliente_remitente, nombre_cliente_receptor, observacion_guia FROM guia WHERE DATE(fecha_creacion_guia) BETWEEN '2026-07-22' AND '2026-07-23' ORDER BY id_guia DESC LIMIT 50");
if ($r4) { while($row = mysqli_fetch_assoc($r4)) { $res['guias_creadas_22_y_23_julio'][] = $row; } }

echo json_encode($res, JSON_PRETTY_PRINT);
?>

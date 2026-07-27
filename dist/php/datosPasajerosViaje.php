<?php
require_once("db.php");
header('Content-Type: application/json; charset=utf-8');

$id_viaje = isset($_GET['id_viaje']) ? intval($_GET['id_viaje']) : 0;

if ($id_viaje <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Parámetro id_viaje requerido.'
    ]);
    exit;
}

try {
    $conn = conexion();

    // 1. Datos principales del viaje y chofer/bus
    $query_info = "SELECT
        v.id_viajes,
        v.dia_viajes,
        v.hora_salida_estimado,
        r.nombre_rutas,
        b.disco_buses,
        b.placa_buses,
        p.per_cedula_personal,
        CONCAT(p.per_nombres_persona, ' ', p.per_apellidos_personal) AS nombre_chofer,
        d.fecha_salida_despacho_viaje,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario_despacho
    FROM viajes v
    LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
    LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
    LEFT JOIN personal p ON b.id_fkpersonal_buses = p.id_personal
    LEFT JOIN despacho_viaje d ON v.id_viajes = d.id_fkviaje_despacho_viaje
    LEFT JOIN usuario u ON d.id_fkusuario_aprueba = u.id_usuario
    WHERE v.id_viajes = $id_viaje LIMIT 1";

    $res_info = mysqli_query($conn, $query_info) or die(mysqli_error($conn));
    $info = mysqli_fetch_assoc($res_info);

    // 2. Detalle de pasajeros del viaje
    $query_pasajeros = "SELECT
        bd.asiento_boleto_detalle AS asiento,
        bd.identificacion_boleto_detalle AS cedula,
        bd.nombre_cliente_boleto_detalle AS pasajero,
        COALESCE(d.lugar_destino, sr.nombre_sub_rutas, 'N/A') AS destino,
        bd.total_boleto_detalle AS valor,
        b.nombre_origen AS embarque,
        COALESCE(s.nombre_sucursal, s2.nombre_sucursal, 'OFICINA PRINCIPAL') AS oficina_venta
    FROM boleto_detalle bd
    JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
    LEFT JOIN destino d ON bd.id_destino_boleto = d.id_destino
    LEFT JOIN sub_rutas sr ON bd.id_destino_boleto = sr.id_sub_rutas
    LEFT JOIN sucursal2 s ON b.id_sucursal_venta = s.id_sucursal
    LEFT JOIN sucursal2 s2 ON b.id_sucursal_venta = s2.suc_codigo_sucursal
    WHERE b.id_fkviaje_boleto = $id_viaje
    ORDER BY s.nombre_sucursal ASC, b.nombre_origen ASC, CAST(bd.asiento_boleto_detalle AS UNSIGNED) ASC";

    $res_pasajeros = mysqli_query($conn, $query_pasajeros) or die(mysqli_error($conn));

    $pasajeros = [];
    $total_recaudado = 0;

    while ($row = mysqli_fetch_assoc($res_pasajeros)) {
        $row['valor'] = floatval($row['valor']);
        $total_recaudado += $row['valor'];
        $pasajeros[] = $row;
    }

    echo json_encode([
        'success' => true,
        'viaje' => $info,
        'total_pasajeros' => count($pasajeros),
        'total_recaudado' => round($total_recaudado, 2),
        'pasajeros' => $pasajeros
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

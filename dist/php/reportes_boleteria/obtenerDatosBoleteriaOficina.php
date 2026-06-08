<?php

require_once("../db.php");

try {
    // Obtener parámetros siguiendo patrones FlotaFront
    $sucursal = $_POST['sucursal'] ?? '';
    $oficinista = $_POST['oficinista'] ?? '';
    $fecha_inicio = $_POST['fecha_inicio'] ?? '';
    $fecha_fin = $_POST['fecha_fin'] ?? '';
    $estado = $_POST['estado'] ?? '';

    // Validar parámetros requeridos
    if (empty($sucursal) || empty($fecha_inicio) || empty($fecha_fin)) {
        throw new Exception('Parámetros requeridos faltantes.');
    }

    // Conexión a base de datos siguiendo patrones FlotaFront
    $conn = conexion();

    // Construir consulta SQL con filtros dinámicos
    $sql = "SELECT 
                b.id_boleto,
                DATE_FORMAT(b.fecha_boleto, '%Y-%m-%d %H:%i') as fecha_boleto,
                u.nombre_usuario as oficinista,
                s.nombre_sucursal,
                bd.identificacion_boleto_detalle,
                bd.nombre_cliente_boleto_detalle,
                bd.asiento_boleto_detalle,
                COALESCE(d.lugar_destino, (SELECT nombre_sub_rutas FROM sub_rutas sr WHERE sr.id_sub_rutas = bd.id_destino_boleto LIMIT 1)) as lugar_destino,
                bd.total_boleto_detalle,
                CASE 
                    WHEN bd.estado_boleto_detalle = 0 THEN 'Activo'
                    ELSE 'Anulado'
                END as estado,
                r.nombre_rutas as ruta
            FROM boletos b
            INNER JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
            INNER JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
            INNER JOIN sucursal2 s ON u.id_fksucursal_usuario = s.suc_codigo_sucursal
            LEFT JOIN destino d ON bd.id_destino_boleto = d.id_destino
            INNER JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
            INNER JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
            WHERE s.suc_codigo_sucursal = '$sucursal' 
            AND DATE(b.fecha_boleto) BETWEEN '$fecha_inicio' AND '$fecha_fin'";

    // Filtros adicionales
    if (!empty($oficinista)) {
        $sql .= " AND u.id_usuario = '$oficinista'";
    }

    if ($estado !== '') {
        $sql .= " AND bd.estado_boleto_detalle = '$estado'";
    }

    $sql .= " ORDER BY b.fecha_boleto DESC, b.id_boleto ASC";


    // Ejecutar consulta
    $result = mysqli_query($conn, $sql);

    if (!$result) {
        throw new Exception('Error en la consulta: ' . mysqli_error($conn));
    }

    // Procesar datos y calcular resumen
    $datos = [];
    $total_recaudado = 0;
    $boletos_activos = 0;
    $boletos_anulados = 0;

    while ($row = mysqli_fetch_assoc($result)) {
        $datos[] = $row;

        if ($row['estado'] == 'Activo') {
            $total_recaudado += $row['total_boleto_detalle'];
            $boletos_activos++;
        } else {
            $boletos_anulados++;
        }
    }

    // Obtener información adicional
    $info_sql = "SELECT nombre_sucursal FROM sucursal2 WHERE suc_codigo_sucursal = '$sucursal'";
    $info_result = mysqli_query($conn, $info_sql);
    $info_sucursal = mysqli_fetch_assoc($info_result);

    $oficinista_nombre = 'Todos';
    if (!empty($oficinista)) {
        $ofi_sql = "SELECT nombre_usuario FROM usuario WHERE id_usuario = '$oficinista'";
        $ofi_result = mysqli_query($conn, $ofi_sql);
        $ofi_data = mysqli_fetch_assoc($ofi_result);
        $oficinista_nombre = $ofi_data['nombre_usuario'] ?? 'Desconocido';
    }

    // Respuesta JSON según patrones FlotaFront
    $response = [
        'success' => true,
        'datos' => $datos,
        'resumen' => [
            'nombre_sucursal' => $info_sucursal['nombre_sucursal'],
            'nombre_oficinista' => $oficinista_nombre,
            'total_boletos' => count($datos),
            'boletos_activos' => $boletos_activos,
            'boletos_anulados' => $boletos_anulados,
            'total_recaudado' => $total_recaudado
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    $response = [
        'success' => false,
        'mensaje' => 'Error al obtener datos: ' . $e->getMessage()
    ];

    echo json_encode($response);
}
?>
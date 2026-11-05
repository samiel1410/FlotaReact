<?php
/**
 * Datos compartidos para la impresión de boletos.
 *
 * Centraliza las consultas y la normalización de datos para que el ticket
 * térmico (boletoFactura.php) y el formato A4 (boletoFacturaA4.php) impriman
 * exactamente la misma información.
 */

function formatearFechaEspanol($fecha)
{
    $fechaObj = DateTime::createFromFormat('Y-m-d', $fecha);

    if (!$fechaObj) {
        $fechaObj = DateTime::createFromFormat('d/m/Y', $fecha);
    }
    if (!$fechaObj) {
        try {
            $fechaObj = new DateTime($fecha);
        } catch (Exception $e) {
            $fechaObj = false;
        }
    }

    if (!$fechaObj) {
        return $fecha; // Fallback a retornar la cadena original
    }

    $dias = [
        'domingo',
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado'
    ];

    $meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre'
    ];

    $nombreDia = $dias[$fechaObj->format('w')];
    $nombreMes = $meses[$fechaObj->format('n') - 1];
    $diaNumero = $fechaObj->format('d');
    $anio = $fechaObj->format('Y');

    return ucfirst($nombreDia) . ', ' . $diaNumero . ' de ' . $nombreMes . ' ' . $anio;
}

function extraerDestinoLimpio($candidato)
{
    if (empty($candidato)) {
        return '';
    }
    $cand = trim((string)$candidato);
    if ($cand === '' || $cand === '—' || $cand === '-' || is_numeric($cand)) {
        return '';
    }
    if (strpos(strtoupper($cand), 'SIN DESTINO') !== false) {
        return '';
    }
    if (strpos(strtoupper($cand), 'S/N - S/N') !== false) {
        return '';
    }
    if (preg_match('/^ID\s+\d+\s*-\s*ID\s+\d+$/i', $cand)) {
        return '';
    }
    if (preg_match('/^\d+\s*-\s*\d+$/', $cand)) {
        return '';
    }

    // Limpiar posibles precios adjuntos al final (ej: "Quito - Latacunga - $3.13" -> "Quito - Latacunga")
    $cand = preg_replace('/\s*-\s*\$\s*[\d\.,]+\s*$/i', '', $cand);
    $cand = preg_replace('/\s*\$\s*[\d\.,]+\s*$/i', '', $cand);

    return trim($cand);
}

/**
 * ¿La tabla tiene la columna? El punto final se agregó después, así que en
 * bases sin la migración el boleto debe seguir imprimiéndose igual.
 */
function existe_columna_boleto($conn, $tabla, $columna)
{
    static $cache = [];
    $clave = $tabla . '.' . $columna;
    if (array_key_exists($clave, $cache)) {
        return $cache[$clave];
    }
    $cache[$clave] = false;
    $tablaSegura = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    $columnaSegura = preg_replace('/[^a-zA-Z0-9_]/', '', $columna);
    $res = @mysqli_query($conn, "SHOW COLUMNS FROM `{$tablaSegura}` LIKE '{$columnaSegura}'");
    if ($res && mysqli_num_rows($res) > 0) {
        $cache[$clave] = true;
    }
    return $cache[$clave];
}

/**
 * Verifica que exista una tabla (para bases sin la migración de tasas).
 */
function existe_tabla_boleto($conn, $tabla)
{
    static $cache = [];
    if (array_key_exists($tabla, $cache)) {
        return $cache[$tabla];
    }
    $tablaSegura = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    $res = @mysqli_query($conn, "SHOW TABLES LIKE '{$tablaSegura}'");
    $cache[$tabla] = ($res && mysqli_num_rows($res) > 0);
    return $cache[$tabla];
}

/**
 * Texto de los productos que el pasajero debe retirar.
 * Recibe [['nombre' => 'Agua', 'cantidad' => 2]] y devuelve "2 AGUAS".
 */
function texto_retirar_productos($productos)
{
    $partes = [];
    foreach ($productos as $producto) {
        $cantidad = (int)($producto['cantidad'] ?? 0);
        $nombre = trim(mb_strtoupper((string)($producto['nombre'] ?? ''), 'UTF-8'));
        if ($cantidad <= 0 || $nombre === '') {
            continue;
        }
        // Plural simple: AGUA -> AGUAS, ALMUERZO -> ALMUERZOS.
        if ($cantidad > 1 && substr($nombre, -1) !== 'S') {
            $nombre .= 'S';
        }
        $partes[] = $cantidad . ' ' . $nombre;
    }
    return implode(' + ', $partes);
}

/**
 * Texto del punto final a imprimir: destino real vendido cuando la agencia
 * vende más allá de la última parada de la ruta (ej. ruta Ambato - Coca
 * vendida hasta Aguagrio, o Coca - Guayaquil continuando en Ambato).
 */
function unir_destino_con_punto_final($destinoBase, $puntoFinal)
{
    $base = trim((string)$destinoBase);
    $final = trim((string)$puntoFinal);
    if ($final === '') {
        return $base;
    }
    if ($base === '' || strcasecmp($base, $final) === 0) {
        return $final;
    }
    // Evita duplicar cuando el destino ya contiene el punto final escrito.
    if (stripos($base, $final) !== false) {
        return $base;
    }
    return $base . ' / ' . $final;
}

function obtener_datos_factura($id_boleto, $conn)
{
    $id_boleto_esc = (int)$id_boleto;
    if ($id_boleto_esc <= 0) {
        throw new Exception("ID de boleto no válido: {$id_boleto}");
    }

    $tieneTasas = existe_tabla_boleto($conn, 'boleto_tasas');
    $selectGeneraTasa = existe_columna_boleto($conn, 'sucursal2', 'genera_tasa')
        ? 's.genera_tasa,'
        : '0 AS genera_tasa,';

    $query_boleto = "SELECT
b.id_boleto, b.identificacion_boleto, b.nombres_boleto, b.observacion_boleto,
b.fecha_boleto, b.total_boleto, b.numero_boleto,
b.punto_emision_boleto, b.sucursal_emision_boleto, b.id_fkviaje_boleto,
b.nombre_origen, b.nombre_destino, b.origen_boleto, b.destino_boleto, b.id_fksubruta_boleto,
" . (existe_columna_boleto($conn, 'boletos', 'punto_final_boleto')
        ? "b.punto_final_boleto,"
        : "NULL AS punto_final_boleto,") . "
b.clave_acceso_boletos, b.fecha_creacion_boleto,
b.id_sucursal_venta, b.id_fksucursal_boleto,
$selectGeneraTasa
s.nombre_sucursal, s.direccion_sucursal, u.nombre_usuario, bu.disco_buses, bu.placa_buses,
r.nombre_rutas, r.andes_rutas, r.piso_rutas, r.id_fkdestino_rutas, b.celular_boleto, b.tipo_boleto, b.estado_boleto,
sr.nombre_sub_rutas, sr.anden_sub_rutas, sr.piso_sub_rutas, sr.fecha_salida, sr.hora_salida, sr.id_fkdestino_sub_rutas,
d_sr.nombre_destino as destino_sr_nombre, d_sr.lugar_destino as destino_sr_lugar,
d_bol.nombre_destino as destino_bol_nombre, d_bol.lugar_destino as destino_bol_lugar,
d_ruta.nombre_destino as destino_ruta_nombre, d_ruta.lugar_destino as destino_ruta_lugar,
v.incluye_alimentos, v.hora_origen_salida, v.fecha_cierre,
(SELECT GROUP_CONCAT(nombre_alimentos SEPARATOR ', ')
FROM alimentos
WHERE FIND_IN_SET(id_alimentos, REPLACE(v.id_fkalimento_viajes, ' ', ''))) as nombres_alimentos
FROM boletos b
LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
LEFT JOIN sucursal2 s ON u.id_fksucursal_usuario = s.suc_codigo_sucursal
LEFT JOIN buses bu ON b.id_fkbus_boleto = bu.id_buses
LEFT JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
LEFT JOIN sub_rutas sr ON b.id_fksubruta_boleto = sr.id_sub_rutas
LEFT JOIN destino d_sr ON sr.id_fkdestino_sub_rutas = d_sr.id_destino
LEFT JOIN destino d_bol ON b.destino_boleto = d_bol.id_destino
LEFT JOIN destino d_ruta ON r.id_fkdestino_rutas = d_ruta.id_destino
WHERE b.id_boleto = $id_boleto_esc";

    $recuperar_boleto = mysqli_query($conn, $query_boleto);
    if (!$recuperar_boleto) {
        throw new Exception("Error en consulta de boleto: " . mysqli_error($conn));
    }
    $boleto = mysqli_fetch_assoc($recuperar_boleto);
    if (!$boleto) {
        throw new Exception("Boleto #{$id_boleto_esc} no encontrado");
    }

    $query_detalles = "SELECT
bd.asiento_boleto_detalle, bd.precio_boleto_detalle,
bd.descuento_boleto_detalle, bd.iva_boleto_detalle,
bd.total_boleto_detalle, bd.tarifa_boleto_detalle,
bd.nombre_cliente_boleto_detalle,
bd.identificacion_boleto_detalle,
bd.incluye_alimento_boleto_detalle,
bd.precio_alimento_boleto_detalle,
" . (existe_columna_boleto($conn, 'boleto_detalle', 'id_fkalimento_boleto_detalle')
        ? "bd.id_fkalimento_boleto_detalle,"
        : "NULL AS id_fkalimento_boleto_detalle,") . "
" . (existe_columna_boleto($conn, 'boleto_detalle', 'costo_socio_alimento_boleto_detalle')
        ? "bd.costo_socio_alimento_boleto_detalle,"
        : "0 AS costo_socio_alimento_boleto_detalle,") . "
bd.id_destino_boleto,
" . (existe_columna_boleto($conn, 'boleto_detalle', 'punto_final_boleto_detalle')
        ? "bd.punto_final_boleto_detalle,"
        : "NULL AS punto_final_boleto_detalle,") . "
" . ($tieneTasas
        ? "t.tasa AS tasa_boleto, t.tasa_valor AS tasa_valor_boleto,
           t.clave_acceso_tasa AS clave_acceso_tasa_boleto,
           t.numero_documento_tasa AS numero_documento_tasa_boleto,"
        : "NULL AS tasa_boleto, 0 AS tasa_valor_boleto,
           NULL AS clave_acceso_tasa_boleto, NULL AS numero_documento_tasa_boleto,") . "
sr_det.nombre_sub_rutas as subruta_detalle_nombre,
d_det_sr.nombre_destino as destino_det_sr_nombre,
d_det_sr.lugar_destino as destino_det_sr_lugar,
d_det.nombre_destino as destino_det_nombre,
d_det.lugar_destino as destino_det_lugar
FROM boleto_detalle bd
LEFT JOIN sub_rutas sr_det ON bd.id_destino_boleto = sr_det.id_sub_rutas
LEFT JOIN destino d_det_sr ON sr_det.id_fkdestino_sub_rutas = d_det_sr.id_destino
LEFT JOIN destino d_det ON bd.id_destino_boleto = d_det.id_destino
" . ($tieneTasas ? "LEFT JOIN boleto_tasas t ON t.id_fkdetalle_boleto_tasa = bd.id_boleto_detalle" : "") . "
WHERE bd.id_fkboleto_boleto_detalle = $id_boleto_esc
ORDER BY bd.id_boleto_detalle ASC";

    $recuperar_detalles = mysqli_query($conn, $query_detalles);
    $detalles = [];
    if ($recuperar_detalles) {
        while ($detalle = mysqli_fetch_assoc($recuperar_detalles)) {
            $detalles[] = $detalle;
        }
    }

    // Si por alguna razón no hay registros en boleto_detalle, crear uno por defecto desde el boleto
    if (empty($detalles)) {
        $detalles[] = [
            'asiento_boleto_detalle' => '1',
            'precio_boleto_detalle' => (float)($boleto['total_boleto'] ?? 0),
            'descuento_boleto_detalle' => 0,
            'iva_boleto_detalle' => 0,
            'total_boleto_detalle' => (float)($boleto['total_boleto'] ?? 0),
            'tarifa_boleto_detalle' => 'Normal',
            'nombre_cliente_boleto_detalle' => $boleto['nombres_boleto'] ?? 'CLIENTE',
            'identificacion_boleto_detalle' => $boleto['identificacion_boleto'] ?? '',
            'incluye_alimento_boleto_detalle' => 0,
            'precio_alimento_boleto_detalle' => 0,
            'id_fkalimento_boleto_detalle' => null,
            'costo_socio_alimento_boleto_detalle' => 0,
            'tasa_boleto' => null,
            'tasa_valor_boleto' => 0,
            'clave_acceso_tasa_boleto' => null,
            'numero_documento_tasa_boleto' => null,
            'id_destino_boleto' => $boleto['destino_boleto'] ?? 0,
            'subruta_detalle_nombre' => $boleto['nombre_sub_rutas'] ?? '',
            'destino_det_sr_nombre' => $boleto['destino_sr_nombre'] ?? '',
            'destino_det_sr_lugar' => $boleto['destino_sr_lugar'] ?? '',
            'destino_det_nombre' => $boleto['destino_bol_nombre'] ?? '',
            'destino_det_lugar' => $boleto['destino_bol_lugar'] ?? ''
        ];
    }

    return [
        'boleto' => $boleto,
        'detalles' => $detalles
    ];
}

/**
 * Devuelve el destino general del boleto a partir del primer candidato válido.
 */
function resolver_destino_general($boleto)
{
    $candidatos = [
        $boleto['nombre_sub_rutas'] ?? '',
        $boleto['nombre_destino'] ?? '',
        $boleto['destino_sr_nombre'] ?? '',
        $boleto['destino_sr_lugar'] ?? '',
        $boleto['destino_bol_nombre'] ?? '',
        $boleto['destino_bol_lugar'] ?? '',
        $boleto['destino_boleto'] ?? '',
        $boleto['destino_ruta_nombre'] ?? '',
        $boleto['destino_ruta_lugar'] ?? '',
        $boleto['nombre_rutas'] ?? '',
    ];
    foreach ($candidatos as $candidato) {
        $destino = extraerDestinoLimpio($candidato);
        if ($destino !== '') {
            return $destino;
        }
    }
    return '';
}

/**
 * Destino impreso para un pasajero, anexando el punto final vendido por la
 * agencia cuando la venta va más allá de la última parada de la ruta.
 */
function resolver_destino_pasajero($detalle, $destinoGeneral, $puntoFinalBoleto)
{
    $destinoDetalle = '';
    foreach ([
        $detalle['subruta_detalle_nombre'] ?? '',
        $detalle['destino_det_nombre'] ?? '',
        $detalle['destino_det_lugar'] ?? '',
        $detalle['destino_det_sr_nombre'] ?? '',
        $detalle['destino_det_sr_lugar'] ?? '',
    ] as $candidato) {
        $destino = extraerDestinoLimpio($candidato);
        if ($destino !== '') {
            $destinoDetalle = $destino;
            break;
        }
    }

    $destinoBase = $destinoDetalle !== '' ? $destinoDetalle : $destinoGeneral;
    $puntoFinal = trim((string)($detalle['punto_final_boleto_detalle'] ?? ''));
    if ($puntoFinal === '') {
        $puntoFinal = trim((string)$puntoFinalBoleto);
    }

    $destino = strtoupper(unir_destino_con_punto_final($destinoBase, $puntoFinal));
    return $destino !== '' ? $destino : '—';
}

/**
 * Texto de los productos que el pasajero debe retirar (alimentos por asiento).
 *
 * Un producto se cuenta por cada asiento marcado con alimento. El producto se
 * guardó al vender; en ventas antiguas se busca el marcado para entrega por
 * asiento en la oficina que vendió.
 */
function obtener_texto_productos_retirar($conn, $boleto, $detalles)
{
    $asientosConAlimento = 0;
    $conteoProductos = [];
    foreach ($detalles as $detalle) {
        if ((int)($detalle['incluye_alimento_boleto_detalle'] ?? 0) !== 1) {
            continue;
        }
        $asientosConAlimento++;
        $idProducto = (int)($detalle['id_fkalimento_boleto_detalle'] ?? 0);
        $conteoProductos[$idProducto] = ($conteoProductos[$idProducto] ?? 0) + 1;
    }

    if ($asientosConAlimento <= 0) {
        return '';
    }

    $idSucursalVenta = (int)($boleto['id_sucursal_venta'] ?? $boleto['id_fksucursal_boleto'] ?? 0);
    $resMarcado = @mysqli_query(
        $conn,
        "SELECT a.id_alimentos, a.nombre_alimentos
           FROM inventario_sucursal i
           JOIN alimentos a ON a.id_alimentos = i.id_fkalimento
          WHERE i.id_fksucursal = {$idSucursalVenta}
            AND a.alimento_por_asiento = 1
          ORDER BY a.id_alimentos ASC"
    );
    if ($resMarcado) {
        while ($marcado = mysqli_fetch_assoc($resMarcado)) {
            $idMarcado = (int)$marcado['id_alimentos'];
            if (!isset($conteoProductos[$idMarcado])) {
                $conteoProductos[$idMarcado] = $asientosConAlimento;
            }
        }
    }

    $idsProductos = array_values(array_filter(array_keys($conteoProductos), fn($id) => (int)$id > 0));
    $nombresProducto = [];
    if (!empty($idsProductos)) {
        $resNombres = @mysqli_query(
            $conn,
            "SELECT id_alimentos, nombre_alimentos FROM alimentos
              WHERE id_alimentos IN (" . implode(',', array_map('intval', $idsProductos)) . ")"
        );
        if ($resNombres) {
            while ($fila = mysqli_fetch_assoc($resNombres)) {
                $nombresProducto[(int)$fila['id_alimentos']] = $fila['nombre_alimentos'];
            }
        }
    }

    $productosRetirar = [];
    foreach ($conteoProductos as $idProducto => $cantidad) {
        $nombreProducto = $nombresProducto[(int)$idProducto] ?? '';
        if ($nombreProducto === '') {
            continue;
        }
        // Un mismo producto puede venir del viaje y de la oficina: no se duplica.
        $yaListado = false;
        foreach ($productosRetirar as &$existente) {
            if (mb_strtoupper($existente['nombre'], 'UTF-8') === mb_strtoupper($nombreProducto, 'UTF-8')) {
                $existente['cantidad'] += $cantidad;
                $yaListado = true;
                break;
            }
        }
        unset($existente);
        if (!$yaListado) {
            $productosRetirar[] = ['nombre' => $nombreProducto, 'cantidad' => $cantidad];
        }
    }

    // Último respaldo: nombre del producto asignado al viaje.
    if (empty($productosRetirar) && !empty($boleto['nombres_alimentos'])) {
        $productosRetirar[] = [
            'nombre' => $boleto['nombres_alimentos'],
            'cantidad' => $asientosConAlimento,
        ];
    }

    return texto_retirar_productos($productosRetirar);
}

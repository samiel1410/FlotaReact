<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_viaje = (int)($_GET['id_viaje'] ?? $_GET['id_viajes'] ?? 0);

    $id_sucursal_filtro = (int)($_GET['id_sucursal'] ?? 0);
    $id_despacho_filtro = (int)($_GET['id_despacho'] ?? $_GET['id_despacho_viaje'] ?? 0);
    // Lista GENERAL del viaje: sin oficina ni despacho. No debe encabezarse con
    // la hora de paso ni atribuirse al último oficinista que despachó otra
    // oficina (antes una lista general de El Coca salía con la hora de Loreto).
    $esListaGeneral = ($id_sucursal_filtro <= 0 && $id_despacho_filtro <= 0);
    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── DESPACHO / TURNO QUE SE IMPRIME ─────────────────────────────────────
    // Cuando la lista se imprime junto con una hoja de despacho debe liquidar
    // el MISMO corte: la venta de esa oficina posterior a su despacho anterior.
    // Antes se imprimía toda la venta del viaje (incluidas otras oficinas) y
    // los valores no cuadraban con el "RECIBE" de la hoja (despacho #503:
    // lista 27 pasajeros / $462.10 vs despacho 25 pasajeros / $436.50).
    $despacho_turno = null;
    $sello_turno = '';
    $sello_turno_anterior = '';
    $id_despacho_anterior = 0;
    if ($id_despacho_filtro > 0) {
        $stmtTurno = $conn->prepare(
            "SELECT dv.id_despacho_viaje, dv.id_fkviaje_despacho_viaje,
                    dv.fecha_creacion_despacho_viaje, dv.fecha_salida_despacho_viaje,
                    dv.hora_salida_despacho_viaje, dv.id_fkusuario_aprueba,
                    u.id_fksucursal_usuario,
                    s.id_sucursal AS id_sucursal_despacho,
                    s.suc_codigo_sucursal AS codigo_sucursal_despacho,
                    s.nombre_sucursal AS nombre_sucursal_despacho
               FROM despacho_viaje dv
               LEFT JOIN usuario u ON u.id_usuario = dv.id_fkusuario_aprueba
               LEFT JOIN sucursal2 s ON (s.id_sucursal = u.id_fksucursal_usuario OR s.suc_codigo_sucursal = u.id_fksucursal_usuario)
              WHERE dv.id_despacho_viaje = ? LIMIT 1"
        );
        $stmtTurno->bind_param("i", $id_despacho_filtro);
        $stmtTurno->execute();
        $despacho_turno = $stmtTurno->get_result()->fetch_assoc();
        $stmtTurno->close();

        if ($despacho_turno) {
            // El viaje manda el despacho: si llega un id_viaje distinto (p. ej.
            // reimpresión desde otra pantalla) se usa el del despacho.
            $id_viaje = (int)$despacho_turno['id_fkviaje_despacho_viaje'] ?: $id_viaje;

            if (!empty($despacho_turno['fecha_creacion_despacho_viaje'])) {
                $tsTurno = strtotime($despacho_turno['fecha_creacion_despacho_viaje']);
                if ($tsTurno !== false) {
                    $sello_turno = date('Y-m-d H:i:s', $tsTurno);
                }
            }

            // La lista queda limitada a la oficina que despachó, igual que la hoja.
            $id_sucursal_despacho_turno = (int)($despacho_turno['id_sucursal_despacho'] ?? 0);
            $codigo_sucursal_despacho_turno = trim((string)($despacho_turno['codigo_sucursal_despacho'] ?? ''));
            if ($id_sucursal_despacho_turno <= 0) {
                $id_sucursal_despacho_turno = (int)($despacho_turno['id_fksucursal_usuario'] ?? 0);
            }
            if ($id_sucursal_despacho_turno > 0) {
                $id_sucursal_filtro = $id_sucursal_despacho_turno;
            }

            // Corte del turno anterior de la misma oficina.
            if ($sello_turno !== '' && $id_sucursal_despacho_turno > 0) {
                $query_prev = "SELECT dv_p.id_despacho_viaje,
                                      dv_p.fecha_creacion_despacho_viaje AS sello_anterior
                                 FROM despacho_viaje dv_p
                                 JOIN usuario u_p ON u_p.id_usuario = dv_p.id_fkusuario_aprueba
                                 LEFT JOIN sucursal2 s_p ON (s_p.id_sucursal = u_p.id_fksucursal_usuario OR s_p.suc_codigo_sucursal = u_p.id_fksucursal_usuario)
                                WHERE dv_p.id_fkviaje_despacho_viaje = ?
                                  AND dv_p.id_despacho_viaje <> ?
                                  AND dv_p.fecha_creacion_despacho_viaje < ?
                                  AND (s_p.id_sucursal = ? OR s_p.suc_codigo_sucursal = ?)
                                ORDER BY dv_p.fecha_creacion_despacho_viaje DESC, dv_p.id_despacho_viaje DESC
                                LIMIT 1";
                $stmtPrev = $conn->prepare($query_prev);
                $stmtPrev->bind_param(
                    "iisis",
                    $id_viaje,
                    $id_despacho_filtro,
                    $sello_turno,
                    $id_sucursal_despacho_turno,
                    $codigo_sucursal_despacho_turno
                );
                $stmtPrev->execute();
                $rowPrev = $stmtPrev->get_result()->fetch_assoc();
                $stmtPrev->close();
                if ($rowPrev) {
                    $id_despacho_anterior = (int)$rowPrev['id_despacho_viaje'];
                    if (!empty($rowPrev['sello_anterior'])) {
                        $sello_turno_anterior = (string)$rowPrev['sello_anterior'];
                    }
                }
            }
        }
    }

    if ($id_viaje <= 0) {
        throw new Exception("ID de viaje no proporcionado o inválido");
    }

    // ─── EMPRESA Y CONFIGURACIÓN (sin logo: los PDFs no imprimen logos) ──────
    $vals_empresa = null;
    $vals_config = null;

    $query_empresa = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
    $rec_empresa = mysqli_query($conn, $query_empresa);
    $vals_empresa = $rec_empresa ? mysqli_fetch_assoc($rec_empresa) : [];
    if (!$vals_empresa) {
        $vals_empresa = [
            'razon_social_empresa' => 'SISTEMA FLOTA',
            'ruc_empresa' => '',
            'direccion_empresa' => '',
            'telefono_empresa' => ''
        ];
    }

    $query_config = "SELECT formato_impresion FROM configuracion LIMIT 1";
    $rec_cfg = mysqli_query($conn, $query_config);
    $vals_config = $rec_cfg ? mysqli_fetch_assoc($rec_cfg) : [];

    $razon_social = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa = $vals_empresa["direccion_empresa"] ?? '';
    $telefono_empresa = $vals_empresa["telefono_empresa"] ?? '';

    // ─── CONSULTA VIAJE, BUS, CHOFER Y USUARIO ───────────────────────────────
    $query_info = "SELECT
        v.id_viajes, v.dia_viajes, v.hora_salida_estimado, v.hora_origen_salida, v.fecha_cierre, r.nombre_rutas,
        r.tiempos_paradas_rutas,
        b.disco_buses, b.placa_buses,
        p.per_cedula_personal, p.per_nombres_persona, p.per_apellidos_personal,
        v.chofer_viajes, v.cedula_viajes, v.id_fkusuario_viajes
    FROM viajes v
    LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
    LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
    LEFT JOIN personal p ON p.id_personal = CASE 
        WHEN IFNULL(v.id_fkchofer_viajes, 0) > 0 THEN v.id_fkchofer_viajes 
        ELSE b.id_fkpersonal_buses 
    END
    WHERE v.id_viajes = $id_viaje LIMIT 1";

    $result_info = mysqli_query($conn, $query_info) or die(mysqli_error($conn));
    $info = mysqli_fetch_assoc($result_info) ?: [];

    // ─── DESPACHO QUE ENTREGA LA LISTA ───────────────────────────────────────
    // Un viaje puede tener varios despachos (turnos y oficinas). La lista se
    // entrega a nombre del oficinista del despacho correcto: el indicado, el
    // del usuario en sesión y, si no coincide, el más reciente. Antes el JOIN
    // traía una fila arbitraria y la lista salía a nombre de otra persona.
    $id_despacho_param = (int)($_GET['id_despacho'] ?? 0);
    $id_usuario_param = (int)($_GET['id_usuario'] ?? 0);
    $usuario_param = trim($_GET['usuario'] ?? '');
    $normalizar_usuario = static function ($texto) {
        return preg_replace('/\s+/u', ' ', mb_strtolower(trim((string)$texto), 'UTF-8'));
    };
    $usuario_param_norm = $normalizar_usuario($usuario_param);

    $query_despachos = "SELECT d.id_despacho_viaje, d.fecha_salida_despacho_viaje,
            d.id_fkusuario_aprueba, u.id_usuario, u.nombre_usuario, u.apellido_usuario,
            u.username_usuario, u.id_fksucursal_usuario,
            s_d.id_sucursal AS id_sucursal_despacho,
            s_d.suc_codigo_sucursal AS codigo_sucursal_despacho,
            TRIM(CONCAT(COALESCE(u.nombre_usuario, ''), ' ', COALESCE(u.apellido_usuario, ''))) AS nombre_completo
        FROM despacho_viaje d
        LEFT JOIN usuario u ON u.id_usuario = d.id_fkusuario_aprueba
        LEFT JOIN sucursal2 s_d ON (s_d.id_sucursal = u.id_fksucursal_usuario OR s_d.suc_codigo_sucursal = u.id_fksucursal_usuario)
        WHERE d.id_fkviaje_despacho_viaje = $id_viaje
        ORDER BY d.id_despacho_viaje DESC";
    $res_despachos = mysqli_query($conn, $query_despachos);
    $despachos_lista = [];
    while ($res_despachos && ($dRow = mysqli_fetch_assoc($res_despachos))) {
        $despachos_lista[] = $dRow;
    }

    $despacho_entrega = null;
    $criterios_despacho = [
        static fn($d) => $id_despacho_param > 0 && (int)$d['id_despacho_viaje'] === $id_despacho_param,
        // Manifiesto filtrado por oficina: la entrega es del oficinista de ESA
        // oficina, aunque quien imprima sea de otra o haya despachado otro turno.
        static function ($d) use ($id_sucursal_filtro) {
            if ($id_sucursal_filtro <= 0) return false;
            $ref = (string)$id_sucursal_filtro;
            return (string)($d['id_sucursal_despacho'] ?? '') === $ref
                || (string)($d['codigo_sucursal_despacho'] ?? '') === $ref
                || (string)($d['id_fksucursal_usuario'] ?? '') === $ref;
        },
        static fn($d) => $id_usuario_param > 0 && (int)$d['id_fkusuario_aprueba'] === $id_usuario_param,
        static function ($d) use ($usuario_param_norm, $normalizar_usuario) {
            if ($usuario_param_norm === '') return false;
            return in_array($usuario_param_norm, [
                $normalizar_usuario($d['nombre_usuario'] ?? ''),
                $normalizar_usuario($d['nombre_completo'] ?? ''),
                $normalizar_usuario($d['username_usuario'] ?? ''),
            ], true);
        },
        // Solo una lista de oficina/turno puede atribuirse al despacho de esa
        // oficina. En la lista general no se toma el último despacho del viaje.
        static fn($d) => !$esListaGeneral,
    ];
    foreach ($criterios_despacho as $criterio) {
        foreach ($despachos_lista as $dRow) {
            if ($criterio($dRow)) {
                $despacho_entrega = $dRow;
                break 2;
            }
        }
    }

    // Si el viaje no tiene despacho, se usa el usuario que lo creó.
    $usuario_creador_viaje = null;
    if (!$despacho_entrega && !empty($info['id_fkusuario_viajes'])) {
        $idCreadorViaje = (int)$info['id_fkusuario_viajes'];
        $qCreador = mysqli_query($conn, "SELECT nombre_usuario, apellido_usuario, username_usuario FROM usuario WHERE id_usuario = $idCreadorViaje LIMIT 1");
        if ($qCreador && $rCreador = mysqli_fetch_assoc($qCreador)) {
            $usuario_creador_viaje = $rCreador;
        }
    }

    $ruta = $info['nombre_rutas'] ?? '';

    $raw_fecha_viaje = !empty($info['fecha_cierre']) 
        ? $info['fecha_cierre'] 
        : (!empty($despacho_entrega['fecha_salida_despacho_viaje']) ? $despacho_entrega['fecha_salida_despacho_viaje'] : '');

    $fecha_viaje = (!empty($raw_fecha_viaje) && strtotime($raw_fecha_viaje) !== false) 
        ? date('d/m/Y', strtotime($raw_fecha_viaje)) 
        : date('d/m/Y');

    $raw_hora_viaje = !empty($info['hora_salida_estimado']) 
        ? $info['hora_salida_estimado'] 
        : (!empty($info['hora_origen_salida']) ? $info['hora_origen_salida'] : '');

    $hora_viaje = (!empty($raw_hora_viaje) && strtotime($raw_hora_viaje) !== false) 
        ? date('H:i', strtotime($raw_hora_viaje)) 
        : '';

    // Hora en que el bus pasa por la oficina que entrega la lista. La lista se
    // imprime junto con la hoja de despacho; si el bus sale de otra oficina
    // (p. ej. Terminal Sur 09:45) la lista no debe encabezar con esa hora sino
    // con la del paso por la oficina que la entrega (Ingahurco 10:00).
    // La oficina puede venir del despacho que entrega la lista o del filtro con
    // el que se imprime (id interno o código sucursal).
    $oficina_lista = $esListaGeneral ? 0 : (int)($despacho_entrega['id_sucursal_despacho'] ?? 0);
    $codigo_lista = $esListaGeneral ? '' : (string)($despacho_entrega['codigo_sucursal_despacho'] ?? '');
    if (!$esListaGeneral && $oficina_lista <= 0 && $codigo_lista === '' && $id_sucursal_filtro > 0) {
        $oficina_lista = (int)$id_sucursal_filtro;
    }
    $refs_lista = array_values(array_filter([$oficina_lista, (int)$codigo_lista], static fn($v) => $v > 0));
    if (count($refs_lista) > 0) {
        $resSucLista = mysqli_query(
            $conn,
            'SELECT id_sucursal, suc_codigo_sucursal FROM sucursal2 WHERE id_sucursal IN (' . implode(',', $refs_lista) . ')'
            . ' OR suc_codigo_sucursal IN (' . implode(',', $refs_lista) . ') LIMIT 1'
        );
        if ($resSucLista && ($sucLista = mysqli_fetch_assoc($resSucLista))) {
            $refs_lista[] = (int)$sucLista['id_sucursal'];
            $refs_lista[] = (int)$sucLista['suc_codigo_sucursal'];
        }
        $refs_lista = array_values(array_unique(array_filter($refs_lista, static fn($v) => $v > 0)));
    }
    if (!empty($info['tiempos_paradas_rutas']) && count($refs_lista) > 0) {
        $paradas_lista = json_decode((string)$info['tiempos_paradas_rutas'], true);
        $minutos_lista = null;
        if (is_array($paradas_lista)) {
            foreach ($paradas_lista as $parada_lista) {
                $idParada = (int)($parada_lista['id_sucursal'] ?? 0);
                if ($idParada > 0 && in_array($idParada, $refs_lista, true)) {
                    $minutos_lista = (int)($parada_lista['minutos_desde_origen'] ?? 0);
                    break;
                }
            }
        }
        if ($minutos_lista !== null && $minutos_lista > 0) {
            $partes_lista = array_pad(array_map('intval', explode(':', (string)($info['hora_origen_salida'] ?? '0:0'))), 3, 0);
            $total_lista = ($partes_lista[0] * 60) + $partes_lista[1] + $minutos_lista;
            $hora_viaje = sprintf('%02d:%02d', intdiv($total_lista, 60) % 24, $total_lista % 60);
        }
    }

    $conductor_nombre = trim(($info['per_nombres_persona'] ?? '') . ' ' . ($info['per_apellidos_personal'] ?? ''));
    if (empty($conductor_nombre) && !empty($info['chofer_viajes'])) {
        $conductor_nombre = trim($info['chofer_viajes']);
    }
    if (empty($conductor_nombre)) {
        $conductor_nombre = 'N/A';
    }

    $conductor_cedula = !empty($info['per_cedula_personal']) 
        ? trim($info['per_cedula_personal']) 
        : (!empty($info['cedula_viajes']) ? trim($info['cedula_viajes']) : 'N/A');

    // Usuario de entrega
    $usuario_entrega = '';
    if ($despacho_entrega) {
        $usuario_entrega = trim(($despacho_entrega['nombre_usuario'] ?? '') . ' ' . ($despacho_entrega['apellido_usuario'] ?? ''));
        if (empty($usuario_entrega) && !empty($despacho_entrega['username_usuario'])) {
            $usuario_entrega = trim($despacho_entrega['username_usuario']);
        }
    }
    if (empty($usuario_entrega) && $usuario_creador_viaje) {
        $usuario_entrega = trim(($usuario_creador_viaje['nombre_usuario'] ?? '') . ' ' . ($usuario_creador_viaje['apellido_usuario'] ?? ''));
        if (empty($usuario_entrega) && !empty($usuario_creador_viaje['username_usuario'])) {
            $usuario_entrega = trim($usuario_creador_viaje['username_usuario']);
        }
    }
    if (empty($usuario_entrega) && $usuario_param !== '') {
        $usuario_entrega = $usuario_param;
    }
    if (empty($usuario_entrega) && !empty($_GET['nombre_usuario'])) {
        $usuario_entrega = trim($_GET['nombre_usuario']);
    }
    if (empty($usuario_entrega)) {
        $usuario_entrega = 'SISTEMA';
    }
    // La lista GENERAL no se entrega a un conductor: solo la imprime un usuario.
    // No debe figurar el último oficinista que despachó otra oficina.
    if ($esListaGeneral) {
        $usuario_entrega = $usuario_param !== '' ? $usuario_param : 'SISTEMA';
    }

    // Filtro por sucursal
    $where_sucursal = "";
    $nombre_sucursal_filtro = '';
    if ($id_sucursal_filtro > 0) {
        $where_sucursal = " AND (s.id_sucursal = $id_sucursal_filtro OR s.suc_codigo_sucursal = '$id_sucursal_filtro' OR b.id_sucursal_venta = $id_sucursal_filtro OR b.id_fksucursal_boleto = $id_sucursal_filtro OR u.id_fksucursal_usuario = $id_sucursal_filtro) ";
        $q_suc = mysqli_query($conn, "SELECT nombre_sucursal FROM sucursal2 WHERE id_sucursal = $id_sucursal_filtro OR suc_codigo_sucursal = '$id_sucursal_filtro' LIMIT 1");
        if ($q_suc && $r_suc = mysqli_fetch_assoc($q_suc)) {
            $nombre_sucursal_filtro = $r_suc['nombre_sucursal'];
        }
    }

    // Corte del turno: solo la venta posterior al despacho anterior de la
    // oficina y hasta el sello de este despacho, igual que la hoja de despacho.
    $where_turno = "";
    if ($sello_turno !== '') {
        $sello_turno_sql = mysqli_real_escape_string($conn, $sello_turno);
        $where_turno .= " AND (b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= '$sello_turno_sql')";
        if ($sello_turno_anterior !== '') {
            $sello_anterior_sql = mysqli_real_escape_string($conn, $sello_turno_anterior);
            $where_turno .= " AND (b.fecha_creacion_boleto IS NOT NULL AND b.fecha_creacion_boleto > '$sello_anterior_sql')";
        }
    }

    // ─── CONSULTA DE PASAJEROS ───────────────────────────────────────────────
    $colPuntoFinal = columna_boleto_existe($conn, 'boleto_detalle', 'punto_final_boleto_detalle')
        ? 'bd.punto_final_boleto_detalle'
        : 'NULL AS punto_final_boleto_detalle';
    $query_pasajeros = "SELECT 
        COALESCE(NULLIF(TRIM(sr.nombre_sub_rutas), ''), NULLIF(TRIM(d.lugar_destino), ''), 'N/A') AS lugar_destino,
        $colPuntoFinal,
        r.nombre_rutas, bd.estado_boleto_detalle, bd.identificacion_boleto_detalle,
        bd.asiento_boleto_detalle, bd.total_boleto_detalle,
        bd.nombre_cliente_boleto_detalle, b.nombre_origen,
        COALESCE(s.nombre_sucursal, b.nombre_origen, 'OFICINA PRINCIPAL') AS nombre_sucursal
    FROM boleto_detalle bd
    JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
    JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
    LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
    LEFT JOIN destino d ON bd.id_destino_boleto = d.id_destino
    LEFT JOIN sub_rutas sr ON bd.id_destino_boleto = sr.id_sub_rutas
    LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
    LEFT JOIN sucursal2 s ON (
        s.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
        OR s.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
    )
    WHERE b.id_fkviaje_boleto = $id_viaje AND (b.estado_boleto IS NULL OR b.estado_boleto != 3) $where_sucursal $where_turno
    ORDER BY COALESCE(s.nombre_sucursal, b.nombre_origen) ASC, b.nombre_origen ASC, CAST(bd.asiento_boleto_detalle AS UNSIGNED) ASC";

    $result_pasajeros = mysqli_query($conn, $query_pasajeros) or die(mysqli_error($conn));

    $pasajeros = [];
    $total_pasajeros = 0;
    $total_valor = 0.0;

    while ($row = mysqli_fetch_assoc($result_pasajeros)) {
        $pasajeros[] = $row;
        $total_pasajeros++;
        $total_valor += (float)($row['total_boleto_detalle'] ?? 0);
    }

    // Cuadre con la hoja de despacho. La lista del turno muestra lo mismo que
    // el "RECIBE"; el acumulado de la oficina y lo entregado antes explican la
    // diferencia con la lista completa de la oficina (despacho #503: 25/$436.50
    // + #490 1/$10.00 = 26/$446.50).
    $cantidad_acumulada_turno = 0;
    $total_acumulado_turno = 0.0;
    $cantidad_entregado_antes = 0;
    $total_entregado_antes = 0.0;
    if ($sello_turno !== '') {
        $sello_turno_sql_acum = mysqli_real_escape_string($conn, $sello_turno);
        $sello_anterior_sql_acum = $sello_turno_anterior !== ''
            ? mysqli_real_escape_string($conn, $sello_turno_anterior)
            : $sello_turno_sql_acum;
        $query_acumulado = "SELECT
                COUNT(bd.id_boleto_detalle) AS cantidad,
                IFNULL(SUM(bd.total_boleto_detalle), 0) AS total,
                IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NOT NULL AND b.fecha_creacion_boleto <= '$sello_anterior_sql_acum' THEN 1 ELSE 0 END), 0) AS cantidad_antes,
                IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NOT NULL AND b.fecha_creacion_boleto <= '$sello_anterior_sql_acum' THEN bd.total_boleto_detalle ELSE 0 END), 0) AS total_antes
              FROM boleto_detalle bd
              JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
              LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
              LEFT JOIN sucursal2 s ON (
                  s.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                  OR s.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
              )
             WHERE b.id_fkviaje_boleto = $id_viaje
               AND (b.estado_boleto IS NULL OR b.estado_boleto != 3)
               $where_sucursal
               AND (b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= '$sello_turno_sql_acum')";
        $resAcum = mysqli_query($conn, $query_acumulado);
        if ($resAcum && $rowAcum = mysqli_fetch_assoc($resAcum)) {
            $cantidad_acumulada_turno = (int)($rowAcum['cantidad'] ?? 0);
            $total_acumulado_turno = (float)($rowAcum['total'] ?? 0);
            $cantidad_entregado_antes = (int)($rowAcum['cantidad_antes'] ?? 0);
            $total_entregado_antes = (float)($rowAcum['total_antes'] ?? 0);
        }
    }

    // Sin despacho explícito pero con oficina: la lista es la venta completa de
    // la oficina. Se muestra qué parte ya se entregó en sus despachos y cuánto
    // quedó pendiente para que también cuadre con la hoja de despacho.
    $id_ultimo_despacho_oficina = 0;
    $cantidad_entregada_oficina = 0;
    $total_entregado_oficina = 0.0;
    $cantidad_pendiente_oficina = 0;
    $total_pendiente_oficina = 0.0;
    if ($sello_turno === '' && $id_sucursal_filtro > 0) {
        $query_ultimo = "SELECT dv_u.id_despacho_viaje, dv_u.fecha_creacion_despacho_viaje
                           FROM despacho_viaje dv_u
                           JOIN usuario u_u ON u_u.id_usuario = dv_u.id_fkusuario_aprueba
                           LEFT JOIN sucursal2 s_u ON (s_u.id_sucursal = u_u.id_fksucursal_usuario OR s_u.suc_codigo_sucursal = u_u.id_fksucursal_usuario)
                          WHERE dv_u.id_fkviaje_despacho_viaje = $id_viaje
                            AND (s_u.id_sucursal = $id_sucursal_filtro OR s_u.suc_codigo_sucursal = '$id_sucursal_filtro')
                          ORDER BY dv_u.fecha_creacion_despacho_viaje DESC, dv_u.id_despacho_viaje DESC
                          LIMIT 1";
        $res_ultimo = mysqli_query($conn, $query_ultimo);
        if ($res_ultimo && $row_ultimo = mysqli_fetch_assoc($res_ultimo)) {
            $id_ultimo_despacho_oficina = (int)$row_ultimo['id_despacho_viaje'];
            $sello_ultimo_sql = mysqli_real_escape_string($conn, (string)$row_ultimo['fecha_creacion_despacho_viaje']);
            $query_cuadre_oficina = "SELECT
                    IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= '$sello_ultimo_sql' THEN 1 ELSE 0 END), 0) AS cantidad_entregada,
                    IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= '$sello_ultimo_sql' THEN bd.total_boleto_detalle ELSE 0 END), 0) AS total_entregado,
                    IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NOT NULL AND b.fecha_creacion_boleto > '$sello_ultimo_sql' THEN 1 ELSE 0 END), 0) AS cantidad_pendiente,
                    IFNULL(SUM(CASE WHEN b.fecha_creacion_boleto IS NOT NULL AND b.fecha_creacion_boleto > '$sello_ultimo_sql' THEN bd.total_boleto_detalle ELSE 0 END), 0) AS total_pendiente
                  FROM boleto_detalle bd
                  JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
                  LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
                  LEFT JOIN sucursal2 s ON (
                      s.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                      OR s.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                  )
                 WHERE b.id_fkviaje_boleto = $id_viaje
                   AND (b.estado_boleto IS NULL OR b.estado_boleto != 3)
                   $where_sucursal";
            $res_cuadre = mysqli_query($conn, $query_cuadre_oficina);
            if ($res_cuadre && $row_cuadre = mysqli_fetch_assoc($res_cuadre)) {
                $cantidad_entregada_oficina = (int)($row_cuadre['cantidad_entregada'] ?? 0);
                $total_entregado_oficina = (float)($row_cuadre['total_entregado'] ?? 0);
                $cantidad_pendiente_oficina = (int)($row_cuadre['cantidad_pendiente'] ?? 0);
                $total_pendiente_oficina = (float)($row_cuadre['total_pendiente'] ?? 0);
            }
        }
    }

    // ─── CONFIGURACIÓN DE PÁGINA NATIVA TCPDF ────────────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion($conn, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    // Altura estimada
    $altoEstimado = max(240, 160 + (count($pasajeros) * 8) + 60);

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA ─────────────────────────────────────────────────────────
    // Oficina que emite la lista: filtro id_sucursal o primera oficina del listado
    $oficinaEmite = $nombre_sucursal_filtro;
    if (empty($oficinaEmite)) {
        // Sin filtro de oficina la lista es GENERAL (todas las oficinas del
        // viaje). Antes se encabezaba con la primera oficina del listado y
        // parecía que el total incluía solo esa oficina.
        $oficinaEmite = 'TODAS LAS OFICINAS';
    }

    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->MultiCell($anchoUtil, 4, strtoupper($razon_social), 0, 'C', false, 1);

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }
    // Oficina que emite la lista (en lugar de la dirección de la empresa)
    if (!empty($oficinaEmite)) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, strtoupper($oficinaEmite), 0, 1, 'C');
    }
    if (!empty($telefono_empresa)) {
        $pdf->SetFont('helvetica', '', 7);
        $pdf->Cell($anchoUtil, 3.2, 'Tel: ' . $telefono_empresa, 0, 1, 'C');
    }

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(2);

    $tituloDoc = 'LISTADO DE PASAJEROS' . ($nombre_sucursal_filtro ? ' - ' . strtoupper($nombre_sucursal_filtro) : '');
    if ($id_despacho_filtro > 0) {
        $tituloDoc .= ' (DESPACHO #' . $id_despacho_filtro . ')';
    }
    $pdf->SetFont('helvetica', 'B', 9.5);
    // MultiCell: con el número de despacho el título ya no cabe en una línea
    // de 80 mm y TCPDF lo recortaba ("... (DESPAC").
    $pdf->MultiCell($anchoUtil, 4.5, $tituloDoc, 0, 'C', false, 1);

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 4, 'Disco: ' . ($info['disco_buses'] ?? 'S/N'), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.5, 'Viaje #' . $id_viaje . ' | Fecha: ' . $fecha_viaje . ' | Hora: ' . $hora_viaje, 0, 1, 'C');

    // Fila Ruta y Placa
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil * 0.65, 3.8, 'Ruta: ' . $ruta, 0, 0, 'L');
    $pdf->Cell($anchoUtil * 0.35, 3.8, 'Placa: ' . ($info['placa_buses'] ?? 'S/N'), 0, 1, 'R');

    // Conductor
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.5, 'Conductor: ' . $conductor_nombre, 0, 1, 'L');
    $pdf->Cell($anchoUtil, 3.5, 'C.I: ' . $conductor_cedula, 0, 1, 'L');

    $pdf->Ln(1.5);

    // ─── 2. TABLA DE PASAJEROS (Agrupada, dos filas por pasajero) ────────────
    // Fila 1: Asiento | Cédula | Nombre   ·   Fila 2: Destino | Valor
    $wAsi   = round($anchoUtil * 0.10, 1);
    $wCed   = round($anchoUtil * 0.30, 1);
    $wNom   = $anchoUtil - $wAsi - $wCed;
    $wVal   = round($anchoUtil * 0.24, 1);
    $indent = $wAsi;

    // Cabecera fija de columnas (aplica a la primera fila de cada pasajero)
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wAsi, 4, 'Asi.', 'B', 0, 'C');
    $pdf->Cell($wCed, 4, 'Cédula', 'B', 0, 'L');
    $pdf->Cell($wNom, 4, 'Nombre', 'B', 1, 'L');

    $current_sucursal = null;
    $current_origen = null;
    $sucursal_subtotal_pasajeros = 0;
    $sucursal_subtotal_valor = 0.0;
    $origen_subtotal_pasajeros = 0;
    $origen_subtotal_valor = 0.0;

    foreach ($pasajeros as $row) {
        $sucursal = !empty($row['nombre_sucursal']) ? $row['nombre_sucursal'] : 'OFICINA PRINCIPAL';
        $origen = !empty($row['nombre_origen']) ? $row['nombre_origen'] : 'ORIGEN PRINCIPAL';

        // Cambio de oficina
        if ($sucursal !== $current_sucursal) {
            if ($current_origen !== null) {
                $pdf->SetFont('helvetica', 'B', 7);
                $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
                $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
            }
            if ($current_sucursal !== null) {
                $pdf->SetFont('helvetica', 'B', 7.5);
                $pdf->Cell($anchoUtil - $wVal, 4, 'TOTAL ' . strtoupper($current_sucursal) . ' (' . $sucursal_subtotal_pasajeros . ' pas.):', 'TB', 0, 'R');
                $pdf->Cell($wVal, 4, '$' . number_format($sucursal_subtotal_valor, 2), 'TB', 1, 'R');
                $pdf->Ln(1);
            }

            // Encabezado oficina
            $pdf->Ln(1);
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->Cell($anchoUtil, 4.2, 'OFICINA DE VENTA: ' . strtoupper($sucursal), 0, 1, 'L');

            $current_sucursal = $sucursal;
            $current_origen = null;
            $sucursal_subtotal_pasajeros = 0;
            $sucursal_subtotal_valor = 0.0;
        }

        // Cambio de origen
        if ($origen !== $current_origen) {
            if ($current_origen !== null) {
                $pdf->SetFont('helvetica', 'B', 7);
                $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
                $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
            }

            $pdf->SetFont('helvetica', 'B', 7.5);
            $pdf->Cell($anchoUtil, 3.8, 'PUNTO EMBARQUE: ' . strtoupper($origen), 0, 1, 'L');

            $current_origen = $origen;
            $origen_subtotal_pasajeros = 0;
            $origen_subtotal_valor = 0.0;
        }

        $precio = (float)($row['total_boleto_detalle'] ?? 0);
        $sucursal_subtotal_pasajeros++;
        $sucursal_subtotal_valor += $precio;
        $origen_subtotal_pasajeros++;
        $origen_subtotal_valor += $precio;

        // Textos recortados al ancho de columna para que no se encimen
        $txtAsi = (string)($row['asiento_boleto_detalle'] ?? '');
        $txtCed = substr((string)($row['identificacion_boleto_detalle'] ?? ''), 0, 13);
        $txtNom = substr(trim((string)($row['nombre_cliente_boleto_detalle'] ?? '')), 0, 22);
        $txtDes = substr(trim(unir_destino_punto_final(
            (string)($row['lugar_destino'] ?? ''),
            (string)($row['punto_final_boleto_detalle'] ?? '')
        )), 0, 34);

        // Fila 1: asiento, cédula y nombre
        $pdf->SetFont('helvetica', '', 6.8);
        $pdf->Cell($wAsi, 3.6, $txtAsi, 0, 0, 'C');
        $pdf->Cell($wCed, 3.6, $txtCed, 0, 0, 'L');
        $pdf->Cell($wNom, 3.6, $txtNom, 0, 1, 'L');

        // Fila 2: destino y valor
        $pdf->SetFont('helvetica', '', 6.5);
        $pdf->Cell($indent, 3.4, '', 0, 0, 'L');
        $pdf->Cell($anchoUtil - $wVal - $indent, 3.4, 'Dest: ' . $txtDes, 0, 0, 'L');
        $pdf->Cell($wVal, 3.4, '$' . number_format($precio, 2), 0, 1, 'R');
    }

    // Cerrar último origen y oficina
    if ($current_origen !== null) {
        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
        $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
    }
    if ($current_sucursal !== null) {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil - $wVal, 4, 'TOTAL ' . strtoupper($current_sucursal) . ' (' . $sucursal_subtotal_pasajeros . ' pas.):', 'TB', 0, 'R');
        $pdf->Cell($wVal, 4, '$' . number_format($sucursal_subtotal_valor, 2), 'TB', 1, 'R');
    }

    // ─── 3. TOTALES GENERALES ────────────────────────────────────────────────
    $pdf->Ln(2);
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->Ln(1);

    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil * 0.65, 4.2, 'Total Pasajeros: ' . $total_pasajeros, 0, 0, 'L');
    $pdf->Cell($anchoUtil * 0.35, 4.2, 'Total: $' . number_format($total_valor, 2), 0, 1, 'R');

    // Mismos totales de cuadre que la hoja de despacho para que ambas
    // impresiones se puedan comparar sin diferencias.
    if ($sello_turno !== '') {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil - $wVal, 3.8, 'Acumulado oficina:', 0, 0, 'R');
        $pdf->Cell($wVal, 3.8, '$' . number_format($total_acumulado_turno, 2) . ' (' . $cantidad_acumulada_turno . ' pas.)', 0, 1, 'R');
        if ($id_despacho_anterior > 0) {
            $pdf->Cell($anchoUtil - $wVal, 3.8, 'Entregado antes (#' . $id_despacho_anterior . '):', 0, 0, 'R');
            $pdf->Cell($wVal, 3.8, '$' . number_format($total_entregado_antes, 2) . ' (' . $cantidad_entregado_antes . ' pas.)', 0, 1, 'R');
        }
    } elseif ($id_ultimo_despacho_oficina > 0) {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil - $wVal, 3.8, 'Entregado (despacho #' . $id_ultimo_despacho_oficina . '):', 0, 0, 'R');
        $pdf->Cell($wVal, 3.8, '$' . number_format($total_entregado_oficina, 2) . ' (' . $cantidad_entregada_oficina . ' pas.)', 0, 1, 'R');
        if ($cantidad_pendiente_oficina > 0 || $total_pendiente_oficina > 0.009) {
            $pdf->Cell($anchoUtil - $wVal, 3.8, 'Pendiente por despachar:', 0, 0, 'R');
            $pdf->Cell($wVal, 3.8, '$' . number_format($total_pendiente_oficina, 2) . ' (' . $cantidad_pendiente_oficina . ' pas.)', 0, 1, 'R');
        }
    }

    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.8, ($esListaGeneral ? 'Impreso por: ' : 'Entrega: ') . $usuario_entrega, 0, 1, 'L');
    $pdf->Cell($anchoUtil, 3.5, 'Impresión: ' . $fecha_actual, 0, 1, 'L');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'pasajeros_' . $id_viaje . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    $pdf->Output($fileName, 'I');
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false
    ]);
    exit();
}
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
    $id_despacho_param = intval($_GET['id_despacho'] ?? $_GET['id_despacho_viaje'] ?? 0);
    $id_viajes_param = intval($_GET['id_viajes'] ?? $_GET['id_viaje'] ?? 0);
    $usuario_param = trim($_GET['usuario'] ?? '');
    $id_sucursal_param = intval($_GET['id_sucursal'] ?? 0);

    if ($id_despacho_param <= 0 && $id_viajes_param <= 0) {
        throw new Exception("Parámetros de viaje o despacho no válidos");
    }

    // Conexión MySQLi
    $conn = conexion();
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $vals_empresa = null;

    
        $query_empresa = "SELECT razon_social_empresa, nombre_comercial_empresa, ruc_empresa, direccion_empresa FROM empresa LIMIT 1";
        $result_empresa = $conn->query($query_empresa);
        $vals_empresa = $result_empresa ? $result_empresa->fetch_assoc() : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'SISTEMA FLOTA',
                'ruc_empresa' => '',
                'direccion_empresa' => ''
            ];
        }

        

    $razon_social = !empty($vals_empresa['razon_social_empresa']) ? $vals_empresa['razon_social_empresa'] : (!empty($vals_empresa['nombre_comercial_empresa']) ? $vals_empresa['nombre_comercial_empresa'] : 'SISTEMA FLOTA');
    $ruc_empresa = $vals_empresa['ruc_empresa'] ?? '';
    $direccion_empresa = $vals_empresa['direccion_empresa'] ?? '';

    // 1. Identificar el despacho y viaje correspondiente
    if ($id_despacho_param > 0) {
        $query_despacho = "SELECT 
            dv.id_despacho_viaje,
            dv.tarifa_despacho_viaje,
            dv.fecha_salida_despacho_viaje,
            dv.hora_salida_despacho_viaje,
            dv.fecha_creacion_despacho_viaje,
            dv.motivo_despacho_viaje,
            dv.id_fkusuario_aprueba,
            dv.id_fkviaje_despacho_viaje,
            u.id_usuario,
            u.nombre_usuario,
            u.apellido_usuario,
            u.username_usuario,
            u.id_fksucursal_usuario,
            s.nombre_sucursal,
            s.porcentaje_retencion,
            s.id_sucursal AS id_sucursal_despacho_resuelta,
            s.suc_codigo_sucursal AS codigo_sucursal_despacho,
            v.id_viajes,
            v.fecha_cierre as fecha_viaje,
            v.hora_origen_salida,
            v.dia_viajes,
            v.hora_salida_estimado,
            v.chofer_viajes,
            v.cedula_viajes,
            r.nombre_rutas,
            b.disco_buses,
            b.placa_buses,
            CONCAT(IFNULL(chofer.per_nombres_persona, ''), ' ', IFNULL(chofer.per_apellidos_personal, '')) as nombre_completo_chofer,
            chofer.per_cedula_personal as cedula_chofer
          FROM despacho_viaje dv
          JOIN viajes v ON dv.id_fkviaje_despacho_viaje = v.id_viajes
          LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
          LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
          LEFT JOIN personal chofer ON chofer.id_personal = CASE 
              WHEN IFNULL(v.id_fkchofer_viajes, 0) > 0 THEN v.id_fkchofer_viajes 
              ELSE b.id_fkpersonal_buses 
          END
          LEFT JOIN usuario u ON dv.id_fkusuario_aprueba = u.id_usuario
          LEFT JOIN sucursal2 s ON (s.id_sucursal = u.id_fksucursal_usuario OR s.suc_codigo_sucursal = u.id_fksucursal_usuario)
          WHERE dv.id_despacho_viaje = ?
          LIMIT 1";

        $stmt = $conn->prepare($query_despacho);
        $stmt->bind_param("i", $id_despacho_param);
    } else {
        $query_despacho = "SELECT 
            dv.id_despacho_viaje,
            dv.tarifa_despacho_viaje,
            dv.fecha_salida_despacho_viaje,
            dv.hora_salida_despacho_viaje,
            dv.fecha_creacion_despacho_viaje,
            dv.motivo_despacho_viaje,
            dv.id_fkusuario_aprueba,
            dv.id_fkviaje_despacho_viaje,
            u.id_usuario,
            u.nombre_usuario,
            u.apellido_usuario,
            u.username_usuario,
            u.id_fksucursal_usuario,
            s.nombre_sucursal,
            s.porcentaje_retencion,
            s.id_sucursal AS id_sucursal_despacho_resuelta,
            s.suc_codigo_sucursal AS codigo_sucursal_despacho,
            v.id_viajes,
            v.fecha_cierre as fecha_viaje,
            v.hora_origen_salida,
            v.dia_viajes,
            v.hora_salida_estimado,
            v.chofer_viajes,
            v.cedula_viajes,
            r.nombre_rutas,
            b.disco_buses,
            b.placa_buses,
            CONCAT(IFNULL(chofer.per_nombres_persona, ''), ' ', IFNULL(chofer.per_apellidos_personal, '')) as nombre_completo_chofer,
            chofer.per_cedula_personal as cedula_chofer
          FROM viajes v
          LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
          LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
          LEFT JOIN personal chofer ON chofer.id_personal = CASE 
              WHEN IFNULL(v.id_fkchofer_viajes, 0) > 0 THEN v.id_fkchofer_viajes 
              ELSE b.id_fkpersonal_buses 
          END
          LEFT JOIN despacho_viaje dv ON v.id_viajes = dv.id_fkviaje_despacho_viaje
          LEFT JOIN usuario u ON dv.id_fkusuario_aprueba = u.id_usuario
          LEFT JOIN sucursal2 s ON (s.id_sucursal = u.id_fksucursal_usuario OR s.suc_codigo_sucursal = u.id_fksucursal_usuario)
          WHERE v.id_viajes = ?
          ORDER BY (CASE 
              WHEN ? != '' AND (u.nombre_usuario = ? OR u.username_usuario = ?) THEN 0 
              WHEN ? > 0 AND u.id_fksucursal_usuario = ? THEN 0
              ELSE 1 
          END), dv.id_despacho_viaje DESC
          LIMIT 1";

        $stmt = $conn->prepare($query_despacho);
        $stmt->bind_param("isssii", $id_viajes_param, $usuario_param, $usuario_param, $usuario_param, $id_sucursal_param, $id_sucursal_param);
    }

    $stmt->execute();
    $res_despacho = $stmt->get_result();

    if ($res_despacho->num_rows === 0) {
        throw new Exception("Viaje o Despacho no encontrado");
    }

    $despacho = $res_despacho->fetch_assoc();
    $stmt->close();

    $id_despacho_viaje = intval($despacho['id_viajes']);
    $id_despacho_num = !empty($despacho['id_despacho_viaje']) ? intval($despacho['id_despacho_viaje']) : $id_despacho_viaje;
    $id_usuario_aprueba = intval($despacho['id_fkusuario_aprueba'] ?? 0);
    // La sucursal puede venir como id interno o como código: se resuelve a ambos
    // para que el filtro de boletos coincida con el de la lista de pasajeros.
    $id_sucursal_despacho = intval($despacho['id_sucursal_despacho_resuelta'] ?? 0)
        ?: intval($despacho['id_fksucursal_usuario'] ?? $id_sucursal_param);
    $codigo_sucursal_despacho = trim((string)($despacho['codigo_sucursal_despacho'] ?? ''));

    // ─── CORTE TEMPORAL DEL DESPACHO ─────────────────────────────────────────
    // La hoja de despacho debe reflejar EXACTAMENTE lo que existía cuando se
    // despachó. Si después alguien vende más boletos para el viaje, una
    // reimpresión no debe mostrar más pasajeros ni otro "RECIBE": eso permitía
    // que el oficinista aparentara haber entregado más dinero al socio.
    $sello_despacho = '';
    if (!empty($despacho['fecha_creacion_despacho_viaje'])) {
        $ts_sello = strtotime($despacho['fecha_creacion_despacho_viaje']);
        if ($ts_sello !== false) {
            $sello_despacho = date('Y-m-d H:i:s', $ts_sello);
        }
    }
    if ($sello_despacho === '') {
        $fecha_sello = $despacho['fecha_salida_despacho_viaje'] ?? '';
        $hora_sello = $despacho['hora_salida_despacho_viaje'] ?? '';
        if (!empty($fecha_sello)) {
            $sello_despacho = date('Y-m-d', strtotime($fecha_sello)) . ' ' . (!empty($hora_sello) ? $hora_sello : '23:59:59');
        }
    }
    if ($sello_despacho === '') {
        // Sin sello conocido: no se limita (compatibilidad con datos antiguos)
        $sello_despacho = '9999-12-31 23:59:59';
    }

    $nombre_chofer = trim($despacho['nombre_completo_chofer'] ?? '');
    if (empty($nombre_chofer) && !empty($despacho['chofer_viajes'])) {
        $nombre_chofer = trim($despacho['chofer_viajes']);
    }
    if (empty($nombre_chofer)) {
        $nombre_chofer = 'N/A';
    }

    // 2. Consulta de boletos correspondientes a ESTE despacho.
    // La sucursal del boleto se resuelve igual que en la lista de pasajeros
    // (y que en el motor de retenciones): id_sucursal_venta -> id_fksucursal_boleto
    // -> sucursal del usuario que vendio, cruzando por id o por codigo.
    // Antes se comparaba solo id_fksucursal_boleto/id_sucursal_venta contra el id
    // del usuario, lo que dejaba fuera boletos de la misma oficina y descuadraba
    // el total contra la lista de pasajeros.
    // La venta se toma de la CABECERA del boleto (boletos.total_boleto), igual
    // que el sistema y la lista de pasajeros: sumar boleto_detalle daba centavos
    // de más por redondeo (ej. boleto de 4 asientos: 39.38 cabecera vs 39.39
    // detalle) y la hoja no cuadraba con el resto de reportes.
    // Los pasajeros se siguen contando por línea de detalle.
    $query_totales = "SELECT 
        IFNULL(SUM(t.total_boleto), 0) AS total_boletos,
        IFNULL(SUM(t.lineas), 0) AS cantidad_boletos
      FROM (
        SELECT b.id_boleto, b.total_boleto, COUNT(bd.id_boleto_detalle) AS lineas
          FROM boletos b
          JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
          LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
         WHERE b.id_fkviaje_boleto = ?
           AND (b.estado_boleto IS NULL OR b.estado_boleto != 3)
           AND (b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= ?)
           AND (
               (? = 0 AND ? = '')
               OR EXISTS (
                   SELECT 1 FROM sucursal2 s_bol
                   WHERE (
                           s_bol.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                           OR s_bol.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                         )
                     AND (s_bol.id_sucursal = ? OR s_bol.suc_codigo_sucursal = ?)
               )
           )
         GROUP BY b.id_boleto, b.total_boleto
      ) t";

    $stmt_tot = $conn->prepare($query_totales);
    $stmt_tot->bind_param("isiiss",
        $id_despacho_viaje,
        $sello_despacho,
        $id_sucursal_despacho, $codigo_sucursal_despacho,
        $id_sucursal_despacho, $codigo_sucursal_despacho
    );
    $stmt_tot->execute();
    $res_tot = $stmt_tot->get_result();
    $totales_boletos = $res_tot->fetch_assoc();
    $stmt_tot->close();

    $total_boletos = floatval($totales_boletos['total_boletos'] ?? 0);

    // 3. Consulta de cobros/retenciones
    $totalRetenciones = 0;
    $cobros = [];

    $id_desp_val = !empty($despacho['id_despacho_viaje']) ? intval($despacho['id_despacho_viaje']) : 0;
    $id_viaje_val = intval($despacho['id_viajes'] ?? $id_despacho_viaje);

    if ($id_desp_val > 0) {
        $query_log = "SELECT 
            drl.monto_aplicado as monto_cobros,
            COALESCE(d.concepto, td.nombre, drl.tipo, 'RETENCIÓN DESPACHO') as tipo_cobro
          FROM despacho_retencion_log drl
          LEFT JOIN deudas d ON drl.id_deuda = d.id_deuda
          LEFT JOIN tipo_deudas td ON COALESCE(drl.id_tipo_deuda, d.id_tipo_deuda) = td.id_tipo_deuda
          WHERE drl.id_despacho_viaje = ?";

        $stmt_log = $conn->prepare($query_log);
        $stmt_log->bind_param("i", $id_desp_val);
        $stmt_log->execute();
        $cobros_log = $stmt_log->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_log->close();

        $query_cobros = "SELECT 
            dvr.total_cobrado_despacho_viaje_retenciones as monto_cobros,
            tc.nombre_tipo_cobros as tipo_cobro
          FROM despacho_viaje_reteciones dvr
          JOIN cobros c ON dvr.id_fkcobro_despacho_viaje_reteciones = c.id_cobros
          JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
          WHERE dvr.id_fkdespacho_viaje = ?";

        $stmt_cobros = $conn->prepare($query_cobros);
        $stmt_cobros->bind_param("i", $id_desp_val);
        $stmt_cobros->execute();
        $cobros_bus = $stmt_cobros->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_cobros->close();

        $cobros = array_merge($cobros_log, $cobros_bus);
    }

    $tarifaDespacho = floatval($despacho['tarifa_despacho_viaje'] ?? 0);
    $porcentajeRetencion = floatval($despacho['porcentaje_retencion'] ?? 0);
    $nombreSucursal = $despacho['nombre_sucursal'] ?? 'Oficina';

    $totalCobrosDespacho = 0;
    foreach ($cobros as $cobro) {
        $totalCobrosDespacho += floatval($cobro['monto_cobros']);
    }

    if (count($cobros) > 0) {
        $totalRetenciones = $totalCobrosDespacho;
    } else {
        $totalRetenciones = $tarifaDespacho;
    }

    $total_entrega = max(0, $total_boletos - $totalRetenciones);

    $raw_fecha = !empty($despacho['fecha_viaje']) ? $despacho['fecha_viaje'] : (!empty($despacho['dia_viajes']) ? $despacho['dia_viajes'] : $despacho['fecha_salida_despacho_viaje']);
    $fecha_salida = $raw_fecha ? date('d/m/Y', strtotime($raw_fecha)) : date('d/m/Y');

    $hora_salida = !empty($despacho['hora_origen_salida']) 
        ? $despacho['hora_origen_salida'] 
        : (!empty($despacho['hora_salida_estimado']) 
            ? $despacho['hora_salida_estimado'] 
            : (!empty($despacho['hora_salida_despacho_viaje']) ? $despacho['hora_salida_despacho_viaje'] : ''));

    // Fecha y hora REALES del despacho. Se graban una sola vez al crear el
    // despacho (despacho_viaje.fecha_creacion_despacho_viaje) y no se modifican
    // al reprogramar el viaje, así que sirven como sello inmutable para saber a
    // qué hora se despachó realmente la unidad.
    $fecha_despacho_real = '';
    if (!empty($despacho['fecha_creacion_despacho_viaje'])) {
        $ts_despacho = strtotime($despacho['fecha_creacion_despacho_viaje']);
        if ($ts_despacho !== false) {
            $fecha_despacho_real = date('d/m/Y H:i:s', $ts_despacho);
        }
    }
    if ($fecha_despacho_real === '') {
        $fecha_sello = $despacho['fecha_salida_despacho_viaje'] ?? '';
        $hora_sello = $despacho['hora_salida_despacho_viaje'] ?? '';
        if (!empty($fecha_sello)) {
            $fecha_despacho_real = date('d/m/Y', strtotime($fecha_sello)) . (!empty($hora_sello) ? ' ' . $hora_sello : '');
        }
    }

    $nombre_oficinista = trim(($despacho['nombre_usuario'] ?? '') . ' ' . ($despacho['apellido_usuario'] ?? ''));
    if (empty($nombre_oficinista)) {
        $nombre_oficinista = !empty($despacho['username_usuario']) ? $despacho['username_usuario'] : ($usuario_param ?: 'DESPACHO AUTOMÁTICO');
    }

    // 4. Ventas por punto (mismo criterio de sucursal que el total)
    $query_origen = "SELECT 
        IFNULL(NULLIF(TRIM(b.nombre_origen), ''),
          IFNULL((SELECT s.nombre_sucursal FROM sucursal2 s
                  WHERE s.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                     OR s.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                  LIMIT 1), 'ORIGEN PRINCIPAL')) as origen, 
        COUNT(bd.id_boleto_detalle) as cantidad, 
        SUM(bd.total_boleto_detalle) as total
      FROM boletos b
      JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
      LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
      WHERE b.id_fkviaje_boleto = ? 
        AND (b.estado_boleto IS NULL OR b.estado_boleto != 3)
        AND (
            (? = 0 AND ? = '')
            OR EXISTS (
                SELECT 1 FROM sucursal2 s_bol
                WHERE (
                        s_bol.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                        OR s_bol.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
                      )
                  AND (s_bol.id_sucursal = ? OR s_bol.suc_codigo_sucursal = ?)
            )
        )
        AND (b.fecha_creacion_boleto IS NULL OR b.fecha_creacion_boleto <= ?)
      GROUP BY origen
      ORDER BY origen ASC";

    $stmt_origen = $conn->prepare($query_origen);
    $stmt_origen->bind_param("iisiss", 
        $id_despacho_viaje, 
        $id_sucursal_despacho, $codigo_sucursal_despacho,
        $id_sucursal_despacho, $codigo_sucursal_despacho,
        $sello_despacho
    );
    $stmt_origen->execute();
    $result_origen = $stmt_origen->get_result();
    $ventasPuntos = [];
    while ($row_origen = $result_origen->fetch_assoc()) {
        $ventasPuntos[] = $row_origen;
    }
    $stmt_origen->close();
    $conn->close();

    // ─── CONFIGURACIÓN TCPDF NATIVA (80mm) ──────────────────────────────────
    $anchoPapel = 80;
    $margen = 4;
    $anchoUtil = $anchoPapel - ($margen * 2); // 72mm

    $numFilasTotal = count($ventasPuntos) + count($cobros);
    $altoEstimado = max(220, 160 + ($numFilasTotal * 5.5));

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetAuthor('Sistema Flota');
    $pdf->SetTitle('Despacho #' . $id_despacho_num);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA EMPRESA ─────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($razon_social), 0, 1, 'C');

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    // Oficina que despacha (en lugar de la dirección de la empresa)
    $nombreOficinaDespacho = trim($despacho['nombre_sucursal'] ?? '');
    if (!empty($nombreOficinaDespacho)) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, strtoupper($nombreOficinaDespacho), 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil, 4.5, 'DESPACHO N° ' . $id_despacho_num, 0, 1, 'C');

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(1.5);

    // ─── 2. DATOS DEL VIAJE ──────────────────────────────────────────────────
    $wKey = 20;
    $wVal = $anchoUtil - $wKey;
    $hRow = 3.8;

    $infoRows = [
        ['N° VIAJE:', (string)$id_despacho_viaje, true],
        ['DISCO:', (string)($despacho['disco_buses'] ?? ''), false],
        ['RUTA:', (string)($despacho['nombre_rutas'] ?? ''), false],
        ['SALIDA:', $fecha_salida . ' ' . $hora_salida, false],
        ['DESPACHADO:', $fecha_despacho_real !== '' ? $fecha_despacho_real : 'NO REGISTRADO', true],
        ['PLACA:', (string)($despacho['placa_buses'] ?? ''), false],
        ['CHOFER:', strtoupper($nombre_chofer), false],
    ];

    foreach ($infoRows as $ir) {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wKey, $hRow, $ir[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', $ir[2] ? 'B' : '', 7.5);
        $pdf->Cell($wVal, $hRow, $ir[1], 0, 1, 'L');
    }

    $pdf->Ln(1);
    $pdf->SetLineStyle(['dash' => 2]);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->SetLineStyle(['dash' => 0]);
    $pdf->Ln(1.5);

    // OFICINISTA
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(20, $hRow, 'OFICINISTA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 20, $hRow, strtoupper($nombre_oficinista), 0, 1, 'L');

    // ─── 3. VENTAS POR PUNTO ─────────────────────────────────────────────────
    if (count($ventasPuntos) > 0) {
        $pdf->Ln(1);
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil, 4, 'VENTAS POR PUNTO:', 'B', 1, 'L');

        $wPunto = 38;
        $wCant = 14;
        $wTot = 20;

        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->Cell($wPunto, 3.8, 'Punto', 0, 0, 'L');
        $pdf->Cell($wCant, 3.8, 'Cant.', 0, 0, 'C');
        $pdf->Cell($wTot, 3.8, 'Total', 0, 1, 'R');

        $pdf->SetFont('helvetica', '', 7);
        foreach ($ventasPuntos as $vp) {
            $pdf->Cell($wPunto, 3.6, strtoupper($vp['origen']), 0, 0, 'L');
            $pdf->Cell($wCant, 3.6, (string)$vp['cantidad'], 0, 0, 'C');
            $pdf->Cell($wTot, 3.6, '$' . number_format($vp['total'], 2), 0, 1, 'R');
        }
    }

    // ─── 4. DETALLE DE COBROS / RETENCIONES ───────────────────────────────────
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil, 4, 'DETALLE DE COBROS:', 0, 1, 'L');

    $wConc = 48;
    $wValC = 24;

    $pdf->SetFont('helvetica', 'B', 7);
    $pdf->Cell($wConc, 3.8, 'Concepto', 'B', 0, 'L');
    $pdf->Cell($wValC, 3.8, 'Valor', 'B', 1, 'R');

    $pdf->SetFont('helvetica', '', 7);
    if (count($cobros) === 0 && $tarifaDespacho > 0) {
        $label = 'RETENCIÓN ' . strtoupper($nombreSucursal);
        if ($porcentajeRetencion > 0) {
            $label .= ' (' . $porcentajeRetencion . '%)';
        }
        $pdf->Cell($wConc, 3.6, $label, 0, 0, 'L');
        $pdf->Cell($wValC, 3.6, '$' . number_format($tarifaDespacho, 2), 0, 1, 'R');
    }

    foreach ($cobros as $cobro) {
        $pdf->Cell($wConc, 3.6, $cobro['tipo_cobro'], 0, 0, 'L');
        $pdf->Cell($wValC, 3.6, '$' . number_format($cobro['monto_cobros'], 2), 0, 1, 'R');
    }

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wConc, 4, 'TOTAL RETENCIONES:', 'T', 0, 'L');
    $pdf->Cell($wValC, 4, '$' . number_format($totalRetenciones, 2), 'T', 1, 'R');

    // ─── 5. RESUMEN FINANCIERO ───────────────────────────────────────────────
    $pdf->Ln(1);
    $wResKey = 48;
    $wResVal = 24;

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wResKey, 3.8, '(+) VENTA BOLETOS:', 0, 0, 'L');
    $pdf->Cell($wResVal, 3.8, '$' . number_format($total_boletos, 2), 0, 1, 'R');

    $pdf->Cell($wResKey, 3.8, '(-) RETENCIONES:', 0, 0, 'L');
    $pdf->Cell($wResVal, 3.8, '$' . number_format($totalRetenciones, 2), 0, 1, 'R');

    // ─── 6. TOTAL A RECIBIR (Cuadro Destacado) ────────────────────────────────
    $pdf->Ln(1.5);
    $yBox = $pdf->GetY();
    $pdf->SetLineStyle(['dash' => 2]);
    $pdf->Rect($margen, $yBox, $anchoUtil, 9, 'D');
    $pdf->SetLineStyle(['dash' => 0]);

    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->SetXY($margen, $yBox + 1.8);
    $pdf->Cell($anchoUtil, 6, 'RECIBE: $' . number_format($total_entrega, 2), 0, 1, 'C');

    // ─── 7. PIE DE PÁGINA ────────────────────────────────────────────────────
    $pdf->Ln(3);
    $pdf->SetFont('helvetica', '', 7);
    $pdf->Cell($anchoUtil, 3.2, 'F. Impresión: ' . date('d/m/Y H:i:s'), 0, 1, 'C');
    $pdf->Cell($anchoUtil, 3.2, 'N° Viaje: ' . $id_despacho_viaje, 0, 1, 'C');
    $pdf->Cell($anchoUtil, 3.2, 'Despachado por: ' . strtoupper($nombre_oficinista), 0, 1, 'C');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'despacho_pos_' . $id_despacho_num . '.pdf';
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
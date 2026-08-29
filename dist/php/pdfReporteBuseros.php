<?php
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";
date_default_timezone_set('America/Guayaquil');

try {
    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // Parámetros de filtro
    $per_codigo  = trim($_GET['per_codigo'] ?? '');
    $bus_codigo  = trim($_GET['bus_codigo'] ?? '');
    $ruta_codigo = trim($_GET['ruta_codigo'] ?? '');
    $per_nombre  = trim($_GET['per_nombre'] ?? '');
    $bus_placa   = trim($_GET['bus_placa'] ?? '');
    $ruta_nombre = trim($_GET['ruta_nombre'] ?? '');
    $fecha       = trim($_GET['fecha'] ?? '');
    $mes         = trim($_GET['mes'] ?? '0');
    $anio        = trim($_GET['anio'] ?? '0');
    $format      = strtolower(trim($_GET['format'] ?? 'a4')); // 'a4' o '80mm'

    // ─── EMPRESA ─────────────────────────────────────────────────────────────
    $rsEmp = mysqli_query($conn, "SELECT id_empresa, ruc_empresa, razon_social_empresa, direccion_empresa, telefono_empresa, correo_empresa, imagen_empresa, nombre_comercial_empresa FROM empresa LIMIT 1");
    $emp = $rsEmp ? mysqli_fetch_array($rsEmp) : [];
    $razon_social = $emp['nombre_comercial_empresa'] ?? $emp['razon_social_empresa'] ?? '';
    $ruc_empresa   = $emp['ruc_empresa'] ?? '';
    $direccion     = $emp['direccion_empresa'] ?? '';
    $logo          = obtenerRutaLogoEmpresa($conn, $emp['imagen_empresa'] ?? null);

    // ─── AGENCIA / SUCURSAL ──────────────────────────────────────────────────
    $nombre_sucursal = $_SESSION['nombre_sucursal'] ?? $_SESSION['sucursal'] ?? '';
    if (!$nombre_sucursal && isset($_SESSION['id_fksucursal'])) {
        $idSuc = intval($_SESSION['id_fksucursal']);
        $rsSuc = mysqli_query($conn, "SELECT nombre_sucursal FROM sucursal2 WHERE id_sucursal = $idSuc OR suc_codigo_sucursal = '$idSuc' LIMIT 1");
        if ($rsSuc && $rowSuc = mysqli_fetch_assoc($rsSuc)) {
            $nombre_sucursal = $rowSuc['nombre_sucursal'];
        }
    }

    // Usuario para pie de firma/impresión
    $usuario_impresion = $_SESSION['nombre_usuario'] ?? $_SESSION['username'] ?? $_SESSION['usuario'] ?? 'SYSDBA';

    // ─── CONSTRUIR WHERE ──────────────────────────────────────────────────────
    $where = " WHERE 1=1 ";
    if (!empty($per_codigo) && $per_codigo !== "0") {
        $val = intval($per_codigo);
        $where .= " AND (v.id_fkchofer_viajes = $val OR bu.id_fksocio_buses = $val) ";
    }
    if (!empty($bus_codigo) && $bus_codigo !== "0") {
        $val = mysqli_real_escape_string($conn, $bus_codigo);
        $where .= " AND (v.id_fkbus_viajes = '$val' OR bu.codigo_buses = '$val' OR bu.disco_buses = '$val') ";
    }
    if (!empty($ruta_codigo) && $ruta_codigo !== "0") {
        $val = intval($ruta_codigo);
        $where .= " AND v.id_fkruta_viajes = $val ";
    }
    if (!empty($per_nombre)) {
        $val = mysqli_real_escape_string($conn, $per_nombre);
        $where .= " AND CONCAT(COALESCE(p.per_nombres_persona,''), ' ', COALESCE(p.per_apellidos_personal,'')) LIKE '%$val%' ";
    }
    if (!empty($bus_placa)) {
        $val = mysqli_real_escape_string($conn, $bus_placa);
        $where .= " AND (bu.disco_buses LIKE '%$val%' OR bu.placa_buses LIKE '%$val%') ";
    }
    if (!empty($ruta_nombre)) {
        $val = mysqli_real_escape_string($conn, $ruta_nombre);
        $where .= " AND r.nombre_rutas LIKE '%$val%' ";
    }
    if (!empty($fecha) && $fecha !== "null") {
        $val = mysqli_real_escape_string($conn, $fecha);
        $where .= " AND v.fecha_cierre LIKE '$val%' ";
    } else {
        if (!empty($mes) && $mes !== "0") {
            $val = intval($mes);
            $where .= " AND MONTH(v.fecha_cierre) = $val ";
        }
        if (!empty($anio) && $anio !== "0") {
            $val = intval($anio);
            $where .= " AND YEAR(v.fecha_cierre) = $val ";
        }
    }

    // ─── CONSULTA SQL ────────────────────────────────────────────────────────
    $sql = "
      SELECT 
        v.id_viajes as viaje,
        r.nombre_rutas as ruta,
        TRIM(CONCAT(COALESCE(p.per_apellidos_personal, ''), ' ', COALESCE(p.per_nombres_persona, ''))) as socio,
        v.fecha_cierre,
        IFNULL(TIME_FORMAT(v.hora_origen_salida, '%H:%i'), '') as hora_salida,
        COALESCE(SUM(c.monto_cobros), 0) as retenido,
        COALESCE(SUM(CASE WHEN c.tipo_cobro = 1 OR tc.nombre_tipo_cobros LIKE '%admin%' OR tc.nombre_tipo_cobros LIKE '%cuota%' THEN c.monto_cobros ELSE 0 END), 0) as cuota_admin,
        COALESCE(SUM(CASE WHEN c.tipo_cobro = 2 OR tc.nombre_tipo_cobros LIKE '%multa%' THEN c.monto_cobros ELSE 0 END), 0) as multas,
        COALESCE(SUM(CASE WHEN tc.nombre_tipo_cobros LIKE '%refrig%' OR tc.nombre_tipo_cobros LIKE '%alim%' OR c.tipo_cobro = 4 THEN c.monto_cobros ELSE 0 END), 0) as refrigerio,
        COALESCE(SUM(CASE WHEN tc.nombre_tipo_cobros LIKE '%accid%' OR c.tipo_cobro = 5 THEN c.monto_cobros ELSE 0 END), 0) as accidentes,
        COALESCE(SUM(CASE WHEN (c.tipo_cobro NOT IN (1,2,4,5) AND tc.nombre_tipo_cobros NOT LIKE '%admin%' AND tc.nombre_tipo_cobros NOT LIKE '%cuota%' AND tc.nombre_tipo_cobros NOT LIKE '%multa%' AND tc.nombre_tipo_cobros NOT LIKE '%refrig%' AND tc.nombre_tipo_cobros NOT LIKE '%alim%' AND tc.nombre_tipo_cobros NOT LIKE '%accid%') THEN c.monto_cobros ELSE 0 END), 0) as otros_desc,
        COALESCE(SUM(b.total_boleto), 0) as venta,
        COUNT(DISTINCT b.id_boleto) as facturas,
        COALESCE(SUM(DISTINCT bn.valor), 0) as bonos,
        COALESCE(bu.disco_buses, '-') as bus_disco,
        p.id_personal as per_codigo
      FROM viajes v
        LEFT JOIN cobros c ON c.id_fkviajes_cobros = v.id_viajes AND c.estado_cobros != 0
        LEFT JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
        LEFT JOIN boletos b ON b.id_fkviaje_boleto = v.id_viajes AND b.estado_boleto != 3
        LEFT JOIN personal p ON v.id_fkchofer_viajes = p.id_personal
        LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
        LEFT JOIN buses bu ON v.id_fkbus_viajes = bu.id_buses
        LEFT JOIN bonos bn ON (bn.id_bus = v.id_fkbus_viajes OR bn.id_socio = bu.id_fksocio_buses OR bn.id_socio = p.id_personal) 
                           AND bn.fecha = DATE(v.fecha_cierre) AND bn.estado = 'activo'
      $where
      GROUP BY v.id_viajes, r.nombre_rutas, p.per_nombres_persona, p.per_apellidos_personal, v.fecha_cierre, v.hora_origen_salida, bu.disco_buses, p.id_personal
      HAVING (COUNT(DISTINCT b.id_boleto) > 0 OR COALESCE(SUM(c.monto_cobros), 0) > 0 OR COALESCE(SUM(DISTINCT bn.valor), 0) > 0)
      ORDER BY socio ASC, bus_disco ASC, v.fecha_cierre ASC
    ";

    $rs = mysqli_query($conn, $sql) or die(mysqli_error($conn));

    // Nombres de meses
    $nombreMeses = [
        '1' => 'Enero', '2' => 'Febrero', '3' => 'Marzo', '4' => 'Abril',
        '5' => 'Mayo', '6' => 'Junio', '7' => 'Julio', '8' => 'Agosto',
        '9' => 'Septiembre', '10' => 'Octubre', '11' => 'Noviembre', '12' => 'Diciembre'
    ];

    function fmtFechaEs($fechaStr) {
        if (!$fechaStr || $fechaStr === '0000-00-00') return '-';
        $time = strtotime($fechaStr);
        $mesesShort = ['jan'=>'ene','feb'=>'feb','mar'=>'mar','apr'=>'abr','may'=>'may','jun'=>'jun','jul'=>'jul','aug'=>'ago','sep'=>'sep','oct'=>'oct','nov'=>'nov','dec'=>'dic'];
        $m = strtolower(date('M', $time));
        $mesEs = $mesesShort[$m] ?? $m;
        return date('d', $time) . '-' . $mesEs . '-' . date('y', $time);
    }

    function fmtMoney($num) {
        if (floatval($num) == 0) return '0,00';
        return number_format(floatval($num), 2, ',', '.');
    }

    // Organizar datos por Socio
    $sociosGrouped = [];
    $totalGeneralFacturas   = 0;
    $totalGeneralVenta      = 0.0;
    $totalGeneralCuotaAdmin = 0.0;
    $totalGeneralMultas     = 0.0;
    $totalGeneralRefrigerio = 0.0;
    $totalGeneralAccidentes = 0.0;
    $totalGeneralOtrosDesc  = 0.0;
    $totalGeneralRetenido   = 0.0;
    $totalGeneralBonos      = 0.0;
    $totalGeneralNeto       = 0.0;
    $totalFilasViajes       = 0;

    while ($row = mysqli_fetch_assoc($rs)) {
        $socioName = !empty($row['socio']) ? strtoupper($row['socio']) : 'SIN SOCIO ASIGNADO';
        $disco = $row['bus_disco'];
        $key = $socioName . '___' . $disco;

        if (!isset($sociosGrouped[$key])) {
            $sociosGrouped[$key] = [
                'socio' => $socioName,
                'disco' => $disco,
                'viajes' => [],
                'total_facturas'   => 0,
                'total_venta'      => 0.0,
                'total_cuota_admin'=> 0.0,
                'total_multas'     => 0.0,
                'total_refrigerio' => 0.0,
                'total_accidentes' => 0.0,
                'total_otros_desc' => 0.0,
                'total_retenido'   => 0.0,
                'total_bonos'      => 0.0,
                'total_neto'       => 0.0,
            ];
        }

        $facturasCount   = intval($row['facturas']);
        $ventaAmount     = floatval($row['venta']);
        $cuotaAdmin      = floatval($row['cuota_admin']);
        $multasAmount    = floatval($row['multas']);
        $refrigerioAmount= floatval($row['refrigerio']);
        $accidentesAmount= floatval($row['accidentes']);
        $otrosDescAmount = floatval($row['otros_desc']);
        $retenidoAmount  = floatval($row['retenido']);
        $bonosAmount     = floatval($row['bonos']);
        $netoAmount      = $ventaAmount - $retenidoAmount + $bonosAmount;

        $sociosGrouped[$key]['viajes'][] = [
            'viaje' => $row['viaje'],
            'ruta' => $row['ruta'] ?? 'SIN RUTA',
            'fecha' => fmtFechaEs($row['fecha_cierre']),
            'fecha_raw' => $row['fecha_cierre'],
            'hora' => !empty($row['hora_salida']) ? $row['hora_salida'] : '00:00',
            'disco' => $disco,
            'facturas' => $facturasCount,
            'venta' => $ventaAmount,
            'cuota_admin' => $cuotaAdmin,
            'multas' => $multasAmount,
            'refrigerio' => $refrigerioAmount,
            'accidentes' => $accidentesAmount,
            'otros_desc' => $otrosDescAmount,
            'retenido' => $retenidoAmount,
            'bonos' => $bonosAmount,
            'neto' => $netoAmount,
        ];

        $sociosGrouped[$key]['total_facturas']   += $facturasCount;
        $sociosGrouped[$key]['total_venta']      += $ventaAmount;
        $sociosGrouped[$key]['total_cuota_admin']+= $cuotaAdmin;
        $sociosGrouped[$key]['total_multas']     += $multasAmount;
        $sociosGrouped[$key]['total_refrigerio'] += $refrigerioAmount;
        $sociosGrouped[$key]['total_accidentes'] += $accidentesAmount;
        $sociosGrouped[$key]['total_otros_desc'] += $otrosDescAmount;
        $sociosGrouped[$key]['total_retenido']   += $retenidoAmount;
        $sociosGrouped[$key]['total_bonos']      += $bonosAmount;
        $sociosGrouped[$key]['total_neto']       += $netoAmount;

        $totalGeneralFacturas   += $facturasCount;
        $totalGeneralVenta      += $ventaAmount;
        $totalGeneralCuotaAdmin += $cuotaAdmin;
        $totalGeneralMultas     += $multasAmount;
        $totalGeneralRefrigerio += $refrigerioAmount;
        $totalGeneralAccidentes += $accidentesAmount;
        $totalGeneralOtrosDesc  += $otrosDescAmount;
        $totalGeneralRetenido   += $retenidoAmount;
        $totalGeneralBonos      += $bonosAmount;
        $totalGeneralNeto       += $netoAmount;
        $totalFilasViajes++;
    }

    $mesLabel = ($mes !== '0' && isset($nombreMeses[$mes])) ? $nombreMeses[$mes] : ($mes !== '0' ? $mes : 'Todos');
    $anioLabel = ($anio !== '0') ? $anio : 'Todos';

    // Obtener nombre del socio para el encabezado
    $nombreSocioReporte = '';
    if (!empty($sociosGrouped)) {
        $primerItem = reset($sociosGrouped);
        $nombreSocioReporte = $primerItem['socio'] ?? '';
    }
    if (empty($nombreSocioReporte) && !empty($per_nombre)) {
        $nombreSocioReporte = strtoupper($per_nombre);
    }
    if (empty($nombreSocioReporte)) {
        $nombreSocioReporte = 'TODOS';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORMATO 80MM (TICKET TÉRMICO)
    // ─────────────────────────────────────────────────────────────────────────
    if ($format === '80mm' || $format === '80' || $format === 'ticket') {
        
        $diasEs = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
        $mesesEs = ['','JAN','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        $now = time();
        $diaNom = $diasEs[date('w', $now)];
        $diaNum = date('d', $now);
        $mesNom = $mesesEs[intval(date('m', $now))];
        $anioNum = date('Y', $now);
        $fechaConsultaStr = "$diaNom, $diaNum $mesNom $anioNum";
        $horaConsultaStr = date('H:i', $now);

        $html80 = '<html><head><style>
            body { font-family: helvetica, sans-serif; font-size: 7.5pt; color: #000000; margin: 0; padding: 0; }
            .box-title { border: 1.5px solid #000000; padding: 3px 2px; text-align: center; font-weight: bold; font-size: 8pt; line-height: 1.1; }
            .company-info { text-align: center; font-size: 7.5pt; line-height: 1.25; }
            .line-dashed { border-bottom: 1px dashed #000000; margin: 3px 0; }
            .line-solid { border-bottom: 1px solid #000000; margin: 3px 0; }
            
            .table-head { width: 100%; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 7pt; font-weight: bold; }
            .table-head td { padding: 3px 0px; }
            
            .table-data { width: 100%; font-size: 7pt; font-family: courier, monospace; border-collapse: collapse; }
            .table-data td { padding: 1.5px 0px; vertical-align: top; }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .bold { font-weight: bold; }
        </style></head><body>';

        // Header: Logo y recuadro REPORTE VENTAS DIARIAS AGENCIA
        $html80 .= '<table style="width:100%; border-collapse:collapse;">
            <tr>
                <td style="width:38%; text-align:left; vertical-align:middle;">
                    ' . ($logo ? '<img src="' . $logo . '" height="28"/>' : ($razon_social ? '<b style="font-size:10pt;">' . htmlspecialchars($razon_social) . '</b>' : '')) . '
                </td>
                <td style="width:62%; vertical-align:middle;">
                    <div class="box-title">REPORTE VENTAS<br/>POR SOCIO</div>
                </td>
            </tr>
        </table>';

        $html80 .= '<div class="line-dashed"></div>';

        // Info Empresa dinámicos de BD
        $html80 .= '<div class="company-info">';
        if (!empty($razon_social)) {
            $html80 .= '<b>' . htmlspecialchars(strtoupper($razon_social)) . '</b><br/>';
        }
        if (!empty($ruc_empresa)) {
            $html80 .= 'RUC <b>' . htmlspecialchars($ruc_empresa) . '</b><br/>';
        }
        if (!empty($direccion)) {
            $html80 .= htmlspecialchars($direccion) . '<br/>';
        }
        if (!empty($nombre_sucursal)) {
            $html80 .= 'Agencia ' . htmlspecialchars($nombre_sucursal) . '<br/>';
        }
        $html80 .= '</div>';

        // Información de Socio y Consulta
        $html80 .= '<table style="width:100%; font-size:7.5pt; line-height:1.3; margin-top:2px;">
            <tr>
                <td>Socio: <b>' . htmlspecialchars($nombreSocioReporte) . '</b></td>
            </tr>
            <tr>
                <td>F. Consulta: <b>' . $fechaConsultaStr . '</b></td>
            </tr>
            <tr>
                <td>Hora Consulta: <b>' . $horaConsultaStr . '</b></td>
            </tr>
        </table><br/>';

        // Encabezado de Columnas 80mm
        $html80 .= '<table class="table-head">
            <tr>
                <td style="width:16%;"># Viaje</td>
                <td style="width:18%;">F. Viaje</td>
                <td style="width:12%;">Hora</td>
                <td style="width:10%; text-align:center;">Disco</td>
                <td style="width:8%; text-align:right;">Cant</td>
                <td style="width:18%; text-align:right;">Venta</td>
                <td style="width:18%; text-align:right;">Neto</td>
            </tr>
        </table>';

        // Datos por Viaje
        if (empty($sociosGrouped)) {
            $html80 .= '<div style="text-align:center; padding:12px; font-size:7pt; color:#666;">Sin datos para mostrar</div>';
        } else {
            $html80 .= '<div style="font-size:7pt; font-weight:bold; margin-top:4px; margin-bottom:2px; color:#333;">
                &nbsp;&nbsp;DETALLE DE BOLETOS Y VIAJES
            </div>';

            $html80 .= '<table class="table-data">';
            foreach ($sociosGrouped as $sg) {
                foreach ($sg['viajes'] as $v) {
                    $fViaje = !empty($v['fecha_raw']) ? date('j/n/Y', strtotime($v['fecha_raw'])) : $v['fecha'];
                    $html80 .= '<tr>
                        <td style="width:16%;">' . htmlspecialchars($v['viaje']) . '</td>
                        <td style="width:18%;">' . htmlspecialchars($fViaje) . '</td>
                        <td style="width:12%;">' . htmlspecialchars($v['hora']) . '</td>
                        <td style="width:10%; text-align:center;">' . htmlspecialchars($v['disco']) . '</td>
                        <td style="width:8%; text-align:right;">' . $v['facturas'] . '</td>
                        <td style="width:18%; text-align:right;">' . fmtMoney($v['venta']) . '</td>
                        <td style="width:18%; text-align:right;">' . fmtMoney($v['neto']) . '</td>
                    </tr>';
                }
            }
            $html80 .= '</table>';

            // Total General
            $html80 .= '<div style="border-bottom:1px solid #000; margin-top:4px;"></div>';
            $html80 .= '<div style="text-align:right; font-size:10pt; font-weight:bold; font-family:courier, monospace; margin-top:5px; margin-bottom:8px;">
                TOTAL NETO: ' . fmtMoney($totalGeneralNeto) . '
            </div>';
        }

        // Icono Easysplus
        $pathsIcono = [
          __DIR__ . '/../public/images/transpaeasy_icon.png',
          dirname(__DIR__) . '/images/transpaeasy_icon.png',
          __DIR__ . '/images/transpaeasy_icon.png',
          $_SERVER['DOCUMENT_ROOT'] . '/images/transpaeasy_icon.png',
          $_SERVER['DOCUMENT_ROOT'] . '/public/images/transpaeasy_icon.png'
        ];
        $rutaIcono = '';
        foreach ($pathsIcono as $pathCandidate) {
          if (file_exists($pathCandidate)) {
            $rutaIcono = $pathCandidate;
            break;
          }
        }

        // Pie de ticket
        $html80 .= '<div style="font-size:7pt; line-height:1.3; border-top:1px dashed #000; padding-top:4px; text-align:center;">
            Impreso por ' . htmlspecialchars($usuario_impresion) . ' | ' . date('j/n/Y H:i:s') . '<br/>
            ' . (!empty($rutaIcono) ? '<img src="' . $rutaIcono . '" width="10" height="10"> ' : '') . '<b>Easysplus</b> - Sistema de facturación electrónica
        </div></body></html>';

        // ─── PDF TCPDF 80MM (CÁLCULO DINÁMICO DE ALTURA) ─────────────────────
        $calculatedHeight = max(180, 110 + ($totalFilasViajes * 6) + (count($sociosGrouped) * 18));
        $pdf = new TCPDF('P', 'mm', array(80, $calculatedHeight), true, 'UTF-8', false);
        $pdf->SetCreator('SistemaFlota');
        $pdf->SetTitle('Reporte_Ventas_Buseros_80mm');
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(2.5, 3, 2.5);
        $pdf->SetAutoPageBreak(true, 4);
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->AddPage();
        $pdf->writeHTML($html80, true, false, true, false, '');

        $pdf->Output('Reporte_Ventas_Buseros_80mm.pdf', 'I');
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORMATO ESTÁNDAR A4 HORIZONTAL (LANDSCAPE)
    // ─────────────────────────────────────────────────────────────────────────
    $html = '<html><head><style>
        body { font-family: helvetica, sans-serif; font-size: 7.5pt; color: #1e293b; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        .title { font-size: 13pt; font-weight: bold; color: #1e3a8a; }
        .subtitle { font-size: 8.5pt; color: #64748b; font-weight: bold; }
        
        .filter-box { width: 100%; border: 1px solid #cbd5e1; background-color: #f8fafc; margin-bottom: 6px; }
        .filter-box td { font-size: 7.5pt; padding: 2px 4px; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-top: 3px; }
        .data-table th { background-color: #2563eb; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #1d4ed8; padding: 3px 1px; font-size: 6.5pt; }
        .data-table td { border: 1px solid #cbd5e1; padding: 2.5px 1px; font-size: 6.5pt; vertical-align: middle; }
        
        .disco-cell { font-weight: bold; text-align: center; vertical-align: middle; color: #1e3a8a; }
        
        .total-general-row td { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 7pt; border: 1px solid #0f172a; padding: 3px 1px; }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-mono { font-family: courier, monospace; }
    </style></head><body>';

    // Encabezado
    $html .= '<table cellpadding="0" cellspacing="0" class="header-table">
        <tr>
            <td width="10%">' . ($logo ? '<img src="' . $logo . '" height="32"/>' : '') . '</td>
            <td width="90%" class="text-left">
                <div class="title">' . htmlspecialchars($razon_social) . '</div>
                <div class="subtitle">REPORTE DETALLADO DE VENTAS Y DESCUENTOS POR SOCIO</div>
            </td>
        </tr>
    </table>';

    // Cuadro de Información del Socio y Filtros (Exactamente 100% en cada fila)
    $html .= '<table cellpadding="3" cellspacing="0" class="filter-box">
        <tr>
            <td width="10%" style="color:#64748b; font-weight:bold;">SOCIO:</td>
            <td width="46%" style="font-size:8.5pt; color:#0f172a;"><b>' . htmlspecialchars($nombreSocioReporte) . '</b></td>
            <td width="8%" style="color:#64748b; font-weight:bold;">AÑO:</td>
            <td width="14%"><b>' . htmlspecialchars($anioLabel) . '</b></td>
            <td width="8%" style="color:#64748b; font-weight:bold;">MES:</td>
            <td width="14%"><b>' . htmlspecialchars($mesLabel) . '</b></td>
        </tr>
        <tr>
            <td width="10%" style="color:#64748b; font-weight:bold;">BUS / PLACA:</td>
            <td width="46%"><b>' . htmlspecialchars($bus_placa ?: 'Todos') . '</b></td>
            <td width="8%" style="color:#64748b; font-weight:bold;">FECHA:</td>
            <td width="36%"><b>' . htmlspecialchars((!empty($fecha) && $fecha !== 'null') ? $fecha : 'Todas') . '</b></td>
        </tr>
    </table>';

    // Tabla de Datos en Formato Horizontal (Porcentajes suman exactamente 100%)
    $html .= '<table cellpadding="2" cellspacing="0" class="data-table">
        <thead>
            <tr>
                <th width="4%">DISCO</th>
                <th width="5%">VIAJE</th>
                <th width="15%">RUTA</th>
                <th width="10%">FECHA Y HORA</th>
                <th width="4%">CANT</th>
                <th width="7%">VENTA</th>
                <th width="7%">CUOTA ADM</th>
                <th width="6%">MULTAS</th>
                <th width="6%">REFRIG.</th>
                <th width="6%">ACCID.</th>
                <th width="6%">OTROS</th>
                <th width="8%">RETENIDO</th>
                <th width="7%">BONOS</th>
                <th width="9%">TOTAL NETO</th>
            </tr>
        </thead>
        <tbody>';

    if (empty($sociosGrouped)) {
        $html .= '<tr><td colspan="14" class="text-center" style="padding: 15px; color: #94a3b8;">No se encontraron registros para la búsqueda.</td></tr>';
    } else {
        foreach ($sociosGrouped as $sg) {
            foreach ($sg['viajes'] as $v) {
                $html .= '<tr>
                    <td width="4%" class="text-center font-mono disco-cell">' . htmlspecialchars($v['disco']) . '</td>
                    <td width="5%" class="text-center font-mono">#' . htmlspecialchars($v['viaje']) . '</td>
                    <td width="15%">' . htmlspecialchars($v['ruta']) . '</td>
                    <td width="10%" class="text-center" style="font-size:6pt; color:#475569;">' . htmlspecialchars($v['fecha']) . '<br/>' . htmlspecialchars($v['hora']) . '</td>
                    <td width="4%" class="text-right font-mono">' . $v['facturas'] . '</td>
                    <td width="7%" class="text-right font-mono">' . fmtMoney($v['venta']) . '</td>
                    <td width="7%" class="text-right font-mono">' . fmtMoney($v['cuota_admin']) . '</td>
                    <td width="6%" class="text-right font-mono">' . fmtMoney($v['multas']) . '</td>
                    <td width="6%" class="text-right font-mono">' . fmtMoney($v['refrigerio']) . '</td>
                    <td width="6%" class="text-right font-mono">' . fmtMoney($v['accidentes']) . '</td>
                    <td width="6%" class="text-right font-mono">' . fmtMoney($v['otros_desc']) . '</td>
                    <td width="8%" class="text-right font-mono" style="font-weight:bold; color:#dc2626;">' . fmtMoney($v['retenido']) . '</td>
                    <td width="7%" class="text-right font-mono">' . fmtMoney($v['bonos']) . '</td>
                    <td width="9%" class="text-right font-mono" style="font-weight:bold; color:#15803d;">' . fmtMoney($v['neto']) . '</td>
                </tr>';
            }
        }

        // Fila de Total General
        $html .= '<tr class="total-general-row">
            <td width="34%" class="text-right">TOTAL GENERAL:</td>
            <td width="4%" class="text-right font-mono">' . number_format($totalGeneralFacturas) . '</td>
            <td width="7%" class="text-right font-mono">' . fmtMoney($totalGeneralVenta) . '</td>
            <td width="7%" class="text-right font-mono">' . fmtMoney($totalGeneralCuotaAdmin) . '</td>
            <td width="6%" class="text-right font-mono">' . fmtMoney($totalGeneralMultas) . '</td>
            <td width="6%" class="text-right font-mono">' . fmtMoney($totalGeneralRefrigerio) . '</td>
            <td width="6%" class="text-right font-mono">' . fmtMoney($totalGeneralAccidentes) . '</td>
            <td width="6%" class="text-right font-mono">' . fmtMoney($totalGeneralOtrosDesc) . '</td>
            <td width="8%" class="text-right font-mono" style="font-weight:bold;">' . fmtMoney($totalGeneralRetenido) . '</td>
            <td width="7%" class="text-right font-mono">' . fmtMoney($totalGeneralBonos) . '</td>
            <td width="9%" class="text-right font-mono" style="font-weight:bold;">' . fmtMoney($totalGeneralNeto) . '</td>
        </tr>';
    }

    $html .= '</tbody></table></body></html>';

    // Rutas del Icono Easysplus
    $pathsIcono = [
      __DIR__ . '/../public/images/transpaeasy_icon.png',
      dirname(__DIR__) . '/images/transpaeasy_icon.png',
      __DIR__ . '/images/transpaeasy_icon.png',
      $_SERVER['DOCUMENT_ROOT'] . '/images/transpaeasy_icon.png',
      $_SERVER['DOCUMENT_ROOT'] . '/public/images/transpaeasy_icon.png'
    ];
    $rutaIcono = '';
    foreach ($pathsIcono as $pathCandidate) {
      if (file_exists($pathCandidate)) {
        $rutaIcono = $pathCandidate;
        break;
      }
    }

    // ─── CLASE PERSONALIZADA PARA PIE DE PÁGINA NATIVO ─────────────────────────
    if (!class_exists('ReporteBuserosPDF')) {
        class ReporteBuserosPDF extends TCPDF {
            public $usuario_impresion = '';
            public $rutaIcono = '';

            public function Footer() {
                $this->SetY(-8);
                $fechaImpresionStr = date('d/m/Y H:i:s');
                $html_footer = '<table cellpadding="0" cellspacing="0" style="width:100%; border-top:1px solid #cbd5e1; padding-top:2px; font-size:7pt; color:#475569;">
                  <tr>
                    <td width="35%" style="text-align:left;">
                      Impreso por: <b>' . htmlspecialchars($this->usuario_impresion) . '</b>
                    </td>
                    <td width="35%" style="text-align:center;">
                      ' . (!empty($this->rutaIcono) ? '<img src="' . $this->rutaIcono . '" width="10" height="10"> ' : '') . '
                      <b>Easysplus</b> - Sistema de facturación electrónica
                    </td>
                    <td width="30%" style="text-align:right;">
                      F. Impresión: <b>' . $fechaImpresionStr . '</b> &nbsp;|&nbsp; Pág. ' . $this->getAliasNumPage() . '/' . $this->getAliasNbPages() . '
                    </td>
                  </tr>
                </table>';
                $this->writeHTML($html_footer, true, false, false, false, '');
            }
        }
    }

    // ─── CREAR PDF CON TCPDF (A4 HORIZONTAL / LANDSCAPE) ───────────────────────
    $pdf = new ReporteBuserosPDF('L', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->usuario_impresion = $usuario_impresion;
    $pdf->rutaIcono = $rutaIcono;
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetAuthor($razon_social ?: 'SistemaFlota');
    $pdf->SetTitle('Reporte_Ventas_Buseros_Landscape');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(true);
    $pdf->setFooterMargin(8);
    $pdf->SetMargins(6, 6, 6);
    $pdf->SetAutoPageBreak(true, 12);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->AddPage();
    $pdf->writeHTML($html, true, false, true, false, '');

    $pdf->Output('Reporte_Ventas_Buseros.pdf', 'I');

} catch (Exception $e) {
    echo '<html><body><h3>Error al generar PDF: ' . htmlspecialchars($e->getMessage()) . '</h3></body></html>';
}

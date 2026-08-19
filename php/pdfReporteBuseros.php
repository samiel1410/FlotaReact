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
    $logo          = obtenerRutaLogoEmpresa($conn);

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
        COALESCE(SUM(b.total_boleto), 0) as venta,
        COUNT(DISTINCT b.id_boleto) as facturas,
        COALESCE(bu.disco_buses, '-') as bus_disco,
        p.id_personal as per_codigo
      FROM viajes v
        LEFT JOIN cobros c ON c.id_fkviajes_cobros = v.id_viajes
        LEFT JOIN boletos b ON b.id_fkviaje_boleto = v.id_viajes AND b.estado_boleto != 3
        LEFT JOIN personal p ON v.id_fkchofer_viajes = p.id_personal
        LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
        LEFT JOIN buses bu ON v.id_fkbus_viajes = bu.id_buses
      $where
      GROUP BY v.id_viajes, r.nombre_rutas, p.per_nombres_persona, p.per_apellidos_personal, v.fecha_cierre, v.hora_origen_salida, bu.disco_buses, p.id_personal
      HAVING (COUNT(DISTINCT b.id_boleto) > 0 OR COALESCE(SUM(c.monto_cobros), 0) > 0)
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
    $totalGeneralFacturas = 0;
    $totalGeneralVenta = 0.0;
    $totalFilasViajes = 0;

    while ($row = mysqli_fetch_assoc($rs)) {
        $socioName = !empty($row['socio']) ? strtoupper($row['socio']) : 'SIN SOCIO ASIGNADO';
        $disco = $row['bus_disco'];
        $key = $socioName . '___' . $disco;

        if (!isset($sociosGrouped[$key])) {
            $sociosGrouped[$key] = [
                'socio' => $socioName,
                'disco' => $disco,
                'viajes' => [],
                'total_facturas' => 0,
                'total_venta' => 0.0
            ];
        }

        $facturasCount = intval($row['facturas']);
        $ventaAmount   = floatval($row['venta']);

        $sociosGrouped[$key]['viajes'][] = [
            'viaje' => $row['viaje'],
            'ruta' => $row['ruta'] ?? 'SIN RUTA',
            'fecha' => fmtFechaEs($row['fecha_cierre']),
            'fecha_raw' => $row['fecha_cierre'],
            'hora' => !empty($row['hora_salida']) ? $row['hora_salida'] : '00:00',
            'disco' => $disco,
            'facturas' => $facturasCount,
            'venta' => $ventaAmount,
        ];

        $sociosGrouped[$key]['total_facturas'] += $facturasCount;
        $sociosGrouped[$key]['total_venta']    += $ventaAmount;

        $totalGeneralFacturas += $facturasCount;
        $totalGeneralVenta    += $ventaAmount;
        $totalFilasViajes++;
    }

    $mesLabel = ($mes !== '0' && isset($nombreMeses[$mes])) ? $nombreMeses[$mes] : ($mes !== '0' ? $mes : 'Todos');
    $anioLabel = ($anio !== '0') ? $anio : 'Todos';

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
                    <div class="box-title">REPORTE VENTAS<br/>DIARIAS AGENCIA</div>
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
            $html80 .= '<br/>Agencia ' . htmlspecialchars($nombre_sucursal);
        }
        $html80 .= '</div><br/>';

        // Fecha / Hora Consulta
        $html80 .= '<table style="width:100%; font-size:7.5pt; line-height:1.3;">
            <tr>
                <td>F. Consulta: <b>' . $fechaConsultaStr . '</b></td>
            </tr>
            <tr>
                <td>Hora Consulta: <b>' . $horaConsultaStr . '</b></td>
            </tr>
        </table><br/>';

        // Encabezado de Columnas
        $html80 .= '<table class="table-head">
            <tr>
                <td style="width:18%;"># Viaje</td>
                <td style="width:20%;">F. Viaje</td>
                <td style="width:14%;">Hora</td>
                <td style="width:12%; text-align:center;">Disco</td>
                <td style="width:12%; text-align:right;">Cant</td>
                <td style="width:24%; text-align:right;">Total</td>
            </tr>
        </table>';

        // Datos por Socio / Oficinista
        if (empty($sociosGrouped)) {
            $html80 .= '<div style="text-align:center; padding:12px; font-size:7pt; color:#666;">Sin datos para mostrar</div>';
        } else {
            foreach ($sociosGrouped as $sg) {
                $html80 .= '<div style="font-size:7.5pt; font-weight:bold; margin-top:5px; margin-bottom:1px;">
                    Oficinista / Socio: ' . htmlspecialchars($sg['socio']) . '
                </div>';
                $html80 .= '<div style="font-size:6.5pt; font-weight:bold; margin-left:8px; margin-bottom:2px; color:#333;">
                    &nbsp;&nbsp;A. BOLETOS DIA
                </div>';

                $html80 .= '<table class="table-data">';
                foreach ($sg['viajes'] as $v) {
                    $fViaje = !empty($v['fecha_raw']) ? date('j/n/Y', strtotime($v['fecha_raw'])) : $v['fecha'];
                    $html80 .= '<tr>
                        <td style="width:18%;">' . htmlspecialchars($v['viaje']) . '</td>
                        <td style="width:20%;">' . htmlspecialchars($fViaje) . '</td>
                        <td style="width:14%;">' . htmlspecialchars($v['hora']) . '</td>
                        <td style="width:12%; text-align:center;">' . htmlspecialchars($v['disco']) . '</td>
                        <td style="width:12%; text-align:right;">' . $v['facturas'] . '</td>
                        <td style="width:24%; text-align:right;">' . fmtMoney($v['venta']) . '</td>
                    </tr>';
                }
                $html80 .= '</table>';

                // Subtotal del socio
                $html80 .= '<div style="border-bottom:1px solid #000; margin-top:2px;"></div>';
                $html80 .= '<div style="text-align:right; font-size:8.5pt; font-weight:bold; font-family:courier; margin-bottom:5px;">
                    ' . fmtMoney($sg['total_venta']) . '
                </div>';
            }

            // Total General
            $html80 .= '<div style="text-align:right; font-size:11pt; font-weight:bold; font-family:courier, monospace; margin-top:8px; margin-bottom:10px;">
                TOTAL ' . fmtMoney($totalGeneralVenta) . '
            </div>';
        }

        // Pie de ticket
        $html80 .= '<div style="font-size:7pt; line-height:1.3; border-top:1px dashed #000; padding-top:4px;">
            Impreso por ' . htmlspecialchars($usuario_impresion) . '<br/>
            Impresión ' . date('j/n/Y') . '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' . date('H:i:s') . '
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
    // FORMATO ESTÁNDAR A4
    // ─────────────────────────────────────────────────────────────────────────
    $html = '<html><head><style>
        body { font-family: helvetica, sans-serif; font-size: 8pt; color: #1e293b; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .title { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
        .subtitle { font-size: 9pt; color: #64748b; font-weight: bold; }
        
        .filter-box { width: 38%; border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 4px; margin-bottom: 12px; border-radius: 4px; }
        .filter-box td { font-size: 8pt; padding: 2.5px 5px; font-weight: bold; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .data-table th { background-color: #3b82f6; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #2563eb; padding: 5px 3px; font-size: 8pt; }
        .data-table td { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 7.5pt; vertical-align: middle; }
        
        .socio-cell { background-color: #f1f5f9; font-weight: bold; text-align: left; vertical-align: middle; color: #0f172a; }
        .disco-cell { background-color: #ffffff; font-weight: bold; text-align: center; vertical-align: middle; font-size: 9pt; color: #1e293b; }
        
        .subtotal-row td { background-color: #e2e8f0; font-weight: bold; color: #0f172a; border-top: 1.5px solid #64748b; border-bottom: 1.5px solid #64748b; }
        .total-general-row td { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 8.5pt; border: 1px solid #0f172a; }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-mono { font-family: courier, monospace; }
    </style></head><body>';

    // Encabezado
    $html .= '<table class="header-table">
        <tr>
            <td width="15%">' . ($logo ? '<img src="' . $logo . '" height="42"/>' : '') . '</td>
            <td width="85%" class="text-left">
                <div class="title">' . htmlspecialchars($razon_social) . '</div>
                <div class="subtitle">REPORTE DE VENTAS POR BUSERO / SOCIO</div>
            </td>
        </tr>
    </table>';

    // Cuadro de Filtros
    $html .= '<table class="filter-box">
        <tr>
            <td width="30%" style="color:#64748b;">AÑO:</td>
            <td width="70%">' . htmlspecialchars($anioLabel) . '</td>
        </tr>
        <tr>
            <td width="30%" style="color:#64748b;">MES:</td>
            <td width="70%">' . htmlspecialchars($mesLabel) . '</td>
        </tr>
    </table>';

    // Tabla de Datos
    $html .= '<table class="data-table">
        <thead>
            <tr>
                <th width="24%">SOCIO</th>
                <th width="8%">DISCO</th>
                <th width="10%">VIAJE</th>
                <th width="28%">RUTA</th>
                <th width="12%">FECHA</th>
                <th width="8%">Facturas</th>
                <th width="10%">Venta</th>
            </tr>
        </thead>
        <tbody>';

    if (empty($sociosGrouped)) {
        $html .= '<tr><td colspan="7" class="text-center" style="padding: 15px; color: #94a3b8;">No se encontraron registros para la búsqueda.</td></tr>';
    } else {
        foreach ($sociosGrouped as $sg) {
            $rowSpan = count($sg['viajes']);
            $first = true;

            foreach ($sg['viajes'] as $v) {
                $html .= '<tr>';
                if ($first) {
                    $html .= '<td width="24%" rowspan="' . $rowSpan . '" class="socio-cell">' . htmlspecialchars($sg['socio']) . '</td>';
                    $html .= '<td width="8%" rowspan="' . $rowSpan . '" class="disco-cell">' . htmlspecialchars($sg['disco']) . '</td>';
                }
                $html .= '<td width="10%" class="text-center font-mono">' . htmlspecialchars($v['viaje']) . '</td>';
                $html .= '<td width="28%">' . htmlspecialchars($v['ruta']) . '</td>';
                $html .= '<td width="12%" class="text-center">' . htmlspecialchars($v['fecha']) . '</td>';
                $html .= '<td width="8%" class="text-right font-mono">' . $v['facturas'] . '</td>';
                $html .= '<td width="10%" class="text-right font-mono">' . fmtMoney($v['venta']) . '</td>';
                $html .= '</tr>';
                $first = false;
            }

            // Fila de Subtotal por Socio
            $html .= '<tr class="subtotal-row">
                <td colspan="5" class="text-right">Total ' . htmlspecialchars($sg['socio']) . '</td>
                <td class="text-right font-mono">' . number_format($sg['total_facturas']) . '</td>
                <td class="text-right font-mono">' . fmtMoney($sg['total_venta']) . '</td>
            </tr>';
        }

        // Fila de Total General
        $html .= '<tr class="total-general-row">
            <td colspan="5" class="text-right">Total general</td>
            <td class="text-right font-mono">' . number_format($totalGeneralFacturas) . '</td>
            <td class="text-right font-mono">' . fmtMoney($totalGeneralVenta) . '</td>
        </tr>';
    }

    $html .= '</tbody></table></body></html>';

    // ─── CREAR PDF CON TCPDF (A4) ──────────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetAuthor($razon_social ?: 'SistemaFlota');
    $pdf->SetTitle('Reporte_Ventas_Buseros');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(8, 8, 8);
    $pdf->SetAutoPageBreak(true, 10);
    $pdf->SetFont('helvetica', '', 8);
    $pdf->AddPage();
    $pdf->writeHTML($html, true, false, true, false, '');

    $pdf->Output('Reporte_Ventas_Buseros.pdf', 'I');

} catch (Exception $e) {
    echo '<html><body><h3>Error al generar PDF: ' . htmlspecialchars($e->getMessage()) . '</h3></body></html>';
}

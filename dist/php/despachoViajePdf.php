<?php
require_once('library/tcpdf.php');
require_once("db.php");
date_default_timezone_set('America/Guayaquil');

// Configuración para impresora POS (80mm)
$width = 80; // Ancho en mm
$height = 300; // Aumentamos la altura para los cobros

try {
    $fecha_actual = date('d-m-Y H:i:s');
    $id_despacho_viaje = $_GET['id_viajes'];

    // Conexión MySQLi
    $conn = conexion();

    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }

    // Consulta SQL - obtener datos del viaje filtrando boletos por sucursal que despachó
    $query = "SELECT 
        v.id_viajes,
        v.fecha_cierre as fecha_viaje,
        v.hora_origen_salida,
        r.nombre_rutas,
        r.id_rutas,
        CONCAT(chofer.per_nombres_persona, ' ', chofer.per_apellidos_personal) as nombre_completo_chofer,
        chofer.per_cedula_personal as cedula_chofer,
        b.disco_buses,
        b.placa_buses,
        b.id_buses,
        IFNULL(u.nombre_usuario, 'DESPACHO AUTOMÁTICO') as nombre_oficinista,
        COALESCE(u.id_fksucursal_usuario, (SELECT id_fksucursal_boleto FROM boletos b_sub WHERE b_sub.id_fkviaje_boleto = v.id_viajes LIMIT 1), 0) as id_sucursal_despacho,
        s.nombre_sucursal,
        s.porcentaje_retencion,
        dv.id_despacho_viaje,
        dv.tarifa_despacho_viaje,
        dv.fecha_salida_despacho_viaje,
        dv.hora_salida_despacho_viaje,
        IFNULL(SUM(CASE WHEN (u.id_fksucursal_usuario IS NULL OR bo.id_fksucursal_boleto = u.id_fksucursal_usuario OR bo.id_fksucursal_boleto = s.id_sucursal) AND bo.estado_boleto != 3 THEN bd.total_boleto_detalle ELSE 0 END), 0) AS total_boletos,
        COUNT(CASE WHEN (u.id_fksucursal_usuario IS NULL OR bo.id_fksucursal_boleto = u.id_fksucursal_usuario OR bo.id_fksucursal_boleto = s.id_sucursal) AND bo.estado_boleto != 3 THEN bd.id_boleto_detalle END) AS cantidad_boletos

      FROM 
        viajes v
        LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
        LEFT JOIN personal chofer ON v.id_fkchofer_viajes = chofer.id_personal
        LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
        LEFT JOIN despacho_viaje dv ON v.id_viajes = dv.id_fkviaje_despacho_viaje
        LEFT JOIN usuario u ON dv.id_fkusuario_aprueba = u.id_usuario
        LEFT JOIN sucursal2 s ON s.id_sucursal = COALESCE(u.id_fksucursal_usuario, (SELECT id_fksucursal_boleto FROM boletos b_sub WHERE b_sub.id_fkviaje_boleto = v.id_viajes LIMIT 1))
        LEFT JOIN boletos bo ON v.id_viajes = bo.id_fkviaje_boleto
        LEFT JOIN boleto_detalle bd ON bo.id_boleto = bd.id_fkboleto_boleto_detalle
      WHERE v.id_viajes = ?
      GROUP BY v.id_viajes, v.fecha_cierre, v.hora_origen_salida, r.nombre_rutas, r.id_rutas,
               chofer.per_nombres_persona, chofer.per_apellidos_personal, chofer.per_cedula_personal,
               b.disco_buses, b.placa_buses, b.id_buses, u.nombre_usuario, u.id_fksucursal_usuario,
               s.nombre_sucursal, s.porcentaje_retencion,
               dv.id_despacho_viaje, dv.tarifa_despacho_viaje, dv.fecha_salida_despacho_viaje, dv.hora_salida_despacho_viaje";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $id_despacho_viaje);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Viaje no encontrado");
    }

    $despacho = $result->fetch_assoc();

    // Consulta para obtener los cobros que fueron descontados en este despacho
    $totalRetenciones = 0;
    $cobros = [];

    if (!empty($despacho['id_despacho_viaje'])) {
        $query_cobros = "SELECT 
            dvr.total_cobrado_despacho_viaje_retenciones as monto_cobros,
            tc.nombre_tipo_cobros as tipo_cobro
          FROM 
            despacho_viaje_reteciones dvr
            JOIN cobros c ON dvr.id_fkcobro_despacho_viaje_reteciones = c.id_cobros
            JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
          WHERE 
            dvr.id_fkdespacho_viaje = ?";

        $stmt_cobros = $conn->prepare($query_cobros);
        $stmt_cobros->bind_param("i", $despacho['id_despacho_viaje']);
        $stmt_cobros->execute();
        $cobros = $stmt_cobros->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_cobros->close();
    }

    // La tarifa_despacho_viaje ya contiene el monto de retención calculado por la sucursal
    // (porcentaje_retencion de la sucursal aplicado sobre sus propios boletos)
    $retencionSucursal = floatval($despacho['tarifa_despacho_viaje'] ?? 0);
    $porcentajeRetencion = floatval($despacho['porcentaje_retencion'] ?? 0);
    $nombreSucursal = $despacho['nombre_sucursal'] ?? 'Sucursal';
    $totalRetenciones = $retencionSucursal;
    foreach ($cobros as $cobro) {
        $totalRetenciones += $cobro['monto_cobros'];
    }

    $stmt->close();

    // Obtener datos de la empresa desde la BD
    $query_empresa = "SELECT razon_social_empresa, ruc_empresa, direccion_empresa, telefono_empresa, correo_empresa FROM empresa WHERE 1 LIMIT 1";
    $result_empresa = $conn->query($query_empresa);
    $empresa = $result_empresa->fetch_assoc();
    $razon_social = $empresa['razon_social_empresa'] ?? 'COOP. FLOTA PELILEO';
    $ruc_empresa = $empresa['ruc_empresa'] ?? '1890066123001';
    $direccion_empresa = $empresa['direccion_empresa'] ?? '';
    $telefono_empresa = $empresa['telefono_empresa'] ?? '';
    $correo_empresa = $empresa['correo_empresa'] ?? '';

    // Calcular valores
    $total_boletos = floatval($despacho['total_boletos']);
    $total_entrega = max(0, $total_boletos - $totalRetenciones);

    // Formatear fechas
    $fecha_salida = $despacho['fecha_salida_despacho_viaje']
        ? date('d/m/Y', strtotime($despacho['fecha_salida_despacho_viaje']))
        : date('d/m/Y', strtotime($despacho['fecha_viaje']));

    $hora_salida = $despacho['hora_salida_despacho_viaje']
        ? $despacho['hora_salida_despacho_viaje']
        : $despacho['hora_origen_salida'];

    // Crear PDF para POS (80mm)
    $pdf = new TCPDF('P', 'mm', array($width, $height), true, 'UTF-8', false);

    // Configuración del documento
    $pdf->SetCreator('FlotaPelileo');
    $pdf->SetAuthor('Sistema Flota');
    $pdf->SetTitle('Despacho #' . $id_despacho_viaje);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(5, 5, 5);
    $pdf->SetAutoPageBreak(true, 5);
    $pdf->AddPage('P', array(500, 120));

    // Encabezado compacto (datos desde BD)
    $content = '
    <div style="text-align: center; line-height: 10px;">
        <span style="font-size: 12px; font-weight: bold;">' . strtoupper($razon_social) . '</span><br>
        <span style="font-size: 8px;">RUC ' . $ruc_empresa . '</span><br>
        <span style="font-size: 8px;">' . $direccion_empresa . '</span>
    </div>
    <hr style="border: 0; border-top: 1px solid #000; margin: 2px 0;">
    
    <div style="font-size: 9px; line-height: 11px;">
        <table style="width: 100%;">
            <tr><td style="width: 25%;"><b>DISCO:</b></td><td style="width: 75%;">' . $despacho['disco_buses'] . '</td></tr>
            <tr><td><b>RUTA:</b></td><td>' . $despacho['nombre_rutas'] . '</td></tr>
            <tr><td><b>SALIDA:</b></td><td>' . $fecha_salida . ' ' . $hora_salida . '</td></tr>
            <tr><td><b>PLACA:</b></td><td>' . $despacho['placa_buses'] . '</td></tr>
            <tr><td><b>CHOFER:</b></td><td>' . $despacho['nombre_completo_chofer'] . '</td></tr>
        </table>
    </div>
    
    <hr style="border: 0; border-top: 1px dashed #000; margin: 2px 0;">
    
    <div style="font-size: 9px;">
        <b>OFICINISTA:</b> ' . strtoupper($despacho['nombre_oficinista']) . '
    </div>';

    // SECCIÓN VENTAS POR ORIGEN - solo boletos de la sucursal que despachó
    $id_sucursal_despacho = intval($despacho['id_sucursal_despacho'] ?? 0);
    $query_origen = "SELECT 
        IFNULL(b.nombre_origen, 'ORIGEN PRINCIPAL') as origen, 
        COUNT(bd.id_boleto_detalle) as cantidad, 
        SUM(bd.total_boleto_detalle) as total
      FROM viajes v
      JOIN boletos b ON v.id_viajes = b.id_fkviaje_boleto AND b.estado_boleto != 3
      JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
      WHERE v.id_viajes = ? AND ( ? = 0 OR b.id_fksucursal_boleto = ? )
      GROUP BY b.nombre_origen
      ORDER BY b.nombre_origen";

    $stmt_origen = $conn->prepare($query_origen);
    $stmt_origen->bind_param("iii", $id_despacho_viaje, $id_sucursal_despacho, $id_sucursal_despacho);
    $stmt_origen->execute();
    $result_origen = $stmt_origen->get_result();

    if ($result_origen->num_rows > 0) {
        $content .= '
        <div style="font-size: 9px; font-weight: bold; margin-top: 5px; border-bottom: 1px dashed #000;">VENTAS POR PUNTO:</div>
        <table style="width:100%; font-size:8px; border-collapse: collapse;">
            <tr>
                <th style="text-align:left; width: 50%;">Punto</th>
                <th style="text-align:center; width: 20%;">Cant.</th>
                <th style="text-align:right; width: 30%;">Total</th>
            </tr>';

        while ($row_origen = $result_origen->fetch_assoc()) {
            $content .= '
            <tr>
                <td style="text-align:left;">' . strtoupper($row_origen['origen']) . '</td>
                <td style="text-align:center;">' . $row_origen['cantidad'] . '</td>
                <td style="text-align:right;">$' . number_format($row_origen['total'], 2) . '</td>
            </tr>';
        }
        $content .= '</table>';
    }
    $stmt_origen->close();

    // SECCIÓN DESGLOSE
    $content .= '
    <div style="font-size: 9px; font-weight: bold; margin-top: 3px;">DETALLE DE COBROS:</div>
    <table style="width:100%; font-size:8px; border-collapse: collapse;">
        <tr>
            <th style="text-align:left; border-bottom:1px solid #000; width: 70%;">Concepto</th>
            <th style="text-align:right; border-bottom:1px solid #000; width: 30%;">Valor</th>
        </tr>';

    if ($retencionSucursal > 0) {
        $label = 'RETENCIÓN ' . strtoupper($nombreSucursal);
        if ($porcentajeRetencion > 0) {
            $label .= ' (' . $porcentajeRetencion . '%)';
        }
        $content .= '
        <tr>
            <td style="text-align:left;">' . $label . '</td>
            <td style="text-align:right;">$' . number_format($retencionSucursal, 2) . '</td>
        </tr>';
    }

    foreach ($cobros as $cobro) {
        $content .= '
        <tr>
            <td style="text-align:left;">' . $cobro['tipo_cobro'] . '</td>
            <td style="text-align:right;">$' . number_format($cobro['monto_cobros'], 2) . '</td>
        </tr>';
    }

    $content .= '
        <tr>
            <td style="text-align:left; border-top:1px solid #000; font-weight:bold;">TOTAL RETENCIONES:</td>
            <td style="text-align:right; border-top:1px solid #000; font-weight:bold;">$' . number_format($totalRetenciones, 2) . '</td>
        </tr>
    </table>';

    $content .= '
    <div style="font-size: 9px; margin-top: 5px; line-height: 12px;">
        <table style="width: 100%;">
            <tr>
                <td style="width: 70%;"><b>(+) VENTA BOLETOS:</b></td>
                <td style="width: 30%; text-align: right;">$' . number_format($total_boletos, 2) . '</td>
            </tr>
            <tr>
                <td><b>(-) RETENCIONES:</b></td>
                <td style="text-align: right;">$' . number_format($totalRetenciones, 2) . '</td>
            </tr>
        </table>
    </div>
    
    <div style="font-size: 14px; font-weight: bold; margin-top: 5px; text-align: center; border: 1px dashed #000; padding: 5px;">
        RECIBE: $' . number_format($total_entrega, 2) . '
    </div>
    
    <div style="text-align: center; font-size: 7px; margin-top: 5px;">
        F. Impresión: ' . date('d/m/Y H:i:s') . '
    </div>';

    // Generar PDF
    $pdf->writeHTML($content, true, false, true, false, '');

    // Salida para impresión directa
    $pdf->Output('despacho_pos_' . $id_despacho_viaje . '.pdf', 'I');

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
<?php
ob_start();
require_once('library/tcpdf.php');
require_once("db.php");
date_default_timezone_set('America/Guayaquil');

// Configuración para impresora POS (80mm)
$width = 80;
$height = 250;

try {
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

    // 1. Identificar el despacho y viaje correspondiente
    // Los despachos son por oficina/oficinista (un viaje puede tener varios despachos en distintas paradas/oficinas)
    if ($id_despacho_param > 0) {
        $query_despacho = "SELECT 
            dv.id_despacho_viaje,
            dv.tarifa_despacho_viaje,
            dv.fecha_salida_despacho_viaje,
            dv.hora_salida_despacho_viaje,
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
          LEFT JOIN sucursal2 s ON s.id_sucursal = u.id_fksucursal_usuario
          WHERE dv.id_despacho_viaje = ?
          LIMIT 1";

        $stmt = $conn->prepare($query_despacho);
        $stmt->bind_param("i", $id_despacho_param);
    } else {
        // Buscar por id_viajes: priorizar el despacho de la oficina/usuario solicitante, o el más reciente
        $query_despacho = "SELECT 
            dv.id_despacho_viaje,
            dv.tarifa_despacho_viaje,
            dv.fecha_salida_despacho_viaje,
            dv.hora_salida_despacho_viaje,
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
          LEFT JOIN sucursal2 s ON s.id_sucursal = u.id_fksucursal_usuario
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
    $id_sucursal_despacho = intval($despacho['id_fksucursal_usuario'] ?? $id_sucursal_param);

    // Resolver chofer si venía como texto en el viaje
    $nombre_chofer = trim($despacho['nombre_completo_chofer'] ?? '');
    if (empty($nombre_chofer) && !empty($despacho['chofer_viajes'])) {
        $nombre_chofer = trim($despacho['chofer_viajes']);
    }
    if (empty($nombre_chofer)) {
        $nombre_chofer = 'N/A';
    }

    // 2. Consulta de boletos correspondientes a ESTE despacho (por oficina/sucursal/usuario que despachó)
    $query_totales = "SELECT 
        IFNULL(SUM(bd.total_boleto_detalle), 0) AS total_boletos,
        COUNT(bd.id_boleto_detalle) AS cantidad_boletos
      FROM boletos b
      JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
      WHERE b.id_fkviaje_boleto = ? 
        AND b.estado_boleto != 3
        AND (
            (? > 0 AND b.id_fksucursal_boleto = ?)
            OR (? > 0 AND b.id_fkusuario_boleto = ?)
            OR (? = 0 AND ? = 0)
        )";

    $stmt_tot = $conn->prepare($query_totales);
    $stmt_tot->bind_param("iiiiiii", 
        $id_despacho_viaje, 
        $id_sucursal_despacho, $id_sucursal_despacho, 
        $id_usuario_aprueba, $id_usuario_aprueba,
        $id_sucursal_despacho, $id_usuario_aprueba
    );
    $stmt_tot->execute();
    $res_tot = $stmt_tot->get_result();
    $totales_boletos = $res_tot->fetch_assoc();
    $stmt_tot->close();

    $total_boletos = floatval($totales_boletos['total_boletos'] ?? 0);

    // 3. Consulta de cobros/retenciones descontados en este despacho específico
    $totalRetenciones = 0;
    $cobros = [];

    if (!empty($despacho['id_despacho_viaje'])) {
        $query_cobros = "SELECT 
            dvr.total_cobrado_despacho_viaje_retenciones as monto_cobros,
            tc.nombre_tipo_cobros as tipo_cobro
          FROM despacho_viaje_reteciones dvr
          JOIN cobros c ON dvr.id_fkcobro_despacho_viaje_reteciones = c.id_cobros
          JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
          WHERE dvr.id_fkdespacho_viaje = ?";

        $stmt_cobros = $conn->prepare($query_cobros);
        $stmt_cobros->bind_param("i", $despacho['id_despacho_viaje']);
        $stmt_cobros->execute();
        $cobros = $stmt_cobros->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_cobros->close();
    }

    $retencionSucursal = floatval($despacho['tarifa_despacho_viaje'] ?? 0);
    $porcentajeRetencion = floatval($despacho['porcentaje_retencion'] ?? 0);
    $nombreSucursal = $despacho['nombre_sucursal'] ?? 'Oficina';
    $totalRetenciones = $retencionSucursal;
    foreach ($cobros as $cobro) {
        $totalRetenciones += floatval($cobro['monto_cobros']);
    }

    // 4. Datos de la empresa
    $query_empresa = "SELECT razon_social_empresa, ruc_empresa, direccion_empresa FROM empresa LIMIT 1";
    $result_empresa = $conn->query($query_empresa);
    $empresa = $result_empresa ? $result_empresa->fetch_assoc() : [];
    $razon_social = $empresa['razon_social_empresa'] ?? 'COOP. FLOTA PELILEO';
    $ruc_empresa = $empresa['ruc_empresa'] ?? '1890066123001';
    $direccion_empresa = $empresa['direccion_empresa'] ?? '';

    $total_entrega = max(0, $total_boletos - $totalRetenciones);

    // Formatear fechas del viaje
    $raw_fecha = !empty($despacho['fecha_viaje']) ? $despacho['fecha_viaje'] : (!empty($despacho['dia_viajes']) ? $despacho['dia_viajes'] : $despacho['fecha_salida_despacho_viaje']);
    $fecha_salida = $raw_fecha ? date('d/m/Y', strtotime($raw_fecha)) : date('d/m/Y');

    $hora_salida = !empty($despacho['hora_origen_salida']) 
        ? $despacho['hora_origen_salida'] 
        : (!empty($despacho['hora_salida_estimado']) 
            ? $despacho['hora_salida_estimado'] 
            : (!empty($despacho['hora_salida_despacho_viaje']) ? $despacho['hora_salida_despacho_viaje'] : ''));

    // 5. Instanciar y configurar TCPDF optimizado para POS
    $pdf = new TCPDF('P', 'mm', array($width, $height), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('FlotaPelileo');
    $pdf->SetAuthor('Sistema Flota');
    $pdf->SetTitle('Despacho #' . $id_despacho_num);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(4, 4, 4);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->SetFont('helvetica', '', 8);
    $pdf->AddPage('P', array($width, $height));

    $nombre_oficinista = trim(($despacho['nombre_usuario'] ?? '') . ' ' . ($despacho['apellido_usuario'] ?? ''));
    if (empty($nombre_oficinista)) {
        $nombre_oficinista = !empty($despacho['username_usuario']) ? $despacho['username_usuario'] : ($usuario_param ?: 'DESPACHO AUTOMÁTICO');
    }

    $content = '
    <div style="text-align: center; line-height: 11px;">
        <span style="font-size: 12px; font-weight: bold;">' . strtoupper($razon_social) . '</span><br>
        <span style="font-size: 8px;">RUC ' . $ruc_empresa . '</span><br>
        <span style="font-size: 8px;">' . htmlspecialchars($direccion_empresa) . '</span><br>
        <span style="font-size: 11px; font-weight: bold;">DESPACHO N° ' . $id_despacho_num . '</span>
    </div>
    <hr style="border: 0; border-top: 1px solid #000; margin: 2px 0;">
    
    <div style="font-size: 9px; line-height: 11px;">
        <table style="width: 100%;">
            <tr><td style="width: 25%;"><b>N° VIAJE:</b></td><td style="width: 75%;"><b>' . $id_despacho_viaje . '</b></td></tr>
            <tr><td><b>DISCO:</b></td><td>' . ($despacho['disco_buses'] ?? '') . '</td></tr>
            <tr><td><b>RUTA:</b></td><td>' . ($despacho['nombre_rutas'] ?? '') . '</td></tr>
            <tr><td><b>SALIDA:</b></td><td>' . $fecha_salida . ' ' . $hora_salida . '</td></tr>
            <tr><td><b>PLACA:</b></td><td>' . ($despacho['placa_buses'] ?? '') . '</td></tr>
            <tr><td><b>CHOFER:</b></td><td>' . strtoupper(htmlspecialchars($nombre_chofer)) . '</td></tr>
        </table>
    </div>
    
    <hr style="border: 0; border-top: 1px dashed #000; margin: 2px 0;">
    
    <div style="font-size: 9px;">
        <b>OFICINISTA:</b> ' . strtoupper(htmlspecialchars($nombre_oficinista)) . '
    </div>';

    // 6. Sección de ventas por punto (origen) correspondientes a este despacho
    $query_origen = "SELECT 
        IFNULL(NULLIF(TRIM(b.nombre_origen), ''), IFNULL(s.nombre_sucursal, 'ORIGEN PRINCIPAL')) as origen, 
        COUNT(bd.id_boleto_detalle) as cantidad, 
        SUM(bd.total_boleto_detalle) as total
      FROM boletos b
      JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
      LEFT JOIN sucursal2 s ON b.id_fksucursal_boleto = s.id_sucursal
      WHERE b.id_fkviaje_boleto = ? 
        AND b.estado_boleto != 3
        AND (
            (? > 0 AND b.id_fksucursal_boleto = ?)
            OR (? > 0 AND b.id_fkusuario_boleto = ?)
            OR (? = 0 AND ? = 0)
        )
      GROUP BY IFNULL(NULLIF(TRIM(b.nombre_origen), ''), IFNULL(s.nombre_sucursal, 'ORIGEN PRINCIPAL'))
      ORDER BY origen ASC";

    $stmt_origen = $conn->prepare($query_origen);
    $stmt_origen->bind_param("iiiiiii", 
        $id_despacho_viaje, 
        $id_sucursal_despacho, $id_sucursal_despacho, 
        $id_usuario_aprueba, $id_usuario_aprueba,
        $id_sucursal_despacho, $id_usuario_aprueba
    );
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
                <td style="text-align:left;">' . strtoupper(htmlspecialchars($row_origen['origen'])) . '</td>
                <td style="text-align:center;">' . $row_origen['cantidad'] . '</td>
                <td style="text-align:right;">$' . number_format($row_origen['total'], 2) . '</td>
            </tr>';
        }
        $content .= '</table>';
    }
    $stmt_origen->close();

    // 7. Sección Desglose de cobros
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
            <td style="text-align:left;">' . htmlspecialchars($cobro['tipo_cobro']) . '</td>
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
    </div>';
    
    $usuario_despacho = $nombre_oficinista;

    $content .= '
    <div style="font-size: 14px; font-weight: bold; margin-top: 5px; text-align: center; border: 1px dashed #000; padding: 5px;">
        RECIBE: $' . number_format($total_entrega, 2) . '
    </div>
    
    <div style="text-align: center; font-size: 8px; margin-top: 5px; line-height: 11px;">
        F. Impresión: ' . date('d/m/Y H:i:s') . '<br>
        <b>N° Viaje:</b> ' . $id_despacho_viaje . '<br>
        <b>Despachado por:</b> ' . strtoupper(htmlspecialchars($usuario_despacho)) . '
    </div>';

    // Cerrar conexión
    $conn->close();

    // Limpiar buffer de salida previo
    if (ob_get_length()) {
        ob_clean();
    }

    // Generar PDF
    $pdf->writeHTML($content, true, false, true, false, '');

    // Salida para navegador / impresión directa
    $pdf->Output('despacho_pos_' . $id_despacho_num . '.pdf', 'I');

} catch (Exception $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    die("Error: " . $e->getMessage());
}
?>
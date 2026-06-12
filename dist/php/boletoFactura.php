<?php
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');

$conn = conexion();

function formatearFechaEspanol($fecha)
{
    $fechaObj = DateTime::createFromFormat('Y-m-d', $fecha);

    if (!$fechaObj) {
        return "Fecha inválida";
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

    return ucfirst($nombreDia) . ', ' . $diaNumero . ' de ' . $nombreMes;
}

function obtener_datos_factura($id_boleto, $conn)
{
    $query_boleto = "SELECT
b.id_boleto, b.identificacion_boleto, b.nombres_boleto, b.observacion_boleto,
b.fecha_boleto, b.total_boleto, b.numero_boleto,
b.punto_emision_boleto, b.sucursal_emision_boleto, b.id_fkviaje_boleto,
b.nombre_origen, b.nombre_destino, b.clave_acceso_boletos, b.fecha_creacion_boleto,
s.nombre_sucursal, u.nombre_usuario, bu.disco_buses, bu.placa_buses,
r.nombre_rutas, b.celular_boleto, b.tipo_boleto, b.estado_boleto,
sr.anden_sub_rutas, sr.piso_sub_rutas, sr.fecha_salida, sr.hora_salida,
v.incluye_alimentos, v.hora_origen_salida,
(SELECT GROUP_CONCAT(nombre_alimentos SEPARATOR ', ')
FROM alimentos
WHERE FIND_IN_SET(id_alimentos, REPLACE(v.id_fkalimento_viajes, ' ', ''))) as nombres_alimentos
FROM boletos b
LEFT JOIN sucursal2 s ON b.id_fksucursal_boleto = s.suc_codigo_sucursal
LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
LEFT JOIN buses bu ON b.id_fkbus_boleto = bu.id_buses
LEFT JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
LEFT JOIN sub_rutas sr ON b.id_fksubruta_boleto = sr.id_sub_rutas
WHERE b.id_boleto = $id_boleto";

    $recuperar_boleto = mysqli_query($conn, $query_boleto) or die(mysqli_error($conn));
    $boleto = mysqli_fetch_assoc($recuperar_boleto);

    $query_detalles = "SELECT
asiento_boleto_detalle, precio_boleto_detalle,
descuento_boleto_detalle, iva_boleto_detalle,
total_boleto_detalle, tarifa_boleto_detalle,
nombre_cliente_boleto_detalle,
identificacion_boleto_detalle,
incluye_alimento_boleto_detalle,
precio_alimento_boleto_detalle
FROM boleto_detalle
WHERE id_fkboleto_boleto_detalle = $id_boleto";

    $recuperar_detalles = mysqli_query($conn, $query_detalles) or die(mysqli_error($conn));
    $detalles = [];
    while ($detalle = mysqli_fetch_assoc($recuperar_detalles)) {
        $detalles[] = $detalle;
    }

    return [
        'boleto' => $boleto,
        'detalles' => $detalles
    ];
}

try {
    $id_boleto = $_GET['id_boleto'] ?? 0;
    $datos_factura = obtener_datos_factura($id_boleto, $conn);
    $boleto = $datos_factura['boleto'];
    $detalles = $datos_factura['detalles'];

    $numero_boleto = $boleto['sucursal_emision_boleto'] . "-" . $boleto['punto_emision_boleto'] . "-" . sprintf(
        "%09s",
        $boleto['numero_boleto']
    );

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa,
correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa WHERE 1";
    $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
    $vals_empresa = mysqli_fetch_array($recuperar_empresa);

    // Obtener leyenda de configuración
    $query_config = "SELECT leyenda_boleteria, mostrar_leyenda_boleteria FROM configuracion LIMIT 1";
    $recuperar_config = mysqli_query($conn, $query_config);
    $vals_config = mysqli_fetch_assoc($recuperar_config);
    $leyenda_viaje = ($vals_config && $vals_config['mostrar_leyenda_boleteria'] == 1) ? $vals_config['leyenda_boleteria'] :
        'GRACIAS POR SU PREFERENCIA';

    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(80, 380), true, 'UTF-8', false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetCreator(PDF_CREATOR);
    $pdf->SetTitle('Boleto de Viaje');
    $pdf->SetSubject('Boleto de Transporte');

    // Generación HTML - Formato compacto de boleto térmico (80mm)
    // Usar datos del boleto y viaje directamente (más confiables que sub_rutas)
    $fechaSalida = !empty($boleto['fecha_cierre']) ? date('d/m/Y', strtotime($boleto['fecha_cierre'])) : date('d/m/Y');
    $horaSalida = !empty($boleto['hora_origen_salida']) ? $boleto['hora_origen_salida'] : $boleto['hora_salida'];
    $rutaMostrar = !empty($boleto['nombre_destino']) ? $boleto['nombre_origen'] . ' → ' . $boleto['nombre_destino'] : $boleto['nombre_rutas'];
    $busMostrar = !empty($boleto['disco_buses']) ? $boleto['disco_buses'] : '—';
    $andMostrar = !empty($boleto['anden_sub_rutas']) && $boleto['anden_sub_rutas'] != '0' ? $boleto['anden_sub_rutas'] : '—';
    $pisoMostrar = !empty($boleto['piso_sub_rutas']) && $boleto['piso_sub_rutas'] != 0 ? $boleto['piso_sub_rutas'] : '1';

    $html1 = '
    
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Helvetica, Arial, sans-serif; font-size: 7.5pt; color: #000; margin: 0; padding: 0; line-height: 1.1; }
        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .sep { border-top: 1.5px solid #000; margin: 3px 0; }
        .sep-light { border-top: 1px solid #000; margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 0.5px 0; vertical-align: middle; }
    </style>
</head>
<body>
    <div class="center">';

    $rutaLogo = obtenerRutaLogoEmpresa($conn);
    if ($rutaLogo) {
        $html1 .= '<img src="' . $rutaLogo . '" width="40" style="margin-bottom:2px;"><br>';
    }

    $html1 .= '
        <div class="bold" style="font-size: 8.5pt;">' . strtoupper($vals_empresa["razon_social_empresa"]) . '</div>
        <div style="font-size: 8pt; margin-top:1px;">RUC: ' . $vals_empresa["ruc_empresa"] . '</div>
        <div style="font-size: 8pt; margin-top:1px; text-transform: uppercase;">' . strtoupper($vals_empresa["direccion_empresa"]) . '</div>
        <div style="font-size: 8pt; margin-top:1px;">Oficina ' . $boleto['nombre_sucursal'] . '</div>
    </div>

    <div class="sep" style="border-top: 2px solid #000; margin-top:4px;"></div>

    <table style="font-size: 8pt; line-height:1.1;">
        <tr>
            <td width="26%" class="bold">Facturado a:</td>
            <td width="74%" class="bold">' . strtoupper($boleto['nombres_boleto']) . '</td>
        </tr>
        <tr>
            <td class="bold">RUC/CI:</td>
            <td>' . $boleto['identificacion_boleto'] . '</td>
        </tr>
        <tr>
            <td class="bold">Teléfono:</td>
            <td>' . ($boleto['celular_boleto'] ? $boleto['celular_boleto'] : '-') . '</td>
        </tr>
    </table>

    <table style="font-size: 8pt; margin-top:3px; line-height:1.1;">
        <tr>
            <td width="26%">Viaje ' . $boleto['id_fkviaje_boleto'] . '</td>
            <td width="74%" class="bold">' . strtoupper($rutaMostrar) . '</td>
        </tr>
        <tr>
            <td class="bold" style="font-size: 10pt;">Bus ' . $busMostrar . '</td>
            <td style="font-size: 7.5pt;">Sale Origen ' . $fechaSalida . ' ' . $horaSalida . '</td>
        </tr>
    </table>

    <table style="margin-top:3px; font-size: 8pt;">
        <tr>
            <td width="60%" class="bold" style="font-size:8.5pt; text-decoration:underline;">INFORMACIÓN DEL VIAJE</td>
            <td width="20%" class="bold">Piso ' . $pisoMostrar . '</td>
            <td width="20%" class="bold">Anden ' . $andMostrar . '</td>
        </tr>
    </table>
    
    <div class="sep" style="border-top: 2px solid #000;"></div>';

    foreach ($detalles as $detalle) {
        $nombrePasajero = strtoupper($detalle['nombre_cliente_boleto_detalle']);
        $fechaSalidaFormateada = formatearFechaEspanol($boleto['fecha_salida'] ?? $fechaSalida); 
        
        $html1 .= '
    <div style="font-size: 8pt; line-height:1.2;">
        <div class="bold" style="font-size:8.5pt;">' . $nombrePasajero . '</div>
        <div class="center bold" style="font-size:8.5pt;">' . strtoupper($rutaMostrar) . '</div>
        <div class="center bold">Piso ' . $pisoMostrar . ' &nbsp;&nbsp;&nbsp;&nbsp; Anden ' . $andMostrar . '</div>
        
        <div style="margin-top:2px;">Salida ' . $fechaSalidaFormateada . '</div>
        
        <table style="margin-top:2px;">
            <tr>
                <td width="15%" style="font-size:9pt;">Hora</td>
                <td width="35%" class="bold" style="font-size:11pt;">' . $horaSalida . ' h</td>
                <td width="20%" style="font-size:9pt;" align="right">Asiento</td>
                <td width="30%" class="bold" style="font-size:14pt;" align="right">' . str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT) . '</td>
            </tr>
        </table>
        
        <table style="margin-top:2px;">
            <tr>
                <td width="25%" style="font-size:9pt;">Valor...$</td>
                <td width="30%" class="bold" style="font-size:12pt;">' . number_format($detalle['total_boleto_detalle'], 2, ',', '.') . '</td>
                <td width="45%" style="font-size:8pt;" align="right">' . $detalle['tarifa_boleto_detalle'] . '</td>
            </tr>
        </table>
    </div>';
    }

    $html1 .= '
    <table style="margin-top:8px;">
        <tr>
            <td width="35%" class="bold" style="font-size:14pt;">TOTAL</td>
            <td width="65%" class="bold" style="font-size:14pt;">' . number_format($boleto['total_boleto'], 2, ',', '.') . '</td>
        </tr>
    </table>
    <div class="sep-light"></div>

    <div style="font-size: 7pt; line-height: 1.1;">
        <div>Caducidad ' . $fechaSalida . ' ' . $horaSalida . '</div>
        <div>F. Emisión ' . ($boleto['fecha_creacion_boleto'] ? date('d/m/Y H:i:s', strtotime($boleto['fecha_creacion_boleto'])) : date('d/m/Y H:i:s')) . '</div>';
        
    if (!empty($numero_boleto)) {
        $html1 .= '<div>Factura ' . $numero_boleto . '</div>';
    }
    if (!empty($boleto['clave_acceso_boletos'])) {
        $html1 .= '<div>Aut. SRI ' . $boleto['clave_acceso_boletos'] . '</div>';
    }

    $html1 .= '
    </div>
    <div class="sep-light"></div>

    <div class="center" style="font-size: 7pt; line-height: 1.1;">
        <div>COOPERATIVA DE TRANSPORTES FLOTA PELILEO</div>
        <div>Dir. Matriz Garcia Moreno s/n y Montalvo</div>
        
        <div style="margin-top:5px;">Oficina Garcia Moreno v Montalvo</div>
        <div class="left">Registra VENTASONLINE</div>
        <table class="left">
            <tr>
                <td width="50%">Impresión ' . date('d/m/Y') . '</td>
                <td width="50%">' . date('H:i') . '</td>
            </tr>
        </table>
    </div>
    
    <div style="margin-top:2px;">-</div>

    <div class="center" style="font-size: 6pt; margin-top: 3px; line-height: 1.05;">
        Descargue su factura electrónica desde patate.easysplus.com / Usuario y
        contraseña (Ruc o CI), Recuerde estar 15 minutos antes de la hora de salida
        de la unidad,En caso de no estar puntual y perder el viaje NO SE
        REEMBOLSARA EL VALOR. Una vez generado el Boleto por ningun motivo
        se reembolsara el valos.GRACIAS POR SU COMPRENSION.<br>
        EASYSPLUS.COM
    </div>

    <div class="center bold" style="margin-top:6px; font-size:8pt;">
        Vendido por: ' . $boleto['nombre_usuario'] . '
    </div>
</body>
</html>';

    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetMargins(3, 2, 3, true);
    $pdf->SetAutoPageBreak(true, 2);
    $pdf->AddPage('P', array(80, 210));
    $pdf->writeHTML($html1, true, false, true, false, '');

    $filename = 'boleto_' . $id_boleto . '.pdf';
    $filepath = __DIR__ . '/tmp/' . $filename;

    $pdf->Output($filepath, 'F');

    $array = array(
        "ruta" => $filename,
        "success" => true,
        "borrar" => $filepath,
    );

    echo json_encode($array);

} catch (Exception $e) {
    $array = array(
        "error" => $e->getMessage(),
        "success" => false,
    );
    echo json_encode($array);
}
?>
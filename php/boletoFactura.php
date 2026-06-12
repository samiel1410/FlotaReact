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
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 7.5pt;
            color: #000;
            margin: 0;
            padding: 0;
            line-height: 1.1;
        }
        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .sep { border-top: 1.5px solid #000; margin: 3px 0; }
        .sep-light { border-top: 1px solid #000; margin: 3px 0; }
        .title { font-weight: bold; font-size: 8.5pt; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 1px 0; vertical-align: top; font-size: 7.5pt; }
        .label { font-weight: bold; font-size: 7.5pt; }
        .val { font-size: 7.5pt; }
        .big-total { font-size: 11pt; font-weight: bold; }
        .sri-info { font-size: 6pt; line-height: 1.0; }
        .leyenda { font-size: 6pt; text-align: center; margin-top: 5px; line-height: 1.0; }
    </style>
</head>
<body>
    <div class="header center">';

    $rutaLogo = obtenerRutaLogoEmpresa($conn);
    if ($rutaLogo) {
        $html1 .= '<img src="' . $rutaLogo . '" width="45" style="margin-bottom:2px;"><br>';
    }

    $html1 .= '
        <div class="title">' . strtoupper($vals_empresa["razon_social_empresa"]) . '</div>
        <div>RUC: ' . $vals_empresa["ruc_empresa"] . '</div>
        <div style="text-transform: uppercase;">' . strtoupper($vals_empresa["direccion_empresa"]) . '</div>
        <div>Oficina ' . $boleto['nombre_sucursal'] . '</div>
    </div>

    <div class="sep"></div>

    <table class="datos-factura">
        <tr>
            <td width="25%" class="label">Facturado a:</td>
            <td width="75%" class="val bold">' . strtoupper($boleto['nombres_boleto']) . '</td>
        </tr>
        <tr>
            <td class="label">RUC/CI:</td>
            <td class="val">' . $boleto['identificacion_boleto'] . '</td>
        </tr>
        <tr>
            <td class="label">Teléfono:</td>
            <td class="val">' . ($boleto['celular_boleto'] ? $boleto['celular_boleto'] : '-') . '</td>
        </tr>
    </table>

    <table class="info-viaje" style="margin-top:2px;">
        <tr>
            <td width="35%">Viaje ' . $boleto['id_fkviaje_boleto'] . '</td>
            <td width="65%" class="bold">' . strtoupper($rutaMostrar) . '</td>
        </tr>
        <tr>
            <td class="bold" style="font-size:9pt;">Bus ' . $busMostrar . '</td>
            <td style="font-size:7pt;">Sale Origen ' . $fechaSalida . ' ' . $horaSalida . '</td>
        </tr>
    </table>

    <table style="margin-top:2px;">
        <tr>
            <td width="60%" class="bold" style="font-size:8pt; text-decoration:underline;">INFORMACIÓN DEL VIAJE</td>
            <td width="20%" class="bold">Piso ' . $pisoMostrar . '</td>
            <td width="20%" class="bold">Anden ' . $andMostrar . '</td>
        </tr>
    </table>
    <div class="sep"></div>';

    // Lista de Pasajeros
    foreach ($detalles as $detalle) {
        $nombrePasajero = strtoupper($detalle['nombre_cliente_boleto_detalle']);
        $fechaSalidaFormateada = formatearFechaEspanol($boleto['fecha_salida'] ?? $fechaSalida); // si no existe fecha_salida usa fechaSalida
        
        $html1 .= '
    <div class="info-pasajero">
        <div class="bold" style="font-size:8pt;">' . $nombrePasajero . '</div>
        <div class="center bold">>> ' . strtoupper($rutaMostrar) . ' <<</div>
        <table class="center bold" style="margin:2px 0;">
            <tr>
                <td width="50%">Piso ' . $pisoMostrar . '</td>
                <td width="50%">Anden ' . $andMostrar . '</td>
            </tr>
        </table>
        <div>Salida ' . $fechaSalidaFormateada . '</div>
        <table>
            <tr>
                <td width="20%">Hora</td>
                <td width="30%" class="bold" style="font-size:9pt;">' . $horaSalida . '</td>
                <td width="25%">Asiento</td>
                <td width="25%" class="bold" style="font-size:10pt;">' . str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT) . '</td>
            </tr>
        </table>
        <table style="margin-top:2px;">
            <tr>
                <td width="30%" class="bold">Valor...$</td>
                <td width="20%" class="bold" style="font-size:9pt;">' . number_format($detalle['total_boleto_detalle'], 2, ',', '.') . '</td>
                <td width="50%" class="right">' . $detalle['tarifa_boleto_detalle'] . '</td>
            </tr>
        </table>
    </div><br>';
    }

    $html1 .= '
    <div class="sep-light"></div>
    <table style="margin-top:3px;">
        <tr>
            <td width="40%" class="big-total">TOTAL</td>
            <td width="60%" class="big-total">' . number_format($boleto['total_boleto'], 2, ',', '.') . '</td>
        </tr>
    </table>
    <div class="sep-light"></div>

    <div class="sri-info">
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

    <div class="sri-info center">
        <div>COOPERATIVA DE TRANSPORTES FLOTA PELILEO</div>
        <div>Dir. Matriz Garcia Moreno s/n y Montalvo</div>
        <div>Oficina Garcia Moreno v Montalvo</div>
        <div class="left" style="margin-top:2px;">Registra VENTASONLINE</div>
        <table class="left">
            <tr>
                <td width="50%">Impresión ' . date('d/m/Y') . '</td>
                <td width="50%">' . date('H:i') . '</td>
            </tr>
        </table>
    </div>

    <div class="leyenda">
        Descargue su factura electrónica desde patate.easysplus.com / Usuario y
        contraseña (Ruc o CI), Recuerde estar 15 minutos antes de la hora de salida
        de la unidad, En caso de no estar puntual y perder el viaje NO SE
        REEMBOLSARA EL VALOR. Una vez generado el Boleto por ningún motivo
        se reembolsará el valor. GRACIAS POR SU COMPRENSIÓN.<br>
        EASYSPLUS.COM
    </div>

    <div class="center bold" style="margin-top:5px; font-size:7.5pt;">
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
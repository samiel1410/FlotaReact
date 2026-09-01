<?php
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');

try {
$fecha_actual = date('Y-m-d H:i:s');
$id_viaje = (int)($_GET['id_viaje'] ?? 0);

// Crear PDF
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

$conn = conexion();

// Consulta optimizada de datos del bus, ruta y conductor
$query_info = "SELECT
v.id_viajes, v.dia_viajes, v.hora_salida_estimado, r.nombre_rutas,
b.disco_buses, b.placa_buses, p.per_cedula_personal,
CONCAT(p.per_nombres_persona, ' ', p.per_apellidos_personal) AS per_nombres_persona,
d.fecha_salida_despacho_viaje, u.nombre_usuario, u.apellido_usuario
FROM viajes v
LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
LEFT JOIN personal p ON b.id_fkpersonal_buses = p.id_personal
LEFT JOIN despacho_viaje d ON v.id_viajes = d.id_fkviaje_despacho_viaje
LEFT JOIN usuario u ON d.id_fkusuario_aprueba = u.id_usuario
WHERE v.id_viajes = $id_viaje LIMIT 1";
$result_info = mysqli_query($conn, $query_info) or die(mysqli_error($conn));
$info = mysqli_fetch_assoc($result_info);

// Consulta optimizada de pasajeros (agrupados por oficina de venta y embarque)
$query = "SELECT 
COALESCE(d.lugar_destino, sr.nombre_sub_rutas, 'N/A') AS lugar_destino,
r.nombre_rutas, bd.estado_boleto_detalle, bd.identificacion_boleto_detalle,
bd.asiento_boleto_detalle, bd.total_boleto_detalle,
bd.nombre_cliente_boleto_detalle, b.nombre_origen,
COALESCE(s.nombre_sucursal, s2.nombre_sucursal, s3.nombre_sucursal, 'OFICINA PATATE') AS nombre_sucursal
FROM boleto_detalle bd
JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
LEFT JOIN destino d ON bd.id_destino_boleto = d.id_destino
LEFT JOIN sub_rutas sr ON bd.id_destino_boleto = sr.id_sub_rutas
LEFT JOIN sucursal2 s ON b.id_sucursal_venta = s.id_sucursal
LEFT JOIN sucursal2 s2 ON b.id_sucursal_venta = s2.suc_codigo_sucursal
LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
LEFT JOIN sucursal2 s3 ON u.id_fksucursal_usuario = s3.suc_codigo_sucursal
WHERE b.id_fkviaje_boleto = $id_viaje
ORDER BY COALESCE(s.nombre_sucursal, s2.nombre_sucursal, s3.nombre_sucursal) ASC, b.nombre_origen ASC, CAST(bd.asiento_boleto_detalle AS UNSIGNED) ASC";

$result = mysqli_query($conn, $query) or die(mysqli_error($conn));

$tabla = '';
$total_pasajeros = 0;
$total_valor = 0;

// Variables para agrupación por oficina y origen
$current_sucursal = null;
$current_origen = null;
$sucursal_subtotal_pasajeros = 0;
$sucursal_subtotal_valor = 0;
$origen_subtotal_pasajeros = 0;
$origen_subtotal_valor = 0;

$ruta = "";

while ($row = mysqli_fetch_array($result)) {
$sucursal = !empty($row['nombre_sucursal']) ? $row['nombre_sucursal'] : 'OFICINA PRINCIPAL';
$origen = $row['nombre_origen'] ? $row['nombre_origen'] : 'ORIGEN PRINCIPAL';

// Detectar cambio de oficina (sucursal de venta)
if ($sucursal !== $current_sucursal) {
    // Cerrar subtotal de origen anterior (si existe)
    if ($current_origen !== null) {
        $tabla .= '
<tr style="background-color:#f0f0f0;">
    <td colspan="4" style="text-align:right; font-weight:bold;">Total ' . $current_origen . ':</td>
    <td style="text-align:right; font-weight:bold;">$' . number_format($origen_subtotal_valor, 2) . ' <span
            style="font-size:9px">(' . $origen_subtotal_pasajeros . ')</span></td>
</tr>';
    }
    // Cerrar total de oficina anterior (si existe)
    if ($current_sucursal !== null) {
        $tabla .= '
<tr style="background-color:#d9ead3;">
    <td colspan="4" style="text-align:right; font-weight:bold; font-size:12px;">TOTAL ' . strtoupper($current_sucursal) . ':</td>
    <td style="text-align:right; font-weight:bold; font-size:12px;">$' . number_format($sucursal_subtotal_valor, 2) . ' <span
            style="font-size:9px">(' . $sucursal_subtotal_pasajeros . ' pasajeros)</span></td>
</tr>
<tr><td colspan="5" style="border-bottom:2px solid #000;"></td></tr>';
    }
    // Imprimir cabecera de nueva oficina
    $tabla .= '
<tr>
    <td colspan="5" style="text-align:left; background-color:#c6d9f1; font-weight:bold; padding:6px; font-size:13px;">
        <br>OFICINA DE VENTA: ' . strtoupper($sucursal) . '
    </td>
</tr>';

    $current_sucursal = $sucursal;
    $current_origen = null;
    $sucursal_subtotal_pasajeros = 0;
    $sucursal_subtotal_valor = 0;
}

// Detectar cambio de origen (dentro de la misma oficina)
if ($origen !== $current_origen) {
    // Si no es el primero, imprimir subtotal del origen anterior
    if ($current_origen !== null) {
        $tabla .= '
<tr style="background-color:#f0f0f0;">
    <td colspan="4" style="text-align:right; font-weight:bold;">Total ' . $current_origen . ':</td>
    <td style="text-align:right; font-weight:bold;">$' . number_format($origen_subtotal_valor, 2) . ' <span
            style="font-size:9px">(' . $origen_subtotal_pasajeros . ')</span></td>
</tr>';
    }
    // Imprimir cabecera de nuevo origen
    $tabla .= '
<tr>
    <td colspan="5" style="text-align:left; background-color:#e8e8e8; font-weight:bold; padding:5px;">
        <br>PUNTO DE EMBARQUE: ' . strtoupper($origen) . '
    </td>
</tr>';

    $current_origen = $origen;
    $origen_subtotal_pasajeros = 0;
    $origen_subtotal_valor = 0;
}

$total_pasajeros++;
$total_valor += $row['total_boleto_detalle'];

$sucursal_subtotal_pasajeros++;
$sucursal_subtotal_valor += $row['total_boleto_detalle'];
$origen_subtotal_pasajeros++;
$origen_subtotal_valor += $row['total_boleto_detalle'];

$ruta = $row['nombre_rutas'];

$tabla .= '
<tr>
    <td style="width: 10%; border-bottom: 1px dotted #000;">' . $row['asiento_boleto_detalle'] . '</td>
    <td style="width: 18%; border-bottom: 1px dotted #000;">' . $row['identificacion_boleto_detalle'] . '</td>
    <td style="width: 28%; border-bottom: 1px dotted #000; text-align:left; word-wrap:break-word;">' .
        $row['nombre_cliente_boleto_detalle'] . '</td>
    <td style="width: 28%; border-bottom: 1px dotted #000; text-align:left; word-wrap:break-word;">' .
        $row['lugar_destino'] . '</td>
    <td style="width: 18%; border-bottom: 1px dotted #000; text-align:right;">$' .
        number_format($row['total_boleto_detalle'], 2) . '</td>
</tr>
';
}

// Cerrar último origen
if ($current_origen !== null) {
$tabla .= '
<tr style="background-color:#f0f0f0;">
    <td colspan="4" style="text-align:right; font-weight:bold;">Total ' . $current_origen . ':</td>
    <td style="text-align:right; font-weight:bold;">$' . number_format($origen_subtotal_valor, 2) . ' <span
            style="font-size:9px">(' . $origen_subtotal_pasajeros . ')</span></td>
</tr>';
}
// Cerrar última oficina
if ($current_sucursal !== null) {
$tabla .= '
<tr style="background-color:#d9ead3;">
    <td colspan="4" style="text-align:right; font-weight:bold; font-size:12px;">TOTAL ' . strtoupper($current_sucursal) . ':</td>
    <td style="text-align:right; font-weight:bold; font-size:12px;">$' . number_format($sucursal_subtotal_valor, 2) . ' <span
            style="font-size:9px">(' . $sucursal_subtotal_pasajeros . ' pasajeros)</span></td>
</tr>
<tr><td colspan="5" style="border-bottom:2px solid #000;"></td></tr>';
}

// Consulta de empresa
$query = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM
empresa LIMIT 1";
$recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
$vals = mysqli_fetch_array($recuperar);

$id_empresa = $vals["id_empresa"];
$imagen_empresa = $vals["imagen_empresa"] ?? null;
$telefono_empresa = $vals["telefono_empresa"];
$correo_empresa = $vals["correo_empresa"];
$ruc_empresa = $vals["ruc_empresa"];
$direccion_empresa = $vals["direccion_empresa"];
$razon_social_empresa = $vals["razon_social_empresa"];

$html = '
<html>

<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #fff;
        }

        .empresa {
            font-size: 15px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 2px;
            letter-spacing: 1px;
        }

        .empresa-datos {
            font-size: 10px;
            text-align: center;
            margin-bottom: 8px;
        }

        hr {
            border: none;
            border-top: 1px solid #000;
            margin: 10px 0;
        }

        .titulo {
            font-size: 17px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
        }

        .subtitulo {
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
        }

        .info-bus {
            font-size: 11px;
            margin-bottom: 8px;
            text-align: left;
        }

        table {
            font-size: 11px;
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        th {
            background: #fff;
            color: #000;
            border-bottom: 2px solid #000;
            padding: 7px 4px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 1px;
        }

        td {
            padding: 7px 4px;
            border-bottom: 1px solid #ccc;
            text-align: center;
        }

        tr:last-child td {
            border-bottom: 2px solid #000;
        }

        .totales {
            font-size: 13px;
            font-weight: bold;
            margin-top: 10px;
            text-align: right;
            border-top: 1px solid #000;
            padding-top: 6px;
        }

        .footer {
            font-size: 10px;
            text-align: right;
            margin-top: 14px;
            color: #555;
        }
    </style>
</head>

<body>
    ' . (($rutaLogo = obtenerRutaLogoEmpresa($conn, $imagen_empresa)) ? '<div style="text-align:center;"><img src="' . $rutaLogo . '" width="40"></div>' : '') . '
    <div class="empresa">' . $razon_social_empresa . '</div>
    <div class="empresa-datos">
        RUC: ' . $ruc_empresa . ' | Tel: ' . $telefono_empresa . ' | Email: ' . $correo_empresa . '<br>
        Dirección: ' . $direccion_empresa . '
    </div>
    <hr>
    <div class="titulo">LISTADO DE PASAJEROS</div>
    <div class="titulo"> <b>Disco:</b> ' . $info['disco_buses'] . '</div>
    <div class="subtitulo">Viaje #' . $id_viaje . ' | Fecha: ' . $fecha_actual . '</div>

    <div class="info-bus" style="display: flex; justify-content: space-between; align-items: center;">
        <span><b>Ruta:</b> ' . $ruta . ' </span>
        <span><b>Placa:</b> ' . $info['placa_buses'] . '</span>
    </div>

    <span><b>Conductor:</b> ' . $info['per_nombres_persona'] . '' . $info['per_apellidos_personal'] . '</span>
    <br><span><b>C.I:</b> ' . $info['per_cedula_personal'] . '</span>
    <br>
    <br>

    <table>
        <tr>
            <th style="width: 10%;">Asi.</th>
            <th style="width: 18%;">Cédula</th>
            <th style="width: 28%;">Nombre</th>
            <th style="width: 28%;">Destino</th>
            <th style="width: 18%;">Valor</th>
        </tr>
        ' . $tabla . '
    </table>
    <div class="totales">
        Total Pasajeros: ' . $total_pasajeros . '<br>
        Total Recaudado: $' . number_format($total_valor, 2) . '
    </div>

    <span><b>Entrega:</b> ' . $info['nombre_usuario'] . '' . $info['apellido_usuario'] . '</span>

    <div class="footer">Impresión: ' . $fecha_actual . '</div>
</body>

</html>
';

$pdf->SetFont('helvetica', '', 10);
$pdf->AddPage('P', array(500, 120));
$pdf->writeHTML($html, true, false, true, false, '');


$pdf->Output('pasajeros.pdf', 'I');
exit;

} catch (Exception $e) {
$array = array(
"error" => $e->getMessage(),
"success" => false,
);
echo json_encode($array);
}
?>
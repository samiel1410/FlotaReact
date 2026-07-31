<?php
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");

//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
$fecha_actual = date('Y-m-d H:i:s');
$id_maestro = $_GET['id_maestro'];


// create new PDF document
// Usamos un formato de ticket (80mm de ancho)
$pdf = new TCPDF('P', 'mm', array(80, 297), true, 'UTF-8', false);

// Remover cabeceras y pies de página por defecto
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

$conn = conexion();

// Query principal con LEFT JOIN para evitar que falle si falta algún dato relacionado
$query = "SELECT 
    dm.numero_despacho_maestro,
    dm.nombre_destino,
    dm.fecha_despacho_maestro,
    dm.nombre_oficinista,
    dm.nombre_bus,
    dm.id_fkusuario_despacho_maestro,
    CONCAT(p.per_nombres_persona, ' ', p.per_apellidos_personal) as nombre_busero,
    u.nombre_usuario,
    u.apellido_usuario 
FROM despacho_maestro dm
LEFT JOIN usuario u ON dm.id_fkusuario_despacho_maestro = u.id_usuario
LEFT JOIN personal p ON dm.id_fkbus_despacho_maestro = p.per_codigo_personal
WHERE dm.id_despacho_maestro = $id_maestro";

$recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
$vals = mysqli_fetch_array($recuperar);

if (!$vals) {
    throw new Exception("No se encontró el despacho con ID: $id_maestro");
}

$nombre_oficinista_real = trim(($vals["nombre_usuario"] ?? '') . " " . ($vals["apellido_usuario"] ?? ''));
if (empty($nombre_oficinista_real)) $nombre_oficinista_real = $vals["nombre_oficinista"];

$numero_despacho_maestro = $vals["numero_despacho_maestro"];
$nombre_destino = $vals["nombre_destino"];
$fecha_despacho_maestro = $vals["fecha_despacho_maestro"];
$nombre_oficinista = $vals["nombre_oficinista"];
$nombre_busero = $vals["nombre_busero"] ?? "N/A";
$nombre_bus = $vals["nombre_bus"];
$id_fkusuario_despacho_maestro = $vals["id_fkusuario_despacho_maestro"];

$query3 = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa
FROM empresa WHERE 1 LIMIT 1";
$recuperar3 = mysqli_query($conn, $query3) or die(mysqli_error($conn));
$vals3 = mysqli_fetch_array($recuperar3);

$razon_social_empresa = $vals3["razon_social_empresa"] ?? "SISTEMA FLOTA";
$ruc_empresa = $vals3["ruc_empresa"] ?? "";

$rutaLogo = obtenerRutaLogoEmpresa($conn);
$html_logo = '';
if ($rutaLogo) {
    $html_logo = '<div style="text-align:center;"><img src="' . $rutaLogo . '" style="width:120px;" /></div>';
}

$query4 = "SELECT d.lugar_destino FROM destino d
JOIN usuario u ON d.id_destino = u.id_fkdestino_usuario 
WHERE u.id_usuario = $id_fkusuario_despacho_maestro LIMIT 1";
$recuperar4 = mysqli_query($conn, $query4);
$lugar_destino = "";
if ($recuperar4 && $vals4 = mysqli_fetch_array($recuperar4)) {
    $lugar_destino = $vals4["lugar_destino"];
}

$datos = '';
$query2 = "SELECT 
    dd.id_despacho_detalle,
    dd.observacion_despacho_detalle,
    g.id_guia,
    g.numero_guia,
    g.punto_emision_guia,
    s.punto_emision_sucursal, 
    g.total_guia 
FROM despacho_detalle dd
JOIN guia g ON dd.id_fkguia_despacho_detalle = g.id_guia 
JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal 
WHERE dd.id_fkdespacho_maestro = $id_maestro 
GROUP BY dd.id_despacho_detalle";

$recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));

$total_final = 0;
$total_cantidad = 0;
$total_guias = 0;
$observacion_general = "";

while ($vals2 = mysqli_fetch_array($recuperar2)) {
    $total_guias++;
    if (empty($observacion_general)) $observacion_general = $vals2["observacion_despacho_detalle"];
    
    $total_final += $vals2['total_guia'];
    $resultado = sprintf("%09s", $vals2['numero_guia']);
    $id_guia = $vals2['id_guia'];
    
    $query_cantidad = "SELECT SUM(cantidad_detalle_guia) as cantidad FROM detalle_guia WHERE id_fkguia_detalle_envio=$id_guia";
    $rec_cant = mysqli_query($conn, $query_cantidad);
    $v_cant = mysqli_fetch_array($rec_cant);
    $cant_item = $v_cant['cantidad'] ?? 0;
    
    $total_cantidad += $cant_item;
    
    $datos .= '
    <tr>
      <td style="width: 100px; border-bottom: 1px solid #ccc;">' . $vals2['punto_emision_sucursal'] . '-' . $vals2['punto_emision_guia'] . '-' . $resultado . '</td>
      <td style="width: 50px; border-bottom: 1px solid #ccc; text-align:right;">$' . number_format((float) $vals2['total_guia'], 2) . '</td>
      <td style="width: 50px; border-bottom: 1px solid #ccc; text-align:center;">' . $cant_item . '</td>
    </tr>';
}

$html = '
<style>
    body { font-family: helvetica; font-size: 8pt; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    table { width: 100%; }
    .header-info { font-size: 9pt; }
    .items-table th { border-bottom: 1px solid black; font-weight: bold; }
    .totals { font-size: 10pt; border-top: 1px solid black; padding-top: 5px; }
</style>
<body>
    ' . $html_logo . '
    <div class="center bold" style="font-size: 10pt;">' . $razon_social_empresa . '</div>
    <div class="center">RUC: ' . $ruc_empresa . '</div>
    <div class="center bold">OFICINA ' . $lugar_destino . '</div>
    <div class="center bold" style="font-size: 11pt; margin-top: 5px;">DESPACHO #' . $numero_despacho_maestro . '</div>
    
    <hr>
    
    <table class="header-info">
        <tr><td class="bold" width="70">DESTINO:</td><td>' . $nombre_destino . '</td></tr>
        <tr><td class="bold">BUS:</td><td>' . $nombre_bus . '</td></tr>
        <tr><td class="bold">CONDUCTOR:</td><td>' . $nombre_busero . '</td></tr>
        <tr><td class="bold">OFICINISTA:</td><td>' . $nombre_oficinista_real . '</td></tr>
        <tr><td class="bold">FECHA:</td><td>' . $fecha_despacho_maestro . '</td></tr>
    </table>
    
    <br><br>
    
    <table class="items-table" cellpadding="2">
        <thead>
            <tr>
                <th style="width: 100px;">GUIA</th>
                <th style="width: 50px; text-align:right;">TOTAL</th>
                <th style="width: 50px; text-align:center;">CANT.</th>
            </tr>
        </thead>
        <tbody>
            ' . $datos . '
        </tbody>
    </table>
    
    <br>
    
    <div class="totals">
        <b>Total:</b> $' . number_format((float) $total_final, 2) . '<br>
        <b>Total Guías:</b> ' . $total_guias . '<br>
        <b>Total Cantidad:</b> ' . $total_cantidad . '
    </div>
    
    <br>
    <div><b>Observación:</b> ' . ($observacion_general ?: "N/A") . '</div>
    <div style="font-size: 7pt; margin-top: 5px;">Impresión: ' . $fecha_actual . '</div>
    
    <br><br><br>
    
    <table>
        <tr>
            <td style="text-align: center; width: 50%;">
                ___________________<br>
                ENTREGADO POR<br>
                <span style="font-size: 7pt;">' . $nombre_oficinista_real . '</span>
            </td>
            <td style="text-align: center; width: 50%;">
                ___________________<br>
                RECIBIDO POR (BUS)<br>
                <span style="font-size: 7pt;">' . $nombre_busero . '</span>
            </td>
        </tr>
    </table>
</body>';

// Cálculo dinámico de altura (80mm base + 4mm por guía aprox)
$dynamicHeight = 150 + ($total_guias * 5);
if ($dynamicHeight < 200) $dynamicHeight = 200;

$pdf->AddPage('P', array(80, $dynamicHeight));
$pdf->SetMargins(5, 5, 5);
$pdf->SetAutoPageBreak(true, 5);

$pdf->writeHTML($html, true, false, true, false, '');
$pdf->IncludeJS("print();");

$tempDir = __DIR__ . '/tmp/';
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0777, true);
}

$fileName = 'despacho.pdf';
$fullPath = $tempDir . $fileName;

$pdf->Output($fullPath, 'F');

echo json_encode([
    "ruta" => $fileName,
    "success" => true,
    "borrar" => $fullPath,
]);

} catch (Exception $e) {
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false,
    ]);
}



// Guardar el archivo en el servidor


// Limpiar el búfer de salida





//============================================================+
// END OF FILE
//============================================================+


?>
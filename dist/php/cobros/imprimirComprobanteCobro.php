<?php

require_once('../library/tcpdf.php');
require_once ("../db.php");

date_default_timezone_set('America/Guayaquil');

$numero_comprobante = isset($_GET['numero_comprobante']) ? intval($_GET['numero_comprobante']) : 0;

if (!$numero_comprobante) {
    echo json_encode(['success' => false, 'error' => 'Número de comprobante no válido']);
    exit;
}

$conn = conexion();

// Consulta principal: trae todos los comprobantes con ese número
$query = "
SELECT 
    ccr.id_comprobante_cobro_retenciones,
    ccr.numero_comprobante_cobro,
    ccr.fecha_emision_comprobante_cobro,
    ccr.monto_comprobante_cobro,
    ccr.concepto_detalle_comprobante_cobro,
    ccr.estado_comprobante_cobro,
    ccr.observacion_comprobante_cobro,
    u.nombre_usuario,
    u.apellido_usuario,
    b.placa_buses,
    b.disco_buses,
    s.nombre_sucursal,
    fp.nombre_forma_pago
FROM comprobante_cobro_retenciones ccr
LEFT JOIN usuario u ON ccr.id_fkusuario_comprobante_cobro = u.id_usuario
LEFT JOIN buses b ON ccr.id_fkbus_comprobante_cobro = b.id_buses
LEFT JOIN sucursal2 s ON ccr.id_fksucursal_comprobante_cobro = s.suc_codigo_sucursal
LEFT JOIN forma_pago fp ON ccr.id_fkforma_pago = fp.id_forma_pago
WHERE ccr.numero_comprobante_cobro = $numero_comprobante
ORDER BY ccr.fecha_creacion_comprobante_cobro ASC
";
$res = mysqli_query($conn, $query) or die(mysqli_error($conn));

$comprobantes = [];
while ($row = mysqli_fetch_assoc($res)) {
    $comprobantes[] = $row;
}

if (count($comprobantes) == 0) {
    echo json_encode(['success' => false, 'error' => 'No se encontraron comprobantes']);
    exit;
}

// Datos de empresa
$query_empresa = "SELECT razon_social_empresa, ruc_empresa, direccion_empresa, telefono_empresa FROM empresa LIMIT 1";
$res_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
$empresa = mysqli_fetch_assoc($res_empresa);

// Crear PDF
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);
$pdf->SetFont('helvetica', '', 12);
$pdf->AddPage('P', array(500, 200));

// HTML principal
$html = '
<style>
.titulo { font-size: 16px; font-weight: bold; text-align: center; }
.subtitulo { font-size: 12px; text-align: center; }
.table { font-size: 10px; width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px dotted #888; padding: 2px 4px; }
.total { font-size: 12px; font-weight: bold; color: #27ae60; }
</style>
<div class="titulo">' . $empresa['razon_social_empresa'] . '</div>
<div class="subtitulo">RUC ' . $empresa['ruc_empresa'] . '<br>' . $empresa['direccion_empresa'] . '<br>Tel: ' . $empresa['telefono_empresa'] . '</div>
<hr>
<div class="subtitulo"><strong>Comprobante de Cobro N° ' . $numero_comprobante . '</strong></div>
<table class="table">
    <tr>
        <th>Fecha</th>
        <th>Bus</th>
        <th>Forma Pago</th>
        <th>Concepto</th>
        <th>Monto</th>
        <th>Estado</th>
    </tr>
';

$total = 0;
foreach ($comprobantes as $c) {
    $fecha = date('d/m/Y', strtotime($c['fecha_emision_comprobante_cobro']));
    $bus = $c['disco_buses'] . ' - ' . $c['placa_buses'];
    $forma = $c['nombre_forma_pago'];
    $concepto = $c['concepto_detalle_comprobante_cobro'];
    $monto = number_format($c['monto_comprobante_cobro'], 2);
    $estado = $c['estado_comprobante_cobro'];
    $total += floatval($c['monto_comprobante_cobro']);
    $html .= "
    <tr>
        <td>$fecha</td>
        <td>$bus</td>
        <td>$forma</td>
        <td>$concepto</td>
        <td style='text-align:right;'>$$monto</td>
        <td>$estado</td>
    </tr>
    ";
}

$html .= '</table>';
$html .= '<div class="total">Total Comprobante: $' . number_format($total, 2) . '</div>';

$usuario = $comprobantes[0]['nombre_usuario'] . ' ' . $comprobantes[0]['apellido_usuario'];
$sucursal = $comprobantes[0]['nombre_sucursal'];

$html .= '<br><div class="subtitulo">Sucursal: ' . $sucursal . '<br>Usuario: ' . $usuario . '</div>';
$html .= '<br><div style="font-size:10px;text-align:right;">Impresión: ' . date('d/m/Y H:i:s') . '</div>';

$pdf->writeHTML($html, true, false, true, false, '');
$pdf->IncludeJS("print();");
$pdf->Output('comprobanteCobro.pdf', 'I');
?>
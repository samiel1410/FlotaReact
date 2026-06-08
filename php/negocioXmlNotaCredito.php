<?php
require_once("../php/armarXmlNotaCredito.php");
$ver = new metodoXmlNotaCredito();
$id_boleto = $_GET['id_boleto'];
$motivo = isset($_GET['motivo']) ? $_GET['motivo'] : 'ANULACION DE TICKET';

$var = $ver->armarXmlNotaCredito($id_boleto, $motivo);

header('Content-Type: application/json');
if ($var['success']) {
    echo json_encode([
        'success' => true,
        'xml' => $var['comprobante'],
        'clave_acceso' => $var['clave_acceso'],
        'p12_password' => $var['p12_password']
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => $var['error']
    ]);
}
?>
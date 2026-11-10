<?php
//error_reporting(E_ALL);
// ini_set('display_errors', 1);
require_once("../php/armarXml.php");
$ver = new meotodoXml();
$id_factura = $_GET['id_factura'];
$var = $ver->armarXml($id_factura);

header('Content-Type: application/json');

if (!is_array($var) || empty($var['comprobante'])) {
    echo json_encode(array(
        "xml" => null,
        "ruc" => null,
        "clave" => null,
        "success" => false,
        "mensaje" => $ver->ultimoError ?: 'No se pudo generar el comprobante XML de la factura'
    ));
    exit;
}

$transaccion = array(
    "xml" => $var['comprobante'],
    "ruc" => $var['ruc_empresa'],
    "clave" => $var['password_p12'],
    "success" => true
);

echo json_encode($transaccion);
?>
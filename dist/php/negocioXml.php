<?php
//error_reporting(E_ALL);
// ini_set('display_errors', 1);
require_once("../php/armarXml.php");
$ver = new meotodoXml();
$id_factura = $_GET['id_factura'];
$var = $ver->armarXml($id_factura);


$transaccion = array(
    "xml" => $var['comprobante'],
    "ruc" => $var['ruc_empresa'],
    "clave" => $var['password_p12'],
    "success" => true
);

header('Content-Type: application/json');
echo json_encode($transaccion);
?>
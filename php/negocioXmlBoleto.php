<?php
require_once("../php/armarXmlBoleto.php");
$ver = new metodoXmlBoleto();
$id_boleto = $_GET['id_boleto'];
$var = $ver->armarXmlBoleto($id_boleto);

// Guardar el XML en un archivo físico
$xmlFolder = __DIR__ . '/xml_boletos/';
if (!is_dir($xmlFolder)) {
    mkdir($xmlFolder, 0777, true);
}
$xmlFile = $xmlFolder . 'boleto_' . $id_boleto . '.xml';
file_put_contents($xmlFile, $var['comprobante']);

// Devolver el XML en formato JSON
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'xml' => $var['comprobante'],
    'clave_acceso' => isset($var['clave_acceso_boletos']) ? $var['clave_acceso_boletos'] : null,
    'p12_password' => isset($var['p12_password']) ? $var['p12_password'] : null
]);
?>
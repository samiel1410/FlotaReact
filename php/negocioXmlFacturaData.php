<?php
require_once __DIR__ . "/armarXml.php";
$ver = new meotodoXml();
$id_factura = $_GET['id_factura'];
$var = $ver->armarXml($id_factura);

// Guardar el XML en un archivo físico
$xmlFolder = __DIR__ . '/xml_facturas/';
if (!is_dir($xmlFolder)) {
    mkdir($xmlFolder, 0777, true);
}
$xmlFile = $xmlFolder . 'factura_' . $id_factura . '.xml';
file_put_contents($xmlFile, $var['comprobante']);

// Devolver el XML en formato JSON (igual que Boletos)
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'xml' => $var['comprobante'],
    'clave_acceso' => isset($var['clave_acceso_factura']) ? $var['clave_acceso_factura'] : null,
    'p12_password' => isset($var['p12_password']) ? $var['p12_password'] : null
]);
?>
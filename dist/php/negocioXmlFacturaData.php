<?php
require_once __DIR__ . "/armarXml.php";
$ver = new meotodoXml();
$id_factura = $_GET['id_factura'];
$var = $ver->armarXml($id_factura);
$datosEmpresa = $ver->obtenerEmpresaInfo();

$rucEmpresa = !empty($datosEmpresa[0]['ruc_empresa']) ? $datosEmpresa[0]['ruc_empresa'] : '';
$passwordP12 = !empty($datosEmpresa[0]['password_p12']) ? $datosEmpresa[0]['password_p12'] : '';

// Guardar el XML en un archivo físico para logs/respaldo si se desea
$xmlFolder = __DIR__ . '/xml_facturas/';
if (!is_dir($xmlFolder)) {
    mkdir($xmlFolder, 0777, true);
}
$xmlFile = $xmlFolder . 'factura_' . $id_factura . '.xml';
file_put_contents($xmlFile, $var['comprobante']);

// Devolver el XML y datos de firma en formato JSON
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'xml' => $var['comprobante'],
    'ruc' => $rucEmpresa,
    'p12_password' => $passwordP12,
    'clave_acceso' => $var['clave_acceso_factura']
]);
?>
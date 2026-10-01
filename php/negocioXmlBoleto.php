<?php
require_once __DIR__ . "/armarXmlBoleto.php";
$ver = new metodoXmlBoleto();
$id_boleto = $_GET['id_boleto'];
$var = $ver->armarXmlBoleto($id_boleto);

// NOTA: ya NO se guarda copia física en xml_boletos/ (solo se devuelve
// el XML en el JSON para firmar/enviar al SRI en memoria).

// Devolver el XML en formato JSON
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'xml' => $var['comprobante'],
    'ruc' => isset($var['ruc_empresa']) ? $var['ruc_empresa'] : (isset($var['ruc']) ? $var['ruc'] : null),
    'clave_acceso' => isset($var['clave_acceso_boletos']) ? $var['clave_acceso_boletos'] : null,
    'p12_password' => isset($var['p12_password']) ? $var['p12_password'] : null
]);
?>
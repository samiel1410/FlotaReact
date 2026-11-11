<?php
require_once __DIR__ . "/armarXmlBoleto.php";
ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

header('Content-Type: application/json');

if (empty($_GET['id_boleto'])) {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Parámetro id_boleto es requerido'
    ]);
    exit;
}

$ver = new metodoXmlBoleto();
$id_boleto = (int)$_GET['id_boleto'];
$var = $ver->armarXmlBoleto($id_boleto);

// NOTA: ya NO se guarda copia física en xml_boletos/ (solo se devuelve
// el XML en el JSON para firmar/enviar al SRI en memoria).

if (!is_array($var) || empty($var['comprobante'])) {
    echo json_encode([
        'success' => false,
        'mensaje' => $ver->ultimoError ?: "No se pudo generar el XML del boleto #{$id_boleto}"
    ]);
    exit;
}

// Devolver el XML en formato JSON
echo json_encode([
    'success' => true,
    'xml' => $var['comprobante'],
    'ruc' => isset($var['ruc_empresa']) ? $var['ruc_empresa'] : (isset($var['ruc']) ? $var['ruc'] : null),
    'clave_acceso' => isset($var['clave_acceso_boletos']) ? $var['clave_acceso_boletos'] : null,
    'p12_password' => isset($var['p12_password']) ? $var['p12_password'] : null
]);
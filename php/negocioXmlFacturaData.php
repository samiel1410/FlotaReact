<?php
require_once __DIR__ . "/armarXml.php";
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

if (empty($_GET['id_factura'])) {
    echo json_encode([
        'success' => false,
        'mensaje' => 'Parámetro id_factura es requerido'
    ]);
    exit;
}

try {
    $ver = new meotodoXml();
    $id_factura = (int)$_GET['id_factura'];
    $var = $ver->armarXml($id_factura);

    if (empty($var) || empty($var['comprobante'])) {
        echo json_encode([
            'success' => false,
            'mensaje' => 'No se pudo generar el comprobante XML de la factura'
        ]);
        exit;
    }

    // Guardar el XML en un archivo físico
    $xmlFolder = __DIR__ . '/xml_facturas/';
    if (!is_dir($xmlFolder)) {
        mkdir($xmlFolder, 0777, true);
    }
    $xmlFile = $xmlFolder . 'factura_' . $id_factura . '.xml';
    file_put_contents($xmlFile, $var['comprobante']);

    // Devolver el XML en formato JSON (igual que Boletos)
    echo json_encode([
        'success' => true,
        'xml' => $var['comprobante'],
        'ruc' => isset($var['ruc_empresa']) ? $var['ruc_empresa'] : (isset($var['ruc']) ? $var['ruc'] : null),
        'clave_acceso' => isset($var['clave_acceso_factura']) ? $var['clave_acceso_factura'] : null,
        'p12_password' => isset($var['p12_password']) ? $var['p12_password'] : null
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'mensaje' => $e->getMessage()
    ]);
}
?>
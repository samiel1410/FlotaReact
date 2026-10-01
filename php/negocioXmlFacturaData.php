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

    // NOTA: ya NO se guarda copia física en xml_facturas/ (solo se devuelve
    // el XML en el JSON para firmar/enviar al SRI en memoria).

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
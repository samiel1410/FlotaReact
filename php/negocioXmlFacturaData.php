<?php
require_once __DIR__ . "/armarXml.php";
$ver = new meotodoXml();
$id_factura = $_GET['id_factura'];
$var = $ver->armarXml($id_factura);

// Obtener info adicional de la empresa para la firma
$conn = conexion();
$query = "SELECT ruc_empresa, password_p12 FROM empresa LIMIT 1";
$result = mysqli_query($conn, $query);
$empresa = mysqli_fetch_assoc($result);

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
    'ruc' => $empresa['ruc_empresa'],
    'p12_password' => $empresa['password_p12'],
    'clave_acceso' => $var['clave_acceso_factura']
]);
?>
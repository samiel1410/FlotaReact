<?php
if (!isset($_SESSION)) {
    session_start();
}
require_once('library/tcpdf.php');
require_once("db.php");

try {
    // Leer desde cuerpo JSON (POST) para no exponer credenciales en la URL
    $input = json_decode(file_get_contents('php://input'), true);

    // Fallback a GET por compatibilidad temporal
    $id_usuario = $input['id_usuario'] ?? $_GET['id_usuario'] ?? null;
    $db_name    = $input['db_name']    ?? $_GET['db_name']    ?? null;
    $db_host    = $input['db_host']    ?? $_GET['db_host']    ?? 'localhost';
    $db_user    = $input['db_user']    ?? $_GET['db_user']    ?? 'root';
    $db_pass    = $input['db_pass']    ?? $_GET['db_pass']    ?? '';

    if (!$id_usuario || !$db_name) {
        throw new Exception('Parámetros de sesión incompletos');
    }

    $_SESSION["id_usuario"] = $id_usuario;
    $_SESSION["db_name"]    = $db_name;
    $_SESSION["db_host"]    = $db_host;
    $_SESSION["db_user"]    = $db_user;
    $_SESSION["db_pass"]    = $db_pass;

    echo json_encode([
        "success"    => true,
        "id_usuario" => $_SESSION["id_usuario"]
    ]);

} catch (Exception $e) {
    echo json_encode([
        "error"   => $e->getMessage(),
        "success" => false
    ]);
}
?>
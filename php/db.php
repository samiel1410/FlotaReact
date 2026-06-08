<?php

ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

// Configuración de sesión persistente (30 días)
if (session_status() === PHP_SESSION_NONE) {
    $sessionLifetime = 30 * 24 * 60 * 60;
    ini_set('session.gc_maxlifetime', $sessionLifetime);
    session_set_cookie_params($sessionLifetime);
    session_start();
}

// Clave para desencriptar datos que vienen del AuthService
define('DB_ENCRYPTION_KEY', 'flota_secret_key_32_characters_!');

/**
 * Desencripta datos sensibles que vienen del AuthService (Node.js)
 */
function decrypt_db_data($data) {
    if (!$data || strpos($data, ':') === false) return $data;
    
    try {
        list($iv_hex, $encrypted_hex) = explode(':', $data);
        $iv = hex2bin($iv_hex);
        $encrypted = hex2bin($encrypted_hex);
        
        $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', DB_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
        return $decrypted !== false ? $decrypted : $data;
    } catch (Exception $e) {
        return $data;
    }
}

function conexion()
{
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $isLocal = ($host == 'localhost' || $host == '127.0.0.1');

    if (isset($_SESSION['db_name']) && !empty($_SESSION['db_name'])) {
        // Desencriptamos los datos que vienen de la sesión (seteados por login.php)
        $db_name = decrypt_db_data($_SESSION['db_name']);
        $db_host = isset($_SESSION['db_host']) ? decrypt_db_data($_SESSION['db_host']) : "localhost";
        $db_user = isset($_SESSION['db_user']) ? decrypt_db_data($_SESSION['db_user']) : "root";
        $db_pass = isset($_SESSION['db_pass']) ? decrypt_db_data($_SESSION['db_pass']) : "";
    } else if ($isLocal) {
        // Credenciales de DESARROLLO (Fallback)
        $db_host = "localhost";
        $db_user = "root";
        $db_pass = "";
        $db_name = "flotapelileo_produccion";
    } else {
        // Credenciales de PRODUCCION (Fallback)
        $db_host = "localhost";
        $db_user = "patate_user";
        $db_pass = "Latacunga14";
        $db_name = "admin_patate";
    }

    $conn = mysqli_connect($db_host, $db_user, $db_pass, $db_name);

    if (!$conn) {
        if ($isLocal) {
            die("Error: Failed to connect to database (" . mysqli_connect_error() . ")");
        } else {
            // Log de error interno sin exponer datos sensibles
            error_log("DB Connection Error: " . mysqli_connect_error());
            die("Error: Failed to connect to database!");
        }
    }

    mysqli_set_charset($conn, "utf8");

    return $conn;
}
?>
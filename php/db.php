<?php

ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

// Zona horaria de Ecuador para que la fecha de emisión del SRI sea consistente.
date_default_timezone_set('America/Guayaquil');

// Configuración de sesión persistente (30 días)
if (session_status() === PHP_SESSION_NONE) {
    $sessionLifetime = 30 * 24 * 60 * 60;
    ini_set('session.gc_maxlifetime', $sessionLifetime);
    session_set_cookie_params($sessionLifetime);
    session_start();
}

// Clave para desencriptar datos que vienen del AuthService
define('DB_ENCRYPTION_KEY', 'flota_secret_key_32_characters_!');

function decrypt_db_data($data) {
    if (!$data) return $data;
    
    try {
        // Formato 1: iv_hex:encrypted_hex
        if (strpos($data, ':') !== false) {
            list($iv_hex, $encrypted_hex) = explode(':', $data);
            $iv = hex2bin($iv_hex);
            $encrypted = hex2bin($encrypted_hex);
            $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', DB_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
            return $decrypted !== false ? $decrypted : $data;
        }

        // Formato 2: Base64 directo de (16 bytes IV + ciphertext)
        $decoded = base64_decode($data, true);
        if ($decoded !== false && strlen($decoded) > 16) {
            $iv = substr($decoded, 0, 16);
            $encrypted = substr($decoded, 16);
            $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', DB_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
            return ($decrypted !== false && $decrypted !== '') ? trim($decrypted) : $data;
        }

        return $data;
    } catch (Exception $e) {
        return $data;
    }
}

function obtenerCredencialesDb($isLocal)
{
    if (isset($_GET['tenantId']) || isset($_POST['tenantId'])) {
        $tId = isset($_GET['tenantId']) ? $_GET['tenantId'] : $_POST['tenantId'];
        $authUrl = $isLocal ? 'http://localhost:4000' : 'https://usuarioeasys.easysplus.com';
        $endpoint = "{$authUrl}/auth/tenant-db/{$tId}";
        
        $json = null;

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            $json = curl_exec($ch);
            curl_close($ch);
        }
        
        if (!$json) {
            $ctx = stream_context_create([
                "ssl" => ["verify_peer" => false, "verify_peer_name" => false],
                "http" => ["timeout" => 5]
            ]);
            $json = @file_get_contents($endpoint, false, $ctx);
        }

        if ($json) {
            $data = json_decode($json, true);
            if (isset($data['success']) && $data['success'] && isset($data['tenant'])) {
                $t = $data['tenant'];
                $dbHost = !empty($t['db_host']) ? decrypt_db_data($t['db_host']) : 'localhost';
                $dbUser = !empty($t['db_user']) ? decrypt_db_data($t['db_user']) : '';
                $dbPass = !empty($t['db_pass']) ? decrypt_db_data($t['db_pass']) : '';
                $dbName = !empty($t['db_name']) ? decrypt_db_data($t['db_name']) : '';

                return [
                    $dbHost ?: 'localhost',
                    $dbUser ?: ($isLocal ? 'root' : ''),
                    $dbPass ?: '',
                    $dbName
                ];
            } else {
                error_log("[TenantDB Error] Respuesta no válida: " . $json);
            }
        } else {
            error_log("[TenantDB Error] No se pudo obtener respuesta de {$endpoint}");
        }
    }

    $sessionDbName = isset($_SESSION['db_name']) && !empty($_SESSION['db_name']) ? decrypt_db_data($_SESSION['db_name']) : null;
    $sessionDbHost = isset($_SESSION['db_host']) && !empty($_SESSION['db_host']) ? decrypt_db_data($_SESSION['db_host']) : null;
    $sessionDbUser = isset($_SESSION['db_user']) && !empty($_SESSION['db_user']) ? decrypt_db_data($_SESSION['db_user']) : null;
    $sessionDbPass = isset($_SESSION['db_pass']) && !empty($_SESSION['db_pass']) ? decrypt_db_data($_SESSION['db_pass']) : null;

    if (!empty($sessionDbName)) {
        return [
            $sessionDbHost ?: 'localhost',
            $sessionDbUser ?: ($isLocal ? 'root' : ''),
            $sessionDbPass ?: '',
            $sessionDbName
        ];
    }

    if (isset($_GET['db_name']) && !empty($_GET['db_name'])) {
        return [
            isset($_GET['db_host']) ? $_GET['db_host'] : 'localhost',
            isset($_GET['db_user']) ? $_GET['db_user'] : ($isLocal ? 'root' : ''),
            isset($_GET['db_pass']) ? $_GET['db_pass'] : '',
            $_GET['db_name']
        ];
    }

    if (isset($_POST['db_name']) && !empty($_POST['db_name'])) {
        return [
            isset($_POST['db_host']) ? $_POST['db_host'] : 'localhost',
            isset($_POST['db_user']) ? $_POST['db_user'] : ($isLocal ? 'root' : ''),
            isset($_POST['db_pass']) ? $_POST['db_pass'] : '',
            $_POST['db_name']
        ];
    }

    $db_host = $isLocal
        ? (getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: 'localhost')
        : (getenv('PROD_DB_HOST') ?: getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: '');

    $db_user = $isLocal
        ? (getenv('DB_USER') ?: getenv('DB_USERNAME') ?: getenv('MYSQL_USER') ?: 'root')
        : (getenv('PROD_DB_USER') ?: getenv('DB_USER') ?: getenv('DB_USERNAME') ?: getenv('MYSQL_USER') ?: '');

    $db_pass = $isLocal
        ? (getenv('DB_PASSWORD') ?: getenv('MYSQL_PASSWORD') ?: '')
        : (getenv('PROD_DB_PASSWORD') ?: getenv('DB_PASSWORD') ?: getenv('MYSQL_PASSWORD') ?: '');

    $db_name = $isLocal
        ? (getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: 'flotapelileo_produccion')
        : (getenv('PROD_DB_NAME') ?: getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: '');

    // Si en producción no hay usuario/db definidos en variables de entorno, obtener por defecto las del Tenant #1 desde AuthService
    if (!$isLocal && (empty($db_user) || empty($db_name))) {
        $authUrl = 'https://usuarioeasys.easysplus.com';
        $endpoint = "{$authUrl}/auth/tenant-db/1";
        $json = null;

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            $json = curl_exec($ch);
            curl_close($ch);
        }

        if (!$json) {
            $ctx = stream_context_create([
                "ssl" => ["verify_peer" => false, "verify_peer_name" => false],
                "http" => ["timeout" => 5]
            ]);
            $json = @file_get_contents($endpoint, false, $ctx);
        }

        if ($json) {
            $data = json_decode($json, true);
            if (isset($data['success']) && $data['success'] && isset($data['tenant'])) {
                $t = $data['tenant'];
                $db_host = !empty($t['db_host']) ? decrypt_db_data($t['db_host']) : ($db_host ?: 'localhost');
                $db_user = !empty($t['db_user']) ? decrypt_db_data($t['db_user']) : $db_user;
                $db_pass = !empty($t['db_pass']) ? decrypt_db_data($t['db_pass']) : $db_pass;
                $db_name = !empty($t['db_name']) ? decrypt_db_data($t['db_name']) : $db_name;
            }
        }
    }

    return [$db_host, $db_user, $db_pass, $db_name];
}

function conexion()
{
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $isLocal = ($host == 'localhost' || $host == '127.0.0.1');

    list($db_host, $db_user, $db_pass, $db_name) = obtenerCredencialesDb($isLocal);

    $conn = mysqli_connect($db_host, $db_user, $db_pass, $db_name);

    if (!$conn) {
        $err = mysqli_connect_error();
        error_log("DB Connection Error: " . $err);
        die("Error de Conexión a Base de Datos");
    }

    mysqli_set_charset($conn, "utf8");

    return $conn;
}

/**
 * Recalcula el dígito verificador Modulo 11 para la clave de acceso del SRI
 */
function calcularModulo11($cadena) {
    $pivote = 2;
    $longitud = strlen($cadena);
    $cantidadTotal = 0;
    
    for ($i = $longitud - 1; $i >= 0; $i--) {
        $cantidadTotal += (int)$cadena[$i] * $pivote;
        $pivote = ($pivote === 7) ? 2 : $pivote + 1;
    }

    $modulo = $cantidadTotal % 11;
    $digitoVerificador = 11 - $modulo;

    if ($digitoVerificador === 11) {
        $digitoVerificador = 0;
    } elseif ($digitoVerificador === 10) {
        $digitoVerificador = 1;
    }

    return $digitoVerificador;
}

/**
 * Regenera y actualiza la Clave de Acceso SRI para asegurar que tenga la fecha de HOY
 */
function asegurarClaveAccesoHoy($claveOriginal, $tabla, $columnaClave, $columnaId, $idDocumento, $conn = null) {
    $hoyFormato = date('dmY'); // 8 dígitos: ddmmyyyy
    $fechaAccesoOriginal = strlen($claveOriginal) === 49 ? substr($claveOriginal, 0, 8) : '';

    if (strlen($claveOriginal) === 49 && $fechaAccesoOriginal === $hoyFormato) {
        return $claveOriginal; // Ya tiene la fecha de hoy → no modificar
    }

    if (strlen($claveOriginal) >= 48) {
        // Extraer la parte media: tipo_comprobante(2) + ruc(13) + ambiente(1) + estab(3) + ptoEmi(3) + secuencial(9) = 31 chars
        $parteMedia = substr($claveOriginal, 8, 31); // posiciones 8 a 38 inclusive

        // SIEMPRE generar un código numérico aleatorio nuevo para evitar colisiones
        $nuevoCodigoNum = str_pad((string)rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);

        // Base de 48: fecha(8) + parteMedia(31) + codigoNumerico(8) + tipoEmision(1) = 48
        $nuevaSinDigito = $hoyFormato . $parteMedia . $nuevoCodigoNum . '1';

        if (strlen($nuevaSinDigito) !== 48) {
            $nuevaSinDigito = str_pad(substr($nuevaSinDigito, 0, 48), 48, '0');
        }

        $digitoVerificador = calcularModulo11($nuevaSinDigito);
        $nuevaClave = $nuevaSinDigito . $digitoVerificador;

        if ($conn) {
            $sql = "UPDATE {$tabla} SET {$columnaClave} = ? WHERE {$columnaId} = ?";
            $stmt = $conn->prepare($sql);
            if ($stmt) {
                $stmt->bind_param('si', $nuevaClave, $idDocumento);
                $stmt->execute();
                $stmt->close();
            }
        }
        return $nuevaClave;
    }

    return $claveOriginal;
}
?>
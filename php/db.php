<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
        $cleanData = trim((string)$data);

        // Formato 1: iv_hex:encrypted_hex
        if (strpos($cleanData, ':') !== false) {
            list($iv_hex, $encrypted_hex) = explode(':', $cleanData);
            if (ctype_xdigit($iv_hex) && ctype_xdigit($encrypted_hex)) {
                $iv = hex2bin($iv_hex);
                $encrypted = hex2bin($encrypted_hex);
                $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', DB_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
                if ($decrypted !== false && $decrypted !== '') {
                    return trim($decrypted);
                }
            }
        }

        // Formato 2: Base64 directo de (16 bytes IV + ciphertext)
        $base64Candidate = str_replace(' ', '+', $cleanData);
        $decoded = base64_decode($base64Candidate, true);
        if ($decoded !== false && strlen($decoded) > 16) {
            $iv = substr($decoded, 0, 16);
            $encrypted = substr($decoded, 16);
            $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', DB_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
            if ($decrypted !== false && $decrypted !== '') {
                return trim($decrypted);
            }
        }

        return $cleanData;
    } catch (Exception $e) {
        return $data;
    }
}

function obtenerCredencialesDb($isLocal)
{
    $tenantIntentado = false;
    $cacheDir = __DIR__ . '/tmp/tenants/';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }

    $tId = $_GET['tenantId'] ?? $_POST['tenantId'] ?? $_GET['tenant_id'] ?? $_POST['tenant_id'] ?? $_COOKIE['tenantId'] ?? $_COOKIE['tenant_id'] ?? $_SESSION['tenantId'] ?? $_SESSION['tenant_id'] ?? null;

    if (!empty($tId)) {
        $tenantIntentado = true;
        $cacheFile = $cacheDir . 'tenant_' . md5($tId) . '.json';

        // 1. Revisar caché en disco (válido por 1 hora)
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 3600)) {
            $cached = @json_decode(file_get_contents($cacheFile), true);
            if ($cached && !empty($cached['db_name'])) {
                $dbHost = $cached['db_host'];
                $dbUser = $cached['db_user'];
                $dbPass = $cached['db_pass'];
                $dbName = $cached['db_name'];

                $_SESSION['db_host'] = $dbHost;
                $_SESSION['db_user'] = $dbUser;
                $_SESSION['db_pass'] = $dbPass;
                $_SESSION['db_name'] = $dbName;
                $_SESSION['tenantId'] = $tId;

                $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
                $finalHost = $dbHost ?: 'localhost';
                if ($isLocal && ($finalHost === 'localhost' || $finalHost === '127.0.0.1') && !empty($dbUser) && $dbUser !== 'root') {
                    $finalHost = $remoteHost;
                }

                return [
                    $finalHost,
                    $dbUser ?: ($isLocal ? 'root' : ''),
                    $dbPass ?: '',
                    $dbName,
                    'AuthService tenantId=' . $tId . ' (Caché Disco)'
                ];
            }
        }

        $authUrl = $isLocal ? 'http://localhost:4000' : 'https://usuarioeasys.easysplus.com';
        $endpoint = "{$authUrl}/auth/tenant-db/{$tId}";
        
        $json = null;

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            $json = curl_exec($ch);
            curl_close($ch);
        }
        
        if (!$json) {
            $ctx = stream_context_create([
                "ssl" => ["verify_peer" => false, "verify_peer_name" => false],
                "http" => ["timeout" => 1.5]
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

                // Guardar en caché disco y sesión
                if ($dbName) {
                    @file_put_contents($cacheFile, json_encode([
                        'db_host' => $dbHost,
                        'db_user' => $dbUser,
                        'db_pass' => $dbPass,
                        'db_name' => $dbName
                    ]));

                    $_SESSION['db_host'] = $dbHost;
                    $_SESSION['db_user'] = $dbUser;
                    $_SESSION['db_pass'] = $dbPass;
                    $_SESSION['db_name'] = $dbName;
                    $_SESSION['tenantId'] = $tId;
                }

                $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
                $finalHost = $dbHost ?: 'localhost';
                if ($isLocal && ($finalHost === 'localhost' || $finalHost === '127.0.0.1') && !empty($dbUser) && $dbUser !== 'root') {
                    $finalHost = $remoteHost;
                }

                return [
                    $finalHost,
                    $dbUser ?: ($isLocal ? 'root' : ''),
                    $dbPass ?: '',
                    $dbName,
                    'AuthService tenantId=' . $tId
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
        $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
        $finalHost = $sessionDbHost ?: 'localhost';
        if ($isLocal && ($finalHost === 'localhost' || $finalHost === '127.0.0.1') && !empty($sessionDbUser) && $sessionDbUser !== 'root') {
            $finalHost = $remoteHost;
        }
        return [
            $finalHost,
            $sessionDbUser ?: ($isLocal ? 'root' : ''),
            $sessionDbPass ?: '',
            $sessionDbName,
            'sesión ($_SESSION)'
        ];
    }

    if (isset($_GET['db_name']) && !empty($_GET['db_name'])) {
        $decHost = decrypt_db_data($_GET['db_host'] ?? 'localhost');
        $decUser = decrypt_db_data($_GET['db_user'] ?? ($isLocal ? 'root' : ''));
        $decPass = decrypt_db_data($_GET['db_pass'] ?? '');
        $decName = decrypt_db_data($_GET['db_name']);

        $_SESSION['db_host'] = $decHost;
        $_SESSION['db_user'] = $decUser;
        $_SESSION['db_pass'] = $decPass;
        $_SESSION['db_name'] = $decName;

        $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
        $finalHost = $decHost ?: 'localhost';
        if ($isLocal && ($finalHost === 'localhost' || $finalHost === '127.0.0.1') && !empty($decUser) && $decUser !== 'root') {
            $finalHost = $remoteHost;
        }
        return [
            $finalHost,
            $decUser ?: ($isLocal ? 'root' : ''),
            $decPass ?: '',
            $decName,
            'GET (?db_name)'
        ];
    }

    if (isset($_POST['db_name']) && !empty($_POST['db_name'])) {
        $decHost = decrypt_db_data($_POST['db_host'] ?? 'localhost');
        $decUser = decrypt_db_data($_POST['db_user'] ?? ($isLocal ? 'root' : ''));
        $decPass = decrypt_db_data($_POST['db_pass'] ?? '');
        $decName = decrypt_db_data($_POST['db_name']);

        $_SESSION['db_host'] = $decHost;
        $_SESSION['db_user'] = $decUser;
        $_SESSION['db_pass'] = $decPass;
        $_SESSION['db_name'] = $decName;

        $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
        $finalHost = $decHost ?: 'localhost';
        if ($isLocal && ($finalHost === 'localhost' || $finalHost === '127.0.0.1') && !empty($decUser) && $decUser !== 'root') {
            $finalHost = $remoteHost;
        }
        return [
            $finalHost,
            $decUser ?: ($isLocal ? 'root' : ''),
            $decPass ?: '',
            $decName,
            'POST (db_name)'
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

    $origen = 'variables de entorno';

    // Si en producción no hay usuario/db definidos en variables de entorno, obtener por defecto las del Tenant #1 desde AuthService
    if (!$isLocal && (empty($db_user) || empty($db_name))) {
        $defaultCacheFile = $cacheDir . 'tenant_default.json';
        if (file_exists($defaultCacheFile) && (time() - filemtime($defaultCacheFile) < 3600)) {
            $cachedDefault = @json_decode(file_get_contents($defaultCacheFile), true);
            if ($cachedDefault && !empty($cachedDefault['db_name'])) {
                $db_host = $cachedDefault['db_host'] ?: ($db_host ?: 'localhost');
                $db_user = $cachedDefault['db_user'] ?: $db_user;
                $db_pass = $cachedDefault['db_pass'] ?: $db_pass;
                $db_name = $cachedDefault['db_name'] ?: $db_name;
                $origen = 'variables de entorno + tenant #1 (Caché Disco)';
            }
        } else {
            $authUrl = 'https://usuarioeasys.easysplus.com';
            $endpoint = "{$authUrl}/auth/tenant-db/1";
            $json = null;

            if (function_exists('curl_init')) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $endpoint);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 2);
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                $json = curl_exec($ch);
                curl_close($ch);
            }

            if (!$json) {
                $ctx = stream_context_create([
                    "ssl" => ["verify_peer" => false, "verify_peer_name" => false],
                    "http" => ["timeout" => 1.5]
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
                    $origen = 'variables de entorno + tenant #1 (AuthService)';

                    if ($db_name) {
                        @file_put_contents($defaultCacheFile, json_encode([
                            'db_host' => $db_host,
                            'db_user' => $db_user,
                            'db_pass' => $db_pass,
                            'db_name' => $db_name
                        ]));
                    }
                }
            }
        }
    }

    if ($tenantIntentado) {
        $origen = 'tenantId falló la API → ' . $origen;
    }

    if ($db_name) {
        $_SESSION['db_host'] = $db_host;
        $_SESSION['db_user'] = $db_user;
        $_SESSION['db_pass'] = $db_pass;
        $_SESSION['db_name'] = $db_name;
    }

    $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
    if ($isLocal && ($db_host === 'localhost' || $db_host === '127.0.0.1') && !empty($db_user) && $db_user !== 'root') {
        $db_host = $remoteHost;
    }

    return [$db_host, $db_user, $db_pass, $db_name, $origen];
}

function conexion()
{
    if (function_exists('mysqli_report')) {
        mysqli_report(MYSQLI_REPORT_OFF);
    }

    $rawHost = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost');
    $hostOnly = strtolower(trim(explode(':', $rawHost)[0]));
    $isLocal = ($hostOnly === 'localhost' || $hostOnly === '127.0.0.1' || $hostOnly === '::1' || substr($hostOnly, -5) === '.test' || substr($hostOnly, -6) === '.local');

    list($db_host, $db_user, $db_pass, $db_name, $origen) = obtenerCredencialesDb($isLocal);

    $conn = false;
    try {
        $conn = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);
    } catch (Throwable $e) {
        $conn = false;
    }

    if (!$conn && ($db_host === 'localhost' || $db_host === '127.0.0.1') && !empty($db_user) && $db_user !== 'root') {
        $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
        try {
            $conn = @mysqli_connect($remoteHost, $db_user, $db_pass, $db_name);
            if ($conn) {
                $db_host = $remoteHost;
            }
        } catch (Throwable $e) {
            $conn = false;
        }
    }

    // Fallback con credenciales remotas estándar si la conexión a localhost o tenant falló
    if (!$conn) {
        $remoteHost = getenv('REMOTE_DB_HOST') ?: '216.225.204.245';
        $remoteUser = getenv('REMOTE_DB_USER') ?: 'adminroot';
        $remotePass = getenv('REMOTE_DB_PASSWORD') ?: 'Latacunga14';
        $targetDb = !empty($db_name) ? $db_name : (getenv('REMOTE_DB_NAME') ?: 'flotapelileo_produccion');
        try {
            $conn = @mysqli_connect($remoteHost, $remoteUser, $remotePass, $targetDb);
            if ($conn) {
                $db_host = $remoteHost;
                $db_user = $remoteUser;
                $db_name = $targetDb;
            }
        } catch (Throwable $e) {
            $conn = false;
        }
    }

    if (!$conn) {
        // Si la conexión falló con credenciales guardadas en la sesión, limpiar y reintentar
        if (!empty($_SESSION['db_name']) || !empty($_SESSION['db_user'])) {
            unset($_SESSION['db_host'], $_SESSION['db_user'], $_SESSION['db_pass'], $_SESSION['db_name']);
            list($db_host, $db_user, $db_pass, $db_name, $origen) = obtenerCredencialesDb($isLocal);
            try {
                $conn = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);
            } catch (Throwable $e) {
                $conn = false;
            }
        }
    }

    if (!$conn) {
        $err = mysqli_connect_error() ?: 'No se pudo establecer conexión con el servidor MySQL';
        $errNo = mysqli_connect_errno() ?: 0;
        error_log("DB Connection Error ({$errNo}): " . $err);
        die("Error conectando a BD para generar PDF: " . $err . " | Host: '{$db_host}', User: '{$db_user}', DB: '{$db_name}'");
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
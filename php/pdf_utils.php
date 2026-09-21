<?php
/**
 * Utilidades para generación de PDFs con TCPDF
 */

// Aumentar límite de memoria para generación de PDFs y procesamiento de imágenes
@ini_set('memory_limit', '512M');

/**
 * Valida si un archivo en disco es una imagen legible y válida para TCPDF usando getimagesize.
 * Si el archivo está vacío, corrupto o es una respuesta de error HTML, lo elimina automáticamente.
 *
 * @param string|null $ruta
 * @return bool
 */
function esImagenValidaParaTcpdf($ruta)
{
    if (empty($ruta) || !@file_exists($ruta) || @filesize($ruta) < 100) {
        if (!empty($ruta) && @file_exists($ruta)) {
            @unlink($ruta);
        }
        return false;
    }
    $info = @getimagesize($ruta);
    if ($info === false || empty($info[0]) || empty($info[1])) {
        @unlink($ruta);
        return false;
    }
    return true;
}

/**
 * Obtiene la ruta del logo de la empresa para TCPDF.
 * Soporta:
 *  - Rutas relativas en el backend (ej. /uploads/empresa/logo.webp)
 *  - URLs HTTP/HTTPS
 *  - Archivos locales .webp, .png, .jpg
 *  - Datos Base64 legacy o BLOBs binarios
 * Convierte automáticamente imágenes (incluyendo WebP) a PNG temporal en tmp/logos/
 * para que TCPDF pueda leerlas sin error "Unable to get the size of the image".
 * 
 * @param mysqli|null $conn Conexión a la base de datos
 * @param string|null $imageData Ruta, URL o contenido base64/binario de la imagen
 * @return string|null Ruta local al archivo PNG temporal o null si no hay imagen válida
 */
function obtenerRutaLogoEmpresa($conn, $imageData = null)
{
    if (empty($imageData)) {
        if (!empty($_COOKIE['empresa_logo'])) {
            $imageData = $_COOKIE['empresa_logo'];
        } else if (!empty($_COOKIE['logo_empresa'])) {
            $imageData = $_COOKIE['logo_empresa'];
        }
    }

    if (empty($imageData) && $conn) {
        $query = "SELECT imagen_empresa FROM empresa LIMIT 1";
        $result = @mysqli_query($conn, $query);
        if ($result && $row = mysqli_fetch_assoc($result)) {
            $imageData = $row['imagen_empresa'];
        }
    }

    if (empty($imageData)) {
        return null;
    }

    $ruta = procesarLogoParaTcpdf($imageData);
    return esImagenValidaParaTcpdf($ruta) ? $ruta : null;
}

/**
 * Procesa cualquier formato de imagen (WebP, PNG, JPG, Base64, URL, archivo local)
 * y devuelve la ruta absoluta a un archivo PNG válido en disco para TCPDF.
 * 
 * @param mixed $imageData
 * @return string|null
 */
function procesarLogoParaTcpdf($imageData)
{
    if (empty($imageData)) {
        return null;
    }

    // Directorio temporal para logos PNG que TCPDF puede leer
    $tempDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($tempDir)) {
        @mkdir($tempDir, 0777, true);
    }

    $rawBinary = null;
    $cacheKey = '';

    // 1. Caso: URL HTTP / HTTPS
    if (is_string($imageData) && (strpos($imageData, 'http://') === 0 || strpos($imageData, 'https://') === 0)) {
        $cacheKey = $imageData;
        $tempPath = $tempDir . 'logo_' . md5($cacheKey) . '.png';
        if (esImagenValidaParaTcpdf($tempPath)) {
            return $tempPath;
        }
        $rawBinary = @file_get_contents($imageData);
    }
    // 2. Caso: Ruta relativa o absoluta de archivo (ej. /uploads/empresa/logo.webp)
    else if (is_string($imageData) && (
        strpos($imageData, '/uploads/') === 0 ||
        strpos($imageData, 'uploads/') === 0 ||
        preg_match('/\.(webp|png|jpg|jpeg|gif)$/i', trim($imageData))
    )) {
        $cleanPath = ltrim(trim($imageData), '/');
        $cacheKey = $cleanPath;
        $tempPath = $tempDir . 'logo_' . md5($cacheKey) . '.png';
        if (esImagenValidaParaTcpdf($tempPath)) {
            return $tempPath;
        }

        // Posibles ubicaciones relativas seguras en el sistema de archivos
        $candidatePaths = [];
        $isWindows = (DIRECTORY_SEPARATOR === '\\');
        
        // Rutas relativas seguras basadas en __DIR__
        $candidatePaths[] = __DIR__ . '/' . $cleanPath;
        $candidatePaths[] = dirname(__DIR__) . '/' . $cleanPath;
        $candidatePaths[] = dirname(__DIR__, 2) . '/Back/' . $cleanPath;
        $candidatePaths[] = dirname(__DIR__, 2) . '/' . $cleanPath;
        if (!empty($_SERVER['DOCUMENT_ROOT'])) {
            $candidatePaths[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/' . $cleanPath;
        }
        if ($isWindows) {
            $candidatePaths[] = 'c:/laragon/www/SistemaFlota/Back/' . $cleanPath;
        }

        foreach ($candidatePaths as $p) {
            if (@file_exists($p) && @is_file($p)) {
                $rawBinary = @file_get_contents($p);
                break;
            }
        }

        // Si no se encontró en disco local, intentar vía HTTP al backend o frontend
        if ($rawBinary === null || $rawBinary === false) {
            $remoteUrls = [];
            
            $backendUrl = $_SESSION['backend_url'] ?? $_COOKIE['backend_url'] ?? getenv('BACKEND_URL') ?? null;
            if ($backendUrl) {
                $remoteUrls[] = rtrim($backendUrl, '/') . '/' . $cleanPath;
            }

            $isLocal = isset($_SERVER['HTTP_HOST']) && (
                $_SERVER['HTTP_HOST'] === 'localhost' || 
                strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0 || 
                strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0
            );

            if ($isLocal) {
                $remoteUrls[] = 'http://localhost:3000/' . $cleanPath;
            }

            // Fallbacks de producción (donde residen las subidas reales de uploads/empresa)
            $remoteUrls[] = 'https://app.easysplus.com/' . $cleanPath;
            $remoteUrls[] = 'https://backpatate.easysplus.com/' . $cleanPath;
            $remoteUrls[] = 'https://easysplus.com/' . $cleanPath;

            foreach ($remoteUrls as $url) {
                if (function_exists('curl_init')) {
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    $resData = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    if ($httpCode === 200 && !empty($resData)) {
                        $rawBinary = $resData;
                        break;
                    }
                } else {
                    $ctx = stream_context_create([
                        "ssl" => ["verify_peer" => false, "verify_peer_name" => false],
                        "http" => ["timeout" => 2, "follow_location" => 1]
                    ]);
                    $resData = @file_get_contents($url, false, $ctx);
                    if (!empty($resData)) {
                        $rawBinary = $resData;
                        break;
                    }
                }
            }
        }
    }
    // 3. Caso: Base64 data URI o Base64 crudo legacy
    else if (is_string($imageData)) {
        $cacheKey = substr($imageData, 0, 100) . strlen($imageData);
        if (strpos($imageData, 'data:image') === 0) {
            $parts = explode(',', $imageData);
            if (count($parts) > 1) {
                $rawBinary = base64_decode($parts[1]);
            }
        } else if (strpos($imageData, 'iVBOR') === 0 || strpos($imageData, '/9j/') === 0 || strpos($imageData, 'R0lG') === 0 || strpos($imageData, 'UklGR') === 0) {
            $rawBinary = base64_decode($imageData);
        } else {
            $rawBinary = $imageData;
        }
    } else {
        $rawBinary = $imageData;
        $cacheKey = md5((string)$imageData);
    }

    if (empty($rawBinary)) {
        return null;
    }

    $isPng = (strlen($rawBinary) >= 8 && substr($rawBinary, 0, 8) === "\x89PNG\r\n\x1a\n");
    $isJpg = (strlen($rawBinary) >= 3 && substr($rawBinary, 0, 3) === "\xFF\xD8\xFF");
    $ext = $isJpg ? '.jpg' : '.png';

    $tempPath = $tempDir . 'logo_' . md5($cacheKey ?: $rawBinary) . $ext;
    if (esImagenValidaParaTcpdf($tempPath)) {
        return $tempPath;
    }

    if ($isPng || $isJpg) {
        // Guardar directamente sin pasar por GD para no consumir memoria descomprimiendo el mapa de bits
        @file_put_contents($tempPath, $rawBinary);
        if (esImagenValidaParaTcpdf($tempPath)) {
            return $tempPath;
        }
    }

    // Si es WebP u otro formato, convertir a PNG usando GD con manejo seguro de memoria
    try {
        $im = @imagecreatefromstring($rawBinary);
        if ($im !== false) {
            imagealphablending($im, false);
            imagesavealpha($im, true);
            $pngPath = $tempDir . 'logo_' . md5($cacheKey ?: $rawBinary) . '.png';
            imagepng($im, $pngPath);
            imagedestroy($im);
            if (esImagenValidaParaTcpdf($pngPath)) {
                return $pngPath;
            }
        }
    } catch (Throwable $t) {
        // En caso de cualquier excepción en GD, ignorar y continuar
    }

    // Fallback: intentar guardar binario directo y validar
    @file_put_contents($tempPath, $rawBinary);
    return esImagenValidaParaTcpdf($tempPath) ? $tempPath : null;
}

/**
 * Limpia logos antiguos si es necesario (opcional)
 */
function limpiarLogosTemporales()
{
    $tempDir = __DIR__ . '/tmp/logos/';
    if (is_dir($tempDir)) {
        $files = glob($tempDir . '*');
        $now = time();
        foreach ($files as $file) {
            if (is_file($file)) {
                if ($now - filemtime($file) >= 86400) { // 24 horas
                    unlink($file);
                }
            }
        }
    }
}

/**
 * Obtiene el ancho de papel en milímetros configurado en la base de datos (ej. 80mm, 72mm, 58mm).
 * 
 * @param mysqli $conn Conexión a la base de datos
 * @param float $defaultAncho Ancho por defecto en mm (ej. 80 o 110)
 * @param string|null $formatoRaw Formato ya consultado previamente (evita query adicional)
 * @return float Ancho en mm
 */
function obtenerAnchoFormatoImpresion($conn, $defaultAncho = 80, $formatoRaw = null)
{
    if ($formatoRaw !== null && $formatoRaw !== '') {
        $raw = trim($formatoRaw);
        $val = floatval(preg_replace('/[^0-9.]/', '', $raw));
        if ($val >= 35 && $val <= 220) {
            return $val;
        }
        return $defaultAncho;
    }

    if ($conn) {
        $query = "SELECT formato_impresion FROM configuracion LIMIT 1";
        $result = @mysqli_query($conn, $query);
        if ($result && $row = mysqli_fetch_assoc($result)) {
            if (!empty($row['formato_impresion'])) {
                $raw = trim($row['formato_impresion']);
                $val = floatval(preg_replace('/[^0-9.]/', '', $raw));
                if ($val >= 35 && $val <= 220) {
                    return $val;
                }
            }
        }
    }
    return $defaultAncho;
}

/**
 * Calcula tipografía, márgenes, dimensiones de logo y estilos adaptativos según el ancho de papel en mm.
 * 
 * @param float $ancho Ancho de papel en mm (ej. 48, 56, 58, 72, 80, 110, 120)
 * @param float $baseAncho Ancho base de referencia para el cálculo proporcional (por defecto 110mm)
 * @return array Métricas y propiedades CSS/TCPDF adaptadas
 */
function obtenerMetricasImpresion($ancho, $baseAncho = 110)
{
    $ancho = floatval($ancho);
    if ($ancho < 35) $ancho = 80;
    if ($ancho > 220) $ancho = 220;

    // Factor amortiguado para evitar fuentes microscópicas en anchos pequeños o gigantes en anchos grandes
    $factor = 1 + (($ancho - $baseAncho) / $baseAncho) * 0.65;
    $factor = max(0.60, min(1.30, $factor));

    // Márgenes dinámicos
    if ($ancho <= 58) {
        $margen_mm = 2;
    } elseif ($ancho <= 80) {
        $margen_mm = 3;
    } else {
        $margen_mm = 5;
    }

    // Dimensiones proporcionales (píxeles / puntos para CSS)
    $font_base_px    = round(10.5 * $factor, 1);
    $font_titulo_px  = round(12.5 * $factor, 1);
    $font_formas_px  = round(13.0 * $factor, 1);
    $font_pequeno_px = round(8.5 * $factor, 1);
    $font_micro_px   = round(7.0 * $factor, 1);

    // Medidas para boletos u hojas en pt
    $font_boleto_base_pt   = round(6.5 * $factor, 1);
    $font_boleto_tit_pt    = round(7.5 * $factor, 1);
    $font_boleto_dest_pt   = round(9.0 * $factor, 1);
    $font_boleto_total_pt  = round(10.0 * $factor, 1);

    $logo_width_px   = round(64 * $factor);
    if ($logo_width_px < 32) $logo_width_px = 32;
    if ($logo_width_px > 80) $logo_width_px = 80;

    $alto_barcode_mm = $ancho <= 58 ? 12 : ($ancho <= 80 ? 15 : 18);
    $ancho_util_mm   = max(10, $ancho - ($margen_mm * 2));

    // Tipografías para TCPDF directo (pt)
    $font_tcpdf_base = round(8.0 * $factor, 1);
    $font_tcpdf_bold = round(10.5 * $factor, 1);
    $font_tcpdf_sub  = round(7.0 * $factor, 1);

    return [
        'ancho'                 => $ancho,
        'factor'                => $factor,
        'margen_mm'             => $margen_mm,
        'ancho_util_mm'         => $ancho_util_mm,
        'logo_width_px'         => $logo_width_px,
        'font_base_px'          => $font_base_px,
        'font_titulo_px'        => $font_titulo_px,
        'font_formas_px'        => $font_formas_px,
        'font_pequeno_px'       => $font_pequeno_px,
        'font_micro_px'         => $font_micro_px,
        'font_boleto_base_pt'   => $font_boleto_base_pt,
        'font_boleto_tit_pt'    => $font_boleto_tit_pt,
        'font_boleto_dest_pt'   => $font_boleto_dest_pt,
        'font_boleto_total_pt'  => $font_boleto_total_pt,
        'font_tcpdf_base'       => $font_tcpdf_base,
        'font_tcpdf_bold'       => $font_tcpdf_bold,
        'font_tcpdf_sub'        => $font_tcpdf_sub,
        'alto_barcode_mm'       => $alto_barcode_mm,
    ];
}
?>
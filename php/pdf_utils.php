<?php
/**
 * Utilidades para generación de PDFs con TCPDF
 */

/**
 * Obtiene la ruta del logo de la empresa.
 * Si la imagen está en la base de datos como BLOB, crea un archivo temporal
 * para que TCPDF pueda leerlo correctamente y evitar el error "Unable to get the size of the image".
 * 
 * @param mysqli $conn Conexión a la base de datos
 * @return string|null Ruta al archivo de imagen o null si no hay imagen
 */
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
 * @return string|null Ruta local al archivo PNG temporal o null si no hay imagen
 */
function obtenerRutaLogoEmpresa($conn, $imageData = null)
{
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
        if (file_exists($tempPath) && filesize($tempPath) > 0) {
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
        if (file_exists($tempPath) && filesize($tempPath) > 0) {
            return $tempPath;
        }

        // Posibles ubicaciones en el sistema de archivos local
        $candidatePaths = [
            dirname(__DIR__, 2) . '/Back/' . $cleanPath,
            dirname(__DIR__, 2) . '/' . $cleanPath,
            __DIR__ . '/../../Back/' . $cleanPath,
            __DIR__ . '/' . $cleanPath,
            'c:/laragon/www/SistemaFlota/Back/' . $cleanPath,
            $imageData
        ];

        foreach ($candidatePaths as $p) {
            if (file_exists($p) && is_file($p)) {
                $rawBinary = @file_get_contents($p);
                break;
            }
        }

        // Si no se encontró en disco local, intentar vía HTTP al backend
        if ($rawBinary === null) {
            $backendUrl = $_SESSION['backend_url'] ?? $_COOKIE['backend_url'] ?? getenv('BACKEND_URL') ?? null;
            if (!$backendUrl && file_exists(__DIR__ . '/db.php')) {
                $backendUrl = (isset($_SERVER['HTTP_HOST']) && ($_SERVER['HTTP_HOST'] === 'localhost' || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0))
                    ? 'http://localhost:3000'
                    : '';
            }
            if ($backendUrl) {
                $fullUrl = rtrim($backendUrl, '/') . '/' . $cleanPath;
                $rawBinary = @file_get_contents($fullUrl);
            }
        }
    }
    // 3. Caso: Base64 data URI o Base64 crudo legacy
    else if (is_string($imageData)) {
        $cacheKey = substr($imageData, 0, 100) . strlen($imageData);
        $tempPath = $tempDir . 'logo_' . md5($cacheKey) . '.png';
        if (file_exists($tempPath) && filesize($tempPath) > 0) {
            return $tempPath;
        }

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

    $tempPath = $tempDir . 'logo_' . md5($cacheKey ?: $rawBinary) . '.png';
    if (file_exists($tempPath) && filesize($tempPath) > 0) {
        return $tempPath;
    }

    // Convertir a PNG usando GD para que TCPDF lo maneje sin problemas
    $im = @imagecreatefromstring($rawBinary);
    if ($im !== false) {
        imagealphablending($im, false);
        imagesavealpha($im, true);
        imagepng($im, $tempPath);
        imagedestroy($im);
        return $tempPath;
    }

    // Fallback: guardar binario directo
    @file_put_contents($tempPath, $rawBinary);
    return $tempPath;
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
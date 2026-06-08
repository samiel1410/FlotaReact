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
function obtenerRutaLogoEmpresa($conn)
{
    $query = "SELECT imagen_empresa FROM empresa LIMIT 1";
    $result = mysqli_query($conn, $query);
    if ($result && $row = mysqli_fetch_assoc($result)) {
        if (!empty($row['imagen_empresa'])) {
            $imageData = $row['imagen_empresa'];

            // Directorio temporal
            $tempDir = __DIR__ . '/tmp/logos/';
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0777, true);
            }

            // Nombre de archivo basado en el contenido para evitar recrearlo innecesariamente
            $hash = md5($imageData);
            $tempPath = $tempDir . 'logo_' . $hash . '.png';

            // Si los datos tienen el prefijo data:image, lo extraemos
            if (is_string($imageData) && strpos($imageData, 'data:image') === 0) {
                $parts = explode(',', $imageData);
                if (count($parts) > 1) {
                    $imageData = base64_decode($parts[1]);
                }
            } else if (is_string($imageData) && strpos($imageData, 'iVBOR') === 0) {
                $imageData = base64_decode($imageData);
            }

            if (!file_exists($tempPath)) {
                // Limpiar prefijo data:image si existe
                if (is_string($imageData) && strpos($imageData, 'data:image') === 0) {
                    $parts = explode(',', $imageData);
                    if (count($parts) > 1) {
                        $imageData = base64_decode($parts[1]);
                    }
                } else if (is_string($imageData) && (strpos($imageData, 'iVBOR') === 0 || strpos($imageData, '/9j/') === 0 || strpos($imageData, 'R0lG') === 0)) {
                    $imageData = base64_decode($imageData);
                }

                // Intentar crear la imagen con GD para asegurar que es un PNG válido
                $im = @imagecreatefromstring($imageData);
                if ($im !== false) {
                    imagepng($im, $tempPath);
                    imagedestroy($im);
                } else {
                    // Fallback por si acaso es binario puro pero GD no pudo leerlo
                    file_put_contents($tempPath, $imageData);
                }
            }

            return $tempPath;
        }
    }
    return null;
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
?>
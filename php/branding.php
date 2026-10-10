<?php

/**
 * Branding de la aplicación (lado PHP).
 *
 * Lee el MISMO archivo que el frontend: `FrontReact/branding.json`.
 * Cambie el nombre una sola vez ahí y se aplica en toda la interfaz y en los
 * PDFs (facturas, reportes) sin tocar más archivos.
 *
 * Uso:
 *   require_once __DIR__ . '/branding.php';
 *   $pdf->Cell(0, 4, brand_name() . ' - ' . brand_tagline(), 0, 1, 'C');
 */

if (!function_exists('brand_config')) {
    /**
     * Devuelve la configuración de marca. Se cachea en memoria por request.
     */
    function brand_config(): array
    {
        static $config = null;

        if ($config !== null) {
            return $config;
        }

        $defaults = [
            'name' => 'Nexusplus',
            'legalName' => 'Nexusplus Solutions',
            'productTitle' => 'Sistema de Gestión',
            'tagline' => 'Sistema de facturación electrónica',
            'logo' => '/images/transpaeasy.png',
            'logoIcon' => '/images/transpaeasy_icon.png',
            'logoFile' => 'transpaeasy.png',
            'logoIconFile' => 'transpaeasy_icon.png',
            'mobileAppLabel' => 'Nexusplus',
        ];

        // __DIR__ = FrontReact/php  →  branding.json está en FrontReact/
        $rutas = [
            dirname(__DIR__) . '/branding.json',
            __DIR__ . '/branding.json',
        ];

        $config = $defaults;
        foreach ($rutas as $ruta) {
            if (!is_file($ruta) || !is_readable($ruta)) {
                continue;
            }
            $json = json_decode((string) file_get_contents($ruta), true);
            if (is_array($json)) {
                // Sólo se toman las claves conocidas (ignora comentarios como _instrucciones)
                $config = array_merge($defaults, array_intersect_key($json, $defaults));
            }
            break;
        }

        return $config;
    }
}

if (!function_exists('brand_name')) {
    /** Nombre visible de la marca (ej. "Nexusplus"). */
    function brand_name(): string
    {
        return (string) (brand_config()['name'] ?? '');
    }
}

if (!function_exists('brand_name_upper')) {
    /** Nombre de la marca en mayúsculas (ej. "NEXUSPLUS"). */
    function brand_name_upper(): string
    {
        $name = brand_name();
        return function_exists('mb_strtoupper') ? mb_strtoupper($name, 'UTF-8') : strtoupper($name);
    }
}

if (!function_exists('brand_legal_name')) {
    /** Razón social para avisos legales (ej. "Nexusplus Solutions"). */
    function brand_legal_name(): string
    {
        return (string) (brand_config()['legalName'] ?? '');
    }
}

if (!function_exists('brand_product_title')) {
    /** Encabezado del panel (ej. "Sistema de Gestión"). */
    function brand_product_title(): string
    {
        return (string) (brand_config()['productTitle'] ?? '');
    }
}

if (!function_exists('brand_tagline')) {
    /** Descripción corta usada en los PDFs. */
    function brand_tagline(): string
    {
        return (string) (brand_config()['tagline'] ?? '');
    }
}

if (!function_exists('brand_logo_file')) {
    /** Nombre del archivo del logo horizontal (para rutas de filesystem). */
    function brand_logo_file(): string
    {
        return basename((string) (brand_config()['logoFile'] ?? ''));
    }
}

if (!function_exists('brand_logo_icon_file')) {
    /** Nombre del archivo del ícono/logo cuadrado (para rutas de filesystem). */
    function brand_logo_icon_file(): string
    {
        return basename((string) (brand_config()['logoIconFile'] ?? ''));
    }
}

if (!function_exists('brand_logo_icon_paths')) {
    /**
     * Rutas candidatas del ícono del logo, en orden de búsqueda.
     * Devuelve las rutas existentes primero, conservando el resto como respaldo.
     */
    function brand_logo_icon_paths(): array
    {
        $file = brand_logo_icon_file();
        $paths = [
            __DIR__ . '/images/' . $file,
            __DIR__ . '/public/images/' . $file,
            dirname(__DIR__) . '/public/images/' . $file,
            dirname(__DIR__) . '/images/' . $file,
        ];

        usort($paths, static function ($a, $b) {
            return (int) is_file($b) <=> (int) is_file($a);
        });

        return $paths;
    }
}

if (!function_exists('brand_logo_paths')) {
    /**
     * Rutas candidatas del logo horizontal, en orden de búsqueda.
     */
    function brand_logo_paths(): array
    {
        $file = brand_logo_file();
        $paths = [
            __DIR__ . '/images/' . $file,
            __DIR__ . '/public/images/' . $file,
            dirname(__DIR__) . '/public/images/' . $file,
            dirname(__DIR__) . '/images/' . $file,
        ];

        usort($paths, static function ($a, $b) {
            return (int) is_file($b) <=> (int) is_file($a);
        });

        return $paths;
    }
}

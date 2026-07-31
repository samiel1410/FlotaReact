<?php
// SPA fallback: sirve index.html para cualquier ruta que no sea un archivo real
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$file = __DIR__ . $path;
if ($path !== '/' && is_file($file)) {
    return false;
}
include __DIR__ . '/index.html';

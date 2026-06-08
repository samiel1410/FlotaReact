<?php
require __DIR__ . '/vendor/autoload.php'; // Incluye el autoloader de Composer

use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use Mike42\Escpos\CapabilityProfile;
use Mike42\Escpos\ImagickEscposImage;

try {
    // Enter the share name for your USB printer here
    $connector = new WindowsPrintConnector("POS-80"); // Reemplaza "impresora_usb" con el nombre de tu impresora USB en Windows
    
    // Inicializar la impresora
    $printer = new Printer($connector);

    // Imprimir el archivo PDF
    $pdfFilePath = 'despacho.pdf';
    $pdfContent = file_get_contents($pdfFilePath);
    $printer->text($pdfContent);

    // Cortar el papel (solo si la impresora es de corte automático)
    $printer->cut();

    // Cerrar la conexión
    $printer->close();

    echo "El archivo PDF se ha enviado a la impresora USB.";
} catch(Exception $e) {
    echo "Couldn't print to this printer: " . $e -> getMessage() . "\n";
}

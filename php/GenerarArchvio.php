<?php
require_once('library/tcpdf.php');
require_once("db.php");
//include "barcode.php";

try {
  $fecha_actual = date('H:i:s');
  $contenido = $_POST['contenido'];
  $nombre = $_POST['nombre'];

  $tipoA4 = $_POST['tipoA4'];
  $tipoAux = $_POST['tipoAux'];

  // create new PDF document
  $pdf = new TCPDF('P', 'mm', array(200, 350), true, 'UTF-8');








  // Eliminar la coma y el espacio extra al final

  $html = $contenido;

  // set document information

  // Print text using writeHTMLCell()




  // set default monospaced font


  // set auto page breaks


  // set some language-dependent strings (optional)

  // ---------------------------------------------------------

  $pdf->SetFont('helvetica', '', 10);

  // add a page
  if ($tipoA4 == 'si') {


    if ($tipoAux == "si") {
      $pdf->AddPage('L', 'A4');
    } else {
      $pdf->AddPage('P', 'A4');
    }
  } else {

    $pdf->AddPage('P', array(100, 250));
  }







  // Add a page

  // Write HTML content

  $pdf->writeHTML($html, true, false, true, false, '');


  // Output PDF

  $tempDir = __DIR__ . '/tmp/';
  $fileName = $nombre . '.pdf';
  $fullPath = $tempDir . $fileName;
  $pdf->Output($fullPath, 'F');
  $array = array(
    "ruta" => $fileName,
    "success" => true,
    "borrar" => $fullPath,
  );
  echo json_encode($array);

} catch (Exception $e) {
  $array = array(
    "error" => $e,
    "success" => false,

  );

  echo json_encode($array);
}



// Guardar el archivo en el servidor


// Limpiar el búfer de salida





//============================================================+
// END OF FILE
//============================================================+


?>
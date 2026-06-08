
<?php
require_once('library/tcpdf.php');
require_once ("db.php");
//include "barcode.php";

try {

  $ruta = $_GET['ruta'];






// Add a page

// Write HTML content

If (unlink($ruta)) {

    $array = array(
        
         "success" => true,
       
         
      );
     
  
  } else {
  
    $array = array(
        
        "success" => false,
      
        
     );
    
    // there was a problem deleting the file
  
  }
  


 echo json_encode($array);

}catch(Exception $e){
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
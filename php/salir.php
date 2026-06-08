<?php
if(!isset($_SESSION)){
    session_start();

	
}
require_once('library/tcpdf.php');
require_once ("db.php");


try 
{
  

    session_destroy();


    $array = array(
        "success" => true,
        
    );
    
   

   

}
catch(Exception $e){
  $array = array(
    "error" => $e->getMessage(),
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
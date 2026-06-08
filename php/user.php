<?php

    session_start();

	

require_once('library/tcpdf.php');
require_once ("db.php");


try 
{
  
   

    if(isset($_SESSION["id_usuario"]))
    {
        $data['id_usuario']=  $_SESSION["id_usuario"];
    $data['punto_emision_sucursal']= $_SESSION["punto_emision_sucursal"];
    $data['punto_emision_usuario']= $_SESSION["punto_emision_usuario"];
    $data['id_oficina']= $_SESSION["id_oficina"];
    $data['nombre_usuario']= $_SESSION["nombre_usuario"];
    $data['rol_usuario']= $_SESSION["rol_usuario"];
    $data['id_fksucursal']= $_SESSION["id_fksucursal"];




    $array = array(
        "data" => $data,
        "success" => true,
        
    );
    
    echo json_encode($array);

        
    }else{

        $array = array(
          
            "success" => false,
            
        );
        
        echo json_encode($array);
    
    }

    
   

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
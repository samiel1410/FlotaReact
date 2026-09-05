<?php
if(!isset($_SESSION)){
    session_start();

	
}
require_once ("db.php");


try 
{
    $_SESSION = array();
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();

    $array = array(
        "success" => true,
        "message" => "Sesión cerrada correctamente"
    );
    echo json_encode($array);
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
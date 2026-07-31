<?php
require_once('library/tcpdf.php');
require_once("db.php");
//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
    $fecha_actual = date('d-m-yy H:i:s');
    $id_usuario = $_GET['id_usuario'];
    $id_guia = $_GET['id_guia'];


    // create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);
    $conn = conexion();

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa WHERE 1";
    $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
    $vals_empresa = mysqli_fetch_array($recuperar_empresa);

    $id_empresa = $vals_empresa["id_empresa"];
    $imagen_empresa = $vals_empresa["imagen_empresa"];
    $telefono_empresa = $vals_empresa["telefono_empresa"];
    $correo_empresa = $vals_empresa["correo_empresa"];
    $ruc_empresa = $vals_empresa["ruc_empresa"];
    $direccion_empresa = $vals_empresa["direccion_empresa"];
    $razon_social_empresa = $vals_empresa["razon_social_empresa"];

    $sql_verificar = "SELECT 
    ge.numero_guia_guias_entregadas,
    ge.ruc_destinatario_guias_entregadas,
    ge.nombre_destinatario_guias_entregadas,
    ge.punto_emision_guia_guias_entregadas,
    ge.punto_emision_sucursal_guias_entregadas,
    ge.fecha_hora_entrega,
    u.nombre_usuario,
    u.apellido_usuario
FROM 
    guias_entregadas ge
LEFT JOIN 
    usuario u ON ge.id_usuario_entrego = u.id_usuario
WHERE 
    ge.id_fkguia_guias_entregadas = $id_guia; ";




    //BUSQUEDA CONTENIDO
    $query_contenido = "SELECT contenido_guia,cantidad_detalle_guia FROM detalle_guia_nota_venta WHERE id_fkguia_detalle_envio =  $id_guia";


    $recuperar_contenido = mysqli_query($conn, $query_contenido) or die(mysqli_error($conn));

    $datos = "";

    while ($vals_detalles = mysqli_fetch_array($recuperar_contenido)) {

        $tabla = '
  <tr> 
  <td style="border: solid 1px #aaa999;height: 20px;width:20px;"> ' . $vals_detalles['cantidad_detalle_guia'] . '</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:250px;"> ' . $vals_detalles['contenido_guia'] . '</td>
      
    
  </tr>
  ';


        $datos .= $tabla;



    }


    $recuperar_guia = mysqli_query($conn, $sql_verificar) or die(mysqli_error($conn));
    $vals_guia = mysqli_fetch_array($recuperar_guia);

    $id_guia = $vals_guia["id_fkguia_guias_entregadas"];

    $resultado = sprintf("%09s", $vals_guia["numero_guia_guias_entregadas"]);
    $punto_emision_guia = $vals_guia["punto_emision_guia_guias_entregadas"];
    $punto_emision_sucursal = $vals_guia["punto_emision_sucursal_guias_entregadas"];

    $fecha_hora_entrega = $vals_guia["fecha_hora_entrega"];
    $cliente = $vals_guia["nombre_destinatario_guias_entregadas"];
    $cedual_cliente = $vals_guia["ruc_destinatario_guias_entregadas"];
    $usuario_entrego = $vals_guia["nombre_usuario"] . ' ' . $vals_guia["apellido_usuario"];

    $sql_odicinista = "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario ";

    $recuperar_oficinista = mysqli_query($conn, $sql_odicinista) or die(mysqli_error($conn));
    $vals_oficina = mysqli_fetch_array($recuperar_oficinista);

    $nombre_usuario = $vals_oficina["nombre_usuario"];
    $apellido_usuario = $vals_oficina["apellido_usuario"];

    $numero_guia = $punto_emision_sucursal . '-' . $punto_emision_guia . '-' . $resultado;

    $query_ubicacion = "SELECT lugar_destino FROM destino,usuario WHERE id_fkdestino_usuario =  id_destino AND id_usuario= $id_usuario";
    $recuperar_ubicacion = mysqli_query($conn, $query_ubicacion) or die(mysqli_error($conn));
    $vals_ubicacion = mysqli_fetch_array($recuperar_ubicacion);
    $ubicacion_usuaurio = $vals_ubicacion['lugar_destino'];





    $html = '
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<style>

.poner_borde{
  width: 50%;
  border: 1px solid black;
}

.center{

  text-align: center;
 
}

.factura{

  font-size:10px;
  font-weight:bold;
  color:gray
}
</style>
<body>

   

    <p class="center">
	 <img width="64px"   class=" center" src="data:image/*;base64,' . $imagen_empresa . '"/><br>
        <strong>' . $razon_social_empresa . '</strong> <br>
        <strong>RUC ' . $ruc_empresa . '</strong> <br>
       
         <span class="center">OFICINA -  ' . $ubicacion_usuaurio . '</span>
    </p>

    <hr>
	<br>

  
        <strong>GUIA ENTREGADA:</strong> ' . $numero_guia . '<br>
        <strong>OFICINISTA:</strong> ' . $nombre_usuario . ' ' . $apellido_usuario . '<br>
        <strong>CLIENTE:</strong> ' . $cliente . '<br>
        <strong>CEDULA:</strong> ' . $cedual_cliente . '<br>
		<strong>FECHA Y HORA ENTREGA:</strong> ' . $fecha_hora_entrega . '<br>
		
    </p>

     <p class="center">
        <strong>CONTENIDO</strong> <br> 

            <table style="width:100%;">
        ' . $datos . '
           </table>
    </p>


    <table style="width:100%;">
        <tr>
            <td style="width:50%;">
                <p class="center">
                    ________________ <br>
                   CLIENTE:' . $cliente . ' <br>
                </p>
            </td>
            <td style="width:50%; text-align: center">
                <p class="center">
                    ________________ <br>
                    RESPONSABLE:' . $usuario_entrego . ' <br>
                </p>
            </td>
        </tr>
        <tr>
            <td style="width:50%;">
                <p>Impreso Por:' . $nombre_usuario . ' ' . $apellido_usuario . '</p>
            </td>
            <td style="width:50%; text-align: center">
                <p>' . $fecha_actual . '</p>
            </td>
        </tr>
    </table>

</body>
</html>
';

    // set document information

    // Print text using writeHTMLCell()




    // set default monospaced font


    // set auto page breaks


    // set some language-dependent strings (optional)

    // ---------------------------------------------------------

    $pdf->SetFont('helvetica', '', 10);

    // add a page
    $pdf->AddPage('P', array(500, 120));






    // Add a page

    // Write HTML content

    $pdf->writeHTML($html, true, false, true, false, '');
    // Output PDF

    $tempDir = __DIR__ . '/tmp/';
    $fileName = 'entregado.pdf';
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

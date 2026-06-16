<?php
require_once('library/tcpdf.php');
require_once("db.php");
//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
  $fecha_actual = date('Y-m-d H:i:s');
  $id_usuario_global = $_GET['id_usuario_global']; //1
  $id_guia = $_GET['id_guia']; //76
  $impresiones = $_GET['impresiones']; //76

  // create new PDF document
  $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

  $conn = conexion();

  // Output PDF





  // create new PDF document



  $query = "SELECT id_guia,nombre_sucursal,punto_emision_sucursal,destino_guia,id_fkusuario_guia,punto_emision_guia,numero_guia,sucursal_guia  FROM guia_nota_venta,sucursal2 WHERE sucursal_guia = suc_codigo_sucursal AND id_guia=  $id_guia";
  $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
  $vals = mysqli_fetch_array($recuperar);


  $suc_codigo_sucursal = $vals["sucursal_guia"];
  $id_guia = $vals["id_guia"];
  $destino_guia = $vals["destino_guia"];
  $query_sucural = "SELECT nombre_sucursal,punto_emision_sucursal FROM sucursal2 WHERE suc_codigo_sucursal = $suc_codigo_sucursal";
  $recuperar_sucursal = mysqli_query($conn, $query_sucural) or die(mysqli_error($conn));
  $vals_sucursal = mysqli_fetch_array($recuperar_sucursal);

  $resultado = sprintf("%09s", $vals['numero_guia']);
  $numero_guia = $vals_sucursal["punto_emision_sucursal"] . '-' . $vals["punto_emision_guia"] . '-' . $resultado;

  //EMPRESA
  $query3 = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa WHERE 1";
  $recuperar3 = mysqli_query($conn, $query3) or die(mysqli_error($conn));
  $vals3 = mysqli_fetch_array($recuperar3);

  $id_empresa = $vals3["id_empresa"];
  //$imagen_empresa = $vals2["imagen_empresa"];
  $telefono_empresa = $vals3["telefono_empresa"];
  $correo_empresa = $vals3["correo_empresa"];
  $ruc_empresa = $vals3["ruc_empresa"];
  $direccion_empresa = $vals3["direccion_empresa"];
  $razon_social_empresa = $vals3["razon_social_empresa"];

  //OFICINA
  $id_usuario = $vals["id_fkusuario_guia"];

  $query4 = "SELECT destino.lugar_destino FROM destino,usuario WHERE destino.id_destino = usuario.id_fkdestino_usuario AND usuario.id_usuario= $id_usuario;";
  $recuperar4 = mysqli_query($conn, $query4) or die(mysqli_error($conn));
  $vals4 = mysqli_fetch_array($recuperar4);

  $lugar_destino = $vals4["lugar_destino"];




  $datos = array(
    'id_guia' => $id_guia,
    'numero_guia' => $numero_guia,
    'destino' => $destino_guia,
  );

  $cadena = '';


  // Eliminar la coma y el espacio extra al final
  $cadena = json_encode($datos);

  //<td class="td_table">  `+  result_detalles[index].punto_emision_sucursal+'-'+result_detalles[index].punto_emision_guia+'-'+resultado + `</td>


  $html1 = '
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

  font-size:18px;
  font-weight:bold;
  color:gray
}

.rojo{
  color:red
}

.titulos{
    font-size: 15px;
    font-weight:bold;
}

.despacho{
    font-size: 15px;
    font-weight:bold;
}

.contenidos{
    font-size: 10px;
}

</style>
<body>


    <p class="titulos center" style="margin: 0px; padding: 0px;">
    <br>
    ' . $razon_social_empresa . ' <br>
    RUC ' . $ruc_empresa . '
    </p>

 

    


    
    
   
    </p>


   
    <p class="center">
    </p>


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
  $pdf->AddPage('P', array(100, 210));




  // Add a page

  // Write HTML content

  $pdf->writeHTML($html1, true, false, true, false, '');

  $style = array(
    'border' => 2,
    'vpadding' => 'auto',
    'hpadding' => 'auto',
    'fgcolor' => array(0, 0, 0),
    'bgcolor' => false, //array(255,255,255)
    'module_width' => 5, // width of a single module in points
    'module_height' => 5 // height of a single module in points
  );

  $pdf->write2DBarcode($cadena, 'QRCODE,Q', 10, 50, 150, 150, $style, 'N');
  $pdf->IncludeJS("print();");

  $tempDir = __DIR__ . '/tmp/';
  $fileName = 'qrNotaVentaPdf.pdf';
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
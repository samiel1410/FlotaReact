<?php
require_once('library/tcpdf.php');
require_once ("db.php");
require 'vendor/autoload.php';
$generator = new Picqer\Barcode\BarcodeGeneratorHTML();

try {
  $estado = $_GET['estado'];

  $desde = $_GET['desde'];
  $hasta = $_GET['hasta'];
  $oficina = $_GET['oficina'];



  if($estado==0){
    $estado="";

  }

  if($oficina=="TODAS"){
    $oficina="";

  }
        // create new PDF document
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);


$conn = conexion();
$query = "SELECT id_guia,subtotal_12_guia,subtotal_0_guia,
total_guia,impuesto_iva_guia,descuento_guia,subtotal_guia, 
sucursal_guia,punto_emision_guia, estado_entregado_guia, 
valor_tarifa_adicional_guia,nombre_sucursal,fecha_guia, 
numero_guia, CONCAT(nombre_usuario,'',apellido_usuario) as usuario,
sucursal.punto_emision_sucursal ,lugar_destino
from guia,usuario,sucursal, destino
WHERE guia.id_fkusuario_guia = usuario.id_usuario 
AND guia.sucursal_guia = sucursal.id_sucursal 
AND destino.lugar_destino = guia.destino_guia  ";

if ($estado != "") {

    $query .= " AND estado_entregado_guia= $estado";
};

if($desde!="" || $hasta!= ""){
    $query .=" AND fecha_guia BETWEEN '$desde' AND '$hasta'";

}
if($oficina!=""){
  $query .=" AND destino.lugar_destino =$oficina";
}
$query .=" GROUP BY id_guia" ;


$recuperar= mysqli_query($conn,$query) or  die(mysqli_error($conn));
$vals = mysqli_fetch_array($recuperar);




//EMPRESA
$query_empresa= "SELECT  id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa";
$recuperar_empresa= mysqli_query($conn,$query_empresa) or  die(mysqli_error($conn));
$vals_empresa = mysqli_fetch_array($recuperar_empresa);
$nombre_empresa=$vals_empresa['razon_social_empresa'];
$direccion_empresa=$vals_empresa['direccion_empresa'];
$ruc_empresa=$vals_empresa['ruc_empresa'];



//DETALLES FACTURA

$datos="";
while ($vals = mysqli_fetch_array($recuperar)) {

    $resultado= sprintf("%09s", $vals['numero_guia']);

    $numero=$vals['punto_emision_sucursal']."-".$vals['punto_emision_guia']."-".$resultado;

    $tipo="";

    if(    $vals['estado_entregado_guia']==1){
        $tipo="NO ENTREGADO";
    }else{
        $tipo=" ENTREGADO";
    }


 
  $tabla ='
  <tr> 
      <td style="border: solid 1px #aaa999;height: 20px;width:110px;"> '.$numero.'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:80px;"> '.$vals['fecha_guia'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:70px;"> '.$vals['nombre_sucursal'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:60px;"> '.$vals['lugar_destino'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:80px;"> '.$vals['usuario'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:60px;"> $'.$vals['total_guia'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:100px;"> '.$tipo.'</td>

    
  </tr>
  ';
  

      $datos .= $tabla;
   



}

$html='
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
  border: 0px solid black;
 

}
.center{

  text-align: center;
 

}
.derecha{

  text-align: right;
 

}

.factura{

  font-size:18px;
  font-weight:bold;
  color:gray
}

.rojo{
  color:red
}
.cliente{
  width: 100%;
  border: 1px solid black;
}



</style>
<body>





<div class="cliente" style="margin: 5px;">
<div class="center">

<b>REPORTE GUIAS ENTREGADAS/NO ENTREGADAS</b>

</div>


</div>




</div>


<div>

<table style="text-align:center;  margin: 30px;">

<tr>
<th  style="border: solid 1px #aaa999;height: 15px; width:110px;"> <b>GUIA</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:80px;">  <b>FECHA</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:70px;">  <b>SUCURSAL</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:60px;">  <b>OFICINA</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:80px;"><b>USUARIO</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:60px;"> <b>TOTAL</b></th>
<th  style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>ENTREGADO</b></th>




   
</tr>

'.$datos.'

</table>


</div>





</body>
</html>
';

// set document information

// Print text using writeHTMLCell()




// set default monospaced font


// set auto page breaks


// set some language-dependent strings (optional)

// ---------------------------------------------------------

// set font
$pdf->SetFont('helvetica', '', 10);

// add a page
$pdf->AddPage();






// Add a page

// Write HTML content

$pdf->writeHTML($html, true, false, true, false, '');



$pdf_file_name = 'guiasEntregadas.pdf';
$pdf->Output($pdf_file_name, 'I');

$array = array(
    "ruta" => $pdf_file_name,
    "success" => true,
    "tipo" => 0,
    "borrar" => __DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . $pdf_file_name,
    
);

echo json_encode($array);


}catch(Exception $e){
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
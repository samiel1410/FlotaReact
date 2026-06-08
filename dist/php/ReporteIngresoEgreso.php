<?php
require_once('library/tcpdf.php');
require_once ("db.php");
require 'vendor/autoload.php';
$generator = new Picqer\Barcode\BarcodeGeneratorHTML();

try {
  $estado = $_GET['estado'];

  $desde = $_GET['desde'];
  $hasta = $_GET['hasta'];
  $nombre_mes = $_GET['nombre_mes'];
  $mes = $_GET['mes'];


  $nombre_anio = $_GET['nombre_anio'];
  $anio = $_GET['anio'];

  if($estado==0){
    $estado="";

  }

  if($mes==0){
    $mes="";

  }
  if($anio==0){
    $anio="";

  }


        // create new PDF document
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);


$conn = conexion();
$query = "SELECT tipo_caja_detalle, monto_caja_detalle,id_caja ,usuario.nombre_usuario, caja_detalle.estado_caja_detalle,caja_detalle.fecha_caja_detalle, caja_detalle.nombre_socio_caja_detalle,caja_detalle.numero_detalle_caja,caja_detalle.numero_documento_caja_detalle,caja_detalle.observacion_caja_detalle, caja.fecha_caja , caja.fecha_hora_cierre FROM caja_detalle,usuario,caja WHERE caja_detalle.id_fkcaja = caja.id_caja AND caja.id_fkusuario_caja = usuario.id_usuario  ";

if ($estado != "") {

    $query .= " AND estado_caja_detalle LIKE '$estado'";
};

if($desde!="" || $hasta!= ""){
    $query .=" AND date(fecha_caja_detalle) BETWEEN '$desde' AND '$hasta'";

}else{

    if($mes !="" ){
        $query .=" AND EXTRACT(MONTH FROM fecha_caja_detalle) ='$mes' ";

    }if($anio !=""){
        $query .=" AND EXTRACT(YEAR FROM fecha_caja_detalle) = '$anio' ";
    }


}




$recuperar= mysqli_query($conn,$query) or  die(mysqli_error($conn));



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

  

 
  $tabla ='
  <tr> 
      <td "width=4%" style="border: solid 1px #aaa999;height: 20px;"> '.$vals['numero_detalle_caja'].'</td>
      <td width="8%"  style="border: solid 1px #aaa999;height: 20px;width:9%;"> '.$vals['tipo_caja_detalle'].'</td>
     <td width="6%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">$'.number_format((float)$vals['monto_caja_detalle'],2).'</td>
    <td width="10%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['nombre_usuario'].'</td>
       <td width="9%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['estado_caja_detalle'].'</td>
          <td width="10%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['fecha_caja_detalle'].'</td>
       <td width="10%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['nombre_socio_caja_detalle'].'</td>
       <td width="6%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['numero_documento_caja_detalle'].'</td>
       <td width="13%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['observacion_caja_detalle'].'</td>
       <td width="7%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['id_caja'].'</td>
           <td width="8%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['fecha_caja'].'</td>
           <td width="10%"  style="border: solid 1px #aaa999;height: 20px;width:9%;">'.$vals['fecha_hora_cierre'].'</td>
    
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

<b>REPORTE EGRESOS/INGRESOS</b>

</div>

 <table>
  <tr>
    <th><b>RUC:</b> '.$ruc_empresa.'</th>
 <th><b>EMPRESA:</b> '.$nombre_empresa.'</th>
   
  </tr>
  <tr>
    <td><b>MES:</b> '.$nombre_mes.'</td>
   <td><b>AÑO:</b> '.$nombre_anio.'</td>
  </tr>

   <tr>
    <td><b>DESDE:</b> '.$desde.'</td>
   <td><b>HASTA:</b> '.$hasta.'</td>
  </tr>
 
</table> 


</div>




</div>


<div>

<table style="text-align:center;  margin: 30px;">

<tr>
<th  width="4%" style="border: solid 1px #aaa999;height: 15px; "> <b>#</b></th>
<th width="8%"  style="border: solid 1px #aaa999;height: 15px; "> <b>TIPO</b></th>
<th width="6%"  style="border: solid 1px #aaa999;height: 15px; "> <b>MONTO</b></th>
<th width="10%" style="border: solid 1px #aaa999;height: 15px; "> <b>USUARIO</b></th>
<th width="9%" style="border: solid 1px #aaa999;height: 15px; "> <b>ESTADO</b></th>
<th width="10%" style="border: solid 1px #aaa999;height: 15px; "> <b>FECHA</b></th>
<th width="10%" style="border: solid 1px #aaa999;height: 15px; "> <b>SOCIO</b></th>



<th width="6%"  style="border: solid 1px #aaa999;height: 15px;"> <b># DOC.</b></th>
<th width="13%"  style="border: solid 1px #aaa999;height: 15px;"> <b>OBSERVACIÓN</b></th>
<th width="7%"   style="border: solid 1px #aaa999;height: 15px;"> <b>#CAJA</b></th>
<th width="8%"   style="border: solid 1px #aaa999;height: 15px; "> <b>FECHA APERTURA</b></th>
<th width="10%"  style="border: solid 1px #aaa999;height: 15px;"> <b>FECHA CIERRE</b></th>





   
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
$pdf->AddPage('L');






// Add a page

// Write HTML content

$pdf->writeHTML($html, true, false, true, false, '');



$pdf->Output($_SERVER['DOCUMENT_ROOT'].'/php/tmp/guiasEntregadas.pdf', 'I');




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
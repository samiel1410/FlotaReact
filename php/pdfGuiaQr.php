<?php
require_once('library/tcpdf.php');
require_once ("db.php");
//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
  $fecha_actual = date('Y-m-d H:i:s');
  $id_usuario_global = $_GET['id_usuario_global']; //1
  $id_guia = $_GET['id_guia']; //76
 $impresiones = $_GET['impresiones']; //76

        // create new PDF document
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500,200) , true, 'UTF-8', false);

$conn = conexion();
$query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
$recuperar_empresa = mysqli_query($conn,$query_empresa) or die(mysqli_error($conn));
$vals_empresa = mysqli_fetch_assoc($recuperar_empresa);

$id_empresa = isset($vals_empresa["id_empresa"]) ? $vals_empresa["id_empresa"] : 0;
$imagen_empresa = isset($vals_empresa["imagen_empresa"]) ? $vals_empresa["imagen_empresa"] : null;
$telefono_empresa = isset($vals_empresa["telefono_empresa"]) ? $vals_empresa["telefono_empresa"] : '';
$correo_empresa = isset($vals_empresa["correo_empresa"]) ? $vals_empresa["correo_empresa"] : '';
$ruc_empresa = isset($vals_empresa["ruc_empresa"]) ? $vals_empresa["ruc_empresa"] : '';
$direccion_empresa = isset($vals_empresa["direccion_empresa"]) ? $vals_empresa["direccion_empresa"] : '';
$razon_social_empresa = isset($vals_empresa["razon_social_empresa"]) ? $vals_empresa["razon_social_empresa"] : '';

$query_guia = "SELECT 
  g.origen_guia, 
  g.destino_guia,
  g.numero_guia,
  s.punto_emision_sucursal,
  g.observacion_guia,
  g.id_fkcompania_asociada,
  g.id_fkusuario_guia,
  UPPER(g.nombre_cliente_remitente) AS nombre_cliente_remitente,
  u.punto_emision_usuario,
  UPPER(g.nombre_cliente_receptor) AS nombre_cliente_receptor,
  g.cedula_cliente_remitente,
  g.cedula_cliente_receptor,
  g.telefono_cliente_emisor,
  g.telefono_cliente_receptor,
  g.subtotal_12_guia,
  g.subtotal_0_guia,
  g.subtotal_guia,
  g.total_guia,
  g.descuento_guia,
  g.valor_tarifa_adicional_guia,
  g.impuesto_iva_guia,
  CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario,
  du.lugar_destino AS ubicacion_usuario
FROM guia g
LEFT JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
LEFT JOIN destino du ON u.id_fkdestino_usuario = du.id_destino
WHERE g.id_guia = $id_guia
LIMIT 1";

$recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
$vals_guia = mysqli_fetch_assoc($recuperar_guia);

$observacion_guia = isset($vals_guia["observacion_guia"]) ? $vals_guia["observacion_guia"] : '';
$origen_guia = isset($vals_guia["origen_guia"]) ? $vals_guia["origen_guia"] : '';
$destino_guia = isset($vals_guia["destino_guia"]) ? $vals_guia["destino_guia"] : '';
$id_usuario_guia = isset($vals_guia["id_fkusuario_guia"]) ? $vals_guia["id_fkusuario_guia"] : 0;
$nombre_cliente_remitente = isset($vals_guia["nombre_cliente_remitente"]) ? $vals_guia["nombre_cliente_remitente"] : '';
$nombre_cliente_receptor = isset($vals_guia["nombre_cliente_receptor"]) ? $vals_guia["nombre_cliente_receptor"] : '';
$cedula_cliente_remitente = isset($vals_guia["cedula_cliente_remitente"]) ? $vals_guia["cedula_cliente_remitente"] : '';
$cedula_cliente_receptor = isset($vals_guia["cedula_cliente_receptor"]) ? $vals_guia["cedula_cliente_receptor"] : '';
$telefono_cliente_emisor = isset($vals_guia["telefono_cliente_emisor"]) ? $vals_guia["telefono_cliente_emisor"] : '';
$telefono_cliente_receptor = isset($vals_guia["telefono_cliente_receptor"]) ? $vals_guia["telefono_cliente_receptor"] : '';
$subtotal_12_guia = isset($vals_guia["subtotal_12_guia"]) ? $vals_guia["subtotal_12_guia"] : 0;
$subtotal_0_guia = number_format((float) (isset($vals_guia["subtotal_0_guia"]) ? $vals_guia["subtotal_0_guia"] : 0));
$subtotal_guia = number_format((float) (isset($vals_guia["subtotal_guia"]) ? $vals_guia["subtotal_guia"] : 0), 2);
$total_guia = (float) (isset($vals_guia["total_guia"]) ? $vals_guia["total_guia"] : 0);
$descuento_guia = isset($vals_guia["descuento_guia"]) ? $vals_guia["descuento_guia"] : 0;
$valor_tarifa_adicional_guia = isset($vals_guia["valor_tarifa_adicional_guia"]) ? $vals_guia["valor_tarifa_adicional_guia"] : 0;
$impuesto_iva_guia = isset($vals_guia["impuesto_iva_guia"]) ? $vals_guia["impuesto_iva_guia"] : 0;
$punto_emision_sucursal_guia = isset($vals_guia["punto_emision_sucursal"]) ? $vals_guia["punto_emision_sucursal"] : '';
$punto_emision_guia = isset($vals_guia["punto_emision_usuario"]) ? $vals_guia["punto_emision_usuario"] : '';
$id_fkcompania_asociada = (int) (isset($vals_guia["id_fkcompania_asociada"]) ? $vals_guia["id_fkcompania_asociada"] : 0);
$usuario = isset($vals_guia["usuario"]) ? $vals_guia["usuario"] : '';
$ubicacion_usuaurio = isset($vals_guia["ubicacion_usuario"]) ? $vals_guia["ubicacion_usuario"] : '';

//COMPANIA ASOCIADA
$nombre_compania = '';
$direccion_compania_asociada = '';
$direccion_exacta = '';
$numero_contacto = '';
if ($id_fkcompania_asociada > 0) {
  $destino_escaped = mysqli_real_escape_string($conn, $destino_guia);
  $query_datos_compania = "SELECT 
    ca.nombre_compania_asociada, 
    d.nombre_destino AS direccion_compania_asociada, 
    d.direccion_exacta, 
    d.numero_contacto 
  FROM compania_asociada ca
  LEFT JOIN destino d ON d.lugar_destino = '$destino_escaped'
  WHERE ca.id_compania_asociada = $id_fkcompania_asociada 
  LIMIT 1";
  $recuperar_detalles_compnai = mysqli_query($conn, $query_datos_compania);
  if ($recuperar_detalles_compnai && $vals_detalle_compania = mysqli_fetch_assoc($recuperar_detalles_compnai)) {
    $nombre_compania = isset($vals_detalle_compania['nombre_compania_asociada']) ? $vals_detalle_compania['nombre_compania_asociada'] : '';
    $direccion_compania_asociada = isset($vals_detalle_compania['direccion_compania_asociada']) ? $vals_detalle_compania['direccion_compania_asociada'] : '';
    $direccion_exacta = isset($vals_detalle_compania['direccion_exacta']) ? $vals_detalle_compania['direccion_exacta'] : '';
    $numero_contacto = isset($vals_detalle_compania['numero_contacto']) ? $vals_detalle_compania['numero_contacto'] : '';
  }
}

//NUMERO GUIA
$resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
$numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;
$query_datos_detalles = "SELECT contenido_guia, cantidad_detalle_guia, tipo_envio.nombre_envio FROM detalle_guia, tipo_envio WHERE id_fkguia_detalle_envio = $id_guia AND tipo_envio.id_tipo_envio = detalle_guia.id_fktipo_envio_detalle_guia;";
$recuperar_detalles = mysqli_query($conn, $query_datos_detalles) or die(mysqli_error($conn));

$contenido_detalle = '<p class="izquierda">';
$posicion_codigo = 190;
$espacio_codigo = '';

while($vals_detalle = mysqli_fetch_assoc($recuperar_detalles)){
    $contenido_detalle .= 'CONTENIDO: '.$vals_detalle["cantidad_detalle_guia"].' '.$vals_detalle["nombre_envio"].' '.$vals_detalle["contenido_guia"].' <br>';
    $posicion_codigo = $posicion_codigo + 15;
    $espacio_codigo .= '<p> </p>';
}
$contenido_detalle .= ' ';

//DATOS FACTURA
$sql_datos_factura = "SELECT 
  f.id_factura,
  f.punto_emision_factura,
  s.punto_emision_sucursal,
  f.numero_factura,
  f.fecha_creacion_factura,
  f.clave_acceso_factura,
  f.total_factura,
  f.fecha_factura
FROM factura f
LEFT JOIN sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
WHERE f.id_fkguia_factura = $id_guia 
ORDER BY f.id_factura DESC 
LIMIT 1";

$recuperar_datos_factura = mysqli_query($conn, $sql_datos_factura) or die(mysqli_error($conn));
$vals_datos_factura = mysqli_fetch_assoc($recuperar_datos_factura);

$detalles_forma_pago = "";
$suma_total = 0;
$total_cobrado = 0;

$id_factura = ($vals_datos_factura && isset($vals_datos_factura["id_factura"])) ? (int) $vals_datos_factura["id_factura"] : 0;
$total_factura = $vals_datos_factura ? (float)$vals_datos_factura["total_factura"] : $total_guia;
$clave_acceso = $vals_datos_factura ? ($vals_datos_factura["clave_acceso_factura"] ?? '') : '';
$punto_emision_factura = $vals_datos_factura ? ($vals_datos_factura["punto_emision_factura"] ?? '') : '';
$punto_emision_sucursal = $vals_datos_factura ? ($vals_datos_factura["punto_emision_sucursal"] ?? '') : '';
$fecha_factura = $vals_datos_factura ? ($vals_datos_factura["fecha_creacion_factura"] ?? '') : '';
$resultado = sprintf("%09s", $vals_datos_factura ? ($vals_datos_factura['numero_factura'] ?? 0) : 0);
$numero_factura = $punto_emision_sucursal . '-' . $punto_emision_factura . '-' . $resultado;


$sql_pagos="SELECT 

  COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
  fp.id_forma_pago,
  fp.nombre_forma_pago 
FROM 
  comprobante_cobro cc 
LEFT JOIN 
  forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
WHERE 
  cc.id_fkfactura_comprobante_cobro = $id_factura AND  cc.estado_comprobante_cobro = 'COBRADA'
GROUP BY 
  fp.id_forma_pago";




$recuperar_datos_factura_formas= mysqli_query($conn,$sql_pagos) or  die(mysqli_error($conn));
while($vals_datos_facturaR = mysqli_fetch_array($recuperar_datos_factura_formas)){

  $detalles_forma_pago .= ''.$vals_datos_facturaR["nombre_forma_pago"].': $'.number_format((float)$vals_datos_facturaR["total"],2).'';
  $suma_total = $suma_total + $vals_datos_facturaR["total"];

};


if($detalles_forma_pago ==""){
  $detalles_forma_pago="NINGUNA";
}

$total_cobrado = $total_factura - $suma_total;
$estado_factura = "";

if ($total_cobrado == 0) {
$estado_factura = "COBRADA";
} else {
$estado_factura = "NO COBRADA";
}


//COMPROBANTES




$sql_configuracion = "SELECT configuracion.leyendamensaje_configuracion,configuracion.mensajeleyenda_configuracion FROM configuracion";
$recuperar_configuracion= mysqli_query($conn,$sql_configuracion) or  die(mysqli_error($conn));
$vals_configuracion = mysqli_fetch_array($recuperar_configuracion);

$leyendamensaje_configuracion = $vals_configuracion["leyendamensaje_configuracion"];
$mensajeleyenda_configuracion = $vals_configuracion["mensajeleyenda_configuracion"];

$validar_leyenda = $mensajeleyenda_configuracion;
$mensaje = $leyendamensaje_configuracion;
$leyenda = $mensaje;
$img = file_get_contents($imagen_empresa);
$pdf->Image('@' . $img);

$html='
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<style>

.center{
  text-align: center;
}
.formas{
	font-weight:bold;
	font-size:13px;
}

.borde_punto{
  width: 200px; /* Ajusta el ancho según tus necesidades */
  height: 200px; /* Ajusta la altura según tus necesidades */
  border: 1px dotted #000; /* Cambia el grosor y el color según tus necesidades */
  padding: 20px; /* Añade relleno para que el contenido no se pegue al borde */
}
.contenedor-imagen {
    border: solid black;
    display: inline-block;
    height: 220px;
    width:  200px;
    display: block;
  }


.factura{
  font-size:10px;
  font-weight:bold;
  color:gray
}
.center{

  text-align: center;
 
}
.titulo_inicio{
  font-size:12px;
  
}


.linea{
    border-top: 1px dotted #000; /* 1px de ancho y puntos negros */
}
body{
	font-size:11px;
}

</style>

<body>
     
	

        <p class="center">
		   <img width="64px"   class=" center" src="data:image/*;base64,'.$imagen_empresa.'"/><br>
		 <span class="titulo_inicio">'.$razon_social_empresa.'</span> <br>
        <span class="titulo_inicio">RUC:'.$ruc_empresa.'</span> <br>
        <span class="titulo_inicio">GUÍA DE DESPACHO ELECTRÓNICA</span> <br>
        <span class="titulo_inicio">N ° '.$numero_guia.'</span> <br>
           
        </p>
        <span class="center">OFICINA -  '.$ubicacion_usuaurio.'</span>

        <div class="linea"></div>

        <span class="center">
        <strong class=""><i class="fas fa-user"></i>CLIENTE</strong> 
       
        </span>

        <br>RUC/CI: '.$cedula_cliente_remitente.' <br>Nombre:'.$nombre_cliente_remitente.'
        
       

        <div class="linea"></div>
        <span class="center">
        <strong class=""><i class="fas fa-user"></i>ORIGEN</strong> 
       
        </span>


     
        <br>UBICACIÓN:'.$origen_guia.' <br>CI:'.$cedula_cliente_remitente.' <br>ENVÍA: '.$nombre_cliente_remitente.'<br>TELÉFONO: '.$telefono_cliente_emisor.'
      

    
        <div class="linea"></div>
        <span class="center">
        <strong class=""><i class="fas fa-user"></i>DESTINO</strong> 
       
        </span>
        
         
        <br>UBICACIÓN:'.$destino_guia.' <br>CI:'.$cedula_cliente_receptor.' <br>RECIBE: '.$nombre_cliente_receptor.'<br>TELÉFONO: '.$telefono_cliente_receptor.''.$contenido_detalle.'
		
		<div class="linea"></div>
        <span class="center">
        <strong class=""><i class="fas fa-user"></i>RETIRAR EN:</strong>
        </span><br>DIRECCIÓN:'.$direccion_compania_asociada.' <br>EMPRESA:'.$nombre_compania.' <br>DIR.EXACTA:'.$direccion_exacta.'<br>CONTACTO:'.$numero_contacto.' 
		  <span> 
 
        <div class="linea"></div>
        <span class="center">
        <strong class=""><i class="fas fa-user"></i>DETALLE DEL PAGO</strong>  
        </span>
 <br>OFICINISTA: '.$usuario.'<br>FACTURA ELEC. N° '.$numero_factura.'
        <span>
        
         
        </p>

        <div class="center">
          <table style="text-align: left;">

            <tr>
              <td>SUBTOTAL:</td>
              <td>$'.number_format((float)$subtotal_12_guia,2).'</td>
            </tr>
            <tr>
              <td>SUBTOTAL 0%:</td>
              <td>$'.number_format((float)$subtotal_0_guia,2).'</td>
            </tr>
            <tr>
              <td>SUBTOTAL:</td>
              <td>$'.number_format((float)$subtotal_guia,2).'</td>
            </tr>
            <tr>
              <td>DESCUENTO:</td>
              <td>$'.number_format((float)$descuento_guia,2).'</td>
            </tr>
            <tr>
              <td>TARIFA ESPECIAL:</td>
              <td>$'.number_format((float)$valor_tarifa_adicional_guia,2).'</td>
            </tr>
            <tr>
              <td>IVA:</td>
              <td>$'.number_format((float)$impuesto_iva_guia,2).'</td>
            </tr>
            <tr>
              <td><strong>TOTAL</strong></td>
              <td><strong>$'.number_format((float)$total_guia,2).'</strong></td>
            </tr>

          </table>
        </div>
        
        <strong>ESTADO:'.$estado_factura.'</strong>
		<span style="font-size:9px">
		<br>FORMAS DE PAGO:'.$detalles_forma_pago.'<br>POR COBRAR: $'.number_format((float)$total_cobrado,2).'<br>FECHA / HORA DE EMISIÓN:'.$fecha_factura.'<br>USUARIO: '.$cedula_cliente_remitente.' <br>CONTRASEÑA:'.$cedula_cliente_remitente.'<br>IMPRESIÓN: '.$fecha_actual.'
</span>
<br>
 <p class="center">
 
  _____________________
 <br>
 '.$nombre_cliente_remitente.'
 
 
 
 </p>
        '.$espacio_codigo.'
        <div class="linea"></div>

<br>
        
          '.$leyenda.' <br>
          
        



        



</body>
</html>
';

// set document information

// Print text using writeHTMLCell()




// set default monospaced font


// set auto page breaks


// set some language-dependent strings (optional)

// ---------------------------------------------------------

$pdf->SetFont('helvetica', '', 5);
$pdf->SetMargins(0, 0, 0, true);
// add a page
$pdf->AddPage('P',array(500, 110) );

$pdf->SetLineStyle(array('width' => 0.1, 'cap' => 'butt', 'join' => 'miter', 'dash' => 3, 'color' => array(0, 0, 0)));

// Dibujar un rectángulo con borde punteado
$pdf->Rect(5, 30, 100, 25, 'D');




// Add a page

// Write HTML content

$pdf->writeHTML($html, true, false, true, false, '');

$style = array(
    'position' => '',
    'align' => 'C',
    'stretch' => false,
    'fitwidth' => true,
    'cellfitalign' => '',
    'border' => false,
    'hpadding' => 'auto',
    'vpadding' => 'auto',
    'fgcolor' => array(
        0,
        0,
        0
    ),
    'bgcolor' => false, // array(255,255,255),
    'text' => true,
    'font' => 'helvetica',
    'fontsize' => 8,
    'stretchtext' => 4
  );
  // $pdf->SetXY(112, 65);
  
  $pdf->SetXY(5, $posicion_codigo + 92);
  // Codigo de barras
  $pdf->write1DBarcode($clave_acceso, 'C128', '', '', '100', 18, 0.4, $style, 'N');
  $pdf->Ln();

// Output PDF





        // create new PDF document



$query = "SELECT id_guia,nombre_sucursal,punto_emision_sucursal,destino_guia,id_fkusuario_guia,punto_emision_guia,numero_guia,sucursal_guia  FROM guia,sucursal2 WHERE sucursal_guia = suc_codigo_sucursal AND id_guia=  $id_guia";
$recuperar= mysqli_query($conn,$query) or  die(mysqli_error($conn));
$vals = mysqli_fetch_array($recuperar);


$suc_codigo_sucursal=$vals["sucursal_guia"];
$id_guia=$vals["id_guia"];
$destino_guia=$vals["destino_guia"];
$query_sucural = "SELECT nombre_sucursal,punto_emision_sucursal FROM sucursal2 WHERE suc_codigo_sucursal = $suc_codigo_sucursal";
$recuperar_sucursal= mysqli_query($conn,$query_sucural) or  die(mysqli_error($conn));
$vals_sucursal = mysqli_fetch_array($recuperar_sucursal);

$resultado= sprintf("%09s", $vals['numero_guia']);
$numero_guia =$vals_sucursal["punto_emision_sucursal"].'-'.$vals["punto_emision_guia"].'-'.$resultado;

//EMPRESA
$query3 = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa WHERE 1";
$recuperar3= mysqli_query($conn,$query3) or  die(mysqli_error($conn));
$vals3 = mysqli_fetch_array($recuperar3);

$id_empresa = $vals3["id_empresa"];
//$imagen_empresa = $vals2["imagen_empresa"];
$telefono_empresa = $vals3["telefono_empresa"];
$correo_empresa = $vals3["correo_empresa"];
$ruc_empresa = $vals3["ruc_empresa"];
$direccion_empresa = $vals3["direccion_empresa"];
$razon_social_empresa = $vals3["razon_social_empresa"];

//OFICINA
$id_usuario=$vals["id_fkusuario_guia"];

$query4 = "SELECT destino.lugar_destino FROM destino,usuario WHERE destino.id_destino = usuario.id_fkdestino_usuario AND usuario.id_usuario= $id_usuario;";
$recuperar4= mysqli_query($conn,$query4) or  die(mysqli_error($conn));
$vals4 = mysqli_fetch_array($recuperar4);

$lugar_destino = $vals4["lugar_destino"];




$datos=array(
    'id_guia' => $id_guia,
    'numero_guia' => $numero_guia,
    'destino' => $destino_guia,
);

$cadena = '';


// Eliminar la coma y el espacio extra al final
$cadena =  json_encode($datos);

//<td class="td_table">  `+  result_detalles[index].punto_emision_sucursal+'-'+result_detalles[index].punto_emision_guia+'-'+resultado + `</td>


$html1='
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
    '.$razon_social_empresa.' <br>
    RUC '.$ruc_empresa.'
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

for ($i=0; $i < 0; $i++) { 
    $pdf->SetFont('helvetica', '', 10);

// add a page
$pdf->AddPage('P',array(100,210));




// Add a page

// Write HTML content

$pdf->writeHTML($html1, true, false, true, false, '');

$style = array(
    'border' => 2,
    'vpadding' => 'auto',
    'hpadding' => 'auto',
    'fgcolor' => array(0,0,0),
    'bgcolor' => false, //array(255,255,255)
    'module_width' => 5, // width of a single module in points
    'module_height' => 5 // height of a single module in points
);

$pdf->write2DBarcode( $cadena, 'QRCODE,Q', 10, 50, 150, 150, $style, 'N');
  
}

$pdf->IncludeJS("print();");
$tmp_dir = __DIR__ . DIRECTORY_SEPARATOR . 'tmp';
if (!is_dir($tmp_dir)) {
    mkdir($tmp_dir, 0777, true);
}
$pdf_file_name = 'guiaQrImpresion.pdf';
$pdf_path = $tmp_dir . DIRECTORY_SEPARATOR . $pdf_file_name;

$pdf->Output($pdf_path, 'F');

 $array = array(
    "ruta" => $pdf_file_name,
    "success" => true,
    "borrar" => $pdf_path,
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
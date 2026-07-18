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
$query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa WHERE 1";
$recuperar_empresa = mysqli_query($conn,$query_empresa) or  die(mysqli_error($conn));
$vals_empresa = mysqli_fetch_array($recuperar_empresa);

	

$id_empresa = $vals_empresa["id_empresa"];
$imagen_empresa = $vals_empresa["imagen_empresa"];
$telefono_empresa = $vals_empresa["telefono_empresa"];
$correo_empresa = $vals_empresa["correo_empresa"];
$ruc_empresa = $vals_empresa["ruc_empresa"];
$direccion_empresa = $vals_empresa["direccion_empresa"];
$razon_social_empresa = $vals_empresa["razon_social_empresa"];

$query_datos = "SELECT id_usuario, nombre_usuario, apellido_usuario FROM usuario, sucursal2 WHERE id_usuario = $id_usuario_global AND  id_fksucursal_usuario=suc_codigo_sucursal";
$recuperar_datos= mysqli_query($conn,$query_datos) or  die(mysqli_error($conn));
$vals_datos = mysqli_fetch_array($recuperar_datos);

$id_usuario = $vals_datos["id_usuario"];



$query_guia = "SELECT origen_guia, destino_guia,numero_guia,punto_emision_sucursal,id_fkcompania_asociada,id_fkusuario_guia,UPPER(nombre_cliente_remitente) as nombre_cliente_remitente,punto_emision_usuario,UPPER(nombre_cliente_receptor) as nombre_cliente_receptor,cedula_cliente_remitente,cedula_cliente_receptor,telefono_cliente_emisor,telefono_cliente_receptor,subtotal_12_guia,subtotal_0_guia,subtotal_guia,total_guia,descuento_guia,valor_tarifa_adicional_guia,impuesto_iva_guia ,CONCAT(usuario.nombre_usuario,' ',usuario.apellido_usuario) as usuario FROM guia,sucursal2,usuario WHERE id_guia = $id_guia AND  sucursal_guia=suc_codigo_sucursal AND id_fkusuario_guia=id_usuario";
$recuperar_guia= mysqli_query($conn,$query_guia) or  die(mysqli_error($conn));
$vals_guia = mysqli_fetch_array($recuperar_guia);

$origen_guia = $vals_guia["origen_guia"];
$destino_guia = $vals_guia["destino_guia"];
$id_usuario_guia=$vals_guia["id_fkusuario_guia"];
$nombre_cliente_remitente = $vals_guia["nombre_cliente_remitente"];
$nombre_cliente_receptor = $vals_guia["nombre_cliente_receptor"];
$cedula_cliente_remitente = $vals_guia["cedula_cliente_remitente"];
$cedula_cliente_receptor = $vals_guia["cedula_cliente_receptor"];
$telefono_cliente_emisor = $vals_guia["telefono_cliente_emisor"];
$telefono_cliente_receptor = $vals_guia["telefono_cliente_receptor"];
$subtotal_12_guia = $vals_guia["subtotal_12_guia"];
$subtotal_0_guia = number_format((float)$vals_guia["subtotal_0_guia"]);
$subtotal_guia = number_format($vals_guia["subtotal_guia"],2);
$total_guia = $vals_guia["total_guia"];
$descuento_guia = $vals_guia["descuento_guia"];
$valor_tarifa_adicional_guia = $vals_guia["valor_tarifa_adicional_guia"];
$impuesto_iva_guia = $vals_guia["impuesto_iva_guia"];
$punto_emision_sucursal_guia=$vals_guia["punto_emision_sucursal"];
$punto_emision_guia=$vals_guia["punto_emision_usuario"];
$id_fkcompania_asociada=$vals_guia["id_fkcompania_asociada"];
	$usuario=$vals_guia["usuario"];
	
//COMPANIA ASOCIADA
	$query_datos_compania = "SELECT nombre_compania_asociada,nombre_destino as direccion_compania_asociada FROM  compania_asociada,destino  WHERE id_compania_asociada = $id_fkcompania_asociada AND lugar_destino ='$destino_guia'";
$recuperar_detalles_compnai= mysqli_query($conn,$query_datos_compania) or  die(mysqli_error($conn));
	$vals_detalle_compania = mysqli_fetch_array($recuperar_detalles_compnai);
	$nombre_compania=$vals_detalle_compania['nombre_compania_asociada'];
	$direccion_compania_asociada=$vals_detalle_compania['direccion_compania_asociada'];
	
//NUMERO GUIA
$resultado_guia= sprintf("%09s", $vals_guia['numero_guia']);
$numero_guia = $punto_emision_sucursal_guia.'-'.$punto_emision_guia.'-'.$resultado_guia;
$query_datos_detalles = "SELECT contenido_guia, cantidad_detalle_guia, tipo_envio.nombre_envio FROM detalle_guia, tipo_envio WHERE  id_fkguia_detalle_envio  = $id_guia AND tipo_envio.id_tipo_envio = detalle_guia.id_fktipo_envio_detalle_guia;";
$recuperar_detalles= mysqli_query($conn,$query_datos_detalles) or  die(mysqli_error($conn));

$contenido_detalle = '<p class="izquierda">';

$posicion_codigo = 190;
$espacio_codigo = '';

$items_detalle = [];
$total_copias_extra = 0;

while($vals_detalle = mysqli_fetch_array($recuperar_detalles)){

    $contenido_detalle .= 'CONTENIDO: '.$vals_detalle["cantidad_detalle_guia"].' '.$vals_detalle["nombre_envio"].' '.$vals_detalle["contenido_guia"].' <br>';
    
    $posicion_codigo = $posicion_codigo + 22;
    $espacio_codigo .= '<p> </p>';

    $cant = max(1, (int)$vals_detalle["cantidad_detalle_guia"]);
    for ($ci = 1; $ci <= $cant; $ci++) {
      $items_detalle[] = [
        'nombre_envio' => $vals_detalle['nombre_envio'],
        'contenido'    => $vals_detalle['contenido_guia'],
        'cantidad'     => $cant,
        'unidad'       => $ci,
      ];
      $total_copias_extra++;
    }
};

$contenido_detalle .= ' ';

	
		//UBICACION USUARIO GUIA
	
	
$query_ubicacion = "SELECT lugar_destino FROM destino,usuario WHERE id_fkdestino_usuario =  id_destino AND id_usuario= $id_usuario_guia";
$recuperar_ubicacion = mysqli_query($conn,$query_ubicacion) or  die(mysqli_error($conn));
$vals_ubicacion = mysqli_fetch_array($recuperar_ubicacion);
$ubicacion_usuaurio=$vals_ubicacion['lugar_destino'];

	
	///
$sql_datos_factura = "SELECT 
    f.id_factura,
    f.punto_emision_factura,
    s.punto_emision_sucursal,
    f.numero_factura,
    f.fecha_creacion_factura,
    f.clave_acceso_factura,
    f.total_factura,
    f.fecha_factura,
    COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
    fp.id_forma_pago,
    fp.nombre_forma_pago 
FROM 
    factura f
LEFT JOIN 
    comprobante_cobro cc ON f.id_factura = cc.id_fkfactura_comprobante_cobro
LEFT JOIN 
    forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
INNER JOIN 
    sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
WHERE 
    f.id_fkguia_factura = $id_guia 
GROUP BY 
    f.id_factura,
    f.clave_acceso_factura,
    f.fecha_factura,
    s.punto_emision_sucursal,
   fp.id_forma_pago;";
$recuperar_datos_factura= mysqli_query($conn,$sql_datos_factura) or  die(mysqli_error($conn));
$vals_datos_factura = mysqli_fetch_array($recuperar_datos_factura);

$detalles_forma_pago = "";
$suma_total = 0;
$total_cobrado = 0;

$total_factura = $vals_datos_factura["total_factura"];
$clave_acceso = $vals_datos_factura["clave_acceso_factura"];
$punto_emision_factura = $vals_datos_factura["punto_emision_factura"];
$punto_emision_sucursal = $vals_datos_factura["punto_emision_sucursal"];
$fecha_factura = $vals_datos_factura["fecha_creacion_factura"];
$resultado= sprintf("%09s", $vals_datos_factura['numero_factura']);
$numero_factura = $punto_emision_sucursal.'-'.$punto_emision_factura.'-'.$resultado;


$recuperar_datos_factura_formas= mysqli_query($conn,$sql_datos_factura) or  die(mysqli_error($conn));
while($vals_datos_facturaR = mysqli_fetch_array($recuperar_datos_factura_formas)){

    $detalles_forma_pago .= ''.$vals_datos_facturaR["nombre_forma_pago"].': $'.number_format((float)$vals_datos_facturaR["total"],2).'';
    $suma_total = $suma_total + $vals_datos_facturaR["total"];

};



$total_cobrado = $total_factura - $suma_total;
$estado_factura = "";

if ($total_cobrado == 0) {
  $estado_factura = "COBRADA";
} else {
  $estado_factura = "NO COBRADA";
}

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
		 <span class="titulo_inicio">Cooperativa de Transportes Flota Pelileo</span> <br>
        <span class="titulo_inicio">RUC:'.$ruc_empresa.'</span> <br>
        <span class="titulo_inicio">GUÍA DE DESPACHO ELECTRÓNICA</span> <br>
        <span class="titulo_inicio">N ° '.$numero_guia.'</span> <br>
		<span class="titulo_inicio">FECHA /HORA DE EMISIÓN</span> <br>
		<span class="titulo_inicio">'.$fecha_factura.'</span> <br>
           
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
        </span><br>DIRECCIÓN:'.$direccion_compania_asociada.' <br>EMPRESA:'.$nombre_compania.' 
		  <span> 
 
        <div class="linea"></div>
        <span class="center">
        <strong class=""><i class="fas fa-user"></i>DETALLE DEL PAGO</strong>  
        </span>
 <br>OFICINISTA: '.$usuario.'<br>FACTURA ELEC. N° '.$numero_factura.'
  <br>GUIA ELEC. N° '.$numero_guia.'
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
        
        <strong style="font-size:25px"> ESTADO: '.$estado_factura.'</strong>
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
     

<br><br>
        <div class="linea"></div>
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

  // ── SLIPS: una hoja por cada unidad de cada item ──
  if ($total_copias_extra > 0) {
    $pagina_actual = 1;
    $total_paginas = $total_copias_extra;
    $fecha_slip = date('d/m/Y H:i');

    foreach ($items_detalle as $item) {

      $pdf->AddPage('P', array(110, 200));
      $pdf->SetMargins(5, 5, 5, true);
      $pdf->SetAutoPageBreak(FALSE, 0);
      $lw = 100;

      // Logo
      $pdf->SetY(5);

      // Empresa
      $pdf->SetFont('helvetica', 'B', 11);
      $pdf->Cell($lw, 6, strtoupper($razon_social_empresa), 0, 1, 'C');
      $pdf->SetFont('helvetica', '', 8);
      $pdf->Cell($lw, 4, $numero_guia, 0, 1, 'C');

      // Linea doble
      $pdf->Ln(2);
      $y0 = $pdf->GetY();
      $pdf->SetDrawColor(0,0,0);
      $pdf->SetLineWidth(0.6);
      $pdf->Line(5, $y0, 105, $y0);
      $pdf->SetLineWidth(0.2);
      $pdf->Line(5, $y0 + 1.5, 105, $y0 + 1.5);
      $pdf->SetY($y0 + 4);

      // Fecha
      $pdf->SetFont('helvetica', '', 9);
      $pdf->Cell($lw, 5, $fecha_slip, 0, 1, 'C');
      $pdf->Ln(1);

      // Remitente
      $pdf->SetFont('helvetica', '', 8);
      $pdf->Cell($lw, 4, 'Remitente', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', 11);
      $pdf->MultiCell($lw, 6, $nombre_cliente_remitente, 0, 'C', false, 1);
      $pdf->Ln(1);

      // Destinatario
      $pdf->SetFont('helvetica', '', 8);
      $pdf->Cell($lw, 4, 'Destinatario', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', 11);
      $pdf->MultiCell($lw, 6, $nombre_cliente_receptor, 0, 'C', false, 1);
      $pdf->Ln(1);

      // Destino
      $pdf->SetFont('helvetica', '', 8);
      $pdf->Cell($lw, 4, 'Destino', 0, 1, 'C');
      $pdf->SetFont('helvetica', 'B', 13);
      $pdf->Cell($lw, 7, strtoupper($destino_guia), 0, 1, 'C');
      $pdf->Ln(1);

      // Telefono
      $pdf->SetFont('helvetica', '', 9);
      $pdf->Cell($lw, 5, 'Fono: ' . $telefono_cliente_receptor, 0, 1, 'C');
      $pdf->Ln(1);

      // Contenido
      $pdf->SetFont('helvetica', 'B', 10);
      $desc = strtoupper($item['nombre_envio']) . ': ' . strtoupper($item['contenido']);
      $pdf->MultiCell($lw, 6, $desc, 0, 'C', false, 1);
      $pdf->Ln(2);

      // Linea doble
      $y1 = $pdf->GetY();
      $pdf->SetLineWidth(0.6);
      $pdf->Line(5, $y1, 105, $y1);
      $pdf->SetLineWidth(0.2);
      $pdf->Line(5, $y1 + 1.5, 105, $y1 + 1.5);
      $pdf->SetY($y1 + 5);

      // Empresa destino
      if (!empty($nombre_compania)) {
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell($lw, 5, strtoupper($nombre_compania), 0, 1, 'C');
      }
      $pdf->Ln(3);

      // Numero de pagina
      $pdf->SetFont('helvetica', 'B', 9);
      $pdf->Cell($lw, 5, $pagina_actual . ' / ' . $total_paginas, 0, 1, 'C');

      $pagina_actual++;
    }
  }

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
    # code...
}

$pdf->IncludeJS("print();");

$pdf->Output($_SERVER['DOCUMENT_ROOT'].'/php/tmp/guiaQrImpresion.pdf', 'I');

 $array = array(
    "ruta" => 'guiaQrImpresion.pdf',
    "success" => true,
    "borrar" => $_SERVER['DOCUMENT_ROOT'].'/php/tmp/guiaQrImpresion.pdf',
    
 
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
<?php
require_once('library/tcpdf.php');
require_once ("db.php");
require_once ("pdf_utils.php");
require 'vendor/autoload.php';
$generator = new Picqer\Barcode\BarcodeGeneratorHTML();

try {
$id_guia = $_GET['id_guia'];




// create new PDF document
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);


$conn = conexion();
$query = "SELECT
g.id_guia, f.clave_acceso_factura, f.id_factura, g.subtotal_12_guia, g.subtotal_0_guia, g.total_guia, g.impuesto_iva_guia, g.descuento_guia, g.subtotal_guia,
g.sucursal_guia, g.punto_emision_guia, g.valor_tarifa_adicional_guia, g.numero_guia,
g.nombre_cliente_receptor, g.nombre_cliente_remitente, g.cedula_cliente_remitente,
g.cedula_cliente_receptor, g.direccion_cliente_receptor, g.direccion_cliente_emisor, g.telefono_cliente_receptor, g.telefono_cliente_emisor,
g.correo_cliente_emisor, g.correo_cliente_receptor
FROM guia g
LEFT JOIN factura f ON f.id_fkguia_factura = g.id_guia AND f.estado_factura = 1
WHERE g.id_guia = $id_guia";


$recuperar= mysqli_query($conn,$query) or die(mysqli_error($conn));
$vals = mysqli_fetch_array($recuperar);


if(empty($vals)){
  header('Content-Type: text/plain', true, 404);
  echo 'No se encontró la guía con id=' . $id_guia;
  exit;
}else{


$id_sucursal = $vals["sucursal_guia"];
$id_factura = $vals["id_factura"];
$nombre_receptor = $vals["nombre_cliente_receptor"];
$cedula_receptor = $vals["cedula_cliente_receptor"];
$telefono_receptor = $vals["telefono_cliente_receptor"];
$direccion_receptor = $vals["direccion_cliente_receptor"];
$correo_receptor = $vals["correo_cliente_receptor"];
$nombre_emisor = $vals["nombre_cliente_remitente"];
$cedula_emisor = $vals["cedula_cliente_remitente"];
$telefono_emisor = $vals["telefono_cliente_emisor"];
$direccion_emisor = $vals["direccion_cliente_emisor"];
$correo_emisor = $vals["correo_cliente_emisor"];
$subtotal_12 = $vals["subtotal_12_guia"];
$subtotal_0 = $vals["subtotal_0_guia"];
$subtotal = $vals["subtotal_guia"];
$descuento_guia = $vals["descuento_guia"];
$iva_guia = $vals["impuesto_iva_guia"];
$total_guia = $vals["total_guia"];
$tarifa_guia = $vals["valor_tarifa_adicional_guia"];


$query_sucural = "SELECT nombre_sucursal, ubicacion_sucursal,punto_emision_sucursal FROM sucursal WHERE id_sucursal =
$id_sucursal";
$recuperar_sucursal= mysqli_query($conn,$query_sucural) or die(mysqli_error($conn));
$vals_sucursal = mysqli_fetch_array($recuperar_sucursal);

$resultado= sprintf("%09s", $vals['numero_guia']);

$punto_emision_sucursal = !empty($vals_sucursal["punto_emision_sucursal"]) ? $vals_sucursal["punto_emision_sucursal"] : '001';
$punto_emision_guia = !empty($vals["punto_emision_guia"]) ? $vals["punto_emision_guia"] : '001';
$numero_guia = $punto_emision_sucursal . '-' . $punto_emision_guia . '-' . $resultado;
$nombre_sucursal = isset($vals_sucursal["nombre_sucursal"]) ? $vals_sucursal["nombre_sucursal"] : '';
$ubicacion_sucursal = isset($vals_sucursal["ubicacion_sucursal"]) ? $vals_sucursal["ubicacion_sucursal"] : '';

//EMPRESA
$query_empresa= "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa";
$recuperar_empresa= mysqli_query($conn,$query_empresa) or die(mysqli_error($conn));
$vals_empresa = mysqli_fetch_array($recuperar_empresa);
$nombre_empresa=$vals_empresa['razon_social_empresa'];
$direccion_empresa=$vals_empresa['direccion_empresa'];
$ruc_empresa=$vals_empresa['ruc_empresa'];

//DETALLES FACTURA
$query_dettales= "SELECT id_detalle_guia, total_tarifa_detalle_guia, id_fkguia_detalle_envio, cantidad_detalle_guia,
peso_guia, costo_detalle_guia, tipo_descuento_detalle_guia, estado_detalle_guia, fecha_creacion_detalle_guia,
tipo_iva_detalle_guia, total_detalle_guia, subtotal_detalle_guia, contenido_guia, documento_detalle_guia,
id_fktipo_envio_detalle_guia FROM detalle_guia WHERE id_fkguia_detalle_envio=$id_guia";
$recuperar_detalles= mysqli_query($conn,$query_dettales) or die(mysqli_error($conn));

$datos="";
$descuento = 0;
while ($vals_detalles = mysqli_fetch_array($recuperar_detalles)) {
    if ( $vals_detalles["tipo_descuento_detalle_guia"] == 1) {
        $descuento = ($vals_detalles["costo_detalle_guia"] * $vals_detalles["cantidad_detalle_guia"]) / 2;
    } else if ($vals_detalles["tipo_descuento_detalle_guia"] == 1) {
        $descuento = ($vals_detalles["costo_detalle_guia"] * $vals_detalles["cantidad_detalle_guia"] );
    } else {
        $descuento = 0;
    }

    $tabla ='
    <tr>
      <td style="border: solid 1px #aaa999;height: 20px;width:230px;"> '.$vals_detalles['contenido_guia'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:40px;"> '.$vals_detalles['cantidad_detalle_guia'].'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:70px;"> $'.round($vals_detalles['costo_detalle_guia'], 2).'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:60px;"> $'.round($descuento, 2).'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:60px;"> $'.round($vals_detalles['total_tarifa_detalle_guia'], 2).'</td>
      <td style="border: solid 1px #aaa999;height: 20px;width:70px;"> $'.round($vals_detalles['total_detalle_guia'], 2).'</td>
    </tr>
    ';
    $datos .= $tabla;
}

$rutaLogo = obtenerRutaLogoEmpresa($conn);
$html_logo = '';
if ($rutaLogo) {
    $html_logo = '<tr>
      <td style="width:100%; text-align:center;"><img src="' . $rutaLogo . '" width="80"></td>
    </tr>';
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
  .poner_borde {


    width: 50%;
    border: 0px solid black;


  }

  .center {

    text-align: center;


  }

  .derecha {

    text-align: right;


  }

  .factura {

    font-size: 18px;
    font-weight: bold;
    color: gray
  }

  .rojo {
    color: red
  }

  .cliente {
    width: 100%;
    border: 1px solid black;
  }
</style>

<body>
  <table style="width:100%;">
    ' . $html_logo . '
    <tr>
      <td style="width:40%; ">


        <div class="poner_borde">
          <span class="factura">GUIA</span>

          <div>

            <table style="width:100%;">
              <tr>
                <td style="width:50%;">
                  <span class="rojo">No.</span>
                </td>
                <td style="width:50%;">
                  <span class="rojo">'.$numero_guia.'</span>


                </td>
              </tr>

            </table>



            <br>

            <br>
            <div></div>
          </div>
        </div>
      </td>
    </tr>
  </table>

  <br>

  <div class="cliente" style="margin: 5px;">

    <table style="width:100%;">
      <tr>
        <td style="width:50%;">

          <div class="center"><b>DATOS REMITENTE</b></div>
          <b>Nombre Remitente:</b> '.$nombre_emisor.'<br>
          <b>Identificación:</b> '.$cedula_emisor.'<br>
          <b>Teléfono:</b> '.$telefono_emisor.'<br>
          <b>Correo:</b> '.$correo_emisor.'<br>
          <b>Dirección:</b> '.$direccion_emisor.'<br>

        </td>
        <td style="width:50%;">
          <div class="center"><b>DATOS DESTINATARIO</b></div>
          <b>Nombre Destinatario:</b> '.$nombre_receptor.'<br>
          <b>Identificación:</b> '.$cedula_receptor.'<br>
          <b>Teléfono:</b> '.$telefono_receptor.'<br>
          <b>Correo:</b> '.$correo_receptor.'<br>
          <b>Dirección:</b> '.$direccion_receptor.'<br>


        </td>
      </tr>

    </table>


  </div>


  <div>

    <table style="text-align:center;  margin: 30px;">

      <tr>
        <th style="border: solid 1px #aaa999;height: 15px; width:230px;"> <b>Descripción</b></th>
        <th style="border: solid 1px #aaa999;height: 15px; width:40px;"> <b>Cant</b></th>
        <th style="border: solid 1px #aaa999;height: 15px; width:70px;"><b>P. Unitario</b></th>
        <th style="border: solid 1px #aaa999;height: 15px; width:60px;"> <b>Descuento</b></th>
        <th style="border: solid 1px #aaa999;height: 15px; width:60px;"> <b>Tarifa</b></th>
        <th style="border: solid 1px #aaa999;height: 15px; width:70px;"> <b>Subtotal</b></th>
      </tr>

      '.$datos.'

    </table>


  </div>


  <div>
    <table style="width:100%;">
      <tr>


        <td style="width:70%;">




        </td>
        <td style="width:20%;">
          <div class="derecha">

            <table style="text-align:center;  margin: 30px;">

              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>SUBTOTAL IVA</b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $'.round($subtotal_12,2).'</th>
              </tr>
              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>SUBTOTAL 0%</b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $ '.round($subtotal_0,2).'</th>
              </tr>
              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>SUBTOTAL</b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $'.round($subtotal,2).'</th>
              </tr>
              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>DESCUENTO </b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $ '.round($descuento_guia,2).'</th>
              </tr>

              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>TARIFA </b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $ '.round($tarifa_guia,2).'</th>
              </tr>
              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>IVA </b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $ '.round($iva_guia,2).'</th>
              </tr>

              <tr>
                <th style="border: solid 1px #aaa999;height: 15px; width:100px;"> <b>TOTAL </b></th>
                <th style="border: solid 1px #aaa999;height: 15px; width:50px;"> $ '.round($total_guia,2).'</th>
              </tr>




            </table>
          </div>




        </td>
      </tr>

    </table>


  </div>


' . (isset($_GET['reimpreso_por']) && !empty($_GET['reimpreso_por']) ? '<div style="text-align:right; font-style:italic; margin-top:10px;">Reimpreso por: ' . htmlspecialchars($_GET['reimpreso_por']) . '</div>' : '') . '
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

// Enviar el PDF directamente al navegador (inline en el iframe)
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="guia_' . $id_guia . '.pdf"');
header('Cache-Control: private, max-age=0, must-revalidate');
header('Pragma: public');

$pdf->Output('guia_' . $id_guia . '.pdf', 'I');
exit;
}

}catch(Exception $e){
  header('Content-Type: text/plain', true, 500);
  echo 'Error generando PDF: ' . $e->getMessage();
  exit;
}


// Guardar el archivo en el servidor


// Limpiar el búfer de salida





//============================================================+
// END OF FILE
//============================================================+


?>
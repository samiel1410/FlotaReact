<?php
require_once('../library/tcpdf.php');
require_once("../db.php");

//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
  $fecha_actual = date('Y-m-d H:i:s');
  $id_maestro = isset($_GET['id_maestro']) ? intval($_GET['id_maestro']) : 0;


  // create new PDF document
  $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

  $conn = conexion();
  $query = "SELECT numero_despacho_maestro_nota_venta AS numero_despacho_maestro,
                 nombre_destino,
                 fecha_despacho_maestro_nota_venta AS fecha_despacho_maestro,
                 nombre_oficinista,
                 nombre_busero,
                 nombre_bus,
                 id_fkusuario_despacho_maestro_nota_venta
          FROM despacho_maestro_nota_venta
          WHERE id_despacho_maestro_nota_venta=$id_maestro";
  $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
  $vals = mysqli_fetch_array($recuperar);
  // En la tabla convenio ya vienen los nombres requeridos
  $nombre_oficinista_real = $vals["nombre_oficinista"];
  $numero_despacho_maestro = $vals["numero_despacho_maestro"];
  $nombre_destino = $vals["nombre_destino"];
  $fecha_despacho_maestro = $vals["fecha_despacho_maestro"];
  $nombre_oficinista = $vals["nombre_oficinista"];
  $nombre_busero = $vals["nombre_busero"];
  $nombre_bus = $vals["nombre_bus"];
  $id_fkusuario_despacho_maestro = $vals["id_fkusuario_despacho_maestro_nota_venta"];

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


  $query4 = "SELECT destino.lugar_destino FROM destino,usuario WHERE destino.id_fkdestino_despacho = usuario.id_fkdestino_usuario AND usuario.id_usuario= $id_fkusuario_despacho_maestro;";
  $recuperar4 = mysqli_query($conn, $query4) or die(mysqli_error($conn));
  $vals4 = mysqli_fetch_array($recuperar4);

  $lugar_destino = $vals4["lugar_destino"];

  $datos = '';

  $query2 = "SELECT dd.id_despacho_detalle_nota_venta AS id_despacho_detalle,
         dd.observacion_despacho_detalle_nota_venta AS observacion_despacho_detalle,
         dd.id_fkguia_despacho_detalle_nota_venta AS id_guia,
         g.numero_guia,
         s.punto_emision_sucursal,
         g.valor_neto AS total_guia
       FROM despacho_detalle_nota_venta dd
       JOIN guia_nota_venta g ON dd.id_fkguia_despacho_detalle_nota_venta = g.id
       LEFT JOIN sucursal2 s ON g.id_fksucursal_guia_nota_venta = s.suc_codigo_sucursal
       WHERE dd.id_fkdespacho_maestro_nota_venta = $id_maestro;";
  $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));

  //<td class="td_table">  `+  result_detalles[index].punto_emision_sucursal+'-'+result_detalles[index].punto_emision_guia+'-'+resultado + `</td>
  $total_final = 0;
  $total_cantidad = 0;
  $total_guias = 0;
  $observacion_despacho_detalle = '';
  while ($vals2 = mysqli_fetch_array($recuperar2)) {

    $total_guias++;

    $observacion_despacho_detalle = $vals2["observacion_despacho_detalle"];
    $numero_guia = $vals2["numero_guia"];

    $total_final = $total_final + $vals2['total_guia'];
    $id_guia = $vals2['id_guia'];
    // En guia_nota_venta no hay detalle de items, contamos cada guía como 1 unidad
    $cantidad = 1;

    $total_cantidad = $total_cantidad + $cantidad;
    $tabla = '
    <tr> 
        <td style="width: 120px; border-bottom-style: dotted;"> ' . $vals2['numero_guia'] . '</td>
        <td style="border-bottom-style: dotted;  width: 50px"> $' . number_format((float) $vals2['total_guia'], 2) . '</td>
  <td style="border-bottom-style: dotted; width: 80px"> ' . $cantidad . '</td>
        
    </tr>
    ';


    $datos .= $tabla;




  }
  ;

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
.center2{

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
    font-size: 10px;
    font-weight:bold;
}

.despacho{
    font-size: 15px;
    font-weight:bold;
}
.center p {
    display: inline-block;
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

    <p class=" center" style="margin: 1px; padding: 0px;">
    OFICINA ' . $lugar_destino . ' <br>
    <strong>DESPACHO NOTA VENTA #' . $numero_despacho_maestro . '</strong>
    </p>

    <hr>

    <p class=" contenidos" style="margin: 0px; padding: 0px;">
    <strong>DESTINO:</strong> ' . $nombre_destino . '<br>
    <strong>BUS:</strong> ' . $nombre_bus . '<br>
    <strong>CONDUCTOR:</strong>' . $nombre_busero . '<br>
    <strong>OFICINISTA:</strong>' . $nombre_oficinista_real . '<br>
    <strong>FECHA:</strong> ' . $fecha_despacho_maestro . ' <br>
    </p>

    <div style="margin: 0px">
      <table>
          <tr style="content-align: center;">
              <th style="width: 120px; border-bottom-style: dotted;">
              <strong>GUIA</strong>
              </th>
              <th style="border-bottom-style: dotted; width: 50px;">
              <strong>TOTAL</strong>
              </th>
              <th style="border-bottom-style: dotted; width: 100px;">
              <strong>CANT.</strong>
              </th>
          </tr>
          ' . $datos . '
      </table>
    </div>
	
	<span><b>Total:</b> $' . number_format((float) $total_final, 2) . '</span><br><span><b>Total Guias:</b> ' . $total_guias . '</span><br>

    <p style="margin: 0px; padding: 0px">
    <strong>Observacion:</strong> ' . $observacion_despacho_detalle . ' <br>
    
    Impresión ' . $fecha_actual . '
    </p>

   <table style="width:100%;">
        <tr>
            <td style="width:50%;">
                <p class="center">
                    ________________ <br>
                    ' . $nombre_oficinista . ' <br>
                </p>
            </td>
            <td style="width:50%; text-align: center">
                <p class="center">
                    ________________ <br>
                   ' . $nombre_busero . ' <br>
                </p>
            </td>
        </tr>
        
    </table>



    
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

  $pdf->SetFont('helvetica', '', 12);

  // add a pageiif
  if ($total_guias > 65) {
    $height = 500 * ($total_guias / 35);
  } else {
    $height = 500;
  }

  $pdf->AddPage('P', array($height, 120));






  // Add a page

  // Write HTML content

  $pdf->writeHTML($html, true, false, true, false, '');
  // Output PDF
  $pdf->IncludeJS("print();");


  $tempDir = dirname(__DIR__) . '/tmp/';
  $fileName = 'despacho.pdf';
  $fullPath = $tempDir . $fileName;

  if (isset($_GET['inline']) && $_GET['inline'] == 1) {
    $pdf->Output($fileName, 'I');
  } else {
    $pdf->Output($fullPath, 'F');

    $array = array(
      "ruta" => $fileName,
      "success" => true,
      "borrar" => $fullPath,
    );

    echo json_encode($array);
  }

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
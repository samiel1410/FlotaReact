<?php
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
require 'vendor/autoload.php';
$generator = new Picqer\Barcode\BarcodeGeneratorHTML();

try {
  $id_factura = $_GET['id_factura'];




  // create new PDF document
  $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);


  $conn = conexion();
  $query = "select
id_factura,fecha_factura,fecha_hora_autorizacion,telefono_cliente_factura,direccion_clientes_factura,correo_cliente_factura,ruc_cliente_factura,nombre_cliente_factura,id_fksucursal_factura,clave_acceso_factura,fecha_hora_sincronizacion,punto_emision_factura,numero_factura,total_factura,subtotal_12_factura,subtotal_0_factura,subtotal_factura,iva_factura,descuento_total_factura
from factura where id_factura = " . $id_factura . "";
  $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
  $vals = mysqli_fetch_array($recuperar);

  $id_sucursal = $vals["id_fksucursal_factura"];
  $subtotal_12 = $vals["subtotal_12_factura"];
  $subtotal_0 = $vals["subtotal_0_factura"];
  $subtotal = $vals["subtotal_factura"];
  $descuento_guia = $vals["descuento_total_factura"];
  $iva_guia = $vals["iva_factura"];
  $total_guia = $vals["total_factura"];
  $clave_autorizacion = $vals["clave_acceso_factura"];
  $hora_autorizacion = $vals["fecha_hora_autorizacion"];

  //CLIENTE
  $razon_social = $vals["nombre_cliente_factura"];
  $ruc_cliente = $vals["ruc_cliente_factura"];
  $telefono = $vals["telefono_cliente_factura"];
  $correo = $vals["correo_cliente_factura"];
  $direccion = $vals["direccion_clientes_factura"];
  $fecha_emision = $vals["fecha_factura"];

  $resultado = sprintf("%09s", $vals['numero_factura']);


  $query_sucural = "SELECT nombre_sucursal, ubicacion_sucursal,punto_emision_sucursal FROM sucursal WHERE id_sucursal =
$id_sucursal";
  $recuperar_sucursal = mysqli_query($conn, $query_sucural) or die(mysqli_error($conn));
  $vals_sucursal = mysqli_fetch_array($recuperar_sucursal);



  $numero_factura = $vals_sucursal["punto_emision_sucursal"] . '-' . $vals["punto_emision_factura"] . '-' . $resultado;
  $nombre_sucursal = $vals_sucursal["nombre_sucursal"];
  $ubicacion_sucursal = $vals_sucursal["ubicacion_sucursal"];


  //EMPRESA
  $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa";
  $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
  $vals_empresa = mysqli_fetch_array($recuperar_empresa);

  $nombre_empresa = $vals_empresa['razon_social_empresa'];

  $direccion_empresa = $vals_empresa['direccion_empresa'];
  $ruc_empresa = $vals_empresa['ruc_empresa'];


  //DETALLES FACTURA

  $query_dettales = "SELECT
nombre_producto_factura_detalle,cantidad_factura_detalle,total_factura_detalle,descuento_factura_detalle,tarifa_factura_detalle
FROM factura_detalle WHERE id_fkfactura_factura_detalle= $id_factura";
  $recuperar_detalles = mysqli_query($conn, $query_dettales) or die(mysqli_error($conn));

  $datos = "";

  while ($vals_detalles = mysqli_fetch_array($recuperar_detalles)) {

    $tabla = '
<tr>
  <td width="50%" class="border"> ' . $vals_detalles['nombre_producto_factura_detalle'] . '</td>
  <td width="10%" class="border center"> ' . $vals_detalles['cantidad_factura_detalle'] . '</td>
  <td width="15%" class="border right"> $' . round($vals_detalles['descuento_factura_detalle'], 2) . '</td>
  <td width="10%" class="border right"> $' . round($vals_detalles['tarifa_factura_detalle'], 2) . '</td>
  <td width="15%" class="border right"> $' . round($vals_detalles['total_factura_detalle'], 2) . '</td>
</tr>
';


    $datos .= $tabla;




  }
  //FORMA DE PAGO

  $query_pago = "SELECT c.id_comprobante_cobro, c.monto_comprobante_cobro, 
                        COALESCE(f.nombre_forma_pago, 'SIN UTILIZACION DEL SISTEMA FINANCIERO') as nombre_forma_pago 
                 FROM comprobante_cobro c 
                 LEFT JOIN forma_pago f ON (c.id_fkforma_pago = f.id_forma_pago OR c.id_fkforma_pago = f.codigo_forma_pago) 
                 WHERE (c.id_fkfactura_comprobante_cobro = $id_factura OR c.id_fkfactura_comprobante_cobro = (SELECT f2.id_fkguia_factura FROM factura f2 WHERE f2.id_factura = $id_factura))";
  $recuperar_pago = mysqli_query($conn, $query_pago) or die(mysqli_error($conn));
  $datos_pago = "";

  while ($vals_pago = mysqli_fetch_array($recuperar_pago)) {
    $tabla = '
<tr>
  <td width="70%" class="border"> ' . $vals_pago['nombre_forma_pago'] . '</td>
  <td width="30%" class="border right"> $' . number_format((float)$vals_pago['monto_comprobante_cobro'], 2, '.', '') . '</td>
</tr>
';
    $datos_pago .= $tabla;
  }

  if (empty(trim($datos_pago))) {
    $datos_pago = '
<tr>
  <td width="70%" class="border"> SIN UTILIZACION DEL SISTEMA FINANCIERO</td>
  <td width="30%" class="border right"> $' . number_format((float)$total_guia, 2, '.', '') . '</td>
</tr>
';
  }

  $rutaLogo = obtenerRutaLogoEmpresa($conn);
  $html_logo = '';
  if ($rutaLogo) {
    $html_logo = '<tr>
  <td style="width:100%; text-align:center;"><img src="' . $rutaLogo . '" width="80"></td>
</tr>';
  }

  $html_left = '
<style>
  .title { font-size: 11pt; font-weight: bold; }
  .label { font-weight: bold; font-size: 9pt; }
  .value { font-size: 9pt; }
</style>
<div style="text-align: center;">
  ' . ( $rutaLogo ? '<img src="' . $rutaLogo . '" width="80"><br>' : '' ) . '
  <br>
  <span class="title">' . $nombre_empresa . '</span><br><br>
</div>
<span class="label">Dirección Matriz:</span><br>
<span class="value">' . $direccion_empresa . '</span><br><br>
<span class="label">Dirección Sucursal:</span><br>
<span class="value">' . $ubicacion_sucursal . '</span><br><br>
<span class="label">Obligado a llevar Contabilidad:</span> SI
';

  $html_right = '
<style>
  .title { font-size: 11pt; font-weight: bold; }
  .label { font-weight: bold; font-size: 9pt; }
  .value { font-size: 9pt; }
  .small { font-size: 7.5pt; }
</style>
<span class="label">R.U.C.:</span> <span class="value">' . $ruc_empresa . '</span><br>
<span class="title">FACTURA</span><br>
<span class="label">No.</span> <span class="value">' . $numero_factura . '</span><br><br>
<span class="label">NÚMERO DE AUTORIZACIÓN:</span><br>
<span class="small">' . $clave_autorizacion . '</span><br><br>
<span class="label">FECHA Y HORA DE AUTORIZACIÓN:</span><br>
<span class="value">' . $hora_autorizacion . '</span><br><br>
<span class="label">AMBIENTE:</span> <span class="value">PRODUCCIÓN</span><br>
<span class="label">EMISIÓN:</span> <span class="value">NORMAL</span><br><br>
<span class="label">CLAVE DE ACCESO:</span><br>
';

  $html_body = '
<style>
  table { width: 100%; border-collapse: collapse; }
  .box { border: 1px solid #000; padding: 5px; }
  .label { font-weight: bold; font-size: 9pt; }
  .value { font-size: 9pt; }
  .border { border: 1px solid #000; }
  .background { background-color: #eee; }
  .center { text-align: center; }
  .right { text-align: right; }
</style>

<div class="box">
  <table cellpadding="2">
    <tr>
      <td width="70%">
        <span class="label">Razón Social / Nombres y Apellidos:</span> <span class="value">' . $razon_social . '</span><br>
        <span class="label">Identificación:</span> <span class="value">' . $ruc_cliente . '</span><br>
        <span class="label">Fecha Emisión:</span> <span class="value">' . $fecha_emision . '</span><br>
        <span class="label">Dirección:</span> <span class="value">' . $direccion . '</span>
      </td>
      <td width="30%">
        <span class="label">Guía de Remisión:</span><br>
        <span class="label">Placa / Matrícula:</span>
      </td>
    </tr>
  </table>
</div>

<br><br>

<table cellpadding="3">
  <thead>
    <tr class="background">
      <th width="45%" class="border center"><b>Descripción</b></th>
      <th width="10%" class="border center"><b>Cant</b></th>
      <th width="15%" class="border center"><b>Descuento</b></th>
      <th width="15%" class="border center"><b>Tarifa</b></th>
      <th width="15%" class="border center"><b>Subtotal</b></th>
    </tr>
  </thead>
  <tbody>
    ' . $datos . '
  </tbody>
</table>

<br><br>

<table>
  <tr>
    <td width="60%">
      <table cellpadding="3" class="border">
        <tr class="background">
          <th width="70%" class="center"><b>Forma de Pago</b></th>
          <th width="30%" class="center"><b>Valor</b></th>
        </tr>
        ' . $datos_pago . '
      </table>
    </td>
    <td width="40%">
      <table cellpadding="2">
        <tr>
          <td width="65%" class="border">SUBTOTAL 12%</td>
          <td width="35%" class="border right">$' . round($subtotal_12, 2) . '</td>
        </tr>
        <tr>
          <td class="border">SUBTOTAL 0%</td>
          <td class="border right">$' . round($subtotal_0, 2) . '</td>
        </tr>
        <tr>
          <td class="border">SUBTOTAL No objeto de IVA</td>
          <td class="border right">$0.00</td>
        </tr>
        <tr>
          <td class="border">SUBTOTAL Exento de IVA</td>
          <td class="border right">$0.00</td>
        </tr>
        <tr>
          <td class="border">SUBTOTAL SIN IMPUESTOS</td>
          <td class="border right">$' . round($subtotal, 2) . '</td>
        </tr>
        <tr>
          <td class="border">DESCUENTO</td>
          <td class="border right">$' . round($descuento_guia, 2) . '</td>
        </tr>
        <tr>
          <td class="border">IVA 12%</td>
          <td class="border right">$' . round($iva_guia, 2) . '</td>
        </tr>
        <tr>
          <td class="border"><b>VALOR TOTAL</b></td>
          <td class="border right"><b>$' . round($total_guia, 2) . '</b></td>
        </tr>
      </table>
    </td>
  </tr>
</table>
';

  // set font
  $pdf->SetFont('helvetica', '', 10);

  // add a page
  $pdf->AddPage();

  // Draw header boxes
  $pdf->writeHTMLCell(90, 95, 10, 10, $html_left, 1, 0, false, false, 'L', true);
  $pdf->writeHTMLCell(90, 95, 110, 10, $html_right, 1, 1, false, false, 'L', true);

  // Barcode
  $style = array(
    'position' => '',
    'align' => 'C',
    'stretch' => false,
    'fitwidth' => true,
    'cellfitalign' => '',
    'border' => false,
    'hpadding' => 'auto',
    'vpadding' => 'auto',
    'fgcolor' => array(0, 0, 0),
    'bgcolor' => false,
    'text' => true,
    'font' => 'helvetica',
    'fontsize' => 7,
    'stretchtext' => 4
  );
  // Posicionamos el código de barras al fondo del recuadro derecho
  $pdf->write1DBarcode($clave_autorizacion, 'C128', 112, 85, 86, 15, 0.4, $style, 'N');

  // Body content starts below header boxes
  $pdf->SetY(110);
  $pdf->writeHTML($html_body, true, false, true, false, '');

  $pdf->SetFont('helvetica', '', 10);

  // Output PDF

  $tmp_dir = __DIR__ . DIRECTORY_SEPARATOR . 'tmp';
  if (!is_dir($tmp_dir)) {
    mkdir($tmp_dir, 0777, true);
  }
  $pdf_file_name = 'factura.pdf';
  $pdf_path = $tmp_dir . DIRECTORY_SEPARATOR . $pdf_file_name;

  $pdf->Output($pdf_path, 'F');

  $array = array(
    "ruta" => $pdf_file_name,
    "success" => true,
    "borrar" => $pdf_path,

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
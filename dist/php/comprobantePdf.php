<?php
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
//include "barcode.php";

try {
    $fecha_actual = date('Y-m-d\TH:i:s');
    $id_comprobante_cobro = $_GET['id_comprobante'];


    // create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);

    $conn = conexion();
    $query = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa,
imagen_empresa FROM empresa WHERE 1";
    $recuperar = mysqli_query($conn, $query) or die(mysqli_error($conn));
    $vals = mysqli_fetch_array($recuperar);

    $id_empresa = $vals["id_empresa"];
    $telefono_empresa = $vals["telefono_empresa"];
    $correo_empresa = $vals["correo_empresa"];
    $ruc_empresa = $vals["ruc_empresa"];
    $direccion_empresa = $vals["direccion_empresa"];
    $razon_social_empresa = $vals["razon_social_empresa"];


    $query_verificar = "SELECT id_comprobante_cobro,
archivo_comprobante_cobro,factura.numero_factura,numero_comprobante_cobro,guia.numero_guia , usuario.nombre_usuario,
usuario.apellido_usuario,sucursal.punto_emision_sucursal
,comprobante_cobro.fecha_emision_comprobante_cobro,comprobante_cobro.monto_comprobante_cobro, sucursal.nombre_sucursal ,
comprobante_cobro.observacion_comprobante_cobro ,guia.punto_emision_guia,factura.punto_emision_factura,nombre_sucursal
,comprobante_cobro.concepto_detalle_comprobante_cobro, forma_pago.nombre_forma_pago FROM comprobante_cobro ,
factura,guia ,usuario, sucursal, forma_pago WHERE id_comprobante_cobro = $id_comprobante_cobro AND
comprobante_cobro.id_fkfactura_comprobante_cobro= factura.id_factura AND factura.id_fkguia_factura= guia.id_guia AND
comprobante_cobro.id_fkusuario_comprobante_cobro = usuario.id_usuario AND guia.sucursal_guia = sucursal.id_sucursal AND
factura.id_fksucursal_factura = sucursal.id_sucursal AND comprobante_cobro.id_fkforma_pago = forma_pago.id_forma_pago";
    $recuperar2 = mysqli_query($conn, $query_verificar) or die(mysqli_error($conn));
    $vals2 = mysqli_fetch_array($recuperar2);

    $id_comprobante_cobro = $vals2["id_comprobante_cobro"];
    $archivo_comprobante_cobro = $vals2["archivo_comprobante_cobro"];
    $numero_factura = $vals2["numero_factura"];
    $numero_comprobante_cobro = $vals2["numero_comprobante_cobro"];
    $resultado = sprintf("%09s", $vals2['numero_guia']);
    $nombre_usuario = $vals2["nombre_usuario"];
    $apellido_usuario = $vals2["apellido_usuario"];
    $punto_emision_sucursal = $vals2["punto_emision_sucursal"];
    $fecha_emision_comprobante_cobro = $vals2["fecha_emision_comprobante_cobro"];
    $monto_comprobante_cobro = $vals2["monto_comprobante_cobro"];
    $nombre_sucursal = $vals2["nombre_sucursal"];
    $observacion_comprobante_cobro = $vals2["observacion_comprobante_cobro"];
    $punto_emision_guia = $vals2["punto_emision_guia"];
    $punto_emision_factura = $vals2["punto_emision_factura"];
    $concepto_detalle_comprobante_cobro = $vals2["concepto_detalle_comprobante_cobro"];
    $nombre_sucursal_2 = $vals2["nombre_sucursal"];
    $nombre_forma_pago = $vals2["nombre_forma_pago"];

    $rutaLogo = obtenerRutaLogoEmpresa($conn);
    $html_logo = '';
    if ($rutaLogo) {
        $html_logo = '<div style="text-align:center;margin-bottom:10px;"><img src="' . $rutaLogo . '"
        style="max-width:100px;max-height:100px;" /></div>';
    }

    $html = '
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<style>

*{
                        
    font-family: Helvetica;
    font-size: 10px;
}

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
    font-size: 10px;
    font-weight:bold;
}

.despacho{
    font-size: 15px;
    font-weight:bold;
}

.contenidos{
    font-size: 10px;
}

.derecha{
    content-align: right;
    text-align: right;
}

.contenedor-imagen {
    border: solid black;
    display: inline-block;
    height: 220px;
    width:  200px;
    display: block;
  }

</style>

<body>
    ' . $html_logo . '
    <p>
        <strong>' . $razon_social_empresa . '</strong> <br>
        <strong>RUC: ' . $ruc_empresa . '</strong> <br>
        <strong>Dirección:</strong> ' . $direccion_empresa . ' <br>
        <strong>Teléfono:</strong> ' . $telefono_empresa . '<br>
        <strong>Email:</strong> ' . $correo_empresa . '<br>
    </p>

    <p class="center">
        <strong>COMPROBANTE DE INGRESO</strong> <br>
        No.- ' . $numero_comprobante_cobro . '
    </p>

    <p class="derecha">
        <strong>Fecha emisión: ' . $fecha_emision_comprobante_cobro . '</strong> <br>
        <strong>Usuario: ' . $nombre_usuario . ' ' . $apellido_usuario . '</strong>
    </p>

    <table style="border: 1px solid black">
        <tr style="border: 1px solid black">
            <td style="border: 1px solid black">
                <p>
                    <strong>Fecha:</strong> <br>
                    ' . $fecha_emision_comprobante_cobro . '
                </p>
            </td>
            <td style="border: 1px solid black">
                <p>
                    <strong>Monto Cobrado:</strong> <br>
                    $' . $monto_comprobante_cobro . '
                </p>
            </td>
        </tr>
        <tr style="border: 1px solid black">
            <td colspan="2" style="border: 1px solid black">
                <p>
                    <strong>Recibido de:</strong> <br>
                    ' . $nombre_usuario . ' ' . $apellido_usuario . '
                </p>
            </td>
        </tr>
        <tr style="border: 1px solid black">
            <td style="border: 1px solid black">
                <p>
                    <strong>Tipo de Documento:</strong> <br>
                    FACTURA
                </p>
            </td>
            <td style="border: 1px solid black">
                <p>
                    <strong>Nro:</strong> <br>
                    ' . $punto_emision_sucursal . '-' . $punto_emision_factura . '-' . $resultado . '
                </p>
            </td>
        </tr>
        <tr style="border: 1px solid black">
            <td style="border: 1px solid black">
                <p>
                    <strong>Tipo de Documento:</strong> <br>
                    GUIA
                </p>
            </td>
            <td style="border: 1px solid black">
                <p>
                    <strong>Nro:</strong> <br>
                    ' . $punto_emision_sucursal . '-' . $punto_emision_guia . '-' . $resultado . '
                </p>
            </td>
        </tr>
        <tr style="border: 1px solid black">
            <td style="border: 1px solid black">
                <p>
                    <strong>Sucursal:</strong> <br>
                    ' . $nombre_sucursal . '
                </p>
            </td>
            <td style="border: 1px solid black">
                <p>
                    <strong>Observaciones:</strong> <br>
                    ' . $observacion_comprobante_cobro . '
                </p>
            </td>
        </tr>
        <tr style="border: 1px solid black">
            <td style="border: 1px solid black">
                <p>
                    <strong>Forma de pago:</strong> <br>
                    ' . $nombre_forma_pago . '
                </p>
            </td>
            <td style="border: 1px solid black">
                <p>
                    <strong>Detalle:</strong> <br>
                    ' . $concepto_detalle_comprobante_cobro . '
                </p>
            </td>
        </tr>
    </table>

    <div></div>

    <p><b>Imagen del Comprobante:</b></p>
    <img class="contenedor-imagen center"
        src="data:image/png;base64,' . base64_encode($archivo_comprobante_cobro) . '" />


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
    $pdf->AddPage();






    // Add a page

    // Write HTML content

    $pdf->writeHTML($html, true, false, true, false, '');
    // Output PDF

    $tempDir = __DIR__ . '/tmp/';
    $fileName = 'comprobante.pdf';
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
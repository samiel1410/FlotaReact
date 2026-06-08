<?php
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";
//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
    $fecha_actual = date('Y-m-d H:i:s');

    $id_caja = $_GET['id_caja']; //76

    // create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa WHERE 1";
    $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
    $vals_empresa = mysqli_fetch_array($recuperar_empresa);

    $id_empresa = $vals_empresa["id_empresa"];
    $imagen_empresa = $vals_empresa["imagen_empresa"];
    $telefono_empresa = $vals_empresa["telefono_empresa"];
    $correo_empresa = $vals_empresa["correo_empresa"];
    $ruc_empresa = $vals_empresa["ruc_empresa"];
    $direccion_empresa = $vals_empresa["direccion_empresa"];
    $razon_social_empresa = $vals_empresa["razon_social_empresa"];

    //CAJA

    $query_caja = "SELECT nombre_sucursal,
estado_solicitud,id_caja,fecha_caja,apertura_total_caja,cierre_total_caja,id_fksucursal_caja,estado_caja,cuadre_caja,CONCAT(nombre_usuario,'
',apellido_usuario) as usuario,fecha_hora_cierre,id_fkusuario_caja FROM caja,usuario,sucursal2 WHERE 1=1 AND
id_fkusuario_caja=id_usuario AND id_fksucursal_caja = suc_codigo_sucursal AND id_caja= $id_caja";
    $recuperar_empresa = mysqli_query($conn, $query_caja) or die(mysqli_error($conn));
    $vals_caja = mysqli_fetch_array($recuperar_empresa);

    $fecha_apertura = $vals_caja['fecha_caja'];
    $total_apertura = $vals_caja['apertura_total_caja'];
    $fecha_hora_cierre = $vals_caja['fecha_hora_cierre'];
    $cierre_total_caja = $vals_caja['cierre_total_caja'];

    $usuario = $vals_caja['usuario'];
    //GUIAS

    $query2 = "SELECT
a.id_guia,
a.punto_emision_guia,
a.numero_guia,
a.total_guia,
f.punto_emision_sucursal,
SUM(v.cantidad_detalle_guia) as cantidad,
COALESCE(h.monto_comprobante_cobro, 0) as cobrado,
COALESCE(a.total_guia, 0) - COALESCE(h.monto_comprobante_cobro, 0) as por_cobrar
FROM guia as a
INNER JOIN sucursal2 as f ON a.sucursal_guia = f.suc_codigo_sucursal
LEFT JOIN detalle_guia as v ON a.id_guia = v.id_fkguia_detalle_envio
LEFT JOIN (
SELECT id_factura, id_fkguia_factura
FROM factura
WHERE estado_factura = 1 OR estado_factura = 4
) as g ON g.id_fkguia_factura = a.id_guia
LEFT JOIN (
SELECT id_fkfactura_comprobante_cobro, SUM(monto_comprobante_cobro) as monto_comprobante_cobro
FROM comprobante_cobro
JOIN forma_pago ON id_fkforma_pago = forma_pago.id_forma_pago
WHERE estado_comprobante_cobro = 'COBRADA'
AND forma_pago.tipo_forma_pago = 2
AND id_fkcaja_comprobante_cobro = $id_caja
GROUP BY id_fkfactura_comprobante_cobro
) as h ON h.id_fkfactura_comprobante_cobro = g.id_factura
WHERE id_fkcaja_guia = $id_caja AND estado_guia = 1
GROUP BY a.id_guia, a.punto_emision_guia, a.numero_guia, a.total_guia, f.punto_emision_sucursal, h.monto_comprobante_cobro
ORDER BY a.id_guia DESC
";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));
    $datos = "";
    $datos_comprobantes = "";
    $total_final = 0;

    $total_cantidad = 0;


    $total_por_cobrar = 0;
    while ($vals2 = mysqli_fetch_array($recuperar2)) {

        $resultado = sprintf("%09s", $vals2['numero_guia']);
        $id_guia = $vals2['id_guia'];
        $numero_guia = $vals2['punto_emision_sucursal'] . "-" . $vals2['punto_emision_guia'] . "-" . $resultado;

        //COMPROBANTES

        $total_por_cobrar = $total_por_cobrar + $vals2['por_cobrar'];

        $total_final = $total_final + $vals2['cobrado'];
        $total_cantidad = $total_cantidad + $vals2['cantidad'];
        $tabla = '
<tr>
    <td style=" border-bottom-style: dotted;"> ' . $numero_guia . '</td>
    <td style="border-bottom-style: dotted;"> $' . number_format((float) $vals2['cobrado'], 2) . '</td>

    <td style="border-bottom-style: dotted;"> ' . $vals2['cantidad'] . '</td>

</tr>
';

        $datos .= $tabla;

        //DATOS DE OTRAS GUIAS

    }
    ;

    $total_otras_guias = 0;

    $query_comprobantes = "SELECT sum(monto_comprobante_cobro) as
monto_comprobante_cobro,id_guia,punto_emision_sucursal,punto_emision_guia,numero_guia FROM
comprobante_cobro,factura,guia,sucursal2 WHERE comprobante_cobro.id_fkcaja_comprobante_cobro = $id_caja AND
comprobante_cobro.id_fkfactura_comprobante_cobro = factura.id_factura AND factura.id_fkguia_factura = guia.id_guia AND
factura.id_fkcaja_factura !=$id_caja AND guia.id_fkcaja_guia !=$id_caja AND guia.sucursal_guia =
sucursal2.suc_codigo_sucursal AND estado_guia=1 GROUP by id_guia, punto_emision_sucursal, punto_emision_guia, numero_guia";

    $recuperar_comprobantes = mysqli_query($conn, $query_comprobantes) or die(mysqli_error($conn));

    if (mysqli_num_rows($recuperar_comprobantes) > 0) {

        while ($vals_comprobantes = mysqli_fetch_array($recuperar_comprobantes)) {



            if ($vals_comprobantes['numero_guia']) {
                $resultado_compro = sprintf("%09s", $vals_comprobantes['numero_guia']);
                $numero_guia_comprobantes = $vals_comprobantes['punto_emision_sucursal'] . "-" .
                    $vals_comprobantes['punto_emision_guia'] . "-" . $resultado_compro;
            } else {
                $resultado_compro = "";
                $numero_guia_comprobante = "";
            }




            $total_otras_guias = $total_otras_guias + $vals_comprobantes['monto_comprobante_cobro'];
            $tabla_comprobantes = '
<tr>
    <td style=" border-bottom-style: dotted;"> ' . $numero_guia_comprobantes . '</td>

    <td style=" border-bottom-style: dotted;"> $' . number_format(
                (float) $vals_comprobantes['monto_comprobante_cobro'],
                2
            ) . '</td>


</tr>
';

            $datos_comprobantes .= $tabla_comprobantes;

        }

    } else {

        $tabla_comprobantes = '

';

        $datos_comprobantes .= $tabla_comprobantes;



    }


    //EGRESOS/INGRESOS

    $query_egresos_ingresos = "SELECT caja_detalle.tipo_caja_detalle, sum(caja_detalle.monto_caja_detalle) as total FROM
caja_detalle WHERE id_fkcaja =$id_caja GROUP BY tipo_caja_detalle";

    $datos_egresos = "";

    $recuperar_egresos = mysqli_query($conn, $query_egresos_ingresos) or die(mysqli_error($conn));

    $total_egresos = 0;
    $total_ingresos = 0;



    while ($vals_egresos = mysqli_fetch_array($recuperar_egresos)) {



        if (count($vals_egresos) > 0) {
            if ($vals_egresos['tipo_caja_detalle'] == "Egreso") {
                $total_egresos = $total_egresos + $vals_egresos['total'];
            } else if ($vals_egresos['tipo_caja_detalle'] == "Ingreso") {
                $total_ingresos = $total_ingresos + $vals_egresos['total'];
            }

            $tabla_egresos = '
<tr>
    <td style=" border-bottom-style: dotted;"> ' . $vals_egresos['tipo_caja_detalle'] . '</td>

    <td style=" border-bottom-style: dotted;"> $' . number_format((float) $vals_egresos['total'], 2) . '</td>


</tr>
';

            $datos_egresos .= $tabla_egresos;

        } else {

            $tabla_egresos = '
<tr>
    <td style=" border-bottom-style: dotted;"> EGRESO</td>

    <td style=" border-bottom-style: dotted;"> $0.00</td>


</tr>

<tr>
    <td style=" border-bottom-style: dotted;"> INGRESO</td>

    <td style=" border-bottom-style: dotted;"> $0.00</td>


</tr>
';

            $datos_egresos .= $tabla_egresos;


        }

    }

    $total_cobrado = $total_final + $total_otras_guias;


    $total_final_final = $total_cobrado + $total_ingresos - $total_egresos;



    $sqlSaldoCaja = "CALL saldoCaja($id_caja)";

    $recuperar_saldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));

    while ($vals_caja = mysqli_fetch_array($recuperar_saldo)) {
        $estado_cuadre = $vals_caja['estado_cuadre'];
        $saldo = $vals_caja['total_diferencia'];
    }
    mysqli_free_result($recuperar_saldo);
    while (mysqli_more_results($conn) && mysqli_next_result($conn)) {
        $extra = mysqli_store_result($conn);
        if ($extra) mysqli_free_result($extra);
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
    .center {
        text-align: center;
    }

    .borde_punto {
        width: 200px;
        /* Ajusta el ancho según tus necesidades */
        height: 200px;
        /* Ajusta la altura según tus necesidades */
        border: 1px dotted #000;
        /* Cambia el grosor y el color según tus necesidades */
        padding: 20px;
        /* Añade relleno para que el contenido no se pegue al borde */
    }


    .factura {
        font-size: 10px;
        font-weight: bold;
        color: gray
    }

    .titulo_inicio {
        font-size: 12px;

    }


    .linea {
        border-top: 1px dotted #000;
        /* 1px de ancho y puntos negros */
    }
</style>

<body>

    <p class="center">
        ' . (($rutaLogo = obtenerRutaLogoEmpresa($conn)) ? '<img width="64px" class="center"
            src="' . $rutaLogo . '" /><br>' : '') . '
        <span class="titulo_inicio">' . $razon_social_empresa . '</span> <br>
        <span class="titulo_inicio">RUC:' . $ruc_empresa . '</span> <br>
        <span class="titulo_inicio">CAJA</span> <br>
    </p>


    <span class=""><b>Oficinista:</b>' . $usuario . '</span><br><span class=""><b>Fecha y Hora :</b>' . $fecha_apertura
        . '</span>
    <br><span class=""><b>Fecha y Hora Cierre :</b>' . $fecha_hora_cierre . '</span>
    <br><span class=""><b>APERTURA:</b>$' . number_format((float) $total_apertura, 2) . '</span>
    <br><span class=""><b>CIERRE:</b>$' . number_format((float) $cierre_total_caja, 2) . '</span>

    <br><span class=""><b>SALDO ==></b>$' . number_format((float) $saldo, 2) . ' ' . $estado_cuadre . ' </span>

    <p class="center">
        <span class=""><b>CAJA</b></span>
    </p>

    <table>
        <tr style="content-align: center;">
            <th style=" border-bottom-style: dotted;">
                <strong>GUIA</strong>
            </th>
            <th style="border-bottom-style: dotted;">
                <strong>COBRADO</strong>
            </th>
            <th style="border-bottom-style: dotted;">
                <strong>CANTIDAD</strong>
            </th>

        </tr>
        ' . $datos . '

        <tr style="content-align: center;">
            <th style="border-bottom-style: dotted;">
                <strong></strong>
            </th>
            <th style="border-bottom-style: dotted;">

                <strong>TOTAL:$' . number_format((float) $total_final, 2) . '</strong>
            </th>

        </tr>
    </table>

    <div class="linea center">
        <br>
        <span class=""><b>OTRAS GUIAS</b></span>
        <br>




        <table>
            <tr style="content-align: center;">
                <th style=" border-bottom-style: dotted;">
                    <strong>GUIA</strong>
                </th>
                <th style="border-bottom-style: dotted;">
                    <strong>COBRADO</strong>
                </th>

            </tr>
            ' . $datos_comprobantes . '

            <tr style="content-align: center;">
                <th style="border-bottom-style: dotted;">
                    <strong></strong>
                </th>
                <th style="border-bottom-style: dotted;">
                    <strong>TOTAL:$' . number_format((float) $total_otras_guias, 2) . '</strong>
                </th>

            </tr>
        </table>


        <br>

        <div class="linea center">
            <br>
            <span class=""><b>EGRESOS/INGRESOS</b></span>
            <br>


            <table>
                <tr style="content-align: center;">
                    <th style=" border-bottom-style: dotted;">
                        <strong>TIPO</strong>
                    </th>


                    <th style="border-bottom-style: dotted;">
                        <strong>TOTAL</strong>
                    </th>



                </tr>
                ' . $datos_egresos . '


            </table>





            <br>
            <br>





            <strong>TOTAL COBRADO:$' . number_format((float) $total_cobrado, 2) . '</strong>
            <br><strong>TOTAL POR COBRAR:$' . number_format((float) $total_por_cobrar, 2) . '</strong>

            <br><strong>TOTAL EGRESOS:$' . number_format((float) $total_egresos, 2) . '</strong>
            <br><strong>TOTAL CANTIDAD:' . $total_cantidad . '</strong>

            <br><strong>TOTAL CAJA:$' . number_format((float) $total_final_final, 2) . '</strong>
            <br><strong>TOTAL GENERAL:$' . number_format((float) $total_final_final + (float) $total_por_cobrar, 2) .
        '</strong>

















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

    $pdf->SetLineStyle(array('width' => 0.1, 'cap' => 'butt', 'join' => 'miter', 'dash' => 3, 'color' => array(0, 0, 0)));

    // Dibujar un rectángulo con borde punteado
    $pdf->Rect(10, 17, 100, 25, 'D');

    // Add a page

    // Write HTML content

    $pdf->writeHTML($html, true, false, true, false, '');

    // Output PDF

    $pdf->Output(__DIR__ . '/tmp/guiaImpresion.pdf', 'I');

    $array = array(
        "ruta" => 'guiaImpresion.pdf',
        "success" => true,
        "borrar" => __DIR__ . '/tmp/guiaImpresion.pdf',

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
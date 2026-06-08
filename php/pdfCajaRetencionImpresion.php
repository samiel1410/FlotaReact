<?php
require_once 'library/tcpdf.php';
require_once "db.php";
//include "barcode.php";
date_default_timezone_set('America/Guayaquil');
try {
    $fecha_actual = date('Y-m-d H:i:s');

    $id_caja = $_GET['id_caja']; //76

    // create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

    $conn = conexion();
    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa WHERE 1";
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

    $query_caja = "SELECT nombre_sucursal, estado_solicitud,id_caja_retenciones,fecha_caja,apertura_total_caja,cierre_total_caja,id_fksucursal_caja,estado_caja,cuadre_caja,CONCAT(nombre_usuario,' ',apellido_usuario) as usuario,fecha_hora_cierre,id_fkusuario_caja FROM caja_retenciones,usuario,sucursal2 WHERE 1=1 AND id_fkusuario_caja=id_usuario AND id_fksucursal_caja = suc_codigo_sucursal AND id_caja_retenciones= $id_caja";
    $recuperar_empresa = mysqli_query($conn, $query_caja) or die(mysqli_error($conn));
    $vals_caja = mysqli_fetch_array($recuperar_empresa);

    $fecha_apertura = $vals_caja['fecha_caja'];
    $total_apertura = $vals_caja['apertura_total_caja'];
    $fecha_hora_cierre = $vals_caja['fecha_hora_cierre'];
    $cierre_total_caja = $vals_caja['cierre_total_caja'];

    $usuario = $vals_caja['usuario'];
//GUIAS

    $query2 = "SELECT 
                c.id_cobros,
                c.tipo_cobro,
                tc.nombre_tipo_cobros,
                s.nombre_sucursal,
                u.nombre_usuario,
                c.monto_cobros,
                c.id_fkbus_cobros,
                c.observacion_cobros,
                c.id_fkusuario_cobros,
                c.id_fkoficina_cobros,
                c.id_fksucursal_cobros,
                c.estado_cobros,
                c.fecha_creacion_cobros,
                c.fecha_cobros,
                COALESCE(SUM(ccr.monto_comprobante_cobro), 0) as total_pagado,
                (c.monto_cobros - COALESCE(SUM(ccr.monto_comprobante_cobro), 0)) as saldo_pendiente
            FROM cobros c
            INNER JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
            INNER JOIN sucursal2 s ON c.id_fksucursal_cobros = s.suc_codigo_sucursal
            INNER JOIN usuario u ON c.id_fkusuario_cobros = u.id_usuario
            INNER JOIN comprobante_cobro_retenciones ccr ON c.id_cobros = ccr.id_fkcobro_comprobante_cobro 
                AND ccr.estado_comprobante_cobro = 'COBRADA' AND ccr.id_fkcaja_comprobante_cobro = $id_caja
         
            GROUP BY 
                c.id_cobros,
                c.tipo_cobro,
                tc.nombre_tipo_cobros,
                s.nombre_sucursal,
                u.nombre_usuario,
                c.monto_cobros,
                c.id_fkbus_cobros,
                c.observacion_cobros,
                c.id_fkusuario_cobros,
                c.id_fkoficina_cobros,
                c.id_fksucursal_cobros,
                c.estado_cobros,
                c.fecha_creacion_cobros,
                c.fecha_cobros
            ORDER BY c.id_cobros DESC
";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));
    $datos = "";
    $datos_comprobantes = "";
    $total_final = 0;

    $total_por_cobrar=0;
    while ($vals2 = mysqli_fetch_array($recuperar2)) {
	
        $id_cobros = $vals2['id_cobros'];
        $nombre_tipo_cobros = $vals2['nombre_tipo_cobros'];
        $monto_cobros = $vals2['monto_cobros'];
        $total_pagado = $vals2['total_pagado'];
        $saldo_pendiente = $vals2['saldo_pendiente'];

//COMPROBANTES

        $total_por_cobrar = $total_por_cobrar + $saldo_pendiente;

        $total_final = $total_final + $total_pagado;
        $tabla = '
    <tr>
        <td style=" border-bottom-style: dotted;"> ' . $nombre_tipo_cobros . ' #' . $id_cobros . '</td>
        <td style="border-bottom-style: dotted;"> $' . number_format((float) $total_pagado, 2) . '</td>
 		<td style="border-bottom-style: dotted;"> $' . number_format((float) $monto_cobros, 2) . '</td>
    </tr>
    ';

        $datos .= $tabla;

        //DATOS DE OTRAS GUIAS

    }
    ;

    $total_otras_guias = 0;
  

    //EGRESOS/INGRESOS

    $query_egresos_ingresos = "SELECT caja_detalle_retenciones.tipo_caja_detalle, sum(caja_detalle_retenciones.monto_caja_detalle) as total FROM caja_detalle_retenciones WHERE id_fkcaja_boleteria = $id_caja GROUP BY tipo_caja_detalle";

    $datos_egresos = "";

    $recuperar_egresos = mysqli_query($conn, $query_egresos_ingresos) or die(mysqli_error($conn));

    $total_egresos=0;
    $total_ingresos=0;



    while ($vals_egresos = mysqli_fetch_array($recuperar_egresos)) {
		


        if(count($vals_egresos)>0){
            if($vals_egresos['tipo_caja_detalle']=="Egreso"){
                $total_egresos=$total_egresos+$vals_egresos['total'];
            }else if($vals_egresos['tipo_caja_detalle']=="Ingreso"){
                $total_ingresos=$total_ingresos+$vals_egresos['total'];
            }

            $tabla_egresos = '
        <tr>
            <td style=" border-bottom-style: dotted;"> ' .  $vals_egresos['tipo_caja_detalle'] . '</td>

            <td style=" border-bottom-style: dotted;"> $' . number_format((float) $vals_egresos['total'], 2) . '</td>


        </tr>
        ';

            $datos_egresos .= $tabla_egresos;

        }

        else{

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

    $total_cobrado= $total_final+$total_otras_guias;

    
    $total_final_final=$total_cobrado+$total_ingresos -$total_egresos;



     $sqlSaldoCaja = "CALL saldoCajaRetenciones($id_caja)";

     $recuperar_saldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));

     while ($vals_caja= mysqli_fetch_array($recuperar_saldo)) {


        $estado_cuadre=$vals_caja['estado_cuadre'];
        $saldo=$vals_caja['total_diferencia'];

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

.center{
  text-align: center;
}

.borde_punto{
  width: 200px; /* Ajusta el ancho según tus necesidades */
  height: 200px; /* Ajusta la altura según tus necesidades */
  border: 1px dotted #000; /* Cambia el grosor y el color según tus necesidades */
  padding: 20px; /* Añade relleno para que el contenido no se pegue al borde */
}


.factura{
  font-size:10px;
  font-weight:bold;
  color:gray
}

.titulo_inicio{
  font-size:12px;

}


.linea{
    border-top: 1px dotted #000; /* 1px de ancho y puntos negros */
}

</style>

<body>

        <p class="center">
        <span class="titulo_inicio">' . $razon_social_empresa . '</span> <br>
        <span class="titulo_inicio">RUC:' . $ruc_empresa . '</span> <br>
        <span class="titulo_inicio">CAJA RETENCIONES</span> <br>
        </p>


        <span class=""><b>Oficinista:</b>' . $usuario . '</span><br><span class=""><b>Fecha y Hora :</b>' . $fecha_apertura . '</span>
		<br><span class=""><b>Fecha y Hora Cierre :</b>' . $fecha_hora_cierre . '</span>
        <br><span class=""><b>APERTURA:</b>$' . number_format((float)  $total_apertura ,2). '</span>
        <br><span class=""><b>CIERRE:</b>$' .  number_format((float)$cierre_total_caja ,2). '</span>
		
        <br><span class=""><b>SALDO ==></b>$'.number_format((float)$saldo,2).' '.$estado_cuadre.' </span>

        <p class="center">
        <span class=""><b>CAJA</b></span>
        </p>

        <table>
            <tr style="content-align: center;">
                <th style=" border-bottom-style: dotted;">
                <strong>COBRO</strong>
                </th>
                <th style="border-bottom-style: dotted;">
                <strong>COBRADO</strong>
                </th>
				 <th style="border-bottom-style: dotted;">
                <strong>MONTO</strong>
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

   
  
  
      
     <strong>TOTAL COBRADO:$'. number_format((float)$total_cobrado,2).'</strong>
    <br><strong>TOTAL POR COBRAR:$' . number_format((float) $total_por_cobrar, 2) . '</strong>

 	<br><strong>TOTAL EGRESOS:$'. number_format((float)$total_egresos,2).'</strong>

  	<br><strong>TOTAL  CAJA:$'. number_format((float)$total_final_final,2).'</strong>
      	<br><strong>TOTAL  GENERAL:$'. number_format((float)$total_final_final+(float) $total_por_cobrar,2).'</strong>

    
  




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

    $pdf_file_name = 'guiaImpresion.pdf';
    $pdf->Output($pdf_file_name, 'I');

    $array = array(
        "ruta" => $pdf_file_name,
        "success" => true,
        "borrar" => __DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . $pdf_file_name,

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

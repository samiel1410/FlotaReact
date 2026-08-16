<?php
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";

date_default_timezone_set('America/Guayaquil');
try {
    $fecha_actual = date('Y-m-d H:i:s');

    $id_caja = (int)$_GET['id_caja'];

    // create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array(500, 200), true, 'UTF-8', false);

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
    $recuperar_empresa = mysqli_query($conn, $query_empresa) or die(mysqli_error($conn));
    $vals_empresa = mysqli_fetch_array($recuperar_empresa);

    $id_empresa = $vals_empresa["id_empresa"];
    $imagen_empresa = $vals_empresa["imagen_empresa"];
    $telefono_empresa = $vals_empresa["telefono_empresa"];
    $correo_empresa = $vals_empresa["correo_empresa"];
    $ruc_empresa = $vals_empresa["ruc_empresa"];
    $direccion_empresa = $vals_empresa["direccion_empresa"];
    $razon_social_empresa = $vals_empresa["razon_social_empresa"];

    // ─── CAJA BOLETERIA ─────────────────────────────────────────
    $query_caja = "SELECT suc.nombre_sucursal,
        cb.estado_solicitud, cb.id_caja_boleteria as id_caja, cb.fecha_caja,
        cb.apertura_total_caja, cb.cierre_total_caja, cb.id_fksucursal_caja,
        cb.estado_caja, cb.cuadre_caja,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) as usuario,
        cb.fecha_hora_cierre, cb.id_fkusuario_caja 
    FROM caja_boleteria cb
    INNER JOIN usuario u ON cb.id_fkusuario_caja = u.id_usuario
    LEFT JOIN sucursal2 suc ON cb.id_fksucursal_caja = suc.suc_codigo_sucursal
    WHERE cb.id_caja_boleteria = $id_caja";

    $recuperar_caja = mysqli_query($conn, $query_caja) or die(mysqli_error($conn));
    $vals_caja = mysqli_fetch_array($recuperar_caja);

    $fecha_apertura = $vals_caja['fecha_caja'] ? date('Y-m-d H:i:s', strtotime($vals_caja['fecha_caja'])) : '';
    $total_apertura = $vals_caja['apertura_total_caja'];
    $fecha_hora_cierre = ($vals_caja['fecha_hora_cierre'] && $vals_caja['fecha_hora_cierre'] != '0000-00-00 00:00:00') ? date('Y-m-d H:i:s', strtotime($vals_caja['fecha_hora_cierre'])) : 'EN PROCESO';
    $cierre_total_caja = $vals_caja['cierre_total_caja'];
    $usuario = $vals_caja['usuario'];

    // ─── BOLETOS DE LA CAJA ─────────────────────────────────────
    $query2 = "SELECT 
        b.id_boleto,
        b.punto_emision_boleto,
        b.sucursal_emision_boleto,
        b.numero_boleto,
        b.total_boleto as cobrado,
        COALESCE(COUNT(bd.id_boleto_detalle), 1) as cantidad
    FROM boletos b
    LEFT JOIN boleto_detalle bd ON b.id_boleto = bd.id_fkboleto_boleto_detalle
    WHERE b.id_fkcaja_boleto = $id_caja AND b.estado_boleto IN (0, 1, 2)
    GROUP BY b.id_boleto, b.punto_emision_boleto, b.sucursal_emision_boleto, b.numero_boleto, b.total_boleto
    ORDER BY b.id_boleto DESC";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));
    $datos = "";
    $datos_comprobantes = "";
    $total_final = 0;
    $total_cantidad = 0;
    $total_por_cobrar = 0;

    while ($vals2 = mysqli_fetch_array($recuperar2)) {
        $resultado = sprintf("%09s", $vals2['numero_boleto']);
        $id_boleto = $vals2['id_boleto'];
        $sucursal_str = sprintf("%03s", $vals2['sucursal_emision_boleto']);
        $punto_str = sprintf("%03s", $vals2['punto_emision_boleto']);
        $numero_boleto_str = $sucursal_str . "-" . $punto_str . "-" . $resultado;

        $total_final += (float)$vals2['cobrado'];
        $total_cantidad += (int)$vals2['cantidad'];

        $tabla = '
<tr>
    <td style="border-bottom-style: dotted;"> ' . $numero_boleto_str . '</td>
    <td style="border-bottom-style: dotted;"> $' . number_format((float)$vals2['cobrado'], 2) . '</td>
    <td style="border-bottom-style: dotted;"> ' . $vals2['cantidad'] . '</td>
</tr>';
        $datos .= $tabla;
    }

    // ─── OTROS BOLETOS / SUCURSAL ────────────────────────────────
    $total_otras_guias = 0;

    // ─── EGRESOS / INGRESOS ──────────────────────────────────────
    $query_egresos_ingresos = "SELECT tipo_caja_detalle, SUM(monto_caja_detalle) as total 
    FROM caja_detalle_boleteria 
    WHERE id_fkcaja_boleteria = $id_caja 
    GROUP BY tipo_caja_detalle";

    $datos_egresos = "";
    $recuperar_egresos = mysqli_query($conn, $query_egresos_ingresos) or die(mysqli_error($conn));

    $total_egresos = 0;
    $total_ingresos = 0;

    while ($vals_egresos = mysqli_fetch_array($recuperar_egresos)) {
        if ($vals_egresos['tipo_caja_detalle'] == "Egreso") {
            $total_egresos += (float)$vals_egresos['total'];
        } else if ($vals_egresos['tipo_caja_detalle'] == "Ingreso") {
            $total_ingresos += (float)$vals_egresos['total'];
        }

        $tabla_egresos = '
<tr>
    <td style="border-bottom-style: dotted;"> ' . $vals_egresos['tipo_caja_detalle'] . '</td>
    <td style="border-bottom-style: dotted;"> $' . number_format((float)$vals_egresos['total'], 2) . '</td>
</tr>';
        $datos_egresos .= $tabla_egresos;
    }

    $total_cobrado = $total_final + $total_otras_guias;
    $total_final_final = $total_cobrado + $total_ingresos - $total_egresos;

    // ─── SALDO CAJA BOLETERIA ───────────────────────────────────
    $sqlSaldoCaja = "CALL saldoCajaBoleteria($id_caja)";
    $recuperar_saldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));

    $estado_cuadre = 'DESCONOCIDO';
    $saldo = 0;
    while ($vals_saldo = mysqli_fetch_array($recuperar_saldo)) {
        $estado_cuadre = isset($vals_saldo['estado_cuadre']) ? $vals_saldo['estado_cuadre'] : '';
        $saldo = isset($vals_saldo['total_diferencia']) ? $vals_saldo['total_diferencia'] : 0;
    }
    mysqli_free_result($recuperar_saldo);
    while (mysqli_more_results($conn) && mysqli_next_result($conn)) {
        $extra = mysqli_store_result($conn);
        if ($extra) mysqli_free_result($extra);
    }

    $html = '
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Impresión Caja Boletería</title>
</head>
<style>
    .center { text-align: center; }
    .titulo_inicio { font-size: 12px; }
    .linea { border-top: 1px dotted #000; }
</style>

<body>

    <p class="center">
        ' . (($rutaLogo = obtenerRutaLogoEmpresa($conn)) ? '<img width="64px" class="center" src="' . $rutaLogo . '" /><br>' : '') . '
        <span class="titulo_inicio">' . $razon_social_empresa . '</span> <br>
        <span class="titulo_inicio">RUC:' . $ruc_empresa . '</span> <br>
        <span class="titulo_inicio">CAJA BOLETERIA</span> <br>
    </p>

    <span class=""><b>Oficinista:</b> ' . $usuario . '</span><br>
    <span class=""><b>Fecha y Hora:</b> ' . $fecha_apertura . '</span><br>
    <span class=""><b>Fecha y Hora Cierre:</b> ' . $fecha_hora_cierre . '</span><br>
    <span class=""><b>APERTURA:</b>$' . number_format((float)$total_apertura, 2) . '</span><br>
    <span class=""><b>CIERRE:</b>$' . number_format((float)$cierre_total_caja, 2) . '</span><br>
    <span class=""><b>SALDO ==></b>$' . number_format((float)$saldo, 2) . ' ' . $estado_cuadre . '</span>

    <p class="center">
        <span class=""><b>BOLETOS</b></span>
    </p>

    <table>
        <tr style="content-align: center;">
            <th style="border-bottom-style: dotted;"><strong>BOLETO</strong></th>
            <th style="border-bottom-style: dotted;"><strong>COBRADO</strong></th>
            <th style="border-bottom-style: dotted;"><strong>CANTIDAD</strong></th>
        </tr>
        ' . $datos . '
        <tr style="content-align: center;">
            <th style="border-bottom-style: dotted;"><strong></strong></th>
            <th style="border-bottom-style: dotted;" colspan="2">
                <strong>TOTAL:$' . number_format((float)$total_final, 2) . '</strong>
            </th>
        </tr>
    </table>

    <div class="linea center">
        <br>
        <span class=""><b>OTROS BOLETOS</b></span>
        <br>
        <table>
            <tr style="content-align: center;">
                <th style="border-bottom-style: dotted;"><strong>BOLETO</strong></th>
                <th style="border-bottom-style: dotted;"><strong>COBRADO</strong></th>
            </tr>
            ' . $datos_comprobantes . '
            <tr style="content-align: center;">
                <th style="border-bottom-style: dotted;"><strong></strong></th>
                <th style="border-bottom-style: dotted;">
                    <strong>TOTAL:$' . number_format((float)$total_otras_guias, 2) . '</strong>
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
                    <th style="border-bottom-style: dotted;"><strong>TIPO</strong></th>
                    <th style="border-bottom-style: dotted;"><strong>TOTAL</strong></th>
                </tr>
                ' . $datos_egresos . '
            </table>

            <br><br>
            <strong>TOTAL COBRADO:$' . number_format((float)$total_cobrado, 2) . '</strong><br>
            <strong>TOTAL POR COBRAR:$' . number_format((float)$total_por_cobrar, 2) . '</strong><br>
            <strong>TOTAL EGRESOS:$' . number_format((float)$total_egresos, 2) . '</strong><br>
            <strong>TOTAL CANTIDAD:' . $total_cantidad . '</strong><br>
            <strong>TOTAL CAJA:$' . number_format((float)$total_final_final, 2) . '</strong><br>
            <strong>TOTAL GENERAL:$' . number_format((float)$total_final_final + (float)$total_por_cobrar, 2) . '</strong>
</body>
</html>
';

    $pdf->SetFont('helvetica', '', 10);
    $pdf->AddPage('P', array(500, 120));
    $pdf->SetLineStyle(array('width' => 0.1, 'cap' => 'butt', 'join' => 'miter', 'dash' => 3, 'color' => array(0, 0, 0)));
    $pdf->Rect(10, 17, 100, 25, 'D');

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('cajaBoleteriaImpresion.pdf', 'I');
    exit;

} catch (Exception $e) {
    echo json_encode(array("error" => $e->getMessage(), "success" => false));
}
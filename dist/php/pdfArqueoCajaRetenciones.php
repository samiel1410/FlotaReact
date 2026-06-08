<?php
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";

date_default_timezone_set('America/Guayaquil');

try {
    $id_caja = isset($_GET['id_caja']) ? $_GET['id_caja'] : 0;
    
    $conn = conexion();
    
    // Obtener información de la caja y usuario
    $sqlCaja = "SELECT id_caja_retenciones, fecha_caja, CONCAT(nombre_usuario,' ',apellido_usuario) as cajero,
                apertura_100_caja, apertura_50_caja, apertura_20_caja, apertura_10_caja, apertura_5_caja, apertura_1_caja, apertura_moneda_caja, apertura_moneda_50_caja, apertura_moneda_25_caja, apertura_moneda_10_caja, apertura_moneda_5_caja, apertura_moneda_1_caja, apertura_total_caja, 
                cierre_100_caja, cierre_50_caja, cierre_20_caja, cierre_10_caja, cierre_5_caja, cierre_1_caja, cierre_moneda_caja, cierre_moneda_50_caja, cierre_moneda_25_caja, cierre_moneda_10_caja, cierre_moneda_5_caja, cierre_moneda_1_caja, cierre_total_caja, 
                sucursal_caja, punto_emision_caja, id_fksucursal_caja, id_fkusuario_caja, estado_caja, cuadre_caja, fecha_hora_cierre, tipo_registro_caja, configuracion_reporte_caja, logs_edicion_caja, estado_arqueo_caja, total_estado_arqueo 
                FROM caja_retenciones, usuario 
                WHERE id_caja_retenciones = $id_caja AND id_fkusuario_caja = usuario.id_usuario";
    
    $resultCaja = mysqli_query($conn, $sqlCaja) or die(mysqli_error($conn));
    
    if (mysqli_num_rows($resultCaja) > 0) {
        $caja = mysqli_fetch_array($resultCaja);
        
        $fecha_caja = date('Y-m-d H:i:s', strtotime($caja['fecha_caja']));
        $cajero = $caja['cajero'];
        $fecha_hora_cierre = $caja['fecha_hora_cierre'] ? date('Y-m-d H:i:s', strtotime($caja['fecha_hora_cierre'])) : '';
        $razon_social = 'FLOTA PELLILEO';
        
        // APERTURA
        $apertura_100_caja = $caja['apertura_100_caja'];
        $apertura_50_caja = $caja['apertura_50_caja'];
        $apertura_20_caja = $caja['apertura_20_caja'];
        $apertura_10_caja = $caja['apertura_10_caja'];
        $apertura_5_caja = $caja['apertura_5_caja'];
        $apertura_1_caja = $caja['apertura_1_caja'];
        $apertura_moneda_caja = $caja['apertura_moneda_caja'];
        $apertura_moneda_50_caja = $caja['apertura_moneda_50_caja'];
        $apertura_moneda_25_caja = $caja['apertura_moneda_25_caja'];
        $apertura_moneda_10_caja = $caja['apertura_moneda_10_caja'];
        $apertura_moneda_5_caja = $caja['apertura_moneda_5_caja'];
        $apertura_moneda_1_caja = $caja['apertura_moneda_1_caja'];
        $apertura_total_caja = number_format((float)$caja['apertura_total_caja'], 2, '.', '');
        
        $_apertura_100_caja = number_format($apertura_100_caja * 100, 2, '.', '');
        $_apertura_50_caja = number_format($apertura_50_caja * 50, 2, '.', '');
        $_apertura_20_caja = number_format($apertura_20_caja * 20, 2, '.', '');
        $_apertura_10_caja = number_format($apertura_10_caja * 10, 2, '.', '');
        $_apertura_5_caja = number_format($apertura_5_caja * 5, 2, '.', '');
        $_apertura_1_caja = number_format($apertura_1_caja, 2, '.', '');
        $_apertura_moneda_caja = number_format($apertura_moneda_caja, 2, '.', '');
        $_apertura_moneda_50_caja = number_format($apertura_moneda_50_caja * 0.50, 2, '.', '');
        $_apertura_moneda_25_caja = number_format($apertura_moneda_25_caja * 0.25, 2, '.', '');
        $_apertura_moneda_10_caja = number_format($apertura_moneda_10_caja * 0.10, 2, '.', '');
        $_apertura_moneda_5_caja = number_format($apertura_moneda_5_caja * 0.05, 2, '.', '');
        $_apertura_moneda_1_caja = number_format($apertura_moneda_1_caja * 0.01, 2, '.', '');
        
        // CIERRE
        $cierre_100_caja = $caja['cierre_100_caja'];
        $cierre_50_caja = $caja['cierre_50_caja'];
        $cierre_20_caja = $caja['cierre_20_caja'];
        $cierre_10_caja = $caja['cierre_10_caja'];
        $cierre_5_caja = $caja['cierre_5_caja'];
        $cierre_1_caja = $caja['cierre_1_caja'];
        $cierre_moneda_caja = $caja['cierre_moneda_caja'];
        $cierre_moneda_50_caja = $caja['cierre_moneda_50_caja'];
        $cierre_moneda_25_caja = $caja['cierre_moneda_25_caja'];
        $cierre_moneda_10_caja = $caja['cierre_moneda_10_caja'];
        $cierre_moneda_5_caja = $caja['cierre_moneda_5_caja'];
        $cierre_moneda_1_caja = $caja['cierre_moneda_1_caja'];
        $cierre_total_caja = number_format((float)$caja['cierre_total_caja'], 2, '.', '');
        
        $_cierre_100_caja = number_format($cierre_100_caja * 100, 2, '.', '');
        $_cierre_50_caja = number_format($cierre_50_caja * 50, 2, '.', '');
        $_cierre_20_caja = number_format($cierre_20_caja * 20, 2, '.', '');
        $_cierre_10_caja = number_format($cierre_10_caja * 10, 2, '.', '');
        $_cierre_5_caja = number_format($cierre_5_caja * 5, 2, '.', '');
        $_cierre_1_caja = number_format($cierre_1_caja, 2, '.', '');
        $_cierre_moneda_caja = number_format($cierre_moneda_caja, 2, '.', '');
        $_cierre_moneda_50_caja = number_format($cierre_moneda_50_caja * 0.50, 2, '.', '');
        $_cierre_moneda_25_caja = number_format($cierre_moneda_25_caja * 0.25, 2, '.', '');
        $_cierre_moneda_10_caja = number_format($cierre_moneda_10_caja * 0.10, 2, '.', '');
        $_cierre_moneda_5_caja = number_format($cierre_moneda_5_caja * 0.05, 2, '.', '');
        $_cierre_moneda_1_caja = number_format($cierre_moneda_1_caja * 0.01, 2, '.', '');
        
        // SALDOS
        $sqlSaldoCaja = "CALL saldoCajaBoleteria($id_caja)"; // Retenciones usa este proc.
        $resultSaldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));
        $saldoCaja = mysqli_fetch_array($resultSaldo);
        
        while(mysqli_next_result($conn)){
            if($res = mysqli_store_result($conn)){
                mysqli_free_result($res);
            }
        }
        
        $totalIngresosDetalle = isset($saldoCaja['total_ingreso_detalle']) ? number_format((float)$saldoCaja['total_ingreso_detalle'], 2, '.', '') : '0.00';
        $totalEgresosDetalle = isset($saldoCaja['total_egreso_detalle']) ? number_format((float)$saldoCaja['total_egreso_detalle'], 2, '.', '') : '0.00';
        $totalEfectivoDetalle = isset($saldoCaja['total_efectivo_caja']) ? number_format((float)$saldoCaja['total_efectivo_caja'], 2, '.', '') : '0.00';
        $total_documentos = isset($saldoCaja['total_documento']) ? number_format((float)$saldoCaja['total_documento'], 2, '.', '') : '0.00';
        $estado_cuadre = isset($saldoCaja['estado_cuadre']) ? $saldoCaja['estado_cuadre'] : 'DESCONOCIDO';
        $saldo = isset($saldoCaja['total_diferencia']) ? number_format((float)$saldoCaja['total_diferencia'], 2, '.', '') : '0.00';
        
        $total_apertura = isset($saldoCaja['_tot_apertura']) ? number_format((float)$saldoCaja['_tot_apertura'], 2, '.', '') : '0.00';
        $total_cierre = isset($saldoCaja['_tot_cierre']) ? number_format((float)$saldoCaja['_tot_cierre'], 2, '.', '') : '0.00';
        $total_general_efectivo = isset($saldoCaja['_total_arqueo']) ? number_format((float)$saldoCaja['_total_arqueo'], 2, '.', '') : '0.00';
        $ventas_ingreso = number_format((float)($totalIngresosDetalle + $totalEfectivoDetalle), 2, '.', '');
        
        // DETALLES
        $sqlDetalleCajaIngreso = "SELECT id_caja_detalle_retenciones as id_caja_detalle, fecha_caja_detalle, tipo_caja_detalle, monto_caja_detalle, observacion_caja_detalle, id_fkcaja_retenciones as id_fkcaja, estado_caja_detalle FROM caja_detalle_retenciones WHERE tipo_caja_detalle='Ingreso' AND id_fkcaja_retenciones=$id_caja";
        $resultIngresos = mysqli_query($conn, $sqlDetalleCajaIngreso) or die(mysqli_error($conn));
        
        $sqlDetalleCajaEgreso = "SELECT id_caja_detalle_retenciones as id_caja_detalle, fecha_caja_detalle, tipo_caja_detalle, monto_caja_detalle, observacion_caja_detalle, id_fkcaja_retenciones as id_fkcaja, estado_caja_detalle FROM caja_detalle_retenciones WHERE tipo_caja_detalle='Egreso' AND id_fkcaja_retenciones=$id_caja";
        $resultEgresos = mysqli_query($conn, $sqlDetalleCajaEgreso) or die(mysqli_error($conn));
        
        // CONSTRUCCIÓN DEL HTML
        $html = '
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>ARQUEO DE CAJA COBROS</title>
                <style>
                    h1 { color: green; }
                </style>
            </head>
            <body>
            <table style="border-spacing: 3px" width="100%">
                <tr>
                    <td colspan="2" width="35%"></td>
                    <td style="font-size:16px" width="30%" align="center"><b>'.$razon_social.'</b></td>
                    <td colspan="2" width="35%"></td>
                </tr>
                <tr>
                    <td colspan="2" width="35%"></td>
                    <td style="font-size:16px" width="30%" align="center"><b>'.$fecha_caja.'</b></td>
                    <td colspan="2" width="35%"></td>
                </tr>
                <tr>
                    <td colspan="2"></td>
                    <td style="font-size:14px" align="center"><b>ARQUEO DE CAJA</b></td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td style="font-size:11px" width="20%">CAJERO: '.$cajero.'</td>
                    <td width="20%"></td>
                    <td width="20%"></td>
                    <td width="20%" style="font-size:11px">ARQUEO N°:</td>
                    <td width="20%" style="font-size:11px">'.$id_caja.'</td>
                </tr>
                <tr>
                    <td style="font-size:11px">FECHA APERTURA:</td>
                    <td style="font-size:11px">'.$fecha_caja.'</td>
                    <td></td>
                    <td style="font-size:11px">FECHA CIERRE: <br></td>
                    <td style="font-size:11px">'.$fecha_hora_cierre.'</td>
                </tr>
            </table>
            <br>';
            
        $html .= '
            <table width="100%">
                <tr style="background-color: #ccc;">
                    <td width="30%"><h3>1. SALDO</h3></td>
                    <td width="70%"><h3 align="right;">$'.$apertura_total_caja.'</h3></td>
                </tr>
                <tr>
                    <td width="30%"><h4>APERTURA DE CAJA</h4></td>
                    <td width="70%"><h4 align="center;">'.$apertura_total_caja.'</h4></td>
                </tr>
            </table>
            <br><br>
            <table width="90%" style="font-size:9px; text-align:center" border="1" cellpadding="3px">
                <tr>
                    <td width="15%"><b>DENOMINACIÓN</b></td>
                    <td align="center" colspan="6"><b>BILLETES</b></td>
                    <td align="center" colspan="6"><b>MONEDAS</b></td>
                </tr>
                <tr>
                    <td width="15%"><b></b></td>
                    <td align="left">100</td>
                    <td align="left">50</td>
                    <td align="left">20</td>
                    <td align="left">10</td>
                    <td align="left">5</td>
                    <td align="left">1</td>
                    <td align="left">1</td>
                    <td align="left">0.50</td>
                    <td align="left">0.25</td>
                    <td align="left">0.10</td>
                    <td align="left">0.05</td>
                    <td align="left">0.01</td>
                </tr>
                <tr>
                    <td width="15%"><b>CANTIDAD</b></td>
                    <td>'.$apertura_100_caja.'</td>
                    <td>'.$apertura_50_caja.'</td>
                    <td>'.$apertura_20_caja.'</td>
                    <td>'.$apertura_10_caja.'</td>
                    <td>'.$apertura_5_caja.'</td>
                    <td>'.$apertura_1_caja.'</td>
                    <td>'.$apertura_moneda_caja.'</td>
                    <td>'.$apertura_moneda_50_caja.'</td>
                    <td>'.$apertura_moneda_25_caja.'</td>
                    <td>'.$apertura_moneda_10_caja.'</td>
                    <td>'.$apertura_moneda_5_caja.'</td>
                    <td>'.$apertura_moneda_1_caja.'</td>
                </tr>
                <tr>
                    <td width="15%"><b>TOTAL</b></td>
                    <td>'.$_apertura_100_caja.'</td>
                    <td>'.$_apertura_50_caja.'</td>
                    <td>'.$_apertura_20_caja.'</td>
                    <td>'.$_apertura_10_caja.'</td>
                    <td>'.$_apertura_5_caja.'</td>
                    <td>'.$_apertura_1_caja.'</td>
                    <td>'.$_apertura_moneda_caja.'</td>
                    <td>'.$_apertura_moneda_50_caja.'</td>
                    <td>'.$_apertura_moneda_25_caja.'</td>
                    <td>'.$_apertura_moneda_10_caja.'</td>
                    <td>'.$_apertura_moneda_5_caja.'</td>
                    <td>'.$_apertura_moneda_1_caja.'</td>
                </tr>
            </table>
            <br><br><br>
            <table width="100%">
                <tr style="background-color: #ccc;">
                    <td width="30%"><h3>2. DOCUMENTOS</h3></td>
                    <td width="70%"><h4 align="right;">'.$total_documentos.'</h4></td>
                </tr>
                <tr>
                    <td width="30%"><h4>VENTAS - INGRESOS</h4></td>
                    <td width="70%"><h4 align="center;">'.$ventas_ingreso.'</h4></td>
                </tr>
            </table>
            <br><br>
            <table width="40%" border="1" cellpadding="3px" style="font-size:10px;" >
                <tr>
                    <td width="80%">Facturas pago Efectivo</td>
                    <td width="20%">'.$totalEfectivoDetalle.'</td>
                </tr>
                <tr>
                    <td>Otros Ingresos</td>
                    <td>'.$totalIngresosDetalle.'</td>
                </tr>
            </table>
            <h5>Resumen Otros Ingresos</h5>
            <table width="60%" style="text-align:center; font-size: 10px" border="1" cellpadding="3px">
                <tr>
                    <td width="20px"><b>#</b></td>
                    <td width="21%"><b>Fecha Hora</b></td>
                    <td width="220px"><b>Observación</b></td>
                    <td width="70px"><b>Monto</b></td>
                </tr>';
                
        while ($ingreso = mysqli_fetch_array($resultIngresos)) {
            $html .= '<tr>
                <td style="width:20px">'.$ingreso['id_caja_detalle'].'</td>
                <td>'.date('Y-m-d H:i:s', strtotime($ingreso['fecha_caja_detalle'])).'</td>
                <td>'.$ingreso['observacion_caja_detalle'].'</td>
                <td>$'.number_format((float)$ingreso['monto_caja_detalle'], 2, '.', '').'</td>
            </tr>';
        }
        
        $html .= '</table>
            <table>
                <tr>
                    <td width="30%"><h4>GASTOS - EGRESOS</h4></td>
                    <td width="70%"><h4 align="center;">'.$totalEgresosDetalle.'</h4></td>
                </tr>
            </table>
            <h5>Resumen Otros Gastos</h5>
            <table width="60%" style="text-align:center; font-size: 10px" border="1" cellpadding="3px">
                <tr>
                    <td width="20px"><b>#</b></td>
                    <td width="21%"><b>Fecha Hora</b></td>
                    <td width="220px"><b>Observación</b></td>
                    <td width="70px"><b>Monto</b></td>
                </tr>';
                
        while ($egreso = mysqli_fetch_array($resultEgresos)) {
            $html .= '<tr>
                <td width="20px">'.$egreso['id_caja_detalle'].'</td>
                <td width="21%">'.date('Y-m-d H:i:s', strtotime($egreso['fecha_caja_detalle'])).'</td>
                <td width="220px">'.$egreso['observacion_caja_detalle'].'</td>
                <td width="70px">'.number_format((float)$egreso['monto_caja_detalle'], 2, '.', '').'</td>
            </tr>';
        }
        
        $html .= '</table><br><br><br>
            <table width="100%">
                <tr style="background-color: #ccc;">
                    <td width="70%"><h3>3. EFECTIVO - EQUIVALENTE A EFECTIVO</h3></td>
                    <td width="30%"><h3 align="right;">'.$cierre_total_caja.'</h3></td>
                </tr>
                <tr>
                    <td width="70%"><h4>CIERRE DE CAJA</h4></td>
                    <td width="30%"><h4 align="center;">'.$cierre_total_caja.'</h4></td>
                </tr>
            </table>
            <br><br>
            <table width="90%" style="font-size:10px; text-align:center" border="1" cellpadding="3px">
                <tr>
                    <td width="15%" rowspan="2"><b>DENOMINACIÓN</b></td>
                    <td align="center" colspan="6"><b>BILLETES</b></td>
                    <td align="center" colspan="6"><b>MONEDAS</b></td>
                </tr>
                <tr>
                    <td align="left">100</td>
                    <td align="left">50</td>
                    <td align="left">20</td>
                    <td align="left">10</td>
                    <td align="left">5</td>
                    <td align="left">1</td>
                    <td align="left">1</td>
                    <td align="left">0.50</td>
                    <td align="left">0.25</td>
                    <td align="left">0.10</td>
                    <td align="left">0.05</td>
                    <td align="left">0.01</td>
                </tr>
                <tr>
                    <td width="15%"><b>CANTIDAD</b></td>
                    <td>'.$cierre_100_caja.'</td>
                    <td>'.$cierre_50_caja.'</td>
                    <td>'.$cierre_20_caja.'</td>
                    <td>'.$cierre_10_caja.'</td>
                    <td>'.$cierre_5_caja.'</td>
                    <td>'.$cierre_1_caja.'</td>
                    <td>'.$cierre_moneda_caja.'</td>
                    <td>'.$cierre_moneda_50_caja.'</td>
                    <td>'.$cierre_moneda_25_caja.'</td>
                    <td>'.$cierre_moneda_10_caja.'</td>
                    <td>'.$cierre_moneda_5_caja.'</td>
                    <td>'.$cierre_moneda_1_caja.'</td>
                </tr>
                <tr>
                    <td width="15%"><b>TOTAL</b></td>
                    <td>'.$_cierre_100_caja.'</td>
                    <td>'.$_cierre_50_caja.'</td>
                    <td>'.$_cierre_20_caja.'</td>
                    <td>'.$_cierre_10_caja.'</td>
                    <td>'.$_cierre_5_caja.'</td>
                    <td>'.$_cierre_1_caja.'</td>
                    <td>'.$_cierre_moneda_caja.'</td>
                    <td>'.$_cierre_moneda_50_caja.'</td>
                    <td>'.$_cierre_moneda_25_caja.'</td>
                    <td>'.$_cierre_moneda_10_caja.'</td>
                    <td>'.$_cierre_moneda_5_caja.'</td>
                    <td>'.$_cierre_moneda_1_caja.'</td>
                </tr>
            </table>
            <br><br><br>
            <table width="100%">
                <tr>
                    <td width="40%">
                        <br><br><br><br>
                        ______________________________
                        <div align="center">CAJERO</div><br><br><br>
                        ______________________________
                        <div align="center">GERENTE</div>
                    </td>
                    <td width="40%">
                        <div align="left"><b>1. TOTAL APERTURA</b></div>
                        <div align="left"><b>2. TOTAL DOCUMENTOS</b></div>
                        <div align="center">TOTAL EFECTIVO</div>
                        <div align="left"><b>3. TOTAL CIERRE</b></div>                  
                        <div align="center"><b>SALDO ==> </b></div>
                    </td>
                    <td width="20%">
                        <div>'.$total_apertura.'</div>
                        <div>'.$total_documentos.'</div>
                        <div>'.$total_general_efectivo.'</div>
                        <div>'.$total_cierre.'</div>                 
                        <div><b>'.$saldo.' </b><b >'.$estado_cuadre.'</b></div>
                    </td>
                </tr>
            </table>
            </body>
        </html>';
        
        // Inicializar TCPDF y renderizar HTML
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('SistemaFlota');
        $pdf->SetAuthor('SistemaFlota');
        $pdf->SetTitle('Arqueo de Caja Cobros ' . $id_caja);
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(TRUE, 10);
        $pdf->AddPage();
        $pdf->SetFont('helvetica', '', 9);
        $pdf->writeHTML($html, true, false, true, false, '');
        
        // Enviar directamente el PDF al navegador
        $pdf->Output('ArqueoCajaRetenciones_' . $id_caja . '.pdf', 'I');
        exit;
    } else {
        echo "No se encontró la caja especificada.";
        exit;
    }
} catch (Exception $e) {
    echo "Ocurrió un error al generar el PDF: " . $e->getMessage();
}
?>

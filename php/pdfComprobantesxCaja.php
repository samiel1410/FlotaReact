<?php
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";
date_default_timezone_set('America/Guayaquil');

try {
    $idcaja = intval($_GET['idcaja'] ?? 0);
    if (!$idcaja) {
        echo '<html><body><h3>Error: idcaja requerido</h3></body></html>';
        exit;
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── EMPRESA ─────────────────────────────────────────────────────────────
    $rsEmp = mysqli_query($conn, "SELECT * FROM empresa LIMIT 1") or die(mysqli_error($conn));
    $emp = mysqli_fetch_array($rsEmp);
    $razon_social = $emp['razon_social_empresa'] ?? 'FLOTA PELILEO';
    $ruc_empresa   = $emp['ruc_empresa'] ?? '';
    $direccion     = $emp['direccion_empresa'] ?? '';
    $telefono      = $emp['telefono_empresa'] ?? '';
    $correo        = $emp['correo_empresa'] ?? '';
    $logo = obtenerRutaLogoEmpresa($conn);

    // ─── CAJA ─────────────────────────────────────────────────────────────────
    $rsCaja = mysqli_query($conn, "
        SELECT c.id_caja, c.fecha_caja, c.apertura_total_caja, c.cierre_total_caja,
               c.estado_caja, c.cuadre_caja, c.fecha_hora_cierre,
               CONCAT(u.nombre_usuario,' ',u.apellido_usuario) as usuario,
               s.nombre_sucursal
        FROM caja c
        JOIN usuario u ON c.id_fkusuario_caja = u.id_usuario
        JOIN sucursal2 s ON c.id_fksucursal_caja = s.suc_codigo_sucursal
        WHERE c.id_caja = $idcaja
    ") or die(mysqli_error($conn));
    $caja = mysqli_fetch_array($rsCaja);
    $oficinista   = $caja['usuario'] ?? '';
    $sucursal     = $caja['nombre_sucursal'] ?? '';
    $fecha_caja   = $caja['fecha_caja'] ?? '';
    $total_apertura = $caja['apertura_total_caja'] ?? 0;
    $total_cierre   = $caja['cierre_total_caja'] ?? 0;

    // ─── GUÍAS DE LA CAJA ────────────────────────────────────────────────────
    $rsGuias = mysqli_query($conn, "
        SELECT g.id_guia, g.numero_guia, g.total_guia, g.fecha_guia, g.estado_guia,
               g.punto_emision_guia, g.cedula_cliente_remitente, g.nombre_cliente_remitente,
               g.cedula_cliente_receptor, g.nombre_cliente_receptor,
               s.punto_emision_sucursal
        FROM guia g
        JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
        WHERE g.id_fkcaja_guia = $idcaja
        ORDER BY g.id_guia DESC
    ") or die(mysqli_error($conn));
    $guias = [];
    $total_guias = 0;
    while ($row = mysqli_fetch_array($rsGuias)) {
        $guias[] = $row;
        if ($row['estado_guia'] == 1 || $row['estado_guia'] == 0 || $row['estado_guia'] == 3) {
            $total_guias += floatval($row['total_guia']);
        }
    }

    // ─── FACTURAS DE LA CAJA ─────────────────────────────────────────────────
    $rsFacturas = mysqli_query($conn, "
        SELECT f.id_factura, f.numero_factura, f.total_factura, f.fecha_factura,
               f.estado_factura, f.nombre_cliente_factura, f.ruc_cliente_factura,
               f.punto_emision_factura, s.punto_emision_sucursal
        FROM factura f
        JOIN sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
        WHERE f.id_fkcaja_factura = $idcaja
        ORDER BY f.id_factura DESC
    ") or die(mysqli_error($conn));
    $facturas = [];
    $total_facturas = 0;
    while ($row = mysqli_fetch_array($rsFacturas)) {
        $facturas[] = $row;
        if ($row['estado_factura'] == 1 || $row['estado_factura'] == 0 || $row['estado_factura'] == 3) {
            $total_facturas += floatval($row['total_factura']);
        }
    }

    // ─── COMPROBANTES DE COBRO ───────────────────────────────────────────────
    $rsComprobantes = mysqli_query($conn, "
        SELECT cc.id_comprobante_cobro, cc.numero_comprobante_cobro,
               cc.fecha_emision_comprobante_cobro, cc.monto_comprobante_cobro,
               cc.observacion_comprobante_cobro, cc.estado_comprobante_cobro,
               f.id_factura, f.numero_factura, f.punto_emision_factura,
               f.ruc_cliente_factura, f.nombre_cliente_factura,
               s.punto_emision_sucursal,
               fp.nombre_forma_pago, fp.tipo_forma_pago
        FROM comprobante_cobro cc
        JOIN factura f ON cc.id_fkfactura_comprobante_cobro = f.id_factura
        JOIN sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
        JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
        WHERE f.id_fkcaja_factura = $idcaja
        ORDER BY cc.id_comprobante_cobro DESC
    ") or die(mysqli_error($conn));
    $comprobantes = [];
    $total_comprobantes = 0;
    $total_efectivo = 0;
    $total_otro = 0;
    $total_cheque = 0;
    $total_credito = 0;
    $total_debito = 0;
    while ($row = mysqli_fetch_array($rsComprobantes)) {
        $comprobantes[] = $row;
        $monto = floatval($row['monto_comprobante_cobro']);
        $total_comprobantes += $monto;
        switch ($row['tipo_forma_pago']) {
            case 1: $total_otro += $monto; break;
            case 2: $total_efectivo += $monto; break;
            case 3: $total_cheque += $monto; break;
            case 4: $total_credito += $monto; break;
            case 5: $total_debito += $monto; break;
        }
    }

    // ─── DETALLE CAJA (EGRESOS/INGRESOS) ─────────────────────────────────────
    $rsDetalle = mysqli_query($conn, "
        SELECT tipo_caja_detalle, SUM(monto_caja_detalle) as total
        FROM caja_detalle
        WHERE id_fkcaja = $idcaja
        GROUP BY tipo_caja_detalle
    ") or die(mysqli_error($conn));
    $detalle_rows = [];
    $total_egresos = 0;
    $total_ingresos = 0;
    while ($row = mysqli_fetch_array($rsDetalle)) {
        $detalle_rows[] = $row;
        if ($row['tipo_caja_detalle'] == 'Egreso') $total_egresos += floatval($row['total']);
        else if ($row['tipo_caja_detalle'] == 'Ingreso') $total_ingresos += floatval($row['total']);
    }

    // ─── GENERAR HTML ───────────────────────────────────────────────────────
    function fmtNum($v) { return number_format(floatval($v), 2); }
    function fmtGuia($nro, $pe_suc, $pe_gui) {
        $n = sprintf("%09s", $nro);
        return "$pe_suc-$pe_gui-$n";
    }
    function fmtFactura($nro, $pe_suc, $pe_fac) {
        $n = sprintf("%09s", $nro);
        return "$pe_suc-$pe_fac-$n";
    }
    function estadoGuia($est) {
        if ($est == 1) return 'AUTORIZADO';
        if ($est == 2) return 'ANULADO';
        if ($est == 3) return 'PENDIENTE ANULAR';
        if ($est == 0) return 'EN PROCESO';
        return 'DESCONOCIDO';
    }
    function estadoFactura($est) {
        if ($est == 1) return 'AUTORIZADO';
        if ($est == 2) return 'ANULADO';
        if ($est == 3) return 'PENDIENTE ANULAR';
        if ($est == 0) return 'EN PROCESO';
        return 'DESCONOCIDO';
    }

    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>COMPROBANTES CAJA</title>
    <style>
        *{font-family:Helvetica;font-size:9px;}
        table{border-collapse:collapse;width:100%;}
        th,td{padding:4px 6px;border:1px solid #999;text-align:left;}
        th{background-color:#CACBCB;font-weight:bold;text-align:center;}
        .center{text-align:center;}
        .right{text-align:right;}
        .bold{font-weight:bold;}
        .hr{border-top:1px solid #000;margin:2px 0;}
        .section-title{font-size:14px;font-weight:bold;text-align:center;margin:12px 0 6px;}
        .empresa{font-size:16px;font-weight:bold;text-align:center;}
    </style></head><body>';

    // Logo + Empresa
    if ($logo) {
        $html .= '<div class="center"><img src="'.$logo.'" style="max-width:80px;max-height:80px;" /></div>';
    }
    $html .= '<div class="empresa">'.$razon_social.'</div>';
    $html .= '<table style="margin:4px 0;"><tr>
        <td width="15%"><b>RUC:</b></td><td width="85%">'.$ruc_empresa.'</td>
    </tr></table>';
    $html .= '<table><tr>
        <td width="15%"><b>DIRECCIÓN:</b></td><td width="40%">'.$direccion.'</td>
        <td width="15%"><b>TELÉFONO:</b></td><td width="30%">'.$telefono.'</td>
    </tr></table>';
    $html .= '<table><tr>
        <td width="15%"><b>E-MAIL:</b></td><td width="85%">'.$correo.'</td>
    </tr></table>';
    $html .= '<table><tr>
        <td width="15%"><b>OFICINISTA:</b></td><td width="35%">'.$oficinista.'</td>
        <td width="15%"><b>SUCURSAL:</b></td><td width="35%">'.$sucursal.'</td>
    </tr></table>';
    $html .= '<table><tr>
        <td width="15%"><b>FECHA:</b></td><td width="35%">'.$fecha_caja.'</td>
        <td width="15%"><b>APERTURA:</b></td><td width="35%">$'.fmtNum($total_apertura).'</td>
    </tr></table>';
    $html .= '<table><tr>
        <td width="15%"><b>CIERRE:</b></td><td width="85%">$'.fmtNum($total_cierre).'</td>
    </tr></table>';

    // ─── LISTADO DE GUÍAS ─────────────────────────────────────────────────────
    $html .= '<div class="section-title">LISTADO DE GUÍAS</div>';
    $html .= '<table><tr>
        <th width="22%">NRO.</th>
        <th width="15%">FECHA EMISIÓN</th>
        <th width="10%">TOTAL</th>
        <th width="13%">ESTADO</th>
        <th width="20%">REMITENTE</th>
        <th width="20%">DESTINATARIO</th>
    </tr>';
    foreach ($guias as $g) {
        $nro = fmtGuia($g['numero_guia'], $g['punto_emision_sucursal'], $g['punto_emision_guia']);
        $fec = date('Y-m-d', strtotime($g['fecha_guia']));
        $est = estadoGuia($g['estado_guia']);
        $html .= '<tr>
            <td>'.$nro.'</td>
            <td>'.$fec.'</td>
            <td class="right">$'.fmtNum($g['total_guia']).'</td>
            <td>'.$est.'</td>
            <td>'.$g['nombre_cliente_remitente'].' ('.$g['cedula_cliente_remitente'].')</td>
            <td>'.$g['nombre_cliente_receptor'].' ('.$g['cedula_cliente_receptor'].')</td>
        </tr>';
    }
    $html .= '<tr><td colspan="2" class="bold">TOTAL GUÍAS:</td>
        <td class="bold right"><hr>$'.fmtNum($total_guias).'</td>
        <td colspan="3"></td></tr>';
    $html .= '</table><br>';

    // ─── LISTADO FACTURAS ─────────────────────────────────────────────────────
    $html .= '<div class="section-title">LISTADO FACTURAS</div>';
    $html .= '<table><tr>
        <th width="22%">NRO.</th>
        <th width="18%">FECHA EMISIÓN</th>
        <th width="10%">TOTAL</th>
        <th width="15%">ESTADO</th>
        <th width="35%">CLIENTE</th>
    </tr>';
    foreach ($facturas as $f) {
        $nro = fmtFactura($f['numero_factura'], $f['punto_emision_sucursal'], $f['punto_emision_factura']);
        $fec = date('Y-m-d', strtotime($f['fecha_factura']));
        $est = estadoFactura($f['estado_factura']);
        $cli = $f['nombre_cliente_factura'].' ('.$f['ruc_cliente_factura'].')';
        $html .= '<tr>
            <td>'.$nro.'</td>
            <td>'.$fec.'</td>
            <td class="right">$'.fmtNum($f['total_factura']).'</td>
            <td>'.$est.'</td>
            <td>'.$cli.'</td>
        </tr>';
    }
    $html .= '<tr><td colspan="2" class="bold">TOTAL FACTURAS:</td>
        <td class="bold right"><hr>$'.fmtNum($total_facturas).'</td>
        <td colspan="2"></td></tr>';
    $html .= '</table><br>';

    // ─── LISTADO COMPROBANTE DE COBRO ─────────────────────────────────────────
    $html .= '<div class="section-title">LISTADO COMPROBANTE DE COBRO</div>';
    $html .= '<table><tr>
        <th width="8%">NRO.</th>
        <th width="10%">FECHA EMI.</th>
        <th width="18%">CONCEPTO</th>
        <th width="12%">FORMA PAGO</th>
        <th width="10%">TOTAL</th>
        <th width="22%">CLIENTE</th>
        <th width="20%">DETALLE</th>
    </tr>';
    foreach ($comprobantes as $c) {
        $nro = $c['numero_comprobante_cobro'];
        $fec = date('Y-m-d', strtotime($c['fecha_emision_comprobante_cobro']));
        $nroFact = fmtFactura($c['numero_factura'], $c['punto_emision_sucursal'], $c['punto_emision_factura']);
        $cli = $c['ruc_cliente_factura'].' '.$c['nombre_cliente_factura'];
        $html .= '<tr>
            <td>'.$nro.'</td>
            <td>'.$fec.'</td>
            <td>'.$nroFact.'</td>
            <td>'.$c['nombre_forma_pago'].'</td>
            <td class="right">$'.fmtNum($c['monto_comprobante_cobro']).'</td>
            <td>'.$cli.'</td>
            <td>'.($c['observacion_comprobante_cobro'] ?? '').'</td>
        </tr>';
    }
    $html .= '</table><br>';

    // Resumen formas de pago
    $html .= '<table style="width:50%;">';
    $html .= '<tr><th colspan="2" style="text-align:left;">TIPO FORMA DE PAGO</th><th class="right">MONTO</th></tr>';
    $html .= '<tr><td colspan="2">OTRO</td><td class="right">$'.fmtNum($total_otro).'</td></tr>';
    $html .= '<tr><td colspan="2">EFECTIVO</td><td class="right">$'.fmtNum($total_efectivo).'</td></tr>';
    $html .= '<tr><td colspan="2">CHEQUE</td><td class="right">$'.fmtNum($total_cheque).'</td></tr>';
    $html .= '<tr><td colspan="2">CRÉDITO</td><td class="right">$'.fmtNum($total_credito).'</td></tr>';
    $html .= '<tr><td colspan="2">DÉBITO</td><td class="right">$'.fmtNum($total_debito).'</td></tr>';
    $html .= '<tr><td colspan="2" class="bold">TOTAL COBROS:</td>
        <td class="bold right"><hr>$'.fmtNum($total_comprobantes).'</td></tr>';
    $html .= '</table><br>';

    // ─── DETALLE CAJA ─────────────────────────────────────────────────────────
    $html .= '<div class="section-title">DETALLE CAJA</div>';
    $html .= '<table><tr>
        <th width="25%">TIPO</th>
        <th width="15%">MONTO</th>
    </tr>';
    foreach ($detalle_rows as $d) {
        $html .= '<tr>
            <td>'.$d['tipo_caja_detalle'].'</td>
            <td class="right">$'.fmtNum($d['total']).'</td>
        </tr>';
    }
    $html .= '</table>';

    $html .= '</body></html>';

    // ─── GENERAR PDF ─────────────────────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetAutoPageBreak(true, 15);
    $pdf->SetFont('helvetica', '', 9);
    $pdf->AddPage();
    $pdf->writeHTML($html, true, false, true, false, '');

    // Output inline
    $pdf->Output('ComprobantesCaja_'.$idcaja.'.pdf', 'I');

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

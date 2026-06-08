<?php
require_once('library/tcpdf.php');
require_once("db.php");
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Configuración de zona horaria
date_default_timezone_set('America/Lima'); // Ajusta según tu zona horaria

try {
    $fecha_actual = date('d/m/Y H:i:s'); // Formato día/mes/año hora:minuto:segundo
    
    // Ajustar el alto de la página para que todo entre en una sola hoja
    $pdf = new TCPDF('P', PDF_UNIT, array(80, 120), true, 'UTF-8', false);
    $conn = conexion();
    
    // Datos empresa
    $empresa = mysqli_fetch_array(mysqli_query($conn, "SELECT telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1"));
    
    // Datos cobro
    $id_cobros = intval($_GET['id_cobros'] ?? 0);
    $id_usuario = $_GET['id_usuario'] ?? 0;
    
    // Obtener datos del usuario
    $query_usuario = "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario";
    $usuario = mysqli_fetch_array(mysqli_query($conn, $query_usuario));
    $nombre_usuario = $usuario['nombre_usuario'] . ' ' . $usuario['apellido_usuario'];
  
    $query = "SELECT c.*, u.nombre_usuario, u.apellido_usuario, b.placa_buses, b.disco_buses, 
              s.nombre_sucursal, ca.id_caja_boleteria, tc.nombre_tipo_cobros,
              p.per_nombres_persona, p.per_apellidos_personal,
              ue.nombre_usuario AS nombre_usuario_entrego, ue.apellido_usuario AS apellido_usuario_entrego
              FROM cobros c
              LEFT JOIN usuario u ON c.id_fkusuario_cobros = u.id_usuario
              LEFT JOIN usuario ue ON c.id_usuario_entrego = ue.id_usuario
              LEFT JOIN buses b ON c.id_fkbus_cobros = b.id_buses
              LEFT JOIN personal p ON b.id_fkpersonal_buses = p.id_personal
              LEFT JOIN sucursal2 s ON c.id_fksucursal_cobros = s.suc_codigo_sucursal
              LEFT JOIN caja_boleteria ca ON c.id_fkcaja_cobros = ca.id_caja_boleteria
              LEFT JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
              WHERE c.id_cobros = $id_cobros;";
    $cobro = mysqli_fetch_array(mysqli_query($conn, $query));

    // Formatear fecha de creación del cobro
    $fecha_cobro = date('d/m/Y H:i:s', strtotime($cobro['fecha_creacion_cobros']));

    // Configuración PDF
    $pdf->SetCreator('Sistema Flota');
    $pdf->SetMargins(5, 5, 5);
    $pdf->SetAutoPageBreak(true, 5);
    $pdf->AddPage();

    // Estilos
    $header_style = 'font-size:9pt;font-style:bold;text-align:center;line-height:1.1;';
    $label_style = 'font-size:7pt;font-style:bold;';
    $value_style = 'font-size:7pt;';
    $amount_style = 'font-size:9pt;font-style:bold;text-align:center;';
    $footer_style = 'font-size:7pt;text-align:center;color:#555;';
    $status_style = 'font-size:7pt;font-style:bold;';

    // Contenido HTML
    $html = '
    <div style="'.$header_style.'">
        '.$empresa['razon_social_empresa'].'<br>
        <span style="font-size:7pt;">RUC: '.$empresa['ruc_empresa'].'</span><br>
        <span style="font-size:7pt;">'.$empresa['direccion_empresa'].'</span>
    </div>
    <hr style="height:0.5px; margin:2px 0;">
    <div style="text-align:right;font-size:7pt;">Impreso: '.$fecha_actual.'</div>
    <table border="0" cellpadding="1" cellspacing="1" style="margin-bottom:4px; width:100%;">
        <tr>
            <td style="'.$label_style.'" width="35%">Recibido de:</td>
            <td style="'.$value_style.'">'.$cobro['nombre_usuario'].' '.$cobro['apellido_usuario'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Sucursal:</td>
            <td style="'.$value_style.'">'.$cobro['nombre_sucursal'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Bus:</td>
            <td style="'.$value_style.'">'.$cobro['disco_buses'].' - '.$cobro['placa_buses'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Tipo cobro:</td>
            <td style="'.$value_style.'">'.$cobro['nombre_tipo_cobros'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Personal:</td>
            <td style="'.$value_style.'">'.$cobro['per_nombres_persona'].' '.$cobro['per_apellidos_personal'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Estado cobro:</td>
            <td style="'.$value_style.'">'.(
                $cobro['estado_cobros'] == 0 ? 'NO PAGADO' :
                ($cobro['estado_cobros'] == 1 ? 'PAGADO' :
                ($cobro['estado_cobros'] == 2 ? 'ANULADO' : $cobro['estado_cobros']))
            ).'</td>
        </tr>
    </table>
    <table border="0" cellpadding="1" cellspacing="1" style="margin-bottom:4px; width:100%;">
        <tr>
            <td style="'.$label_style.'" width="35%">Fecha:</td>
            <td style="'.$value_style.'">'.$fecha_cobro.'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Usuario Entregó:</td>
            <td style="'.$value_style.'">'.($cobro['nombre_usuario_entrego'].' '.$cobro['apellido_usuario_entrego']).'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Fecha Entrega:</td>
            <td style="'.$value_style.'">'.($cobro['fecha_entrego'] ? date('d/m/Y', strtotime($cobro['fecha_entrego'])) : '').'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Observación:</td>
            <td style="'.$value_style.'">'.$cobro['observacion_cobros'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Monto:</td>
            <td style="'.$value_style.'">$'.number_format($cobro['monto_cobros'], 2).'</td>
        </tr>
    </table>';
    
    if($cobro['estado_cobros']==2) {
        $html .= '<div style="font-size:9pt;color:red;margin-top:3px;border:1px solid #f00;padding:3px;"><b>Motivo Anulación:</b> '.$cobro['motivo_anulacion_cobros'].'</div>';
    }
    
    // Consulta de comprobantes asociados al cobro SOLO COBRADOS
    $query_comprobantes = "SELECT 
        cc.numero_comprobante_cobro,
        cc.monto_comprobante_cobro,
        s.nombre_sucursal,
        u.nombre_usuario,
        u.apellido_usuario
    FROM comprobante_cobro_retenciones cc
    LEFT JOIN sucursal2 s ON cc.id_fksucursal_comprobante_cobro = s.suc_codigo_sucursal
    LEFT JOIN usuario u ON cc.id_fkusuario_comprobante_cobro = u.id_usuario
    WHERE cc.id_fkcobro_comprobante_cobro = $id_cobros
      AND (cc.estado_comprobante_cobro = 'COBRADA' OR cc.estado_comprobante_cobro = 'COBRADO')";

    $res_comprobantes = mysqli_query($conn, $query_comprobantes);

    // Agregar tabla de comprobantes al PDF
    $html .= '<div style="margin-top:8px;font-size:8pt;font-weight:bold;">Comprobantes cobrados asociados:</div>
    <table border="1" cellpadding="2" cellspacing="0" style="width:100%;font-size:7pt;margin-bottom:6px;">
        <tr style="background:#f2f2f2;">
            <th style="text-align:center;width:35px;">N° Comprobante</th>
            <th style="text-align:center;width:32px;">Monto</th>
            <th style="text-align:center;width:90px;">Sucursal</th>
            <th style="text-align:center;">Usuario</th>
        </tr>';

    while($comp = mysqli_fetch_array($res_comprobantes)) {
        $html .= '<tr>
            <td style="text-align:center;width:35px;">'.$comp['numero_comprobante_cobro'].'</td>
            <td style="text-align:right;width:32px;">$'.number_format($comp['monto_comprobante_cobro'],2).'</td>
            <td style="text-align:center;width:90px;">'.$comp['nombre_sucursal'].'</td>
            <td style="text-align:center;">'.$comp['nombre_usuario'].' '.$comp['apellido_usuario'].'</td>
        </tr>';
    }

    $html .= '</table>';

    // Espacios para firmas con nombres
    $html .= '<table style="width:100%;margin-top:8px;" border="0">
        <tr>
            <td style="width:45%;text-align:center;font-size:7pt;">_____________________<br>'.$cobro['per_nombres_persona'].' '.$cobro['per_apellidos_personal'].'<br>Personal</td>
            <td style="width:10%;"></td>
            <td style="width:45%;text-align:center;font-size:7pt;">_____________________<br>'.$nombre_usuario.'<br>Usuario</td>
        </tr>
    </table>';

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('impresionCobro.pdf', 'I');

} catch(Exception $e) {
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
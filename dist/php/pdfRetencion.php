<?php
require_once('library/tcpdf.php');
require_once("db.php");
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Configuración de zona horaria
date_default_timezone_set('America/Lima'); // Ajusta según tu zona horaria

try {
    $fecha_actual = date('d/m/Y H:i:s'); // Formato día/mes/año hora:minuto:segundo
    
    $pdf = new TCPDF('P', PDF_UNIT, array(80, 150), true, 'UTF-8', false);
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
              p.per_nombres_persona, p.per_apellidos_personal
              FROM cobros c
              LEFT JOIN usuario u ON c.id_fkusuario_cobros = u.id_usuario
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
    $header_style = 'font-size:11pt;font-style:bold;text-align:center;line-height:1.3;';
    $label_style = 'font-size:9pt;font-style:bold;';
    $value_style = 'font-size:9pt;';
    $amount_style = 'font-size:12pt;font-style:bold;text-align:center;';
    $footer_style = 'font-size:8pt;text-align:center;color:#555;';
    $status_style = 'font-size:9pt;font-style:bold;';

    // Contenido HTML
    $html = '
    <div style="'.$header_style.'">
        '.$empresa['razon_social_empresa'].'<br>
        <span style="font-size:9pt;">RUC: '.$empresa['ruc_empresa'].'</span><br>
        <span style="font-size:9pt;">'.$empresa['direccion_empresa'].'</span>
    </div>
    
    <hr style="height:0.5px;">
    <div style="text-align:right;font-size:8pt;">Impreso: '.$fecha_actual.'</div>
    
    <table border="0" cellpadding="2" cellspacing="2" style="margin-bottom:8px; width:100%;">
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
    </table>
    
    <table border="0" cellpadding="2" cellspacing="2" style="margin-bottom:8px; width:100%;">
        <tr>
            <td style="'.$label_style.'" width="35%">Fecha:</td>
            <td style="'.$value_style.'">'.$fecha_cobro.'</td>
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
    
  

    // Espacios para firmas con nombres
    $html .= '<br><br><table style="width:100%;margin-top:20px;" border="0">
        <tr>
            <td style="width:45%;text-align:center;font-size:8pt;">_________________________<br>'.$cobro['per_nombres_persona'].' '.$cobro['per_apellidos_personal'].'<br>Personal</td>
            <td style="width:10%;"></td>
            <td style="width:45%;text-align:center;font-size:8pt;">_________________________<br>'.$nombre_usuario.'<br>Usuario</td>
        </tr>
    </table>';

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('impresionCobro.pdf', 'I');

} catch(Exception $e) {
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
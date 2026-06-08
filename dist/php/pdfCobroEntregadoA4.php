<?php
require_once('library/tcpdf.php');
require_once("db.php");
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Configuración de zona horaria
date_default_timezone_set('America/Lima');

try {
    $fecha_actual = date('d/m/Y H:i:s');
    
    // Configuración A4 estándar
    $pdf = new TCPDF('P', PDF_UNIT, 'A4', true, 'UTF-8', false);
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

    // Configuración PDF A4
    $pdf->SetCreator('Sistema Flota');
    $pdf->SetTitle('Comprobante de Cobro - ' . $cobro['id_cobros']);
    $pdf->SetMargins(15, 20, 15);
    $pdf->SetAutoPageBreak(true, 20);
    $pdf->AddPage();

    // Ajusta los estilos para reducir espacios y márgenes
    $header_style = 'font-size:15pt;font-weight:bold;text-align:center;line-height:1.1;color:#2c3e50;margin-bottom:8px;';
    $subheader_style = 'font-size:10pt;text-align:center;color:#7f8c8d;margin-bottom:8px;';
    $section_title_style = 'font-size:12pt;font-weight:bold;color:#34495e;background-color:#ecf0f1;padding:4px;margin-top:8px;margin-bottom:6px;';
    $label_style = 'font-size:10pt;font-weight:bold;color:#2c3e50;padding:2px 0;';
    $value_style = 'font-size:10pt;color:#34495e;padding:2px 0;';
    $table_header_style = 'font-size:9pt;font-weight:bold;background-color:#3498db;color:white;text-align:center;padding:4px;';
    $table_cell_style = 'font-size:9pt;padding:3px;border:1px solid #bdc3c7;';
    $amount_highlight_style = 'font-size:12pt;font-weight:bold;color:#27ae60;text-align:center;background-color:#e8f8f5;padding:6px;border:2px solid #27ae60;margin:10px 0;';
    $footer_style = 'font-size:8pt;text-align:center;color:#7f8c8d;margin-top:18px;';

    // Contenido HTML para A4
    $html = '
    <div style="'.$header_style.'">
        '.$empresa['razon_social_empresa'].'
    </div>
    <div style="'.$subheader_style.'">
        RUC: '.$empresa['ruc_empresa'].' | '.$empresa['direccion_empresa'].'<br>
        Tel: '.$empresa['telefono_empresa'].' | Email: '.$empresa['correo_empresa'].'
    </div>
    
    <div style="text-align:right;font-size:9pt;color:#7f8c8d;margin-bottom:8px;">
        Documento generado: '.$fecha_actual.'
    </div>

    <div style="'.$section_title_style.'">
        COMPROBANTE DE ENTREGA DE COBRO N° '.$cobro['id_cobros'].'
    </div>

    <table style="width:100%;margin-bottom:8px;" cellpadding="3" cellspacing="0">
        <tr>
            <td style="'.$label_style.';width:25%;">Recibido de:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$cobro['nombre_usuario'].' '.$cobro['apellido_usuario'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Sucursal:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$cobro['nombre_sucursal'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Bus asignado:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">Disco: '.$cobro['disco_buses'].' - Placa: '.$cobro['placa_buses'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Tipo de cobro:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$cobro['nombre_tipo_cobros'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Personal responsable:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$cobro['per_nombres_persona'].' '.$cobro['per_apellidos_personal'].'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Estado del cobro:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.(
                $cobro['estado_cobros'] == 0 ? 'NO PAGADO' :
                ($cobro['estado_cobros'] == 1 ? 'PAGADO' :
                ($cobro['estado_cobros'] == 2 ? 'ANULADO' : $cobro['estado_cobros']))
            ).'</td>
        </tr>
    </table>

    <div style="'.$amount_highlight_style.'">
        MONTO TOTAL: $'.number_format($cobro['monto_cobros'], 2).'
    </div>

    <table style="width:100%;margin-bottom:8px;" cellpadding="3" cellspacing="0">
        <tr>
            <td style="'.$label_style.';width:25%;">Fecha de creación:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$fecha_cobro.'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Usuario que entregó:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.($cobro['nombre_usuario_entrego'].' '.$cobro['apellido_usuario_entrego']).'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Fecha de entrega:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.($cobro['fecha_entrego'] ? date('d/m/Y', strtotime($cobro['fecha_entrego'])) : 'Pendiente').'</td>
        </tr>
        <tr>
            <td style="'.$label_style.'">Observaciones:</td>
            <td style="'.$value_style.';border-bottom:1px solid #bdc3c7;">'.$cobro['observacion_cobros'].'</td>
        </tr>
    </table>';
    
    // Motivo de anulación si aplica
    if($cobro['estado_cobros'] == 2) {
        $html .= '<div style="font-size:12pt;color:#e74c3c;margin:20px 0;border:2px solid #e74c3c;padding:15px;background-color:#fadbd8;">
            <strong>MOTIVO DE ANULACIÓN:</strong><br>'.$cobro['motivo_anulacion_cobros'].'
        </div>';
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

    // Verificar si hay comprobantes
    if(mysqli_num_rows($res_comprobantes) > 0) {
        $html .= '<div style="'.$section_title_style.'">
            DETALLE DE COMPROBANTES COBRADOS
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;" cellpadding="8" cellspacing="0">
            <tr>
                <th style="'.$table_header_style.';width:15%;">N° Comprobante</th>
                <th style="'.$table_header_style.';width:15%;">Monto</th>
                <th style="'.$table_header_style.';width:35%;">Sucursal</th>
                <th style="'.$table_header_style.';width:35%;">Usuario que cobró</th>
            </tr>';

        $total_comprobantes = 0;
        while($comp = mysqli_fetch_array($res_comprobantes)) {
            $total_comprobantes += $comp['monto_comprobante_cobro'];
            $html .= '<tr>
                <td style="'.$table_cell_style.';text-align:center;">'.$comp['numero_comprobante_cobro'].'</td>
                <td style="'.$table_cell_style.';text-align:right;">$'.number_format($comp['monto_comprobante_cobro'],2).'</td>
                <td style="'.$table_cell_style.'">'.$comp['nombre_sucursal'].'</td>
                <td style="'.$table_cell_style.'">'.$comp['nombre_usuario'].' '.$comp['apellido_usuario'].'</td>
            </tr>';
        }

        $html .= '<tr>
            <td colspan="3" style="'.$table_cell_style.';text-align:right;font-weight:bold;background-color:#ecf0f1;">TOTAL COMPROBANTES:</td>
            <td style="'.$table_cell_style.';text-align:right;font-weight:bold;background-color:#ecf0f1;">$'.number_format($total_comprobantes,2).'</td>
        </tr>';
        
        $html .= '</table>';
    }

    // Espacios para firmas con diseño A4
    $html .= '<div style="margin-top:50px;">
        <table style="width:100%;" cellpadding="20" cellspacing="0">
            <tr>
                <td style="width:45%;text-align:center;vertical-align:bottom;">
                    <div style="border-bottom:2px solid #2c3e50;margin-bottom:10px;height:50px;"></div>
                    <div style="font-size:12pt;font-weight:bold;color:#2c3e50;">
                        '.$cobro['per_nombres_persona'].' '.$cobro['per_apellidos_personal'].'<br>
                        <span style="font-size:10pt;color:#7f8c8d;">PERSONAL RESPONSABLE</span>
                    </div>
                </td>
                <td style="width:10%;"></td>
                <td style="width:45%;text-align:center;vertical-align:bottom;">
                    <div style="border-bottom:2px solid #2c3e50;margin-bottom:10px;height:50px;"></div>
                    <div style="font-size:12pt;font-weight:bold;color:#2c3e50;">
                        '.$nombre_usuario.'<br>
                        <span style="font-size:10pt;color:#7f8c8d;">USUARIO DEL SISTEMA</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>';

    $html .= '<div style="'.$footer_style.'">
        Este documento fue generado automáticamente por el Sistema de Gestión de Flota<br>
        Fecha y hora de generación: '.$fecha_actual.'
    </div>';

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('ComprobanteCobroA4_'.$cobro['id_cobros'].'.pdf', 'I');

} catch(Exception $e) {
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
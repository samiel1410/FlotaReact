<?php
require_once('library/tcpdf.php');
require_once("db.php");
error_reporting(E_ALL);
ini_set('display_errors', '1');

date_default_timezone_set('America/Lima');

try {
    $id_guia = intval($_GET['id_guia'] ?? 0);

    // Formato térmico: 80mm ancho x 150mm alto
    $pdf = new TCPDF('P', PDF_UNIT, array(80, 150), true, 'UTF-8', false);
    $conn = conexion();

    // Datos empresa
    $empresa = mysqli_fetch_array(mysqli_query($conn, "SELECT telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1"));

    // Consulta principal con los campos requeridos
    $query = "
        SELECT 
            gc.id, gc.compania_id, gc.id_fksucursal_guias_companias, gc.porcentaje_comision, gc.valor_comision, gc.valor_neto,
            gc.fecha_procesamiento, gc.numero_guia, gc.id_usuario_oficina, gc.id_destino, gc.id_oficina,
            gc.estado_guia_companias, gc.id_fkcaja_guias_copanias,
            gc.identificacion_cliente, gc.nombre_cliente,
            ca.nombre_compania_asociada,
            s.nombre_sucursal, s.ciudad_sucursal, s.ruc_sucursal, s.telefono_sucursal, s.direccion_sucursal, s.suc_codigo_sucursal, s.punto_emision_sucursal
        FROM guias_companias gc
        LEFT JOIN compania_asociada ca ON gc.compania_id = ca.id_compania_asociada
        LEFT JOIN sucursal2 s ON gc.id_fksucursal_guias_companias = s.suc_codigo_sucursal
        WHERE gc.id = $id_guia
        LIMIT 1
    ";
    $guia = mysqli_fetch_array(mysqli_query($conn, $query));

    // Formatear fechas
    $fecha = $guia['fecha_procesamiento'] ? date('d/m/Y H:i', strtotime($guia['fecha_procesamiento'])) : '';
    $fecha_actual = date('d/m/Y H:i');

    // Configuración PDF
    $pdf->SetCreator('FlotaFront');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(4, 4, 4);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();
    $pdf->SetFont('helvetica', '', 8);

    // Estilos
    $header_style = 'font-size:9pt;font-weight:bold;text-align:center;line-height:1.1;margin-bottom:2px;';
    $subheader_style = 'font-size:7pt;text-align:center;color:#333;margin-bottom:2px;';
    $label_style = 'font-size:7pt;font-weight:bold;color:#222;padding:1px;';
    $value_style = 'font-size:7pt;color:#222;padding:1px;';
    $footer_style = 'font-size:7pt;text-align:center;color:#555;margin-top:4px;';
    $table_style = 'width:100%;border-radius:3px;margin-bottom:3px;';
    $block_style = 'border-radius:4px;padding:2px 2px 2px 2px;margin-bottom:3px;';
    $highlight_style = 'background-color:#eafbe7;font-size:8pt;font-weight:bold;padding:2px;border-radius:3px;';

    // Contenido HTML
    $html = '';
    // Encabezado
    $html .= '<div style="'.$header_style.'">'.htmlentities($empresa['razon_social_empresa']).'</div>';
    $html .= '<div style="'.$subheader_style.'">RUC: '.htmlentities($empresa['ruc_empresa']).'<br/>'.htmlentities($empresa['direccion_empresa']).'</div>';
    $html .= '<div style="text-align:right;font-size:7pt;margin-bottom:2px;">Impreso: '.$fecha_actual.'</div>';
    $html .= '<hr style="border:0;border-top:1px dashed #bbb;margin:2px 0;">';

    // Bloque de datos de la guía
    $html .= '<div style="'.$block_style.'">';
    $html .= '<table style="'.$table_style.'" cellpadding="0" cellspacing="0">';
    $html .= '<tr><td style="'.$label_style.'" width="40%">Guía N°:</td><td style="'.$highlight_style.'">'.htmlentities($guia['numero_guia']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Fecha:</td><td style="'.$value_style.'">'.$fecha.'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Compañía:</td><td style="'.$value_style.'">'.htmlentities($guia['nombre_compania_asociada']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Sucursal:</td><td style="'.$value_style.'">'.htmlentities($guia['nombre_sucursal']).' ('.htmlentities($guia['ciudad_sucursal']).')</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">RUC:</td><td style="'.$value_style.'">'.htmlentities($guia['ruc_sucursal']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Dirección:</td><td style="'.$value_style.'">'.htmlentities($guia['direccion_sucursal']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Teléfono:</td><td style="'.$value_style.'">'.htmlentities($guia['telefono_sucursal']).'</td></tr>';
    $html .= '</table></div>';

    // Bloque de datos del cliente
    $html .= '<div style="'.$block_style.'">';
    $html .= '<table style="'.$table_style.'" cellpadding="0" cellspacing="0">';
    $html .= '<tr><td style="'.$label_style.'" width="40%">Cliente:</td><td style="'.$value_style.'">'.htmlentities($guia['nombre_cliente']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Identificación:</td><td style="'.$value_style.'">'.htmlentities($guia['identificacion_cliente']).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Destino:</td><td style="'.$value_style.'">'.htmlentities($guia['id_destino']).'</td></tr>';
    $html .= '</table></div>';

    // Bloque de comisión
    $html .= '<div style="'.$block_style.'">';
    $html .= '<table style="'.$table_style.'" cellpadding="0" cellspacing="0">';
    $html .= '<tr><td style="'.$label_style.'" width="40%">% Comisión:</td><td style="'.$value_style.'">'.$guia['porcentaje_comision'].' %</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Valor Comisión:</td><td style="'.$value_style.'">$'.number_format($guia['valor_comision'], 2).'</td></tr>';
    $html .= '<tr><td style="'.$label_style.'">Valor Neto:</td><td style="'.$value_style.'">$'.number_format($guia['valor_neto'], 2).'</td></tr>';
    $html .= '</table></div>';

    // Footer
    $html .= '<div style="'.$footer_style.'"><span>Documento generado por '.htmlentities($guia['nombre_compania_asociada']).'</span></div>';

    // Escribir el contenido HTML PRIMERO
    $pdf->writeHTML($html, true, false, true, false, '');

    // MARCA DE AGUA "RECEPTADA" - AGREGAR DESPUÉS del contenido
    $pdf->SetAlpha(0.08); // Opacidad muy baja para no interferir
    $pdf->SetFont('helvetica', 'B', 18);
    $pdf->SetTextColor(120, 120, 120);
    
    // Posición centrada
    $x = 12;
    $y = 70;
    
    $pdf->StartTransform();
    $pdf->Rotate(45, $x + 25, $y + 5);
    $pdf->Text($x, $y, 'RECEPTADA');
    $pdf->StopTransform();
    
    $pdf->SetAlpha(1);
    $pdf->SetTextColor(0, 0, 0);

    $pdf->Output('guiaRecibesCompania.pdf', 'I');

} catch(Exception $e) {
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
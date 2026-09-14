<?php
// ─── IMPORTANTE: suprimir salida de errores para no corromper el PDF ────────
error_reporting(0);
ini_set('display_errors', '0');

require_once('library/tcpdf.php');
require_once("db.php");

date_default_timezone_set('America/Guayaquil');

try {
    $fecha_actual = date('d/m/Y H:i:s');

    $pdf = new TCPDF('P', PDF_UNIT, array(80, 150), true, 'UTF-8', false);
    $conn = conexion();

    // Datos empresa
    $empresa = mysqli_fetch_array(mysqli_query($conn,
        "SELECT telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1"
    ));

    // Parámetros
    $id_cobros  = intval($_GET['id_cobros'] ?? 0);
    $id_usuario = intval($_GET['id_usuario'] ?? 0);

    // Datos del usuario (si viene por GET)
    $nombre_usuario = '';
    if ($id_usuario > 0) {
        $res_u = mysqli_query($conn, "SELECT nombre_usuario, apellido_usuario FROM usuario WHERE id_usuario = $id_usuario");
        if ($res_u && $u = mysqli_fetch_array($res_u)) {
            $nombre_usuario = trim(($u['nombre_usuario'] ?? '') . ' ' . ($u['apellido_usuario'] ?? ''));
        }
    }

    // Datos del cobro — JOIN con COALESCE para socio/personal
    $query = "SELECT c.*,
                     u.nombre_usuario, u.apellido_usuario,
                     b.placa_buses, b.disco_buses,
                     s.nombre_sucursal,
                     ca.id_caja_boleteria,
                     tc.nombre_tipo_cobros,
                     p.per_nombres_persona,
                     p.per_apellidos_personal
              FROM cobros c
              LEFT JOIN usuario  u  ON c.id_fkusuario_cobros = u.id_usuario
              LEFT JOIN buses    b  ON c.id_fkbus_cobros = b.id_buses
              LEFT JOIN personal p  ON p.id_personal = COALESCE(b.id_fksocio_buses, b.id_fkpersonal_buses)
              LEFT JOIN sucursal2 s ON c.id_fksucursal_cobros = s.suc_codigo_sucursal
              LEFT JOIN caja_boleteria ca ON c.id_fkcaja_cobros = ca.id_caja_boleteria
              LEFT JOIN tipo_cobros tc ON c.tipo_cobro = tc.id_tipo_cobros
              WHERE c.id_cobros = $id_cobros";

    $res = mysqli_query($conn, $query);
    $cobro = $res ? mysqli_fetch_array($res) : null;

    if (!$cobro) {
        // No se encontró el cobro — mostrar mensaje de error en PDF
        $pdf->SetCreator('Sistema Flota');
        $pdf->SetMargins(5, 5, 5);
        $pdf->SetAutoPageBreak(true, 5);
        $pdf->AddPage();
        $pdf->writeHTML('<h3 style="color:red;text-align:center;">Cobro #' . $id_cobros . ' no encontrado</h3>', true, false, true, false, '');
        $pdf->Output('error.pdf', 'I');
        exit;
    }

    // Si no vino id_usuario por GET, usar el que está en el cobro
    if (empty($nombre_usuario)) {
        $nombre_usuario = trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''));
    }

    // Fecha cobro con fallback
    $fecha_str = $cobro['fecha_cobros'] ?? $cobro['fecha_creacion_cobros'] ?? null;
    if ($fecha_str && $fecha_str !== '0000-00-00' && $fecha_str !== '0000-00-00 00:00:00') {
        $ts = strtotime($fecha_str);
        $fecha_cobro = $ts ? date('d/m/Y H:i:s', $ts) : $fecha_actual;
    } else {
        $fecha_cobro = $fecha_actual;
    }

    // Helpers
    $razon   = $empresa['razon_social_empresa'] ?? 'Empresa';
    $ruc     = $empresa['ruc_empresa'] ?? '';
    $dir     = $empresa['direccion_empresa'] ?? '';
    $socio_n = trim(($cobro['per_nombres_persona'] ?? '') . ' ' . ($cobro['per_apellidos_personal'] ?? ''));
    $bus_inf = ($cobro['disco_buses'] ?? '-') . ' - ' . ($cobro['placa_buses'] ?? '-');
    $monto   = number_format(floatval($cobro['monto_cobros'] ?? 0), 2);
    $tipo_c  = $cobro['nombre_tipo_cobros'] ?? 'Cobro';
    $sucursal = $cobro['nombre_sucursal'] ?? '-';
    $obs     = $cobro['observacion_cobros'] ?? '';
    $recibido = $nombre_usuario ?: trim(($cobro['nombre_usuario'] ?? '') . ' ' . ($cobro['apellido_usuario'] ?? ''));

    // Configuración PDF
    $pdf->SetCreator('Sistema Flota');
    $pdf->SetMargins(5, 5, 5);
    $pdf->SetAutoPageBreak(true, 5);
    $pdf->AddPage();

    // Estilos
    $header_style = 'font-size:11pt;font-style:bold;text-align:center;line-height:1.3;';
    $label_style  = 'font-size:9pt;font-style:bold;';
    $value_style  = 'font-size:9pt;';

    // Contenido HTML
    $html = '
    <div style="' . $header_style . '">
        ' . htmlspecialchars($razon) . '<br>
        <span style="font-size:9pt;">RUC: ' . htmlspecialchars($ruc) . '</span><br>
        <span style="font-size:9pt;">' . htmlspecialchars($dir) . '</span>
    </div>

    <hr style="height:0.5px;">
    <div style="text-align:right;font-size:8pt;">Impreso: ' . $fecha_actual . '</div>

    <table border="0" cellpadding="2" cellspacing="2" style="margin-bottom:8px; width:100%;">
        <tr>
            <td style="' . $label_style . '" width="35%">Recibido de:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($recibido) . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Sucursal:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($sucursal) . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Bus:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($bus_inf) . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Tipo cobro:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($tipo_c) . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Personal:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($socio_n ?: '-') . '</td>
        </tr>
    </table>

    <table border="0" cellpadding="2" cellspacing="2" style="margin-bottom:8px; width:100%;">
        <tr>
            <td style="' . $label_style . '" width="35%">Fecha:</td>
            <td style="' . $value_style . '">' . $fecha_cobro . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Observación:</td>
            <td style="' . $value_style . '">' . htmlspecialchars($obs) . '</td>
        </tr>
        <tr>
            <td style="' . $label_style . '">Monto:</td>
            <td style="' . $value_style . '">$' . $monto . '</td>
        </tr>
    </table>';

    if (($cobro['estado_cobros'] ?? '') == 2) {
        $motivo = htmlspecialchars($cobro['motivo_anulacion_cobros'] ?? '');
        $html .= '<div style="font-size:9pt;color:red;margin-top:3px;border:1px solid #f00;padding:3px;"><b>Motivo Anulación:</b> ' . $motivo . '</div>';
    }

    // Firmas
    $html .= '<br><br><table style="width:100%;margin-top:20px;" border="0">
        <tr>
            <td style="width:45%;text-align:center;font-size:8pt;">_________________________<br>'
                . htmlspecialchars($socio_n ?: 'Personal') . '<br>Personal</td>
            <td style="width:10%;"></td>
            <td style="width:45%;text-align:center;font-size:8pt;">_________________________<br>'
                . htmlspecialchars($nombre_usuario ?: 'Usuario') . '<br>Usuario</td>
        </tr>
    </table>';

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('retencion_' . $id_cobros . '.pdf', 'I');

} catch (Exception $e) {
    // Si aún no se envió nada al buffer, mostrar JSON de error
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
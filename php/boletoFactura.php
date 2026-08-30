<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');

$conn = conexion();

function formatearFechaEspanol($fecha)
{
    $fechaObj = DateTime::createFromFormat('Y-m-d', $fecha);

    if (!$fechaObj) {
        $fechaObj = DateTime::createFromFormat('d/m/Y', $fecha);
    }
    if (!$fechaObj) {
        try {
            $fechaObj = new DateTime($fecha);
        } catch (Exception $e) {
            $fechaObj = false;
        }
    }

    if (!$fechaObj) {
        return $fecha; // Fallback a retornar la cadena original
    }

    $dias = [
        'domingo',
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado'
    ];

    $meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre'
    ];

    $nombreDia = $dias[$fechaObj->format('w')];
    $nombreMes = $meses[$fechaObj->format('n') - 1];
    $diaNumero = $fechaObj->format('d');
    $anio = $fechaObj->format('Y');

    return ucfirst($nombreDia) . ', ' . $diaNumero . ' de ' . $nombreMes . ' ' . $anio;
}

function extraerDestinoLimpio($candidato)
{
    if (empty($candidato)) {
        return '';
    }
    $cand = trim((string)$candidato);
    if ($cand === '' || $cand === '—' || $cand === '-' || is_numeric($cand)) {
        return '';
    }
    if (strpos(strtoupper($cand), 'SIN DESTINO') !== false) {
        return '';
    }
    if (strpos(strtoupper($cand), 'S/N - S/N') !== false) {
        return '';
    }
    if (preg_match('/^ID\s+\d+\s*-\s*ID\s+\d+$/i', $cand)) {
        return '';
    }
    if (preg_match('/^\d+\s*-\s*\d+$/', $cand)) {
        return '';
    }

    // Limpiar posibles precios adjuntos al final (ej: "Quito - Latacunga - $3.13" -> "Quito - Latacunga")
    $cand = preg_replace('/\s*-\s*\$\s*[\d\.,]+\s*$/i', '', $cand);
    $cand = preg_replace('/\s*\$\s*[\d\.,]+\s*$/i', '', $cand);

    return trim($cand);
}

function obtener_datos_factura($id_boleto, $conn)
{
    $id_boleto_esc = (int)$id_boleto;
    if ($id_boleto_esc <= 0) {
        throw new Exception("ID de boleto no válido: {$id_boleto}");
    }

    $query_boleto = "SELECT
b.id_boleto, b.identificacion_boleto, b.nombres_boleto, b.observacion_boleto,
b.fecha_boleto, b.total_boleto, b.numero_boleto,
b.punto_emision_boleto, b.sucursal_emision_boleto, b.id_fkviaje_boleto,
b.nombre_origen, b.nombre_destino, b.origen_boleto, b.destino_boleto, b.id_fksubruta_boleto,
b.clave_acceso_boletos, b.fecha_creacion_boleto,
s.nombre_sucursal, u.nombre_usuario, bu.disco_buses, bu.placa_buses,
r.nombre_rutas, r.andes_rutas, r.piso_rutas, r.id_fkdestino_rutas, b.celular_boleto, b.tipo_boleto, b.estado_boleto,
sr.nombre_sub_rutas, sr.anden_sub_rutas, sr.piso_sub_rutas, sr.fecha_salida, sr.hora_salida, sr.id_fkdestino_sub_rutas,
d_sr.nombre_destino as destino_sr_nombre, d_sr.lugar_destino as destino_sr_lugar,
d_bol.nombre_destino as destino_bol_nombre, d_bol.lugar_destino as destino_bol_lugar,
d_ruta.nombre_destino as destino_ruta_nombre, d_ruta.lugar_destino as destino_ruta_lugar,
v.incluye_alimentos, v.hora_origen_salida, v.fecha_cierre,
(SELECT GROUP_CONCAT(nombre_alimentos SEPARATOR ', ')
FROM alimentos
WHERE FIND_IN_SET(id_alimentos, REPLACE(v.id_fkalimento_viajes, ' ', ''))) as nombres_alimentos
FROM boletos b
LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
LEFT JOIN sucursal2 s ON u.id_fksucursal_usuario = s.suc_codigo_sucursal
LEFT JOIN buses bu ON b.id_fkbus_boleto = bu.id_buses
LEFT JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
LEFT JOIN sub_rutas sr ON b.id_fksubruta_boleto = sr.id_sub_rutas
LEFT JOIN destino d_sr ON sr.id_fkdestino_sub_rutas = d_sr.id_destino
LEFT JOIN destino d_bol ON b.destino_boleto = d_bol.id_destino
LEFT JOIN destino d_ruta ON r.id_fkdestino_rutas = d_ruta.id_destino
WHERE b.id_boleto = $id_boleto_esc";

    $recuperar_boleto = mysqli_query($conn, $query_boleto);
    if (!$recuperar_boleto) {
        throw new Exception("Error en consulta de boleto: " . mysqli_error($conn));
    }
    $boleto = mysqli_fetch_assoc($recuperar_boleto);
    if (!$boleto) {
        throw new Exception("Boleto #{$id_boleto_esc} no encontrado");
    }

    $query_detalles = "SELECT
bd.asiento_boleto_detalle, bd.precio_boleto_detalle,
bd.descuento_boleto_detalle, bd.iva_boleto_detalle,
bd.total_boleto_detalle, bd.tarifa_boleto_detalle,
bd.nombre_cliente_boleto_detalle,
bd.identificacion_boleto_detalle,
bd.incluye_alimento_boleto_detalle,
bd.precio_alimento_boleto_detalle,
bd.id_destino_boleto,
sr_det.nombre_sub_rutas as subruta_detalle_nombre,
d_det_sr.nombre_destino as destino_det_sr_nombre,
d_det_sr.lugar_destino as destino_det_sr_lugar,
d_det.nombre_destino as destino_det_nombre,
d_det.lugar_destino as destino_det_lugar
FROM boleto_detalle bd
LEFT JOIN sub_rutas sr_det ON bd.id_destino_boleto = sr_det.id_sub_rutas
LEFT JOIN destino d_det_sr ON sr_det.id_fkdestino_sub_rutas = d_det_sr.id_destino
LEFT JOIN destino d_det ON bd.id_destino_boleto = d_det.id_destino
WHERE bd.id_fkboleto_boleto_detalle = $id_boleto_esc";

    $recuperar_detalles = mysqli_query($conn, $query_detalles);
    $detalles = [];
    if ($recuperar_detalles) {
        while ($detalle = mysqli_fetch_assoc($recuperar_detalles)) {
            $detalles[] = $detalle;
        }
    }

    // Si por alguna razón no hay registros en boleto_detalle, crear uno por defecto desde el boleto
    if (empty($detalles)) {
        $detalles[] = [
            'asiento_boleto_detalle' => '1',
            'precio_boleto_detalle' => (float)($boleto['total_boleto'] ?? 0),
            'descuento_boleto_detalle' => 0,
            'iva_boleto_detalle' => 0,
            'total_boleto_detalle' => (float)($boleto['total_boleto'] ?? 0),
            'tarifa_boleto_detalle' => 'Normal',
            'nombre_cliente_boleto_detalle' => $boleto['nombres_boleto'] ?? 'CLIENTE',
            'identificacion_boleto_detalle' => $boleto['identificacion_boleto'] ?? '',
            'incluye_alimento_boleto_detalle' => 0,
            'precio_alimento_boleto_detalle' => 0,
            'id_destino_boleto' => $boleto['destino_boleto'] ?? 0,
            'subruta_detalle_nombre' => $boleto['nombre_sub_rutas'] ?? '',
            'destino_det_sr_nombre' => $boleto['destino_sr_nombre'] ?? '',
            'destino_det_sr_lugar' => $boleto['destino_sr_lugar'] ?? '',
            'destino_det_nombre' => $boleto['destino_bol_nombre'] ?? '',
            'destino_det_lugar' => $boleto['destino_bol_lugar'] ?? ''
        ];
    }

    return [
        'boleto' => $boleto,
        'detalles' => $detalles
    ];
}

try {
    $id_boleto = isset($_GET['id_boleto']) ? (int)$_GET['id_boleto'] : 0;
    if ($id_boleto <= 0) {
        throw new Exception("Parámetro id_boleto inválido o faltante");
    }

    $datos_factura = obtener_datos_factura($id_boleto, $conn);
    $boleto = $datos_factura['boleto'];
    $detalles = $datos_factura['detalles'];

    $sucursal_emi = !empty($boleto['sucursal_emision_boleto']) ? $boleto['sucursal_emision_boleto'] : '001';
    $punto_emi = !empty($boleto['punto_emision_boleto']) ? $boleto['punto_emision_boleto'] : '001';
    $num_bol = !empty($boleto['numero_boleto']) ? sprintf("%09s", $boleto['numero_boleto']) : '000000001';
    $numero_boleto = "{$sucursal_emi}-{$punto_emi}-{$num_bol}";

    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa,
correo_empresa, ruc_empresa, direccion_empresa,
razon_social_empresa FROM empresa LIMIT 1";
    $recuperar_empresa = mysqli_query($conn, $query_empresa);
    $vals_empresa = $recuperar_empresa ? mysqli_fetch_assoc($recuperar_empresa) : [];
    if (!$vals_empresa) {
        $vals_empresa = [
            'imagen_empresa' => null,
            'razon_social_empresa' => 'EMPRESA DE TRANSPORTE',
            'ruc_empresa' => '9999999999001',
            'direccion_empresa' => 'MATRIZ',
            'telefono_empresa' => ''
        ];
    }

    // Obtener leyenda de configuración
    $query_config = "SELECT leyenda_boleteria, mostrar_leyenda_boleteria, formato_impresion FROM configuracion LIMIT 1";
    $recuperar_config = mysqli_query($conn, $query_config);
    $vals_config = $recuperar_config ? mysqli_fetch_assoc($recuperar_config) : [];
    $leyenda_viaje = ($vals_config && ($vals_config['mostrar_leyenda_boleteria'] ?? 0) == 1) ? ($vals_config['leyenda_boleteria'] ?? '') :
        'GRACIAS POR SU PREFERENCIA';

    $formato_impresion_db = $vals_config['formato_impresion'] ?? null;
    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 80, $formato_impresion_db);
    $metricas = obtenerMetricasImpresion($ancho_impresion, 80);

    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array($ancho_impresion, 380), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetCreator(PDF_CREATOR);
    $pdf->SetTitle('Boleto de Viaje');
    $pdf->SetSubject('Boleto de Transporte');

    // Usar datos del boleto y viaje directamente
    $fechaSalidaRaw = !empty($boleto['fecha_cierre']) ? $boleto['fecha_cierre'] : ($boleto['fecha_salida'] ?? null);
    $fechaSalida = (!empty($fechaSalidaRaw) && $fechaSalidaRaw !== '0000-00-00') ? date('d/m/Y', strtotime($fechaSalidaRaw)) : date('d/m/Y');
    $horaSalida = !empty($boleto['hora_origen_salida']) ? $boleto['hora_origen_salida'] : ($boleto['hora_salida'] ?? '00:00');
    
    $viajeMostrar = !empty($boleto['nombre_rutas']) ? $boleto['nombre_rutas'] : '—';
    
    // Obtener destino general del boleto como fallback
    $destinoGeneral = '';
    $candidatosBoleto = [
        $boleto['nombre_sub_rutas'] ?? '',
        $boleto['nombre_destino'] ?? '',
        $boleto['destino_sr_nombre'] ?? '',
        $boleto['destino_sr_lugar'] ?? '',
        $boleto['destino_bol_nombre'] ?? '',
        $boleto['destino_bol_lugar'] ?? '',
        $boleto['destino_boleto'] ?? '',
        $boleto['destino_ruta_nombre'] ?? '',
        $boleto['destino_ruta_lugar'] ?? '',
        $boleto['nombre_rutas'] ?? ''
    ];
    foreach ($candidatosBoleto as $cand) {
        $dest = extraerDestinoLimpio($cand);
        if (!empty($dest)) {
            $destinoGeneral = $dest;
            break;
        }
    }

    $busMostrar = !empty($boleto['disco_buses']) ? $boleto['disco_buses'] : '—';
    $andMostrar = !empty($boleto['anden_sub_rutas']) && $boleto['anden_sub_rutas'] != '0' ? $boleto['anden_sub_rutas'] : (!empty($boleto['andes_rutas']) && $boleto['andes_rutas'] != '0' ? $boleto['andes_rutas'] : '—');
    $pisoMostrar = !empty($boleto['piso_sub_rutas']) && $boleto['piso_sub_rutas'] != 0 ? $boleto['piso_sub_rutas'] : (!empty($boleto['piso_rutas']) && $boleto['piso_rutas'] != 0 ? $boleto['piso_rutas'] : '1');

    $html1 = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{font-family:Helvetica,Arial,sans-serif;font-size:' . $metricas['font_boleto_base_pt'] . 'pt;color:#000;margin:0;padding:0;line-height:1}
        .center{text-align:center}.left{text-align:left}.bold{font-weight:bold}
        .sep{border-top:1.5px solid #000;margin:1px 0}
        .sep-light{border-top:1px solid #000;margin:1px 0}
        table{width:100%;border-collapse:collapse}td{padding:0;vertical-align:middle;font-size:' . $metricas['font_boleto_base_pt'] . 'pt}
    </style></head><body><div class="center">';

    $rutaLogo = obtenerRutaLogoEmpresa($conn, $vals_empresa['imagen_empresa'] ?? null);
    if ($rutaLogo) {
        $html1 .= '<img src="' . $rutaLogo . '" width="' . max(24, round(30 * $metricas['factor'])) . '" style="margin-bottom:0;"><br>';
    }

    $html1 .= '<div class="bold" style="font-size:' . $metricas['font_boleto_tit_pt'] . 'pt;line-height:1">' . strtoupper($vals_empresa["razon_social_empresa"] ?? 'EMPRESA') . '</div>
        <div style="font-size:' . $metricas['font_boleto_base_pt'] . 'pt;line-height:1">RUC: ' . ($vals_empresa["ruc_empresa"] ?? '') . '</div>
        <div style="font-size:' . $metricas['font_boleto_base_pt'] . 'pt;line-height:1;text-transform:uppercase">' . strtoupper($vals_empresa["direccion_empresa"] ?? '') . '</div>
        <div style="font-size:' . $metricas['font_boleto_base_pt'] . 'pt;line-height:1">Oficina ' . ($boleto['nombre_sucursal'] ?? '') . '</div>
    </div>
    <div class="sep"></div>
    <table>
        <tr><td width="26%" class="bold">Facturado a:</td><td width="74%" class="bold">' . strtoupper($boleto['nombres_boleto'] ?? 'CLIENTE') . '</td></tr>
        <tr><td class="bold">RUC/CI:</td><td>' . ($boleto['identificacion_boleto'] ?? '') . '</td></tr>
        <tr><td class="bold">Teléfono:</td><td>' . (!empty($boleto['celular_boleto']) ? $boleto['celular_boleto'] : '-') . '</td></tr>
    </table>
    <table>
        <tr><td width="26%">Viaje ' . ($boleto['id_fkviaje_boleto'] ?? '') . '</td><td width="74%" class="bold">' . strtoupper($viajeMostrar) . '</td></tr>
        <tr><td class="bold" style="font-size:' . round($metricas['font_boleto_base_pt'] * 1.2, 1) . 'pt">Bus ' . $busMostrar . '</td><td class="bold" style="font-size:' . round($metricas['font_boleto_base_pt'] * 1.2, 1) . 'pt">Sale Origen ' . $fechaSalida . ' ' . $horaSalida . '</td></tr>
    </table>
    <table>
        <tr><td width="60%" class="bold" style="font-size:' . round($metricas['font_boleto_base_pt'] * 1.1, 1) . 'pt;text-decoration:underline">INFORMACIÓN DEL VIAJE</td><td width="20%" class="bold">Piso ' . $pisoMostrar . '</td><td width="20%" class="bold">Andén ' . $andMostrar . '</td></tr>
    </table>
    <div class="sep"></div>';

    foreach ($detalles as $detalle) {
        $nombrePasajero = strtoupper($detalle['nombre_cliente_boleto_detalle'] ?? ($boleto['nombres_boleto'] ?? 'PASAJERO'));
        $fechaSalidaFormateada = formatearFechaEspanol($fechaSalida); 
        
        $destinoDetalle = '';
        $candidatosDetalle = [
            $detalle['subruta_detalle_nombre'] ?? '',
            $detalle['destino_det_nombre'] ?? '',
            $detalle['destino_det_lugar'] ?? '',
            $detalle['destino_det_sr_nombre'] ?? '',
            $detalle['destino_det_sr_lugar'] ?? '',
            $detalle['id_destino_boleto'] ?? ''
        ];
        foreach ($candidatosDetalle as $cand) {
            $dest = extraerDestinoLimpio($cand);
            if (!empty($dest)) {
                $destinoDetalle = $dest;
                break;
            }
        }

        $destinoMostrar = !empty($destinoDetalle) ? strtoupper($destinoDetalle) : (!empty($destinoGeneral) ? strtoupper($destinoGeneral) : '—');
        $asientoVal = isset($detalle['asiento_boleto_detalle']) ? str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT) : '01';
        $totalDetalle = isset($detalle['total_boleto_detalle']) ? (float)$detalle['total_boleto_detalle'] : (float)($boleto['total_boleto'] ?? 0);
        $tarifaDetalle = !empty($detalle['tarifa_boleto_detalle']) ? $detalle['tarifa_boleto_detalle'] : 'Normal';
        
        $html1 .= '<table style="margin-top:1px">
            <tr><td class="bold" style="font-size:' . round($metricas['font_boleto_base_pt'] * 1.1, 1) . 'pt">' . $nombrePasajero . '</td><td class="bold" style="font-size:' . $metricas['font_boleto_total_pt'] . 'pt" align="right">Asiento ' . $asientoVal . '</td></tr>
            <tr><td colspan="2" class="bold" style="font-size:' . $metricas['font_boleto_tit_pt'] . 'pt" align="right">DESTINO: ' . $destinoMostrar . '</td></tr>
            <tr><td colspan="2" align="right" class="bold" style="font-size:' . $metricas['font_boleto_dest_pt'] . 'pt">Valor $' . number_format($totalDetalle, 2, ',', '.') . '</td></tr>
            <tr><td colspan="2" style="font-size:' . round($metricas['font_boleto_base_pt'] * 0.9, 1) . 'pt">Tarifa: ' . $tarifaDetalle . '</td></tr>
        </table>';
    }

    $totalBoleto = isset($boleto['total_boleto']) ? (float)$boleto['total_boleto'] : 0.0;
    $html1 .= '<table style="margin-top:3px">
        <tr><td width="35%" class="bold" style="font-size:' . $metricas['font_boleto_total_pt'] . 'pt">TOTAL</td><td width="65%" class="bold" style="font-size:' . $metricas['font_boleto_total_pt'] . 'pt" align="right">$' . number_format($totalBoleto, 2, ',', '.') . '</td></tr>
    </table>
    <div style="font-size:' . round($metricas['font_boleto_base_pt'] * 0.9, 1) . 'pt;line-height:1">
        <div>Caducidad ' . $fechaSalida . ' ' . $horaSalida . '</div>
        <div>F. Emisión ' . (!empty($boleto['fecha_creacion_boleto']) ? date('d/m/Y H:i:s', strtotime($boleto['fecha_creacion_boleto'])) : date('d/m/Y H:i:s')) . '</div>';
        
    if (!empty($numero_boleto)) {
        $html1 .= '<div>Factura ' . $numero_boleto . '</div>';
    }
    if (!empty($boleto['clave_acceso_boletos'])) {
        $html1 .= '<div>Aut. SRI ' . $boleto['clave_acceso_boletos'] . '</div>';
    }

    $html1 .= '</div>
    <div class="sep-light"></div>
    <div class="center" style="font-size:' . round($metricas['font_boleto_base_pt'] * 0.9, 1) . 'pt;line-height:1">
        <div>' . strtoupper($vals_empresa["razon_social_empresa"] ?? '') . '</div>
        <div>Dir. Matriz ' . ($vals_empresa["direccion_empresa"] ?? '') . '</div>
        <div>Oficina ' . ($boleto['nombre_sucursal'] ?? '') . '</div>
        <div class="left">Registra ' . ($boleto['nombre_usuario'] ?? '') . '</div>
        <table class="left">
            <tr><td width="50%">Impresión ' . date('d/m/Y') . '</td><td width="50%">' . date('H:i') . '</td></tr>
        </table>
    </div>
  
    <div class="center bold" style="font-size:' . $metricas['font_boleto_base_pt'] . 'pt">Vendido por: ' . ($boleto['nombre_usuario'] ?? '') . '</div>
    <div class="sep-light" style="margin:3px 0"></div>
    <div class="center" style="font-size:' . round($metricas['font_boleto_base_pt'] * 0.9, 1) . 'pt;line-height:1.2">' . $leyenda_viaje . '</div>
</body></html>';

    $pdf->SetFont('helvetica', '', $metricas['font_boleto_base_pt']);
    $pdf->SetMargins($metricas['margen_mm'], 3, $metricas['margen_mm'], true);
    $pdf->SetAutoPageBreak(true, 2);
    $pdf->AddPage('P', array($ancho_impresion, 200));
    $pdf->writeHTML($html1, true, false, true, false, '');

    $filename = 'boleto_' . $id_boleto . '.pdf';
    $pdf->Output($filename, 'I');
    exit();

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Error al generar boleto</title></head><body style='font-family:sans-serif;padding:30px;background:#f8f9fa;'>";
    echo "<div style='max-width:800px;margin:0 auto;background:#fff;border:1px solid #e74c3c;border-radius:8px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);'>";
    echo "<h2 style='color:#c0392b;margin-top:0;'>⚠️ Error al generar el boleto (ID: " . htmlspecialchars($_GET['id_boleto'] ?? '0') . ")</h2>";
    echo "<p style='font-size:16px;'><strong>Mensaje:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>Archivo:</strong> <code>" . htmlspecialchars($e->getFile()) . "</code> (Línea <strong>" . $e->getLine() . "</strong>)</p>";
    echo "<h4 style='margin-bottom:5px;color:#2c3e50;'>Traza de ejecución:</h4>";
    echo "<pre style='background:#2c3e50;color:#ecf0f1;padding:15px;border-radius:5px;overflow:auto;font-size:13px;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div></body></html>";
    exit();
}
?>
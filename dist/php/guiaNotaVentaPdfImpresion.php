<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once('library/tcpdf.php');
require_once("db.php");
require_once("pdf_utils.php");

date_default_timezone_set('America/Guayaquil');

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_guia = isset($_GET['id_guia']) ? (int)$_GET['id_guia'] : 0;
    $reimpreso_por = isset($_GET['reimpreso_por']) ? trim($_GET['reimpreso_por']) : null;

    if ($id_guia <= 0) {
        throw new Exception("ID de guía nota de venta inválido");
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // Consulta directa de Empresa y Configuración (sin caché)
    $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
    $rec_emp = mysqli_query($conn, $query_empresa);
    $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];

    $sql_configuracion = "SELECT leyenda_nota_venta, mostrar_leyenda_nota_venta, imprimir_boucher_guia, formato_impresion FROM configuracion LIMIT 1";
    $rec_cfg = mysqli_query($conn, $sql_configuracion);
    $vals_configuracion = $rec_cfg ? mysqli_fetch_assoc($rec_cfg) : [];

    $id_empresa = $vals_empresa["id_empresa"] ?? 0;
    $imagen_empresa = $vals_empresa["imagen_empresa"] ?? null;
    $telefono_empresa = $vals_empresa["telefono_empresa"] ?? '';
    $correo_empresa = $vals_empresa["correo_empresa"] ?? '';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa = $vals_empresa["direccion_empresa"] ?? '';
    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? '';

    $leyenda_nota_venta = $vals_configuracion["leyenda_nota_venta"] ?? '';
    $imprimir_boucher_guia = isset($vals_configuracion["imprimir_boucher_guia"]) ? (int)$vals_configuracion["imprimir_boucher_guia"] : 1;
    $formato_impresion_db = $vals_configuracion["formato_impresion"] ?? null;

    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 110, $formato_impresion_db);
    $metricas = obtenerMetricasImpresion($ancho_impresion, 110);
    $leyenda = $leyenda_nota_venta;
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $imagen_empresa);

    // ─── CONSULTA PRINCIPAL DE GUIA NOTA VENTA ───────────────────────────────
    $query_guia = "SELECT 
        g.origen_guia, 
        s.nombre_sucursal,
        g.destino_guia,
        g.numero_guia,
        g.numero_manual_guia,
        s.punto_emision_sucursal,
        g.observacion_guia,
        g.id_fkcompania_asociada,
        g.id_fkusuario_guia,
        g.fecha_creacion_guia,
        g.fecha_guia,
        g.estado_cobro_guia,
        g.cancelado_por_guia,
        UPPER(g.nombre_cliente_remitente) AS nombre_cliente_remitente,
        u.punto_emision_usuario,
        UPPER(g.nombre_cliente_receptor) AS nombre_cliente_receptor,
        g.cedula_cliente_remitente,
        g.cedula_cliente_receptor,
        g.telefono_cliente_emisor,
        g.telefono_cliente_receptor,
        g.subtotal_12_guia,
        g.subtotal_0_guia,
        g.subtotal_guia,
        g.total_guia,
        g.descuento_guia,
        g.valor_tarifa_adicional_guia,
        g.impuesto_iva_guia,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS usuario,
        du.lugar_destino AS ubicacion_usuario
    FROM guia_nota_venta g
    LEFT JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
    LEFT JOIN usuario u ON g.id_fkusuario_guia = u.id_usuario
    LEFT JOIN destino du ON u.id_fkdestino_usuario = du.id_destino
    WHERE g.id_guia = $id_guia
    LIMIT 1";

    $recuperar_guia = mysqli_query($conn, $query_guia) or die(mysqli_error($conn));
    $vals_guia = mysqli_fetch_assoc($recuperar_guia);

    if (!$vals_guia) {
        throw new Exception("Guía nota de venta no encontrada");
    }

    $origen_guia = limpiarTextoPdf($vals_guia["origen_guia"] ?? '');
    $observacion_guia = limpiarTextoPdf($vals_guia["observacion_guia"] ?? '');
    $destino_guia = limpiarTextoPdf($vals_guia["destino_guia"] ?? '');
    $nombre_cliente_remitente = limpiarTextoPdf($vals_guia["nombre_cliente_remitente"] ?? '');
    $nombre_cliente_receptor = limpiarTextoPdf($vals_guia["nombre_cliente_receptor"] ?? '');
    $cedula_cliente_remitente = limpiarTextoPdf($vals_guia["cedula_cliente_remitente"] ?? '');
    $cedula_cliente_receptor = limpiarTextoPdf($vals_guia["cedula_cliente_receptor"] ?? '');
    $telefono_cliente_emisor = limpiarTextoPdf($vals_guia["telefono_cliente_emisor"] ?? '');
    $telefono_cliente_receptor = limpiarTextoPdf($vals_guia["telefono_cliente_receptor"] ?? '');
    $subtotal_12_guia = (float)($vals_guia["subtotal_12_guia"] ?? 0);
    $subtotal_0_guia = (float)($vals_guia["subtotal_0_guia"] ?? 0);
    $subtotal_guia = (float)($vals_guia["subtotal_guia"] ?? 0);
    $total_guia = (float)($vals_guia["total_guia"] ?? 0);
    $descuento_guia = (float)($vals_guia["descuento_guia"] ?? 0);
    $valor_tarifa_adicional_guia = (float)($vals_guia["valor_tarifa_adicional_guia"] ?? 0);
    $impuesto_iva_guia = (float)($vals_guia["impuesto_iva_guia"] ?? 0);
    $punto_emision_sucursal_guia = limpiarTextoPdf($vals_guia["punto_emision_sucursal"] ?? '', '001');
    $punto_emision_guia = limpiarTextoPdf($vals_guia["punto_emision_usuario"] ?? '', '001');
    $id_fkcompania_asociada = (int)($vals_guia["id_fkcompania_asociada"] ?? 0);
    $usuario = limpiarTextoPdf($vals_guia["usuario"] ?? '');
    $numero_manual_guia = limpiarTextoPdf($vals_guia["numero_manual_guia"] ?? '');
    $ubicacion_usuario = limpiarTextoPdf(!empty($vals_guia["ubicacion_usuario"]) ? $vals_guia["ubicacion_usuario"] : ($vals_guia["nombre_sucursal"] ?? ''));

    // Fecha y hora de emisión
    $fecha_emision_raw = $vals_guia['fecha_creacion_guia'] ?? $vals_guia['fecha_guia'] ?? null;
    if (!empty($fecha_emision_raw) && $fecha_emision_raw !== '0000-00-00' && $fecha_emision_raw !== '0000-00-00 00:00:00') {
        $fecha_hora_emision = date('Y-m-d H:i:s', strtotime($fecha_emision_raw));
    } else {
        $fecha_hora_emision = $fecha_actual;
    }

    // Compañía asociada
    $nombre_compania = '';
    $direccion_compania_asociada = '';
    $numero_contacto = '';
    if ($id_fkcompania_asociada > 0) {
        $destino_escaped = mysqli_real_escape_string($conn, $destino_guia);
        $query_datos_compania = "SELECT 
            ca.nombre_compania_asociada, 
            d.nombre_destino AS direccion_compania_asociada, 
            d.direccion_exacta, 
            d.numero_contacto 
        FROM compania_asociada ca
        LEFT JOIN destino d ON d.lugar_destino = '$destino_escaped'
        WHERE ca.id_compania_asociada = $id_fkcompania_asociada 
        LIMIT 1";
        $rec_comp = mysqli_query($conn, $query_datos_compania);
        if ($rec_comp && $row_comp = mysqli_fetch_assoc($rec_comp)) {
            $nombre_compania = limpiarTextoPdf($row_comp['nombre_compania_asociada'] ?? '');
            $direccion_compania_asociada = limpiarTextoPdf($row_comp['direccion_compania_asociada'] ?? '');
            $numero_contacto = limpiarTextoPdf($row_comp['numero_contacto'] ?? '');
        }
    }

    $resultado_guia = sprintf("%09s", $vals_guia['numero_guia']);
    $numero_guia = $punto_emision_sucursal_guia . '-' . $punto_emision_guia . '-' . $resultado_guia;

    // Detalles Guía Nota Venta
    $query_detalles = "SELECT 
        dg.contenido_guia, 
        dg.cantidad_detalle_guia, 
        te.nombre_envio 
    FROM detalle_guia_nota_venta dg
    LEFT JOIN tipo_envio te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio 
    WHERE dg.id_fkguia_detalle_envio = $id_guia";

    $rec_det = mysqli_query($conn, $query_detalles) or die(mysqli_error($conn));
    $items_detalle = [];
    $total_copias_extra = 0;
    $lista_contenido = [];

    while ($vals_detalle = mysqli_fetch_assoc($rec_det)) {
        $cant = max(1, (int)$vals_detalle["cantidad_detalle_guia"]);
        $nomEnv = limpiarTextoPdf($vals_detalle["nombre_envio"] ?? '');
        $contGuia = limpiarTextoPdf($vals_detalle["contenido_guia"] ?? '');
        $lista_contenido[] = $cant . ' ' . $nomEnv . ' ' . $contGuia;
        for ($ci = 1; $ci <= $cant; $ci++) {
            $items_detalle[] = [
                'nombre_envio' => $nomEnv,
                'contenido'    => $contGuia,
                'cantidad'     => $cant,
                'unidad'       => $ci,
            ];
            $total_copias_extra++;
        }
    }

    // ─── CONSULTA FORMAS DE PAGO Y ESTADO DE COBRO ───────────────────────────
    $detalles_forma_pago = "";
    $suma_cobrada = 0.0;

    // 1) Comprobantes en comprobante_cobro_nota_venta
    $sql_pagos_nv = "SELECT
        COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
        fp.id_forma_pago,
        fp.nombre_forma_pago,
        fp.tipo_forma_pago
    FROM comprobante_cobro_nota_venta cc
    LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
    WHERE cc.id_fkfactura_comprobante_cobro = $id_guia AND cc.estado_comprobante_cobro != 'ANULADA'
    GROUP BY fp.id_forma_pago, fp.nombre_forma_pago, fp.tipo_forma_pago";

    $rec_pagos_nv = mysqli_query($conn, $sql_pagos_nv);
    if ($rec_pagos_nv && mysqli_num_rows($rec_pagos_nv) > 0) {
        while ($vPago = mysqli_fetch_assoc($rec_pagos_nv)) {
            $monto_pago = (float)$vPago["total"];
            $nomFp = trim($vPago["nombre_forma_pago"] ?? 'EFECTIVO');
            $detalles_forma_pago .= $nomFp . ': $' . number_format($monto_pago, 2) . ' ';
            if ((int)($vPago["tipo_forma_pago"] ?? 0) != 4) {
                $suma_cobrada += $monto_pago;
            }
        }
    }

    // 2) Si no hubo en comprobante_cobro_nota_venta, consultar comprobante_cobro general
    if (empty(trim($detalles_forma_pago))) {
        $sql_pagos_gen = "SELECT
            COALESCE(SUM(cc.monto_comprobante_cobro), 0) AS total,
            fp.id_forma_pago,
            fp.nombre_forma_pago,
            fp.tipo_forma_pago
        FROM comprobante_cobro cc
        LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
        WHERE cc.id_fkfactura_comprobante_cobro = $id_guia AND cc.estado_comprobante_cobro != 'ANULADA'
        GROUP BY fp.id_forma_pago, fp.nombre_forma_pago, fp.tipo_forma_pago";

        $rec_pagos_gen = mysqli_query($conn, $sql_pagos_gen);
        if ($rec_pagos_gen && mysqli_num_rows($rec_pagos_gen) > 0) {
            while ($vPago = mysqli_fetch_assoc($rec_pagos_gen)) {
                $monto_pago = (float)$vPago["total"];
                $nomFp = trim($vPago["nombre_forma_pago"] ?? 'EFECTIVO');
                $detalles_forma_pago .= $nomFp . ': $' . number_format($monto_pago, 2) . ' ';
                if ((int)($vPago["tipo_forma_pago"] ?? 0) != 4) {
                    $suma_cobrada += $monto_pago;
                }
            }
        }
    }

    $total_cobrado = max(0.0, $total_guia - $suma_cobrada);

    // Determinar ESTADO (COBRADA / POR COBRAR / AL COBRO)
    $estado_cobro_raw = strtoupper(trim((string)($vals_guia['estado_cobro_guia'] ?? '')));
    $cancelado_por_raw = strtoupper(trim((string)($vals_guia['cancelado_por_guia'] ?? '')));

    if ($cancelado_por_raw === 'DESTINATARIO' || $cancelado_por_raw === 'DESTINO' || $estado_cobro_raw === 'AL COBRO') {
        $estado_nota_venta = "AL COBRO";
        $total_cobrado = $total_guia;
    } else if ($suma_cobrada >= ($total_guia - 0.001) && $total_guia > 0) {
        $estado_nota_venta = "COBRADA";
        $total_cobrado = 0.00;
    } else if ($estado_cobro_raw === 'COBRADA' || $estado_cobro_raw === 'PAGADA' || $estado_cobro_raw === 'PAGADO') {
        $estado_nota_venta = "COBRADA";
        $total_cobrado = 0.00;
    } else if ($estado_cobro_raw === 'POR COBRAR' || $estado_cobro_raw === 'PENDIENTE') {
        $estado_nota_venta = "POR COBRAR";
        $total_cobrado = max(0.0, $total_guia - $suma_cobrada);
    } else {
        $estado_nota_venta = ($total_cobrado <= 0.001 && $total_guia > 0) ? "COBRADA" : "POR COBRAR";
    }

    if (empty(trim($detalles_forma_pago))) {
        if ($estado_nota_venta === 'COBRADA') {
            $detalles_forma_pago = "EFECTIVO: $" . number_format($total_guia, 2);
        } else if ($estado_nota_venta === 'AL COBRO') {
            $detalles_forma_pago = "AL COBRO EN DESTINO";
        } else {
            $detalles_forma_pago = "NINGUNA";
        }
    }

    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO ──────────────────────────────────────────
    $lw = $metricas['ancho_util_mm'];
    $pdf = new TCPDF('P', 'mm', array($ancho_impresion, 800), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($metricas['margen_mm'], 4, $metricas['margen_mm'], true);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // ─── PÁGINA 1: TICKET NOTA DE VENTA ──────────────────────────────────────
    $pdf->SetY(4);
    if ($rutaLogo) {
        imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $ancho_impresion, $metricas['margen_mm'], 30, 24, 2.0);
    }

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
    $pdf->MultiCell($lw, 5.0, strtoupper($razon_social_empresa), 0, 'C', false, 1);

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    if (!empty($ruc_empresa)) {
        $pdf->Cell($lw, 4.2, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }
    $pdf->Cell($lw, 4.5, 'NOTA DE VENTA ELECTRÓNICA', 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.05, 1));
    $pdf->Cell($lw, 5.0, 'N° ' . $numero_guia, 0, 1, 'C');
    if (!empty($numero_manual_guia)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'N° MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
    }

    if (!empty($ubicacion_usuario)) {
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'OFICINA - ' . $ubicacion_usuario, 0, 1, 'C');
    }

    $drawLine = function() use ($pdf, $metricas, $ancho_impresion) {
        $pdf->Ln(1);
        $y = $pdf->GetY();
        $pdf->SetLineStyle(array('width' => 0.35, 'cap' => 'butt', 'join' => 'miter', 'dash' => 2, 'color' => array(0, 0, 0)));
        $pdf->Line($metricas['margen_mm'], $y, $ancho_impresion - $metricas['margen_mm'], $y);
        $pdf->SetLineStyle(array('width' => 0.35, 'dash' => 0));
        $pdf->SetY($y + 1.8);
    };

    // CLIENTE
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.2, 'CLIENTE', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, 'RUC/CI: ' . $cedula_cliente_remitente . "\n" . 'Nombre: ' . $nombre_cliente_remitente, 0, 'L', false, 1);

    // ORIGEN
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.2, 'ORIGEN', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, 'UBICACIÓN: ' . $origen_guia . "\n" . 'CI: ' . $cedula_cliente_remitente . "\n" . 'ENVÍA: ' . $nombre_cliente_remitente . "\n" . 'TELÉFONO: ' . $telefono_cliente_emisor, 0, 'L', false, 1);

    // DESTINO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.2, 'DESTINO', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $txtDest = 'UBICACIÓN: ' . $destino_guia . "\n" . 'CI: ' . $cedula_cliente_receptor . "\n" . 'RECIBE: ' . $nombre_cliente_receptor . "\n" . 'TELÉFONO: ' . $telefono_cliente_receptor;
    foreach ($lista_contenido as $cnt) {
        $txtDest .= "\n" . 'CONTENIDO: ' . $cnt;
    }
    $pdf->MultiCell($lw, 4.0, $txtDest, 0, 'L', false, 1);

    // RETIRAR EN
    if (!empty($direccion_compania_asociada) || !empty($nombre_compania)) {
        $drawLine();
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'RETIRAR EN:', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, 'DIRECCIÓN: ' . $direccion_compania_asociada . "\n" . 'EMPRESA: ' . $nombre_compania . "\n" . 'CONTACTO: ' . $numero_contacto, 0, 'L', false, 1);
    }

    // OBSERVACIÓN
    if (!empty($observacion_guia)) {
        $drawLine();
        $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
        $pdf->Cell($lw, 4.2, 'OBSERVACIÓN', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, $observacion_guia, 0, 'L', false, 1);
    }

    // DETALLE DEL PAGO
    $drawLine();
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.2, 'DETALLE DEL PAGO', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, 'OFICINISTA: ' . $usuario . "\n" . 'GUÍA N° ' . $numero_guia, 0, 'L', false, 1);

    // TOTALES
    $pdf->Ln(1);
    $wTotL = $lw * 0.65;
    $wTotV = $lw * 0.35;

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'SUBTOTAL:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($subtotal_12_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'SUBTOTAL 0%:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($subtotal_0_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'SUBTOTAL:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($subtotal_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'DESCUENTO:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($descuento_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'TARIFA ESPECIAL:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($valor_tarifa_adicional_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotL, 4.0, 'IVA:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $pdf->Cell($wTotV, 4.0, '$' . number_format($impuesto_iva_guia, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($wTotL, 4.8, 'TOTAL', 0, 0, 'L');
    $pdf->Cell($wTotV, 4.8, '$' . number_format($total_guia, 2), 0, 1, 'R');

    // ESTADO Y METADATA EMISIÓN
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
    $pdf->Cell($lw, 4.5, 'ESTADO: ' . $estado_nota_venta, 0, 1, 'L');

    $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
    $txtMeta = 'FORMAS DE PAGO: ' . $detalles_forma_pago . "\n" .
               'POR COBRAR: $' . number_format((float)$total_cobrado, 2) . "\n" .
               'FECHA / HORA EMISIÓN: ' . $fecha_hora_emision . "\n" .
               'USUARIO: ' . $cedula_cliente_remitente . "\n" .
               'CONTRASEÑA: ' . $cedula_cliente_remitente . "\n" .
               'IMPRESIÓN: ' . $fecha_actual;
    $pdf->MultiCell($lw, 4.0, $txtMeta, 0, 'L', false, 1);

    // FIRMA CLIENTE
    $pdf->Ln(4);
    $pdf->Cell($lw, 4.0, '_____________________', 0, 1, 'C');
    $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
    $pdf->MultiCell($lw, 4.0, $nombre_cliente_remitente, 0, 'C', false, 1);

    // LEYENDA Y REIMPRESIÓN
    if (!empty($leyenda)) {
        $drawLine();
        $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
        $pdf->MultiCell($lw, 4.0, $leyenda, 0, 'C', false, 1);
    }
    if ($reimpreso_por) {
        $pdf->SetFont('helvetica', 'BI', $metricas['font_tcpdf_sub']);
        $pdf->Cell($lw, 4.5, 'Reimpreso por: ' . $reimpreso_por, 0, 1, 'C');
    }

    // ─── PÁGINAS EXTRA: SLIPS / TICKETS POR BULTO ────────────────────────────
    if ($imprimir_boucher_guia === 1 && !empty($items_detalle)) {
        $pagina_actual = 1;
        $total_paginas = $total_copias_extra;
        $fecha_slip = (!empty($fecha_hora_emision) && $fecha_hora_emision !== '0000-00-00 00:00:00') ? date('d/m/Y H:i', strtotime($fecha_hora_emision)) : date('d/m/Y H:i');

        foreach ($items_detalle as $item) {
            $pdf->AddPage('P', array($ancho_impresion, 200));
            $pdf->SetMargins($metricas['margen_mm'], 5, $metricas['margen_mm'], true);
            $pdf->SetAutoPageBreak(false, 0);

            $pdf->SetY(4);
            if ($rutaLogo) {
                imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $ancho_impresion, $metricas['margen_mm'], 24, 18, 1.5);
            }

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->Cell($lw, 5, strtoupper($razon_social_empresa), 0, 1, 'C');

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 4.5, $numero_guia, 0, 1, 'C');
            if (!empty($numero_manual_guia)) {
                $pdf->Cell($lw, 4.2, 'MANUAL: ' . $numero_manual_guia, 0, 1, 'C');
            }

            $pdf->Ln(2);
            $y0 = $pdf->GetY();
            $pdf->SetDrawColor(0, 0, 0);
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y0, $ancho_impresion - $metricas['margen_mm'], $y0);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y0 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y0 + 1.5);
            $pdf->SetY($y0 + 4);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 5, $fecha_slip, 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Remitente', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->MultiCell($lw, 5, $nombre_cliente_remitente, 0, 'C', false, 1);
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Destinatario', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_bold']);
            $pdf->MultiCell($lw, 5, $nombre_cliente_receptor, 0, 'C', false, 1);
            $pdf->Ln(1);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_sub']);
            $pdf->Cell($lw, 4, 'Destino', 0, 1, 'C');
            $pdf->SetFont('helvetica', 'B', round($metricas['font_tcpdf_bold'] * 1.15, 1));
            $pdf->Cell($lw, 6, strtoupper($destino_guia), 0, 1, 'C');
            $pdf->Ln(1);

            if (!empty($telefono_cliente_receptor)) {
                $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_base']);
                $pdf->Cell($lw, 5, 'Fono: ' . $telefono_cliente_receptor, 0, 1, 'C');
                $pdf->Ln(1);
            }

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $desc = trim(strtoupper($item['nombre_envio']) . ' ' . strtoupper($item['contenido']));
            $pdf->MultiCell($lw, 5, $desc, 0, 'C', false, 1);
            $pdf->Ln(2);

            $y1 = $pdf->GetY();
            $pdf->SetLineWidth(0.6);
            $pdf->Line($metricas['margen_mm'], $y1, $ancho_impresion - $metricas['margen_mm'], $y1);
            $pdf->SetLineWidth(0.2);
            $pdf->Line($metricas['margen_mm'], $y1 + 1.5, $ancho_impresion - $metricas['margen_mm'], $y1 + 1.5);
            $pdf->SetY($y1 + 5);

            if (!empty($nombre_compania)) {
                $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
                $pdf->Cell($lw, 5, strtoupper($nombre_compania), 0, 1, 'C');
            }
            if (!empty($origen_guia)) {
                $pdf->SetFont('helvetica', '', $metricas['font_tcpdf_sub']);
                $pdf->Cell($lw, 4, strtoupper($origen_guia), 0, 1, 'C');
            }
            $pdf->Ln(3);

            $pdf->SetFont('helvetica', 'B', $metricas['font_tcpdf_base']);
            $pdf->Cell($lw, 5, $pagina_actual . ' / ' . $total_paginas, 0, 1, 'C');

            $pagina_actual++;
        }
    }

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'guiaNotaVentaImpresion_' . $id_guia . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    $pdf->Output($fileName, 'I');
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false
    ]);
    exit();
}
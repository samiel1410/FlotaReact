<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

ob_start();
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');
require_once("boleto_datos.php");

try {
    $t0 = microtime(true);
    $id_boleto = isset($_GET['id_boleto']) ? (int)$_GET['id_boleto'] : 0;
    if ($id_boleto <= 0) {
        throw new Exception("Parámetro id_boleto inválido o faltante");
    }

    // ── Caché rápida de configuración, aislada por empresa ───────────────────
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStrFast = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKeyFast = md5($dbNameStrFast . '_t' . $tenantIdStr);

    require_once('library/tcpdf.php');

    $conn = conexion();

    $datos_factura = obtener_datos_factura($id_boleto, $conn);
    $boleto = $datos_factura['boleto'];
    $detalles = $datos_factura['detalles'];

    $sucursal_emi = !empty($boleto['sucursal_emision_boleto']) ? $boleto['sucursal_emision_boleto'] : '001';
    $punto_emi = !empty($boleto['punto_emision_boleto']) ? $boleto['punto_emision_boleto'] : '001';
    $num_bol = !empty($boleto['numero_boleto']) ? sprintf("%09s", $boleto['numero_boleto']) : '000000001';
    $numero_boleto = "{$sucursal_emi}-{$punto_emi}-{$num_bol}";

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ────────────────────
    // Aislamiento multi-tenant: db_name + tenantId (misma convención que guiaPdfImpresion.php)
    $dbKey = $dbKeyFast;
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) @mkdir($cacheCfgDir, 0777, true);
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';
    $vals_empresa = null;
    $vals_config = null;
    $empresaCfgCached = null;
    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa = $empresaCfgCached;
        $vals_config  = $empresaCfgCached;
    } else {
        // Query liviana sin transferir el BLOB pesado de imagen_empresa
        $query_empresa = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $recuperar_empresa = mysqli_query($conn, $query_empresa);
        $vals_empresa = $recuperar_empresa ? mysqli_fetch_assoc($recuperar_empresa) : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'EMPRESA DE TRANSPORTE',
                'ruc_empresa' => '9999999999001',
                'direccion_empresa' => 'MATRIZ',
                'telefono_empresa' => ''
            ];
        }

        $query_config = "SELECT leyenda_boleteria, mostrar_leyenda_boleteria, formato_impresion FROM configuracion LIMIT 1";
        $recuperar_config = mysqli_query($conn, $query_config);
        $vals_config = $recuperar_config ? mysqli_fetch_assoc($recuperar_config) : [];

        // Persistir config de empresa+configuración (evita 2 queries por request)
        $toCache = array_merge($vals_empresa ?: [], $vals_config ?: []);
        @file_put_contents($cacheCfgFile, json_encode($toCache));
    }

    $t1 = microtime(true);
    header('X-PDF-Time-CfgCache: ' . round(($t1 - $t0) * 1000) . 'ms');

    $leyenda_viaje = ($vals_config && ($vals_config['mostrar_leyenda_boleteria'] ?? 0) == 1) ? ($vals_config['leyenda_boleteria'] ?? '') :
        'GRACIAS POR SU PREFERENCIA';

    $formato_impresion_db = $vals_config['formato_impresion'] ?? null;
    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 80, $formato_impresion_db);
    $metricas = obtenerMetricasImpresion($ancho_impresion, 80);

    // Logo de la empresa (se resuelve antes del hash para invalidar el PDF cacheado).
    $rutaLogo = logoEmpresaParaPdf($conn, $dbKeyFast);

    // El contenido se incluye para regenerar la impresión tras cambios de viaje o asiento.
    $datosHash = md5(json_encode([
        $id_boleto,
        $numero_boleto,
        $boleto,
        $detalles,
        $vals_empresa,
        $vals_config,
        $leyenda_viaje,
        $rutaLogo
    ], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'boleto_fact_' . $id_boleto . '_' . $datosHash . '.pdf';
    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="boleto_' . $id_boleto . '.pdf"');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($cachePdfFile);
        exit;
    }

    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, array($ancho_impresion, 220), true, 'UTF-8', false);
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

    // ── GENERACIÓN NATIVA TCPDF (sin writeHTML) ───────────────────────────────
    // writeHTML() tarda 7-8s. Los métodos nativos tardan ~300ms.
    // ─────────────────────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', '', $metricas['font_boleto_base_pt']);
    $pdf->SetMargins($metricas['margen_mm'], 3, $metricas['margen_mm'], true);
    $pdf->SetAutoPageBreak(true, 2);
    $pdf->AddPage('P', [$ancho_impresion, 200]);

    // ── LOGO DE LA EMPRESA ────────────────────────────────────────────────────
    imprimirLogoTcpdfCentrado($pdf, $rutaLogo, $ancho_impresion, $metricas['margen_mm'], 32.0, 20.0, 1.5);

    $w  = $ancho_impresion - ($metricas['margen_mm'] * 2); // ancho útil
    $fB = $metricas['font_boleto_base_pt'];
    $fT = $metricas['font_boleto_tit_pt'];
    $fD = $metricas['font_boleto_dest_pt'];
    $fO = $metricas['font_boleto_total_pt'];
    $lh = round($fB * 0.42, 1); // line height en mm (~1pt = 0.353mm)


    // ── EMPRESA ───────────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', $fT);
    $pdf->MultiCell($w, $lh * 1.3, strtoupper($vals_empresa['razon_social_empresa'] ?? 'EMPRESA'), 0, 'C', false, 1);
    $pdf->SetFont('helvetica', '', $fB);
    $pdf->MultiCell($w, $lh, 'RUC: ' . ($vals_empresa['ruc_empresa'] ?? ''), 0, 'C', false, 1);
    $pdf->MultiCell($w, $lh, strtoupper($vals_empresa['direccion_empresa'] ?? ''), 0, 'C', false, 1);
    $pdf->MultiCell($w, $lh, 'Oficina ' . ($boleto['nombre_sucursal'] ?? ''), 0, 'C', false, 1);
    $pdf->Ln(0.5);

    // ── SEPARADOR ─────────────────────────────────────────────────────────────
    $pdf->SetLineWidth(0.4);
    $pdf->Line($metricas['margen_mm'], $pdf->GetY(), $metricas['margen_mm'] + $w, $pdf->GetY());
    $pdf->Ln(1);

    // ── DATOS CLIENTE ─────────────────────────────────────────────────────────
    $wL = $w * 0.28; $wR = $w * 0.72;
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->Cell($wL, $lh, 'Facturado a:', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->MultiCell($wR, $lh, strtoupper($boleto['nombres_boleto'] ?? 'CLIENTE'), 0, 'L', false, 1);
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->Cell($wL, $lh, 'RUC/CI:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $fB);
    $pdf->Cell($wR, $lh, $boleto['identificacion_boleto'] ?? '', 0, 1, 'L');
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->Cell($wL, $lh, 'Teléfono:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', $fB);
    $pdf->Cell($wR, $lh, !empty($boleto['celular_boleto']) ? $boleto['celular_boleto'] : '-', 0, 1, 'L');

    // ── VIAJE ─────────────────────────────────────────────────────────────────
    $fechaSalidaRaw = !empty($boleto['fecha_cierre']) ? $boleto['fecha_cierre'] : ($boleto['fecha_salida'] ?? null);
    $fechaSalida = (!empty($fechaSalidaRaw) && $fechaSalidaRaw !== '0000-00-00') ? date('d/m/Y', strtotime($fechaSalidaRaw)) : date('d/m/Y');
    $horaSalida  = !empty($boleto['hora_origen_salida']) ? $boleto['hora_origen_salida'] : ($boleto['hora_salida'] ?? '00:00');
    $viajeMostrar = !empty($boleto['nombre_rutas']) ? $boleto['nombre_rutas'] : '—';
    $busMostrar   = !empty($boleto['disco_buses']) ? $boleto['disco_buses'] : '—';
    $andMostrar   = !empty($boleto['anden_sub_rutas']) && $boleto['anden_sub_rutas'] != '0' ? $boleto['anden_sub_rutas'] : (!empty($boleto['andes_rutas']) && $boleto['andes_rutas'] != '0' ? $boleto['andes_rutas'] : '—');
    $pisoMostrar  = !empty($boleto['piso_sub_rutas']) && $boleto['piso_sub_rutas'] != 0 ? $boleto['piso_sub_rutas'] : (!empty($boleto['piso_rutas']) && $boleto['piso_rutas'] != 0 ? $boleto['piso_rutas'] : '1');

    $pdf->SetFont('helvetica', '', $fB);
    $pdf->Cell($wL, $lh, 'Viaje ' . ($boleto['id_fkviaje_boleto'] ?? ''), 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->MultiCell($wR, $lh, strtoupper($viajeMostrar), 0, 'L', false, 1);

    $fBus = round($fB * 1.2, 1);
    $pdf->SetFont('helvetica', 'B', $fBus);
    $pdf->Cell($w * 0.4, $lh * 1.2, 'Bus ' . $busMostrar, 0, 0, 'L');
    $pdf->MultiCell($w * 0.6, $lh * 1.2, 'Sale Origen ' . $fechaSalida . ' ' . $horaSalida, 0, 'L', false, 1);

    // Info piso/andén
    $pdf->SetFont('helvetica', 'B', round($fB * 1.1, 1));
    $pdf->Cell($w * 0.6, $lh, 'INFORMACIÓN DEL VIAJE', 0, 0, 'L');
    $pdf->Cell($w * 0.2, $lh, 'Piso ' . $pisoMostrar, 0, 0, 'L');
    $pdf->Cell($w * 0.2, $lh, 'Andén ' . $andMostrar, 0, 1, 'L');
    $pdf->Ln(0.5);

    // ── SEPARADOR ─────────────────────────────────────────────────────────────
    $pdf->Line($metricas['margen_mm'], $pdf->GetY(), $metricas['margen_mm'] + $w, $pdf->GetY());
    $pdf->Ln(1);

    // ── DESTINO GENERAL (fallback) ────────────────────────────────────────────
    $destinoGeneral = resolver_destino_general($boleto);

    // Punto final escrito por la agencia (venta más allá de la última parada).
    $puntoFinalBoleto = trim((string)($boleto['punto_final_boleto'] ?? ''));

    // ── PRODUCTOS A RETIRAR (entrega por asiento: AGUA) ───────────────────────
    $textoRetirar = obtener_texto_productos_retirar($conn, $boleto, $detalles);

    // ── DETALLES DE PASAJEROS ─────────────────────────────────────────────────
    foreach ($detalles as $detalle) {
        $nombrePasajero = strtoupper($detalle['nombre_cliente_boleto_detalle'] ?? ($boleto['nombres_boleto'] ?? 'PASAJERO'));
        $destinoMostrar = resolver_destino_pasajero($detalle, $destinoGeneral, $puntoFinalBoleto);
        $asientoVal     = isset($detalle['asiento_boleto_detalle']) ? str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT) : '01';
        $totalDetalle   = isset($detalle['total_boleto_detalle']) ? (float)$detalle['total_boleto_detalle'] : (float)($boleto['total_boleto'] ?? 0);
        $tarifaDetalle  = !empty($detalle['tarifa_boleto_detalle']) ? $detalle['tarifa_boleto_detalle'] : 'Normal';

        $pdf->SetFont('helvetica', 'B', round($fB * 1.1, 1));
        $pdf->Cell($w * 0.6, $lh * 1.2, $nombrePasajero, 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', $fO);
        $pdf->Cell($w * 0.4, $lh * 1.2, 'Asiento ' . $asientoVal, 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', $fT);
        $pdf->Cell($w, $lh * 1.1, 'DESTINO: ' . mb_substr($destinoMostrar, 0, 48, 'UTF-8'), 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', $fD);
        $pdf->Cell($w, $lh * 1.3, 'Valor $' . number_format($totalDetalle, 2, ',', '.'), 0, 1, 'R');

        $pdf->SetFont('helvetica', '', round($fB * 0.9, 1));
        $pdf->Cell($w, $lh, 'Tarifa: ' . $tarifaDetalle, 0, 1, 'L');

        // La tasa FTTG se imprime en hojas aparte (una por pasajero) al final.
        $pdf->Ln(0.5);
    }

    // ── PRODUCTOS A RETIRAR ───────────────────────────────────────────────────
    if ($textoRetirar !== '') {
        $pdf->Ln(1);
        $pdf->SetLineWidth(0.4);
        $pdf->SetFont('helvetica', 'B', round($fT * 1.25, 1));
        $pdf->MultiCell($w, $lh * 1.6, '*** RETIRAR ' . $textoRetirar . ' ***', 1, 'C', false, 1);
        $pdf->SetLineWidth(0.2);
    }

    // ── TOTAL ─────────────────────────────────────────────────────────────────
    $totalBoleto = isset($boleto['total_boleto']) ? (float)$boleto['total_boleto'] : 0.0;
    $pdf->Ln(1);
    $pdf->SetFont('helvetica', 'B', $fO);
    $pdf->Cell($w * 0.5, $lh * 1.5, 'TOTAL', 0, 0, 'L');
    $pdf->Cell($w * 0.5, $lh * 1.5, '$' . number_format($totalBoleto, 2, ',', '.'), 0, 1, 'R');

    // ── PIE ───────────────────────────────────────────────────────────────────
    $fPie = round($fB * 0.9, 1);
    $pdf->SetFont('helvetica', '', $fPie);
    $pdf->Cell($w, $lh, 'Caducidad ' . $fechaSalida . ' ' . $horaSalida, 0, 1, 'L');
    $pdf->Cell($w, $lh, 'F. Emisión ' . (!empty($boleto['fecha_creacion_boleto']) ? date('d/m/Y H:i:s', strtotime($boleto['fecha_creacion_boleto'])) : date('d/m/Y H:i:s')), 0, 1, 'L');
    if (!empty($numero_boleto)) {
        $pdf->Cell($w, $lh, 'Factura ' . $numero_boleto, 0, 1, 'L');
    }
    if (!empty($boleto['clave_acceso_boletos'])) {
        $pdf->SetFont('helvetica', '', round($fB * 0.75, 1));
        $pdf->MultiCell($w, $lh * 0.9, 'Aut. SRI ' . $boleto['clave_acceso_boletos'], 0, 'L', false, 1);
    }

    // ── SEPARADOR LIGERO ──────────────────────────────────────────────────────
    $pdf->SetLineWidth(0.2);
    $pdf->Line($metricas['margen_mm'], $pdf->GetY() + 0.5, $metricas['margen_mm'] + $w, $pdf->GetY() + 0.5);
    $pdf->Ln(1.5);

    // ── FOOTER EMPRESA ────────────────────────────────────────────────────────
    $pdf->SetFont('helvetica', '', $fPie);
    $pdf->MultiCell($w, $lh, strtoupper($vals_empresa['razon_social_empresa'] ?? ''), 0, 'C', false, 1);
    $pdf->MultiCell($w, $lh, 'Dir. Matriz ' . ($vals_empresa['direccion_empresa'] ?? ''), 0, 'C', false, 1);
    $pdf->MultiCell($w, $lh, 'Oficina ' . ($boleto['nombre_sucursal'] ?? ''), 0, 'C', false, 1);
    $pdf->Cell($w, $lh, 'Registra ' . ($boleto['nombre_usuario'] ?? ''), 0, 1, 'L');
    $pdf->Cell($w * 0.5, $lh, 'Impresión ' . date('d/m/Y'), 0, 0, 'L');
    $pdf->Cell($w * 0.5, $lh, date('H:i'), 0, 1, 'L');
    $pdf->Ln(0.5);
    $pdf->SetFont('helvetica', 'B', $fB);
    $pdf->Cell($w, $lh * 1.1, 'Vendido por: ' . ($boleto['nombre_usuario'] ?? ''), 0, 1, 'C');

    $pdf->SetLineWidth(0.2);
    $pdf->Line($metricas['margen_mm'], $pdf->GetY() + 1, $metricas['margen_mm'] + $w, $pdf->GetY() + 1);
    $pdf->Ln(2);

    $pdf->SetFont('helvetica', '', $fPie);
    $pdf->MultiCell($w, $lh * 1.1, $leyenda_viaje, 0, 'C', false, 1);
    // ── FIN RENDERIZADO NATIVO ────────────────────────────────────────────────

    // ── TASAS DE TERMINAL (FTTG): una hoja por pasajero ───────────────────────
    // El código `tasa` es único por pasajero; va en el QR y debajo en texto.
    $tasaSlipAlto = 72;
    foreach ($detalles as $detalle) {
        $tasaPasajero = trim((string)($detalle['tasa_boleto'] ?? ''));
        if ($tasaPasajero === '') {
            continue;
        }

        $asientoTasa = isset($detalle['asiento_boleto_detalle'])
            ? str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT)
            : '01';
        $rutaTasa = !empty($boleto['nombre_rutas']) ? $boleto['nombre_rutas'] : $viajeMostrar;
        $rutaTasa = mb_strtoupper(mb_substr((string)$rutaTasa, 0, 28, 'UTF-8'), 'UTF-8');

        $pdf->AddPage('P', [$ancho_impresion, $tasaSlipAlto]);
        $pdf->SetAutoPageBreak(false, 0);
        $pdf->SetY(4);

        $fSlip = round($fB * 0.95, 1);
        $filaH = 4.6;
        $colIzq = $w * 0.38;
        $colDer = $w - $colIzq;

        $pdf->SetFont('helvetica', '', $fSlip);
        $pdf->Cell($colIzq, $filaH, 'Viaje ' . ($boleto['id_fkviaje_boleto'] ?? ''), 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', $fSlip);
        $pdf->Cell($colDer, $filaH, $rutaTasa, 0, 1, 'R');

        $pdf->SetFont('helvetica', '', $fSlip);
        $pdf->Cell($colIzq, $filaH, 'Bus ' . $busMostrar, 0, 0, 'L');
        $pdf->Cell($colDer, $filaH, 'Sale Origen ' . $fechaSalida . ' ' . $horaSalida, 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', $fSlip);
        $pdf->Cell($colIzq, $filaH * 1.4, 'Asiento', 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', round($fB * 1.7, 1));
        $pdf->Cell($colDer, $filaH * 1.4, $asientoTasa, 0, 1, 'L');

        // QR del torniquete
        $qrSize = min(38, max(30, $w - 12));
        $yQr = $pdf->GetY() + 2;
        $xQr = $metricas['margen_mm'] + ($w - $qrSize) / 2;
        $pdf->write2DBarcode($tasaPasajero, 'QRCODE,M', $xQr, $yQr, $qrSize, $qrSize, [
            'border' => 0,
            'vpadding' => 0,
            'hpadding' => 0,
            'fgcolor' => [0, 0, 0],
            'bgcolor' => false,
        ], 'N');

        $pdf->SetY($yQr + $qrSize + 1.5);
        $pdf->SetFont('helvetica', '', round($fB * 1.1, 1));
        $pdf->Cell($w, $lh * 1.4, $tasaPasajero, 0, 1, 'C');
    }
    // ── FIN TASAS FTTG ────────────────────────────────────────────────────────

    // ── CACHÉ NIVEL 2: PDF por hash de datos (ver bloque antes de TCPDF) ──────
    $filename = 'boleto_' . $id_boleto . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Eliminar PDFs previos de este boleto (los datos cambiaron)
    foreach (glob($pdfCacheDir . 'boleto_fact_' . $id_boleto . '_*.pdf') as $oldPdf) {
        @unlink($oldPdf);
    }
    @file_put_contents($cachePdfFile, $pdfContent);
    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit();

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
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
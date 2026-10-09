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

// Reimpresión inmediata del mismo boleto: se sirve desde disco (<20ms) sin abrir
// conexión a la base de datos ni cargar TCPDF. TTL corto (60s) igual que guiaPdfImpresion.php.
define('BOLETOFACT_FAST_TTL', 60);

ob_start();
require_once("db.php");
require_once("pdf_utils.php");
date_default_timezone_set('America/Guayaquil');

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
    $t0 = microtime(true);
    $id_boleto = isset($_GET['id_boleto']) ? (int)$_GET['id_boleto'] : 0;
    if ($id_boleto <= 0) {
        throw new Exception("Parámetro id_boleto inválido o faltante");
    }

    // ── CAPA RÁPIDA: reimpresión inmediata sin tocar DB ni TCPDF ─────────────
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStrFast = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKeyFast = md5($dbNameStrFast . '_t' . $tenantIdStr);
    $pdfCacheDirFast = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDirFast)) @mkdir($pdfCacheDirFast, 0777, true);
    $fastPdfFile = $pdfCacheDirFast . 'boleto_fact_' . $id_boleto . '_' . $dbKeyFast . '_latest.pdf';
    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < BOLETOFACT_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="boleto_' . $id_boleto . '.pdf"');
        header('Cache-Control: public, max-age=60');
        header('X-PDF-Cache: HIT-FAST');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($fastPdfFile);
        exit;
    }

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
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }
    $vals_empresa = null;
    $vals_config = null;
    $rutaLogo = null;
    $empresaCfgCached = null;
    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa = $empresaCfgCached;
        $vals_config  = $empresaCfgCached;
        $rutaLogo     = $empresaCfgCached['logo_path'] ?? null;
        // Solo si el archivo físico del logo desapareció se re-resuelve (evita el BLOB en cada hit)
        if (!empty($rutaLogo) && !esImagenValidaParaTcpdf($rutaLogo)) {
            $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
            $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
            if (esImagenValidaParaTcpdf($cachedLogoPng)) {
                $rutaLogo = $cachedLogoPng;
            } elseif (esImagenValidaParaTcpdf($cachedLogoJpg)) {
                $rutaLogo = $cachedLogoJpg;
            } else {
                $res_img = mysqli_query($conn, "SELECT imagen_empresa FROM empresa LIMIT 1");
                $row_img = $res_img ? mysqli_fetch_assoc($res_img) : [];
                if (!empty($row_img['imagen_empresa'])) {
                    $rawLogo = procesarLogoParaTcpdf($row_img['imagen_empresa'], $dbKey);
                    if ($rawLogo && esImagenValidaParaTcpdf($rawLogo)) {
                        $ext = strtolower(pathinfo($rawLogo, PATHINFO_EXTENSION) ?: 'png');
                        $targetLogo = $logosDir . 'logo_tenant_' . $dbKey . '.' . $ext;
                        if ($rawLogo !== $targetLogo) @copy($rawLogo, $targetLogo);
                        $rutaLogo = esImagenValidaParaTcpdf($targetLogo) ? $targetLogo : $rawLogo;
                    } else {
                        $rutaLogo = null;
                    }
                } else {
                    $rutaLogo = null;
                }
            }
            $empresaCfgCached['logo_path'] = $rutaLogo;
            @file_put_contents($cacheCfgFile, json_encode($empresaCfgCached));
        }
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

        // Obtener y cachear el logo en disco si aún no existe
        $cachedLogoPng = $logosDir . 'logo_tenant_' . $dbKey . '.png';
        $cachedLogoJpg = $logosDir . 'logo_tenant_' . $dbKey . '.jpg';
        if (esImagenValidaParaTcpdf($cachedLogoPng)) {
            $rutaLogo = $cachedLogoPng;
        } else if (esImagenValidaParaTcpdf($cachedLogoJpg)) {
            $rutaLogo = $cachedLogoJpg;
        } else {
            $query_img = "SELECT imagen_empresa FROM empresa LIMIT 1";
            $res_img = mysqli_query($conn, $query_img);
            if ($res_img && $row_img = mysqli_fetch_assoc($res_img)) {
                // Pasamos $dbKey como cacheHint: evita md5() sobre megabytes de binario
                $rawLogo = procesarLogoParaTcpdf($row_img['imagen_empresa'], $dbKey);
                if ($rawLogo && esImagenValidaParaTcpdf($rawLogo)) {
                    $ext = pathinfo($rawLogo, PATHINFO_EXTENSION) ?: 'png';
                    $targetLogo = $logosDir . 'logo_tenant_' . $dbKey . '.' . $ext;
                    if ($rawLogo !== $targetLogo) {
                        @copy($rawLogo, $targetLogo);
                    }
                    $rutaLogo = esImagenValidaParaTcpdf($targetLogo) ? $targetLogo : $rawLogo;
                }
            }
            if (empty($rutaLogo)) {
                $rutaLogo = obtenerRutaLogoEmpresa($conn, null);
            }
        }

        

        // Persistir config de empresa+configuración (evita 2 queries por request)
        $toCache = array_merge($vals_empresa ?: [], $vals_config ?: [], ['logo_path' => $rutaLogo]);
        @file_put_contents($cacheCfgFile, json_encode($toCache));
    }

    $t1 = microtime(true);
    header('X-PDF-Time-CfgCache: ' . round(($t1 - $t0) * 1000) . 'ms');

    // Logo gigante (ej. 3MB) ralentiza TCPDF->Image() varios segundos: reducir a 500px
    $rutaLogo = reducirLogoGigante($rutaLogo ?? null, 500);

    $leyenda_viaje = ($vals_config && ($vals_config['mostrar_leyenda_boleteria'] ?? 0) == 1) ? ($vals_config['leyenda_boleteria'] ?? '') :
        'GRACIAS POR SU PREFERENCIA';

    $formato_impresion_db = $vals_config['formato_impresion'] ?? null;
    $ancho_impresion = obtenerAnchoFormatoImpresion($conn, 80, $formato_impresion_db);
    $metricas = obtenerMetricasImpresion($ancho_impresion, 80);

    // ── CACHÉ NIVEL 2: hit por hash de datos (evita TCPDF si nada cambió) ──────
    // El boleto es inmutable, pero estado/total pueden cambiar (anulación, reserva);
    // el hash los incluye para regenerar cuando cambien.
    $datosHash = md5(json_encode([
        $id_boleto,
        $numero_boleto,
        (float)($boleto['total_boleto'] ?? 0),
        (string)($boleto['estado_boleto'] ?? ''),
        (string)($boleto['clave_acceso_boletos'] ?? ''),
        count($detalles),
        $leyenda_viaje
    ]));
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) @mkdir($pdfCacheDir, 0777, true);
    $cachePdfFile = $pdfCacheDir . 'boleto_fact_' . $id_boleto . '_' . $datosHash . '.pdf';
    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) ob_clean();
        // Refrescar copia rápida: reimpresiones seguidas no tocan DB ni TCPDF
        @copy($cachePdfFile, $fastPdfFile);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="boleto_' . $id_boleto . '.pdf"');
        header('Cache-Control: public, max-age=60');
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

    $w  = $ancho_impresion - ($metricas['margen_mm'] * 2); // ancho útil
    $fB = $metricas['font_boleto_base_pt'];
    $fT = $metricas['font_boleto_tit_pt'];
    $fD = $metricas['font_boleto_dest_pt'];
    $fO = $metricas['font_boleto_total_pt'];
    $lh = round($fB * 0.42, 1); // line height en mm (~1pt = 0.353mm)

    // ── LOGO ─────────────────────────────────────────────────────────────────
    if (!empty($rutaLogo) && file_exists($rutaLogo)) {
        $logoW = max(10, round(11 * $metricas['factor'])); // ~11mm ≈ 30pt como en el HTML original
        $x = $metricas['margen_mm'] + ($w - $logoW) / 2;
        $pdf->Image($rutaLogo, $x, $pdf->GetY(), $logoW, 0, '', '', '', true, 96);
        $pdf->Ln($logoW + 1); // Avanzar el alto del logo + 1mm de margen
    }

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
    $destinoGeneral = '';
    foreach ([
        $boleto['nombre_sub_rutas'] ?? '', $boleto['nombre_destino'] ?? '',
        $boleto['destino_sr_nombre'] ?? '', $boleto['destino_sr_lugar'] ?? '',
        $boleto['destino_bol_nombre'] ?? '', $boleto['destino_bol_lugar'] ?? '',
        $boleto['destino_ruta_nombre'] ?? '', $boleto['destino_ruta_lugar'] ?? '',
        $boleto['nombre_rutas'] ?? ''
    ] as $cand) {
        $dest = extraerDestinoLimpio($cand);
        if (!empty($dest)) { $destinoGeneral = $dest; break; }
    }

    // ── DETALLES DE PASAJEROS ─────────────────────────────────────────────────
    foreach ($detalles as $detalle) {
        $nombrePasajero = strtoupper($detalle['nombre_cliente_boleto_detalle'] ?? ($boleto['nombres_boleto'] ?? 'PASAJERO'));
        $destinoDetalle = '';
        foreach ([
            $detalle['subruta_detalle_nombre'] ?? '', $detalle['destino_det_nombre'] ?? '',
            $detalle['destino_det_lugar'] ?? '', $detalle['destino_det_sr_nombre'] ?? '',
            $detalle['destino_det_sr_lugar'] ?? ''
        ] as $cand) {
            $dest = extraerDestinoLimpio($cand);
            if (!empty($dest)) { $destinoDetalle = $dest; break; }
        }
        $destinoMostrar = !empty($destinoDetalle) ? strtoupper($destinoDetalle) : (!empty($destinoGeneral) ? strtoupper($destinoGeneral) : '—');
        $asientoVal     = isset($detalle['asiento_boleto_detalle']) ? str_pad($detalle['asiento_boleto_detalle'], 2, '0', STR_PAD_LEFT) : '01';
        $totalDetalle   = isset($detalle['total_boleto_detalle']) ? (float)$detalle['total_boleto_detalle'] : (float)($boleto['total_boleto'] ?? 0);
        $tarifaDetalle  = !empty($detalle['tarifa_boleto_detalle']) ? $detalle['tarifa_boleto_detalle'] : 'Normal';

        $pdf->SetFont('helvetica', 'B', round($fB * 1.1, 1));
        $pdf->Cell($w * 0.6, $lh * 1.2, $nombrePasajero, 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', $fO);
        $pdf->Cell($w * 0.4, $lh * 1.2, 'Asiento ' . $asientoVal, 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', $fT);
        $pdf->Cell($w, $lh * 1.1, 'DESTINO: ' . $destinoMostrar, 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', $fD);
        $pdf->Cell($w, $lh * 1.3, 'Valor $' . number_format($totalDetalle, 2, ',', '.'), 0, 1, 'R');

        $pdf->SetFont('helvetica', '', round($fB * 0.9, 1));
        $pdf->Cell($w, $lh, 'Tarifa: ' . $tarifaDetalle, 0, 1, 'L');
        $pdf->Ln(0.5);
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

    // ── CACHÉ NIVEL 2: PDF por hash de datos (ver bloque antes de TCPDF) ──────
    $filename = 'boleto_' . $id_boleto . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Eliminar PDFs previos de este boleto (los datos cambiaron)
    foreach (glob($pdfCacheDir . 'boleto_fact_' . $id_boleto . '_*.pdf') as $oldPdf) {
        @unlink($oldPdf);
    }
    @file_put_contents($cachePdfFile, $pdfContent);
    // Copia rápida TTL 60s: la reimpresión inmediata no toca DB ni TCPDF
    @copy($cachePdfFile, $fastPdfFile);

    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('Cache-Control: public, max-age=60');
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
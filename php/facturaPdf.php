<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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
    $id_param = isset($_GET['id_factura']) ? trim($_GET['id_factura']) : '';
    if ($id_param === '') {
        throw new Exception("ID de factura no válido o no proporcionado");
    }

    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? 'default';
    $dbNameStr   = $_GET['db_name'] ?? (isset($_SESSION['db_name']) ? $_SESSION['db_name'] : $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);

    // ─── CACHÉ NIVEL 2: PDF ESTÁTICO ─────────────────────────────────────────
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $pdfCacheFile = $pdfCacheDir . 'factura_' . md5($id_param) . '_t' . md5($tenantIdStr) . '.pdf';
    $noCache = !empty($_GET['nocache']) || !empty($_GET['refresh']);

    if (!$noCache && file_exists($pdfCacheFile) && filesize($pdfCacheFile) > 1000) {
        $fileName = 'factura_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $id_param) . '.pdf';
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $fileName . '"');
        header('Content-Length: ' . filesize($pdfCacheFile));
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . round((microtime(true) - $t0) * 1000) . 'ms');
        header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
        readfile($pdfCacheFile);
        exit();
    }

    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");
    $id_esc = mysqli_real_escape_string($conn, $id_param);

    // ─── CONSULTA FACTURA ────────────────────────────────────────────────────
    $query = "SELECT
        id_factura, id_fkguia_factura, fecha_factura, fecha_hora_autorizacion, telefono_cliente_factura, 
        direccion_clientes_factura, correo_cliente_factura, ruc_cliente_factura, nombre_cliente_factura, 
        id_fksucursal_factura, clave_acceso_factura, fecha_hora_sincronizacion, punto_emision_factura, 
        numero_factura, total_factura, subtotal_12_factura, subtotal_0_factura, subtotal_factura, 
        iva_factura, descuento_total_factura
    FROM factura 
    WHERE id_factura = '$id_esc' OR id_fkguia_factura = '$id_esc' OR numero_factura = '$id_esc' OR clave_acceso_factura = '$id_esc' 
    ORDER BY (id_factura = '$id_esc') DESC, id_factura DESC 
    LIMIT 1";

    $recuperar = mysqli_query($conn, $query);
    if (!$recuperar) {
        throw new Exception("Error en consulta de factura: " . mysqli_error($conn));
    }
    $vals = mysqli_fetch_assoc($recuperar);

    if (!$vals) {
        throw new Exception("Factura no encontrada para el parámetro: $id_param");
    }

    $id_factura = (int)$vals["id_factura"];
    $id_sucursal = (int)($vals["id_fksucursal_factura"] ?? 0);
    $subtotal_12 = (float)($vals["subtotal_12_factura"] ?? 0);
    $subtotal_0 = (float)($vals["subtotal_0_factura"] ?? 0);
    $subtotal = (float)($vals["subtotal_factura"] ?? 0);
    $descuento_guia = (float)($vals["descuento_total_factura"] ?? 0);
    $iva_guia = (float)($vals["iva_factura"] ?? 0);
    $total_guia = (float)($vals["total_factura"] ?? 0);
    $clave_autorizacion = $vals["clave_acceso_factura"] ?? '';
    $hora_autorizacion = $vals["fecha_hora_autorizacion"] ?? '';

    // CLIENTE
    $razon_social = $vals["nombre_cliente_factura"] ?? '';
    $ruc_cliente = $vals["ruc_cliente_factura"] ?? '';
    $telefono = $vals["telefono_cliente_factura"] ?? '';
    $correo = $vals["correo_cliente_factura"] ?? '';
    $direccion = $vals["direccion_clientes_factura"] ?? '';
    $fecha_emision = $vals["fecha_factura"] ?? '';

    $resultado = sprintf("%09s", $vals['numero_factura'] ?? 0);
    $nombre_sucursal = '';
    $ubicacion_sucursal = '';
    $punto_emision_sucursal = '001';

    if ($id_sucursal > 0) {
        $query_sucursal2 = "SELECT nombre_sucursal, COALESCE(direccion_sucursal, '') as ubicacion_sucursal, punto_emision_sucursal FROM sucursal2 WHERE suc_codigo_sucursal = $id_sucursal OR id_sucursal = $id_sucursal LIMIT 1";
        $recuperar_sucursal = mysqli_query($conn, $query_sucursal2);
        if ($recuperar_sucursal && ($vals_sucursal = mysqli_fetch_assoc($recuperar_sucursal))) {
            $nombre_sucursal = $vals_sucursal["nombre_sucursal"] ?? '';
            $ubicacion_sucursal = $vals_sucursal["ubicacion_sucursal"] ?? '';
            $punto_emision_sucursal = !empty($vals_sucursal["punto_emision_sucursal"]) ? $vals_sucursal["punto_emision_sucursal"] : '001';
        }
    }

    $punto_emision_factura = !empty($vals["punto_emision_factura"]) ? $vals["punto_emision_factura"] : '001';
    $numero_factura = $punto_emision_sucursal . '-' . $punto_emision_factura . '-' . $resultado;

    // ─── CACHÉ NIVEL 1: EMPRESA ──────────────────────────────────────────────
    $cacheDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $empresaCacheFile = $cacheDir . 'empresa_cfg_' . $dbKey . '.json';
    $vals_empresa = null;

    if (file_exists($empresaCacheFile) && (time() - filemtime($empresaCacheFile) < 300)) {
        $cachedData = @json_decode(file_get_contents($empresaCacheFile), true);
        if ($cachedData && !empty($cachedData['empresa'])) {
            $vals_empresa = $cachedData['empresa'];
        }
    }

    if (!$vals_empresa) {
        $query_empresa = "SELECT id_empresa, imagen_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa, obligado_contabilidad FROM empresa LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        @file_put_contents($empresaCacheFile, json_encode(['empresa' => $vals_empresa]));
    }

    $nombre_empresa = $vals_empresa['razon_social_empresa'] ?? '';
    $direccion_empresa = $vals_empresa['direccion_empresa'] ?? '';
    $ruc_empresa = $vals_empresa['ruc_empresa'] ?? '';
    $obligado_contabilidad = !empty($vals_empresa['obligado_contabilidad']) ? strtoupper(trim($vals_empresa['obligado_contabilidad'])) : 'NO';
    $rutaLogo = obtenerRutaLogoEmpresa($conn, $vals_empresa['imagen_empresa'] ?? null);

    // VALOR DECLARADO DESDE GUIA
    $id_fkguia = (int)($vals['id_fkguia_factura'] ?? 0);
    $texto_valor_declarado = "";
    if ($id_fkguia > 0) {
        $q_guia = "SELECT valor_declarado_valor, valor_declarado FROM guia WHERE id_guia = $id_fkguia LIMIT 1";
        $res_guia = @mysqli_query($conn, $q_guia);
        if ($res_guia && ($row_guia = mysqli_fetch_assoc($res_guia))) {
            $val_dec = (float)($row_guia['valor_declarado_valor'] ?? $row_guia['valor_declarado'] ?? 0);
            if ($val_dec > 0) {
                $texto_valor_declarado = " CON VALOR DECLARADO ($" . number_format($val_dec, 2, '.', '') . ")";
            } else {
                $texto_valor_declarado = " SIN VALOR DECLARADO";
            }
        }
    }

    // DETALLES FACTURA
    $query_detalles = "
        SELECT 
            fd.nombre_producto_factura_detalle,
            fd.cantidad_factura_detalle,
            fd.total_factura_detalle,
            fd.descuento_factura_detalle,
            fd.tarifa_factura_detalle,
            COALESCE(te.tipo_impuesto, 0) AS tipo_impuesto
        FROM factura_detalle fd
        LEFT JOIN detalle_guia dg ON (
            dg.id_fkguia_detalle_envio = $id_fkguia 
            AND (
                dg.contenido_guia = fd.nombre_producto_factura_detalle 
                OR LOWER(TRIM(dg.contenido_guia)) = LOWER(TRIM(fd.nombre_producto_factura_detalle))
            )
        )
        LEFT JOIN tipo_envio te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio
        WHERE fd.id_fkfactura_factura_detalle = $id_factura";

    $recuperar_detalles = mysqli_query($conn, $query_detalles);
    if (!$recuperar_detalles || mysqli_num_rows($recuperar_detalles) == 0) {
        $query_detalles = "SELECT nombre_producto_factura_detalle, cantidad_factura_detalle, total_factura_detalle, descuento_factura_detalle, tarifa_factura_detalle, 0 AS tipo_impuesto FROM factura_detalle WHERE id_fkfactura_factura_detalle = $id_factura";
        $recuperar_detalles = mysqli_query($conn, $query_detalles);
    }

    $items_factura = [];
    $tasa_iva_maxima = 0;

    if ($recuperar_detalles) {
        while ($rDet = mysqli_fetch_assoc($recuperar_detalles)) {
            $nombre_prod = trim($rDet['nombre_producto_factura_detalle'] ?? '');
            if ($texto_valor_declarado !== '' && stripos($nombre_prod, 'VALOR DECLARADO') === false) {
                $nombre_prod .= $texto_valor_declarado;
            }
            $idx_imp = (int)($rDet['tipo_impuesto'] ?? 0);
            $pct_iva = $idx_imp > 0 ? (11 + $idx_imp) : 0;
            if ($pct_iva > $tasa_iva_maxima) {
                $tasa_iva_maxima = $pct_iva;
            }

            $items_factura[] = [
                'descripcion' => $nombre_prod,
                'cantidad'    => (int)($rDet['cantidad_factura_detalle'] ?? 1),
                'descuento'   => (float)($rDet['descuento_factura_detalle'] ?? 0),
                'pct_iva'     => $pct_iva,
                'tarifa'      => (float)($rDet['tarifa_factura_detalle'] ?? 0),
                'total'       => (float)($rDet['total_factura_detalle'] ?? 0)
            ];
        }
    }

    $label_iva = ($tasa_iva_maxima > 0 ? $tasa_iva_maxima : 12) . '%';

    // FORMAS DE PAGO
    $query_pago = "SELECT c.id_comprobante_cobro, c.monto_comprobante_cobro, 
                          COALESCE(f.nombre_forma_pago, 'SIN UTILIZACION DEL SISTEMA FINANCIERO') as nombre_forma_pago 
                   FROM comprobante_cobro c 
                   LEFT JOIN forma_pago f ON (c.id_fkforma_pago = f.id_forma_pago OR c.id_fkforma_pago = f.codigo_forma_pago) 
                   WHERE (c.id_fkfactura_comprobante_cobro = $id_factura" . ($id_fkguia > 0 ? " OR c.id_fkfactura_comprobante_cobro = $id_fkguia" : "") . ")";
    $recuperar_pago = mysqli_query($conn, $query_pago);
    $items_pago = [];

    if ($recuperar_pago && mysqli_num_rows($recuperar_pago) > 0) {
        while ($rPago = mysqli_fetch_assoc($recuperar_pago)) {
            $items_pago[] = [
                'nombre' => $rPago['nombre_forma_pago'] ?? 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
                'monto'  => (float)($rPago['monto_comprobante_cobro'] ?? 0)
            ];
        }
    } else {
        $items_pago[] = [
            'nombre' => 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
            'monto'  => $total_guia
        ];
    }
    $conn->close();

    // ─── INICIALIZACIÓN TCPDF NATIVO ──────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // ─── RECUADRO SUPERIOR IZQUIERDO: EMPRESA ─────────────────────────────────
    $pdf->Rect(10, 10, 92, 92, 'D');

    if ($rutaLogo) {
        $pdf->Image($rutaLogo, 10 + (92 - 32) / 2, 12, 32, 0, '', '', 'T', false, 300, 'C');
        $pdf->SetXY(12, 32);
    } else {
        $pdf->SetXY(12, 14);
    }

    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->MultiCell(88, 4.5, strtoupper($nombre_empresa), 0, 'C', false, 1);
    $pdf->Ln(2);

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(88, 3.8, 'Dirección Matriz:', 0, 1, 'L');
    $pdf->SetX(12);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->MultiCell(88, 3.5, $direccion_empresa, 0, 'L', false, 1);
    $pdf->Ln(1);

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(88, 3.8, 'Dirección Sucursal:', 0, 1, 'L');
    $pdf->SetX(12);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->MultiCell(88, 3.5, $ubicacion_sucursal, 0, 'L', false, 1);
    $pdf->Ln(1);

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(50, 3.8, 'Obligado a llevar Contabilidad:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(38, 3.8, $obligado_contabilidad, 0, 1, 'L');

    // ─── RECUADRO SUPERIOR DERECHO: FACTURA SRI ──────────────────────────────
    $pdf->Rect(106, 10, 94, 92, 'D');

    $pdf->SetXY(108, 12);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(18, 4, 'R.U.C.:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->Cell(72, 4, $ruc_empresa, 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 13);
    $pdf->Cell(90, 6, 'FACTURA', 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell(10, 4.5, 'No.', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 10.5);
    $pdf->SetTextColor(200, 0, 0);
    $pdf->Cell(80, 4.5, $numero_factura, 0, 1, 'L');
    $pdf->SetTextColor(0, 0, 0);

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(90, 3.5, 'NÚMERO DE AUTORIZACIÓN:', 0, 1, 'L');
    $pdf->SetX(108);
    $pdf->SetFont('helvetica', '', 6.8);
    $pdf->Cell(90, 3.2, $clave_autorizacion, 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(90, 3.5, 'FECHA Y HORA DE AUTORIZACIÓN:', 0, 1, 'L');
    $pdf->SetX(108);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(90, 3.5, $hora_autorizacion, 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(20, 3.5, 'AMBIENTE:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(70, 3.5, 'PRODUCCIÓN', 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(20, 3.5, 'EMISIÓN:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(70, 3.5, 'NORMAL', 0, 1, 'L');

    $pdf->SetX(108);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell(90, 3.5, 'CLAVE DE ACCESO:', 0, 1, 'L');

    // Código de barras nativo centrado en recuadro derecho
    if (!empty($clave_autorizacion)) {
        $styleBc = [
            'position' => '',
            'align' => 'C',
            'stretch' => false,
            'fitwidth' => true,
            'cellfitalign' => '',
            'border' => false,
            'hpadding' => 'auto',
            'vpadding' => 'auto',
            'fgcolor' => [0, 0, 0],
            'bgcolor' => false,
            'text' => true,
            'font' => 'helvetica',
            'fontsize' => 6.5,
            'stretchtext' => 4
        ];
        $pdf->write1DBarcode($clave_autorizacion, 'C128', 108, 83, 90, 15, 0.4, $styleBc, 'N');
    }

    // ─── RECUADRO INFORMACIÓN CLIENTE ────────────────────────────────────────
    $pdf->Rect(10, 105, 190, 26, 'D');
    $pdf->SetXY(12, 107);

    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(52, 4, 'Razón Social / Nombres y Apellidos:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(134, 4, $razon_social, 0, 1, 'L');

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(25, 4, 'Identificación:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(70, 4, $ruc_cliente, 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(25, 4, 'Guía Remisión:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(60, 4, '', 0, 1, 'L');

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(25, 4, 'Teléfono:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(70, 4, $telefono, 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(25, 4, 'Fecha Emisión:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->Cell(60, 4, $fecha_emision, 0, 1, 'L');

    $pdf->SetX(12);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(20, 4, 'Dirección:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(166, 4, substr($direccion, 0, 90), 0, 1, 'L');

    // ─── TABLA DETALLES PRODUCTOS ────────────────────────────────────────────
    $pdf->SetY(134);
    $pdf->SetFillColor(238, 238, 238);
    $pdf->SetFont('helvetica', 'B', 8);

    $wColDesc = 76;
    $wColCant = 18;
    $wColDescM = 24;
    $wColIva = 24;
    $wColTar = 24;
    $wColSub = 24;

    $pdf->Cell($wColDesc, 5, 'Descripción', 1, 0, 'C', true);
    $pdf->Cell($wColCant, 5, 'Cant', 1, 0, 'C', true);
    $pdf->Cell($wColDescM, 5, 'Descuento', 1, 0, 'C', true);
    $pdf->Cell($wColIva, 5, 'IVA', 1, 0, 'C', true);
    $pdf->Cell($wColTar, 5, 'Tarifa', 1, 0, 'C', true);
    $pdf->Cell($wColSub, 5, 'Subtotal', 1, 1, 'C', true);

    $pdf->SetFont('helvetica', '', 7.5);
    foreach ($items_factura as $it) {
        $pdf->Cell($wColDesc, 4.5, ' ' . substr($it['descripcion'], 0, 46), 1, 0, 'L');
        $pdf->Cell($wColCant, 4.5, $it['cantidad'], 1, 0, 'C');
        $pdf->Cell($wColDescM, 4.5, '$ ' . number_format($it['descuento'], 2) . ' ', 1, 0, 'R');
        $pdf->Cell($wColIva, 4.5, $it['pct_iva'] . '%', 1, 0, 'C');
        $pdf->Cell($wColTar, 4.5, '$ ' . number_format($it['tarifa'], 2) . ' ', 1, 0, 'R');
        $pdf->Cell($wColSub, 4.5, '$ ' . number_format($it['total'], 2) . ' ', 1, 1, 'R');
    }

    // ─── SECCIÓN INFERIOR: FORMAS DE PAGO & TOTALES ──────────────────────────
    $pdf->Ln(4);
    $yInferior = $pdf->GetY();

    // Columna Izquierda: Formas de Pago
    $pdf->SetXY(10, $yInferior);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell(80, 5, 'Forma de Pago', 1, 0, 'C', true);
    $pdf->Cell(30, 5, 'Valor', 1, 1, 'C', true);

    $pdf->SetFont('helvetica', '', 7.5);
    foreach ($items_pago as $ip) {
        $pdf->Cell(80, 4.2, ' ' . substr($ip['nombre'], 0, 44), 1, 0, 'L');
        $pdf->Cell(30, 4.2, '$ ' . number_format($ip['monto'], 2) . ' ', 1, 1, 'R');
    }

    // Columna Derecha: Totales
    $wTotL = 48;
    $wTotV = 28;
    $xTot = 200 - ($wTotL + $wTotV); // 124 mm

    $rowTot = function($label, $val, $isBold = false) use ($pdf, $xTot, $wTotL, $wTotV) {
        $pdf->SetX($xTot);
        $pdf->SetFont('helvetica', $isBold ? 'B' : '', 7.5);
        $pdf->Cell($wTotL, 4.2, ' ' . $label, 1, 0, 'L');
        $pdf->Cell($wTotV, 4.2, '$ ' . number_format($val, 2) . ' ', 1, 1, 'R');
    };

    $pdf->SetY($yInferior);
    $rowTot('SUBTOTAL ' . $label_iva, $subtotal_12);
    $rowTot('SUBTOTAL 0%', $subtotal_0);
    $rowTot('SUBTOTAL No objeto de IVA', 0.00);
    $rowTot('SUBTOTAL Exento de IVA', 0.00);
    $rowTot('SUBTOTAL SIN IMPUESTOS', $subtotal);
    $rowTot('DESCUENTO', $descuento_guia);
    $rowTot('IVA ' . $label_iva, $iva_guia);
    $rowTot('VALOR TOTAL', $total_guia, true);

    // ─── FOOTER FIJO SISTEMA ──────────────────────────────────────────────────
    $pathsIcono = [
        __DIR__ . '/public/images/transpaeasy_icon.png',
        dirname(__DIR__) . '/public/images/transpaeasy_icon.png',
        __DIR__ . '/images/transpaeasy_icon.png',
    ];
    $rutaIcono = '';
    foreach ($pathsIcono as $pathCandidate) {
        if (file_exists($pathCandidate)) {
            $rutaIcono = $pathCandidate;
            break;
        }
    }

    $pdf->SetY(280);
    $pdf->SetDrawColor(209, 213, 219);
    $pdf->Line(10, 280, 200, 280);

    if ($rutaIcono) {
        $pdf->Image($rutaIcono, 78, 282, 4, 4, '', '', 'T', false, 300, 'L');
        $pdf->SetXY(84, 282);
    } else {
        $pdf->SetXY(10, 282);
    }
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetTextColor(71, 85, 105);
    $pdf->Cell(110, 4, 'Easysplus - Sistema de facturación electrónica', 0, 1, $rutaIcono ? 'L' : 'C');
    $pdf->SetTextColor(0, 0, 0);

    // ─── SALIDA Y CACHÉ ───────────────────────────────────────────────────────
    $fileName = 'factura_' . $id_factura . '.pdf';
    if (ob_get_length()) {
        ob_clean();
    }

    $pdfContent = $pdf->Output($fileName, 'S');

    if (!empty($pdfContent) && strlen($pdfContent) > 1000) {
        @file_put_contents($pdfCacheFile, $pdfContent);
    }

    $tTotal = round((microtime(true) - $t0) * 1000);
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Content-Length: ' . strlen($pdfContent));
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotal . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
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
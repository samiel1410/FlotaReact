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
    $id_viaje = (int)($_GET['id_viaje'] ?? 0);

    if ($id_viaje <= 0) {
        throw new Exception("ID de viaje no proporcionado o inválido");
    }

    $id_sucursal_filtro = (int)($_GET['id_sucursal'] ?? 0);
    $conn = conexion();
    mysqli_query($conn, "SET SESSION sql_mode = ''");

    // ─── CACHÉ NIVEL 1: EMPRESA Y LOGO ────────────────────────────────────────
    $logosDir = __DIR__ . '/tmp/logos/';
    if (!is_dir($logosDir)) {
        @mkdir($logosDir, 0777, true);
    }

    $vals_empresa = null;
    $rutaLogo = null;
    $vals_config = null;

    
        $query_empresa = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa FROM empresa LIMIT 1";
        $rec_empresa = mysqli_query($conn, $query_empresa);
        $vals_empresa = $rec_empresa ? mysqli_fetch_assoc($rec_empresa) : [];
        if (!$vals_empresa) {
            $vals_empresa = [
                'razon_social_empresa' => 'SISTEMA FLOTA',
                'ruc_empresa' => '',
                'direccion_empresa' => '',
                'telefono_empresa' => ''
            ];
        }

        $query_config = "SELECT formato_impresion FROM configuracion LIMIT 1";
        $rec_cfg = mysqli_query($conn, $query_config);
        $vals_config = $rec_cfg ? mysqli_fetch_assoc($rec_cfg) : [];

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
        }

        

    if (empty($rutaLogo) || !esImagenValidaParaTcpdf($rutaLogo)) {
        $rutaLogo = obtenerRutaLogoEmpresa($conn);
    }

    $razon_social = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa = $vals_empresa["ruc_empresa"] ?? '';
    $direccion_empresa = $vals_empresa["direccion_empresa"] ?? '';
    $telefono_empresa = $vals_empresa["telefono_empresa"] ?? '';

    // ─── CONSULTA VIAJE, BUS, CHOFER Y USUARIO ───────────────────────────────
    $query_info = "SELECT
        v.id_viajes, v.dia_viajes, v.hora_salida_estimado, v.hora_origen_salida, v.fecha_cierre, r.nombre_rutas,
        b.disco_buses, b.placa_buses,
        p.per_cedula_personal, p.per_nombres_persona, p.per_apellidos_personal,
        v.chofer_viajes, v.cedula_viajes,
        d.fecha_salida_despacho_viaje,
        COALESCE(u.nombre_usuario, u2.nombre_usuario, u3.nombre_usuario) AS nombre_usuario,
        COALESCE(u.apellido_usuario, u2.apellido_usuario, u3.apellido_usuario) AS apellido_usuario,
        COALESCE(u.username_usuario, u2.username_usuario, u3.username_usuario) AS username_usuario
    FROM viajes v
    LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
    LEFT JOIN buses b ON v.id_fkbus_viajes = b.id_buses
    LEFT JOIN personal p ON p.id_personal = CASE 
        WHEN IFNULL(v.id_fkchofer_viajes, 0) > 0 THEN v.id_fkchofer_viajes 
        ELSE b.id_fkpersonal_buses 
    END
    LEFT JOIN despacho_viaje d ON v.id_viajes = d.id_fkviaje_despacho_viaje
    LEFT JOIN usuario u ON d.id_fkusuario_aprueba = u.id_usuario
    LEFT JOIN usuario u2 ON d.id_fkusuario_aprueba = u2.username_usuario
    LEFT JOIN usuario u3 ON v.id_fkusuario_viajes = u3.id_usuario
    WHERE v.id_viajes = $id_viaje LIMIT 1";

    $result_info = mysqli_query($conn, $query_info) or die(mysqli_error($conn));
    $info = mysqli_fetch_assoc($result_info) ?: [];

    $ruta = $info['nombre_rutas'] ?? '';

    $raw_fecha_viaje = !empty($info['fecha_cierre']) 
        ? $info['fecha_cierre'] 
        : (!empty($info['fecha_salida_despacho_viaje']) ? $info['fecha_salida_despacho_viaje'] : '');

    $fecha_viaje = (!empty($raw_fecha_viaje) && strtotime($raw_fecha_viaje) !== false) 
        ? date('d/m/Y', strtotime($raw_fecha_viaje)) 
        : date('d/m/Y');

    $raw_hora_viaje = !empty($info['hora_salida_estimado']) 
        ? $info['hora_salida_estimado'] 
        : (!empty($info['hora_origen_salida']) ? $info['hora_origen_salida'] : '');

    $hora_viaje = (!empty($raw_hora_viaje) && strtotime($raw_hora_viaje) !== false) 
        ? date('H:i', strtotime($raw_hora_viaje)) 
        : '';

    $conductor_nombre = trim(($info['per_nombres_persona'] ?? '') . ' ' . ($info['per_apellidos_personal'] ?? ''));
    if (empty($conductor_nombre) && !empty($info['chofer_viajes'])) {
        $conductor_nombre = trim($info['chofer_viajes']);
    }
    if (empty($conductor_nombre)) {
        $conductor_nombre = 'N/A';
    }

    $conductor_cedula = !empty($info['per_cedula_personal']) 
        ? trim($info['per_cedula_personal']) 
        : (!empty($info['cedula_viajes']) ? trim($info['cedula_viajes']) : 'N/A');

    // Usuario de entrega
    $usuario_entrega = trim(($info['nombre_usuario'] ?? '') . ' ' . ($info['apellido_usuario'] ?? ''));
    if (empty($usuario_entrega) && !empty($info['username_usuario'])) {
        $usuario_entrega = trim($info['username_usuario']);
    }
    if (empty($usuario_entrega) && !empty($_GET['usuario'])) {
        $usuario_entrega = trim($_GET['usuario']);
    }
    if (empty($usuario_entrega) && !empty($_GET['nombre_usuario'])) {
        $usuario_entrega = trim($_GET['nombre_usuario']);
    }
    if (empty($usuario_entrega)) {
        $usuario_entrega = 'SISTEMA';
    }

    // Filtro por sucursal
    $where_sucursal = "";
    $nombre_sucursal_filtro = '';
    if ($id_sucursal_filtro > 0) {
        $where_sucursal = " AND (s.id_sucursal = $id_sucursal_filtro OR s.suc_codigo_sucursal = '$id_sucursal_filtro' OR b.id_sucursal_venta = $id_sucursal_filtro OR b.id_fksucursal_boleto = $id_sucursal_filtro OR u.id_fksucursal_usuario = $id_sucursal_filtro) ";
        $q_suc = mysqli_query($conn, "SELECT nombre_sucursal FROM sucursal2 WHERE id_sucursal = $id_sucursal_filtro OR suc_codigo_sucursal = '$id_sucursal_filtro' LIMIT 1");
        if ($q_suc && $r_suc = mysqli_fetch_assoc($q_suc)) {
            $nombre_sucursal_filtro = $r_suc['nombre_sucursal'];
        }
    }

    // ─── CONSULTA DE PASAJEROS ───────────────────────────────────────────────
    $query_pasajeros = "SELECT 
        COALESCE(d.lugar_destino, sr.nombre_sub_rutas, 'N/A') AS lugar_destino,
        r.nombre_rutas, bd.estado_boleto_detalle, bd.identificacion_boleto_detalle,
        bd.asiento_boleto_detalle, bd.total_boleto_detalle,
        bd.nombre_cliente_boleto_detalle, b.nombre_origen,
        COALESCE(s.nombre_sucursal, b.nombre_origen, 'OFICINA PRINCIPAL') AS nombre_sucursal
    FROM boleto_detalle bd
    JOIN boletos b ON bd.id_fkboleto_boleto_detalle = b.id_boleto
    JOIN viajes v ON b.id_fkviaje_boleto = v.id_viajes
    LEFT JOIN rutas r ON v.id_fkruta_viajes = r.id_rutas
    LEFT JOIN destino d ON bd.id_destino_boleto = d.id_destino
    LEFT JOIN sub_rutas sr ON bd.id_destino_boleto = sr.id_sub_rutas
    LEFT JOIN usuario u ON b.id_fkusuario_boleto = u.id_usuario
    LEFT JOIN sucursal2 s ON (
        s.id_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
        OR s.suc_codigo_sucursal = COALESCE(NULLIF(b.id_sucursal_venta, 0), NULLIF(b.id_fksucursal_boleto, 0), NULLIF(u.id_fksucursal_usuario, 0))
    )
    WHERE b.id_fkviaje_boleto = $id_viaje AND (b.estado_boleto IS NULL OR b.estado_boleto != 3) $where_sucursal
    ORDER BY COALESCE(s.nombre_sucursal, b.nombre_origen) ASC, b.nombre_origen ASC, CAST(bd.asiento_boleto_detalle AS UNSIGNED) ASC";

    $result_pasajeros = mysqli_query($conn, $query_pasajeros) or die(mysqli_error($conn));

    $pasajeros = [];
    $total_pasajeros = 0;
    $total_valor = 0.0;

    while ($row = mysqli_fetch_assoc($result_pasajeros)) {
        $pasajeros[] = $row;
        $total_pasajeros++;
        $total_valor += (float)($row['total_boleto_detalle'] ?? 0);
    }

    // ─── CONFIGURACIÓN DE PÁGINA NATIVA TCPDF ────────────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion($conn, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    // Altura estimada
    $altoEstimado = max(240, 160 + (count($pasajeros) * 5) + 60);

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA ─────────────────────────────────────────────────────────
    if ($rutaLogo && file_exists($rutaLogo)) {
        $logoW = 30;
        $xLogo = $margen + ($anchoUtil - $logoW) / 2;
        $pdf->Image($rutaLogo, $xLogo, $pdf->GetY(), $logoW, 0, '', '', '', true, 150);
        $pdf->Ln(13);
    }

    $pdf->SetFont('helvetica', 'B', 10.5);
    $pdf->Cell($anchoUtil, 4.5, strtoupper($razon_social), 0, 1, 'C');

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }
    if (!empty($direccion_empresa)) {
        $pdf->SetFont('helvetica', '', 7);
        $pdf->MultiCell($anchoUtil, 3.2, $direccion_empresa, 0, 'C', false, 1);
    }
    if (!empty($telefono_empresa)) {
        $pdf->SetFont('helvetica', '', 7);
        $pdf->Cell($anchoUtil, 3.2, 'Tel: ' . $telefono_empresa, 0, 1, 'C');
    }

    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY() + 0.5, $margen + $anchoUtil, $pdf->GetY() + 0.5);
    $pdf->Ln(2);

    $tituloDoc = 'LISTADO DE PASAJEROS' . ($nombre_sucursal_filtro ? ' - ' . strtoupper($nombre_sucursal_filtro) : '');
    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil, 4.5, $tituloDoc, 0, 1, 'C');

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($anchoUtil, 4, 'Disco: ' . ($info['disco_buses'] ?? 'S/N'), 0, 1, 'C');

    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.5, 'Viaje #' . $id_viaje . ' | Fecha: ' . $fecha_viaje . ' | Hora: ' . $hora_viaje, 0, 1, 'C');

    // Fila Ruta y Placa
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil * 0.65, 3.8, 'Ruta: ' . $ruta, 0, 0, 'L');
    $pdf->Cell($anchoUtil * 0.35, 3.8, 'Placa: ' . ($info['placa_buses'] ?? 'S/N'), 0, 1, 'R');

    // Conductor
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.5, 'Conductor: ' . $conductor_nombre, 0, 1, 'L');
    $pdf->Cell($anchoUtil, 3.5, 'C.I: ' . $conductor_cedula, 0, 1, 'L');

    $pdf->Ln(1.5);

    // ─── 2. TABLA DE PASAJEROS (Agrupada) ────────────────────────────────────
    $wAsi  = round($anchoUtil * 0.10, 1);
    $wCed  = round($anchoUtil * 0.22, 1);
    $wNom  = round($anchoUtil * 0.27, 1);
    $wDest = round($anchoUtil * 0.25, 1);
    $wVal  = $anchoUtil - ($wAsi + $wCed + $wNom + $wDest);

    // Cabecera fija de columnas
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wAsi, 4, 'Asi.', 'B', 0, 'C');
    $pdf->Cell($wCed, 4, 'Cédula', 'B', 0, 'L');
    $pdf->Cell($wNom, 4, 'Nombre', 'B', 0, 'L');
    $pdf->Cell($wDest, 4, 'Destino', 'B', 0, 'L');
    $pdf->Cell($wVal, 4, 'Valor', 'B', 1, 'R');

    $current_sucursal = null;
    $current_origen = null;
    $sucursal_subtotal_pasajeros = 0;
    $sucursal_subtotal_valor = 0.0;
    $origen_subtotal_pasajeros = 0;
    $origen_subtotal_valor = 0.0;

    foreach ($pasajeros as $row) {
        $sucursal = !empty($row['nombre_sucursal']) ? $row['nombre_sucursal'] : 'OFICINA PRINCIPAL';
        $origen = !empty($row['nombre_origen']) ? $row['nombre_origen'] : 'ORIGEN PRINCIPAL';

        // Cambio de oficina
        if ($sucursal !== $current_sucursal) {
            if ($current_origen !== null) {
                $pdf->SetFont('helvetica', 'B', 7);
                $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
                $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
            }
            if ($current_sucursal !== null) {
                $pdf->SetFont('helvetica', 'B', 7.5);
                $pdf->Cell($anchoUtil - $wVal, 4, 'TOTAL ' . strtoupper($current_sucursal) . ' (' . $sucursal_subtotal_pasajeros . ' pas.):', 'TB', 0, 'R');
                $pdf->Cell($wVal, 4, '$' . number_format($sucursal_subtotal_valor, 2), 'TB', 1, 'R');
                $pdf->Ln(1);
            }

            // Encabezado oficina
            $pdf->Ln(1);
            $pdf->SetFont('helvetica', 'B', 8);
            $pdf->Cell($anchoUtil, 4.2, 'OFICINA DE VENTA: ' . strtoupper($sucursal), 0, 1, 'L');

            $current_sucursal = $sucursal;
            $current_origen = null;
            $sucursal_subtotal_pasajeros = 0;
            $sucursal_subtotal_valor = 0.0;
        }

        // Cambio de origen
        if ($origen !== $current_origen) {
            if ($current_origen !== null) {
                $pdf->SetFont('helvetica', 'B', 7);
                $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
                $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
            }

            $pdf->SetFont('helvetica', 'B', 7.5);
            $pdf->Cell($anchoUtil, 3.8, 'PUNTO EMBARQUE: ' . strtoupper($origen), 0, 1, 'L');

            $current_origen = $origen;
            $origen_subtotal_pasajeros = 0;
            $origen_subtotal_valor = 0.0;
        }

        $precio = (float)($row['total_boleto_detalle'] ?? 0);
        $sucursal_subtotal_pasajeros++;
        $sucursal_subtotal_valor += $precio;
        $origen_subtotal_pasajeros++;
        $origen_subtotal_valor += $precio;

        $pdf->SetFont('helvetica', '', 6.8);
        $pdf->Cell($wAsi, 3.6, $row['asiento_boleto_detalle'], 0, 0, 'C');
        $pdf->Cell($wCed, 3.6, $row['identificacion_boleto_detalle'], 0, 0, 'L');
        $pdf->Cell($wNom, 3.6, substr($row['nombre_cliente_boleto_detalle'], 0, 18), 0, 0, 'L');
        $pdf->Cell($wDest, 3.6, substr($row['lugar_destino'], 0, 16), 0, 0, 'L');
        $pdf->Cell($wVal, 3.6, '$' . number_format($precio, 2), 0, 1, 'R');
    }

    // Cerrar último origen y oficina
    if ($current_origen !== null) {
        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->Cell($anchoUtil - $wVal, 3.5, 'Total ' . $current_origen . ' (' . $origen_subtotal_pasajeros . '):', 'T', 0, 'R');
        $pdf->Cell($wVal, 3.5, '$' . number_format($origen_subtotal_valor, 2), 'T', 1, 'R');
    }
    if ($current_sucursal !== null) {
        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil - $wVal, 4, 'TOTAL ' . strtoupper($current_sucursal) . ' (' . $sucursal_subtotal_pasajeros . ' pas.):', 'TB', 0, 'R');
        $pdf->Cell($wVal, 4, '$' . number_format($sucursal_subtotal_valor, 2), 'TB', 1, 'R');
    }

    // ─── 3. TOTALES GENERALES ────────────────────────────────────────────────
    $pdf->Ln(2);
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->Ln(1);

    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil * 0.65, 4.2, 'Total Pasajeros: ' . $total_pasajeros, 0, 0, 'L');
    $pdf->Cell($anchoUtil * 0.35, 4.2, 'Total: $' . number_format($total_valor, 2), 0, 1, 'R');

    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil, 3.8, 'Entrega: ' . $usuario_entrega, 0, 1, 'L');
    $pdf->Cell($anchoUtil, 3.5, 'Impresión: ' . $fecha_actual, 0, 1, 'L');

    // ─── SALIDA DIRECTA DEL PDF (SIN CACHÉ) ───────────────────────────────────
    $fileName = 'pasajeros_' . $id_viaje . '.pdf';
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
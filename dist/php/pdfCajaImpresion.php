<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();
require_once 'library/tcpdf.php';
require_once "db.php";
require_once "pdf_utils.php";

date_default_timezone_set('America/Guayaquil');

// TTL corto (10s): absorbe reimpresiones/iframe inmediatos sin regenerar el PDF.
// La caché por hash de datos (Nivel 2) cubre el caso de datos sin cambios.
// El navegador siempre revalida (no-cache) para que un cambio en la caja se vea al instante.
define('CAJAIMP_FAST_TTL', 10);

try {
    $t0 = microtime(true);
    $fecha_actual = date('Y-m-d H:i:s');
    $id_caja = (int)($_GET['id_caja'] ?? 0);

    if ($id_caja <= 0) {
        throw new Exception("ID de caja no proporcionado o inválido");
    }

    // ─── CACHÉ RÁPIDO (TTL corto): reimpresión inmediata sin tocar la BD ─────
    // Aislamiento multi-tenant: db_name + tenantId (igual que guiaPdfImpresion.php)
    $tenantIdStr = $_GET['tenantId'] ?? $_GET['tenant_id'] ?? $_SESSION['tenantId'] ?? '1';
    $dbNameStr   = $_GET['db_name'] ?? ($_SESSION['db_name'] ?? $tenantIdStr);
    $dbKey       = md5($dbNameStr . '_t' . $tenantIdStr);
    $pdfCacheDir = __DIR__ . '/tmp/pdfs/';
    if (!is_dir($pdfCacheDir)) {
        @mkdir($pdfCacheDir, 0777, true);
    }
    $fastPdfFile = $pdfCacheDir . 'caja_imp_' . $id_caja . '_' . $dbKey . '_latest.pdf';

    if (file_exists($fastPdfFile) && filesize($fastPdfFile) > 1000 && (time() - filemtime($fastPdfFile)) < CAJAIMP_FAST_TTL) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="caja_impresion_' . $id_caja . '.pdf"');
        header('Cache-Control: no-cache, must-revalidate');
        header('X-PDF-Cache: HIT-FAST');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        readfile($fastPdfFile);
        exit();
    }

    $conn = conexion();
    // Sin `SET SESSION sql_mode = ''`: verificado que el sql_mode por defecto del
    // servidor no incluye ONLY_FULL_GROUP_BY y todas las consultas de este script
    // son solo-lectura con GROUP BY completo. Ahorra 1 roundtrip (~90ms).

    // ─── CONSULTA DATOS BÁSICOS CAJA ─────────────────────────────────────────
    $query_caja = "SELECT s.nombre_sucursal, c.estado_solicitud, c.id_caja, c.fecha_caja,
        c.apertura_total_caja, c.cierre_total_caja, c.id_fksucursal_caja, c.estado_caja, c.cuadre_caja,
        CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) as usuario,
        c.fecha_hora_cierre, c.id_fkusuario_caja 
    FROM caja c
    JOIN usuario u ON c.id_fkusuario_caja = u.id_usuario
    JOIN sucursal2 s ON c.id_fksucursal_caja = s.suc_codigo_sucursal
    WHERE c.id_caja = $id_caja LIMIT 1";

    $recuperar_caja = mysqli_query($conn, $query_caja) or die(mysqli_error($conn));
    $vals_caja = mysqli_fetch_assoc($recuperar_caja);

    if (!$vals_caja) {
        throw new Exception("No se encontró la caja con ID: $id_caja");
    }

    $fecha_apertura = $vals_caja['fecha_caja'];
    $total_apertura = (float)$vals_caja['apertura_total_caja'];
    $fecha_hora_cierre = textoFechaHoraCierreCaja($vals_caja['fecha_hora_cierre'] ?? null, $vals_caja['estado_caja'] ?? null);
    $cierre_total_caja = (float)$vals_caja['cierre_total_caja'];
    $usuario = $vals_caja['usuario'] ?? 'OFICINISTA';

    

    // ─── EMPRESA + CONFIG: Caché JSON Nivel 1 (TTL: 5 min) ───────────────────
    $cacheCfgDir = __DIR__ . '/tmp/cache/';
    if (!is_dir($cacheCfgDir)) {
        @mkdir($cacheCfgDir, 0777, true);
    }
    $cacheCfgFile = $cacheCfgDir . 'empresa_cfg_' . $dbKey . '.json';

    $vals_empresa = [];
    $vals_config = [];
    $empresaCfgCached = null;

    if (file_exists($cacheCfgFile) && (time() - filemtime($cacheCfgFile)) < 300) {
        $empresaCfgCached = json_decode(@file_get_contents($cacheCfgFile), true);
    }

    if ($empresaCfgCached) {
        $vals_empresa = $empresaCfgCached;
        $vals_config  = $empresaCfgCached;
    } else {
        // 1 solo roundtrip: empresa + configuracion (sin BLOB) vía LEFT JOIN ON 1=1
        $query_empresa = "SELECT e.id_empresa, e.telefono_empresa, e.correo_empresa, e.ruc_empresa, e.direccion_empresa, e.razon_social_empresa, c.formato_impresion
            FROM empresa e LEFT JOIN configuracion c ON 1=1 LIMIT 1";
        $rec_emp = mysqli_query($conn, $query_empresa);
        $row_emp = $rec_emp ? mysqli_fetch_assoc($rec_emp) : [];
        $vals_empresa = $row_emp ?: ['razon_social_empresa' => 'SISTEMA FLOTA', 'ruc_empresa' => ''];
        $vals_config = $row_emp ?: [];
        @file_put_contents($cacheCfgFile, json_encode($vals_empresa));
    }

    $razon_social_empresa = $vals_empresa["razon_social_empresa"] ?? 'SISTEMA FLOTA';
    $ruc_empresa          = $vals_empresa["ruc_empresa"] ?? '';

    // ─── CONSULTA DE GUÍAS DE LA CAJA ─────────────────────────────────────────
    // Criterio de cobro unificado (igual que guiaPdfImpresion.php): un cobro cuenta
    // como COBRADO salvo que sea CRÉDITO (tipo_forma_pago = 4). Con LEFT JOIN, un
    // comprobante sin forma de pago registrada (id_fkforma_pago = 0) también cuenta.
    $query2 = "SELECT
        a.id_guia,
        a.punto_emision_guia,
        a.numero_guia,
        a.total_guia,
        f.punto_emision_sucursal,
        SUM(v.cantidad_detalle_guia) as cantidad,
        COALESCE(h.monto_comprobante_cobro, 0) as cobrado,
        COALESCE(a.total_guia, 0) - COALESCE(h.monto_comprobante_cobro, 0) as por_cobrar,
        (SELECT GROUP_CONCAT(DISTINCT CONCAT(fa2.punto_emision_factura, '-', LPAD(fa2.numero_factura, 9, '0')) SEPARATOR ', ')
           FROM factura fa2 WHERE fa2.id_fkguia_factura = a.id_guia) AS facturas
    FROM guia as a
    INNER JOIN sucursal2 as f ON a.sucursal_guia = f.suc_codigo_sucursal
    LEFT JOIN detalle_guia as v ON a.id_guia = v.id_fkguia_detalle_envio
    LEFT JOIN (
        SELECT fa.id_fkguia_factura, SUM(cc.monto_comprobante_cobro) as monto_comprobante_cobro
        FROM comprobante_cobro cc
        JOIN factura fa ON cc.id_fkfactura_comprobante_cobro = fa.id_factura
        LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
        WHERE cc.estado_comprobante_cobro = 'COBRADA'
        AND COALESCE(fp.tipo_forma_pago, 0) <> 4
        AND cc.id_fkcaja_comprobante_cobro = $id_caja
        GROUP BY fa.id_fkguia_factura
    ) as h ON h.id_fkguia_factura = a.id_guia
    WHERE id_fkcaja_guia = $id_caja AND estado_guia = 1
    GROUP BY a.id_guia, a.punto_emision_guia, a.numero_guia, a.total_guia, f.punto_emision_sucursal, h.monto_comprobante_cobro
    ORDER BY a.id_guia DESC";

    $recuperar2 = mysqli_query($conn, $query2) or die(mysqli_error($conn));

    $guias = [];
    $guiasPorCobrar = [];
    $total_final = 0.0;
    $total_cantidad = 0;
    $total_por_cobrar = 0.0;
    $total_guias_por_cobrar = 0.0;

    while ($vals2 = mysqli_fetch_assoc($recuperar2)) {
        $resultado = sprintf("%09s", $vals2['numero_guia']);
        $numero_guia = $vals2['punto_emision_sucursal'] . "-" . $vals2['punto_emision_guia'] . "-" . $resultado;
        $cobrado = (float)$vals2['cobrado'];
        $cant = (int)$vals2['cantidad'];
        $porCobrarGuia = (float)$vals2['por_cobrar'];

        $total_por_cobrar += $porCobrarGuia;
        $total_final += $cobrado;
        $total_cantidad += $cant;

        $guias[] = [
            'guia' => $numero_guia,
            'cobrado' => $cobrado,
            'cantidad' => $cant
        ];

        // Saldo pendiente de las guías de ESTA caja: se lista para que el
        // "TOTAL POR COBRAR" no aparezca como un monto sin origen.
        if ($porCobrarGuia > 0.009) {
            $total_guias_por_cobrar += $porCobrarGuia;
            $guiasPorCobrar[] = [
                'guia' => $numero_guia,
                'facturas' => trim((string)($vals2['facturas'] ?? '')),
                'total' => (float)$vals2['total_guia'],
                'cobrado' => $cobrado,
                'por_cobrar' => $porCobrarGuia,
            ];
        }
    }

    // ─── OTRAS GUÍAS (Comprobantes en esta caja para guías de otras cajas) ────
    // Mismo criterio de cobro que la sección CAJA (GUÍAS): solo comprobantes
    // COBRADOS, con monto real y que no sean CRÉDITO (tipo_forma_pago = 4).
    // Antes se sumaban todos los comprobantes de la caja: los registros con
    // monto 0 (p. ej. guías de compañías o comprobantes anulados) aparecían en
    // esta sección como guías con cobrado $0.00.
    $query_comprobantes = "SELECT SUM(cc.monto_comprobante_cobro) as monto_comprobante_cobro,
        g.id_guia, s.punto_emision_sucursal, g.punto_emision_guia, g.numero_guia
    FROM comprobante_cobro cc
    INNER JOIN factura f ON cc.id_fkfactura_comprobante_cobro = f.id_factura
    INNER JOIN guia g ON f.id_fkguia_factura = g.id_guia
    INNER JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
    LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
    WHERE cc.id_fkcaja_comprobante_cobro = $id_caja
      AND cc.estado_comprobante_cobro = 'COBRADA'
      AND COALESCE(cc.monto_comprobante_cobro, 0) > 0
      AND COALESCE(fp.tipo_forma_pago, 0) <> 4
      AND f.id_fkcaja_factura != $id_caja
      AND g.id_fkcaja_guia != $id_caja
      AND g.estado_guia = 1
    GROUP BY g.id_guia, s.punto_emision_sucursal, g.punto_emision_guia, g.numero_guia
    HAVING SUM(cc.monto_comprobante_cobro) > 0
    ORDER BY g.id_guia DESC";

    $recuperar_comprobantes = mysqli_query($conn, $query_comprobantes) or die(mysqli_error($conn));
    $otrasGuias = [];
    $total_otras_guias = 0.0;

    while ($vals_comprobantes = mysqli_fetch_assoc($recuperar_comprobantes)) {
        $resultado_compro = sprintf("%09s", $vals_comprobantes['numero_guia']);
        $num_compro = $vals_comprobantes['punto_emision_sucursal'] . "-" . $vals_comprobantes['punto_emision_guia'] . "-" . $resultado_compro;
        $monto_c = (float)$vals_comprobantes['monto_comprobante_cobro'];
        // Nunca listar guías cuyo monto neto quedó en 0 (p. ej. cobros anulados
        // o suma de pagos y reversos), para que no aparezcan como $0.00.
        if ($monto_c <= 0) {
            continue;
        }
        $total_otras_guias += $monto_c;

        $otrasGuias[] = [
            'guia' => $num_compro,
            'monto' => $monto_c
        ];
    }

    // ─── ENTREGADAS EN OFICINA (POR COBRAR) ──────────────────────────────────
    // Guías entregadas en esta oficina durante el turno pero creadas/facturadas
    // en otra caja (p. ej. Ambato → entregada en Guayaquil). Antes quedaban
    // invisibles en todos los cierres: "CAJA (GUÍAS)" filtra por
    // guia.id_fkcaja_guia y "OTRAS GUÍAS" solo lista cobros ya registrados, así
    // que una entrega con saldo pendiente no aparecía en ningún reporte.
    //
    // Solo las guías cuya sucursal de emisión es la MISMA oficina de la caja
    // entran al TOTAL POR COBRAR / TOTAL GENERAL. Las emitidas por otra
    // sucursal se listan aparte como informativas: su saldo pertenece a la
    // oficina de origen y no debe inflar lo que esta oficina debe tener.
    $entregadasOficina = [];
    $entregadasOtrasOficinas = [];
    $total_por_cobrar_oficina = 0.0;
    $total_por_cobrar_otras_oficinas = 0.0;
    $idSucursalCaja = (int)($vals_caja['id_fksucursal_caja'] ?? 0);
    $cierreCajaSql = (string)($vals_caja['fecha_hora_cierre'] ?? '');
    $finPeriodoCaja = ($cierreCajaSql !== '' && strpos($cierreCajaSql, '0000-00-00') !== 0)
        ? $cierreCajaSql
        : $fecha_actual;

    if ($idSucursalCaja > 0) {
        $fechaIniSql = mysqli_real_escape_string($conn, (string)$fecha_apertura);
        $fechaFinSql = mysqli_real_escape_string($conn, $finPeriodoCaja);

        $query_entregadas = "SELECT g.id_guia, g.punto_emision_guia, g.numero_guia, g.total_guia,
            g.sucursal_guia,
            s.punto_emision_sucursal,
            COALESCE(h.cobrado, 0) AS cobrado,
            COALESCE(g.total_guia, 0) - COALESCE(h.cobrado, 0) AS por_cobrar,
            MAX(ge.fecha_hora_entrega) AS fecha_entrega
        FROM guias_entregadas ge
        INNER JOIN guia g ON g.id_guia = ge.id_fkguia_guias_entregadas
        INNER JOIN sucursal2 s ON g.sucursal_guia = s.suc_codigo_sucursal
        INNER JOIN usuario u ON u.id_usuario = COALESCE(NULLIF(ge.id_fkusuario_llegada, 0), ge.id_usuario_entrego)
        LEFT JOIN (
            SELECT fa.id_fkguia_factura, SUM(cc.monto_comprobante_cobro) AS cobrado
            FROM comprobante_cobro cc
            JOIN factura fa ON cc.id_fkfactura_comprobante_cobro = fa.id_factura
            LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago
            WHERE cc.estado_comprobante_cobro = 'COBRADA'
            AND COALESCE(fp.tipo_forma_pago, 0) <> 4
            GROUP BY fa.id_fkguia_factura
        ) h ON h.id_fkguia_factura = g.id_guia
        WHERE u.id_fksucursal_usuario = $idSucursalCaja
          AND ge.estado_guias_entregadas = 2
          AND ge.fecha_hora_entrega >= '$fechaIniSql'
          AND ge.fecha_hora_entrega <= '$fechaFinSql'
          AND g.id_fkcaja_guia <> $id_caja
          AND g.estado_guia = 1
        GROUP BY g.id_guia, g.punto_emision_guia, g.numero_guia, g.total_guia, g.sucursal_guia, s.punto_emision_sucursal, h.cobrado
        HAVING por_cobrar > 0.009
        ORDER BY fecha_entrega ASC, g.id_guia ASC";

        $recuperar_entregadas = mysqli_query($conn, $query_entregadas);
        if ($recuperar_entregadas) {
            while ($vals_ent = mysqli_fetch_assoc($recuperar_entregadas)) {
                $numero_ent = sprintf("%09s", $vals_ent['numero_guia']);
                $num_ent = $vals_ent['punto_emision_sucursal'] . "-" . $vals_ent['punto_emision_guia'] . "-" . $numero_ent;
                $porCobrarEnt = (float)$vals_ent['por_cobrar'];
                if ($porCobrarEnt <= 0) {
                    continue;
                }
                $registro = [
                    'guia' => $num_ent,
                    'total' => (float)$vals_ent['total_guia'],
                    'por_cobrar' => $porCobrarEnt,
                ];
                // Solo las guías emitidas por esta misma oficina suman al
                // por cobrar del cierre; las de otra sucursal se informan.
                if ((int)$vals_ent['sucursal_guia'] === $idSucursalCaja) {
                    $total_por_cobrar_oficina += $porCobrarEnt;
                    $entregadasOficina[] = $registro;
                } else {
                    $total_por_cobrar_otras_oficinas += $porCobrarEnt;
                    $entregadasOtrasOficinas[] = $registro;
                }
            }
        } else {
            error_log('[pdfCajaImpresion] entregadas en oficina: ' . mysqli_error($conn));
        }
    }

    // ─── EGRESOS / INGRESOS ──────────────────────────────────────────────────
    // Solo movimientos vigentes: los ANULADA/CANCELADO ya no afectan el
    // efectivo, igual que en saldoCaja/cerrar_caja.
    $query_egresos_ingresos = "SELECT tipo_caja_detalle, SUM(monto_caja_detalle) as total 
    FROM caja_detalle 
    WHERE id_fkcaja = $id_caja 
    AND UPPER(TRIM(IFNULL(estado_caja_detalle, ''))) NOT IN ('ANULADO', 'ANULADA', 'CANCELADO')
    GROUP BY tipo_caja_detalle";

    $recuperar_egresos = mysqli_query($conn, $query_egresos_ingresos) or die(mysqli_error($conn));
    $egresos_ingresos = [];
    $total_egresos = 0.0;
    $total_ingresos = 0.0;

    while ($vals_egresos = mysqli_fetch_assoc($recuperar_egresos)) {
        $monto_ei = (float)$vals_egresos['total'];
        // En BD el tipo se guarda en mayúsculas ('INGRESO'/'EGRESO'); comparar sin
        // distinguir mayúsculas para no perder los totales.
        $tipo_ei = strtoupper(trim((string)$vals_egresos['tipo_caja_detalle']));
        if ($tipo_ei === 'EGRESO') {
            $total_egresos += $monto_ei;
        } else if ($tipo_ei === 'INGRESO') {
            $total_ingresos += $monto_ei;
        }
        $egresos_ingresos[] = [
            'tipo' => $vals_egresos['tipo_caja_detalle'],
            'total' => $monto_ei
        ];
    }

    // Guías entregadas en esta oficina con saldo pendiente y emisión de la
    // misma oficina: forman parte del por cobrar del cierre. Las de otras
    // sucursales quedan solo como informativas.
    $total_por_cobrar += $total_por_cobrar_oficina;

    $total_cobrado = $total_final + $total_otras_guias;

    // ─── SALDO CAJA ─────────────────────────────────────────────────────────
    $sqlSaldoCaja = "CALL saldoCaja($id_caja)";
    $recuperar_saldo = mysqli_query($conn, $sqlSaldoCaja) or die(mysqli_error($conn));
    $estado_cuadre = 'DESCONOCIDO';
    $saldo = 0.0;
    $esperado_sp = null;
    $contado_sp = null;
    $efectivo_sp = null;

    while ($vals_saldo = mysqli_fetch_assoc($recuperar_saldo)) {
        $estado_cuadre = $vals_saldo['estado_cuadre'] ?? '';
        $saldo = (float)($vals_saldo['total_diferencia'] ?? 0);
        if (array_key_exists('total_esperado', $vals_saldo)) {
            $esperado_sp = (float)$vals_saldo['total_esperado'];
            $contado_sp = (float)($vals_saldo['total_contado'] ?? 0);
        }
        if (array_key_exists('total_cobrado_efectivo', $vals_saldo)) {
            $efectivo_sp = (float)$vals_saldo['total_cobrado_efectivo'];
        }
    }
    mysqli_free_result($recuperar_saldo);
    while (mysqli_more_results($conn) && mysqli_next_result($conn)) {
        $extra = mysqli_store_result($conn);
        if ($extra) mysqli_free_result($extra);
    }
    $conn->close();

    // Efectivo esperado en la caja: apertura + ingresos - egresos + cobros en
    // efectivo. Se calcula DESPUÉS del SP y es el mismo valor del bloque
    // ESPERADO de la cabecera, para que el resumen no contradiga el cuadre.
    $total_efectivo_caja = $esperado_sp !== null
        ? $esperado_sp
        : round($total_apertura + $total_ingresos - $total_egresos + (float)($efectivo_sp ?? 0), 2);

    // ─── CACHÉ NIVEL 2: PDF por hash de datos (evita el render TCPDF) ────────
    $datosHash = md5(json_encode([
        'render-v4',
        $id_caja, $total_apertura, $cierre_total_caja, $fecha_hora_cierre, $estado_cuadre, $saldo,
        $total_cobrado, $total_por_cobrar, $total_egresos, $total_ingresos, $total_cantidad,
        $total_por_cobrar_oficina, count($guias), count($otrasGuias), count($entregadasOficina),
        count($entregadasOtrasOficinas), $total_por_cobrar_otras_oficinas,
        count($egresos_ingresos), count($guiasPorCobrar), $total_guias_por_cobrar, $total_efectivo_caja
    ]));
    $cachePdfFile = $pdfCacheDir . 'caja_imp_' . $id_caja . '_' . $datosHash . '.pdf';

    if (file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $t0) * 1000);
        if (ob_get_length()) {
            ob_clean();
        }
        // Refrescar la copia rápida para que reimpresiones seguidas no toquen la DB
        @copy($cachePdfFile, $fastPdfFile);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="caja_impresion_' . $id_caja . '.pdf"');
        header('Cache-Control: no-cache, must-revalidate');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
        readfile($cachePdfFile);
        exit();
    }

    // ─── CONFIGURACIÓN DE PÁGINA TCPDF NATIVA ────────────────────────────────
    $anchoPapel = obtenerAnchoFormatoImpresion(null, 80, $vals_config['formato_impresion'] ?? null);
    $margen = ($anchoPapel <= 60) ? 2.5 : 4.0;
    $anchoUtil = $anchoPapel - ($margen * 2);

    // Alto ajustado al contenido real: evita páginas largas con espacio en
    // blanco (se ven cortadas dentro del iframe de impresión rápida).
    $altoEstimado = 108
        + (count($guias) * 3.7)
        + (count($guiasPorCobrar) > 0 ? 16 + (count($guiasPorCobrar) * 3.7) : 0)
        + (count($otrasGuias) > 0 ? 14 + (count($otrasGuias) * 3.7) : 0)
        + (count($entregadasOficina) > 0 ? 14 + (count($entregadasOficina) * 3.7) : 0)
        + (count($entregadasOtrasOficinas) > 0 ? 16 + (count($entregadasOtrasOficinas) * 3.7) : 0)
        + (count($egresos_ingresos) > 0 ? 10 + (count($egresos_ingresos) * 3.7) : 0);

    $pdf = new TCPDF('P', 'mm', array($anchoPapel, $altoEstimado), true, 'UTF-8', false);
    $pdf->setFontSubsetting(false);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins($margen, 4, $margen);
    $pdf->SetAutoPageBreak(true, 4);
    $pdf->AddPage();

    // ─── 1. CABECERA ──────────────────────────────────────────────────
    $pdf->SetY(4);

    // El nombre de la empresa se ajusta al ancho del papel para que no se
    // corte en la vista previa del iframe (papel de 80 mm).
    $pdf->SetFont('helvetica', 'B', 10.5);
    $tituloEmpresa = strtoupper($razon_social_empresa);
    $fontSizeEmpresa = 10.5;
    while ($fontSizeEmpresa > 7 && $pdf->GetStringWidth($tituloEmpresa, 'helvetica', 'B', $fontSizeEmpresa) > $anchoUtil) {
        $fontSizeEmpresa -= 0.5;
    }
    $pdf->SetFont('helvetica', 'B', $fontSizeEmpresa);
    if ($pdf->GetStringWidth($tituloEmpresa) > $anchoUtil) {
        $pdf->MultiCell($anchoUtil, 4, $tituloEmpresa, 0, 'C');
    } else {
        $pdf->Cell($anchoUtil, 4.5, $tituloEmpresa, 0, 1, 'C');
    }

    if (!empty($ruc_empresa)) {
        $pdf->SetFont('helvetica', '', 7.5);
        $pdf->Cell($anchoUtil, 3.5, 'RUC: ' . $ruc_empresa, 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 9.5);
    $pdf->Cell($anchoUtil, 4.5, 'CIERRE DE CAJA', 0, 1, 'C');

    // ─── 2. CUADRO DE APERTURA Y CIERRE ──────────────────────────────────────
    $pdf->Ln(1);
    $yBox = $pdf->GetY();
    $pdf->SetFont('helvetica', '', 7.5);

    $hLine = 3.6;
    $pdf->SetXY($margen + 1, $yBox + 1);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Caja N°: ' . $id_caja, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Oficinista: ' . $usuario, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Fecha y Hora: ' . $fecha_apertura, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'Fecha y Hora Cierre: ' . $fecha_hora_cierre, 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($anchoUtil - 2, $hLine, 'APERTURA: $' . number_format($total_apertura, 2), 0, 1, 'L');
    $pdf->SetX($margen + 1);
    $pdf->Cell($anchoUtil - 2, $hLine, 'CIERRE: $' . number_format($cierre_total_caja, 2), 0, 1, 'L');
    $pdf->SetX($margen + 1);
    // Cuadre: se compara lo CONTADO contra lo ESPERADO (apertura + ingresos -
    // egresos + efectivo cobrado). Antes restaba el cierre y marcaba faltante falso.
    $esperadoCaja = $esperado_sp !== null ? $esperado_sp : 0.0;
    $contadoCaja = $contado_sp !== null ? $contado_sp : $cierre_total_caja;
    $pdf->SetFont('helvetica', '', 7.5);
    $pdf->Cell(
        $anchoUtil - 2,
        $hLine,
        'ESPERADO: $' . number_format($esperadoCaja, 2)
            . ' | CONTADO: $' . number_format($contadoCaja, 2),
        0,
        1,
        'L'
    );
    $pdf->SetX($margen + 1);
    $pdf->Cell(
        $anchoUtil - 2,
        $hLine,
        'DIF: $' . number_format($saldo, 2) . ' ' . $estado_cuadre,
        0,
        1,
        'L'
    );

    $altoBox = ($pdf->GetY() - $yBox) + 1;
    $pdf->SetLineStyle(['dash' => 2]);
    $pdf->Rect($margen, $yBox, $anchoUtil, $altoBox, 'D');
    $pdf->SetLineStyle(['dash' => 0]);
    $pdf->Ln(2);

    // ─── 3. SECCIÓN GUÍAS (CAJA) ─────────────────────────────────────────────
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->Cell($anchoUtil, 4.2, 'CAJA (GUÍAS)', 0, 1, 'C');

    $wGuia = round($anchoUtil * 0.50, 1);
    $wCob  = round($anchoUtil * 0.28, 1);
    $wCant = $anchoUtil - ($wGuia + $wCob);

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wGuia, 4, 'GUIA', 'B', 0, 'L');
    $pdf->Cell($wCob, 4, 'COBRADO', 'B', 0, 'R');
    $pdf->Cell($wCant, 4, 'CANT.', 'B', 1, 'C');

    $pdf->SetFont('courier', '', 7);
    foreach ($guias as $g) {
        $pdf->Cell($wGuia, 3.6, $g['guia'], 0, 0, 'L');
        $pdf->Cell($wCob, 3.6, '$' . number_format($g['cobrado'], 2), 0, 0, 'R');
        $pdf->Cell($wCant, 3.6, (string)$g['cantidad'], 0, 1, 'C');
    }

    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->Cell($wGuia, 4, 'TOTAL:', 'T', 0, 'L');
    $pdf->Cell($wCob, 4, '$' . number_format($total_final, 2), 'T', 0, 'R');
    $pdf->Cell($wCant, 4, '', 'T', 1, 'C');
    $pdf->Ln(1.5);

    // ─── 3b. GUÍAS CON SALDO PENDIENTE (POR COBRAR) ──────────────────────────
    // Se detalla el origen de cada saldo pendiente: antes el resumen mostraba
    // un "TOTAL POR COBRAR" que no se podía asociar a ninguna guía/factura.
    if (count($guiasPorCobrar) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'POR COBRAR - NO ES EFECTIVO', 0, 1, 'C');

        $wGuiaPc = round($anchoUtil * 0.40, 1);
        $wFactPc = round($anchoUtil * 0.30, 1);
        $wPendPc = $anchoUtil - ($wGuiaPc + $wFactPc);

        $pdf->SetFont('helvetica', 'B', 6.8);
        $pdf->Cell($wGuiaPc, 4, 'GUIA', 'B', 0, 'L');
        $pdf->Cell($wFactPc, 4, 'FACTURA', 'B', 0, 'C');
        $pdf->Cell($wPendPc, 4, 'PENDIENTE', 'B', 1, 'R');

        $pdf->SetFont('courier', '', 6.8);
        foreach ($guiasPorCobrar as $gpc) {
            $pdf->Cell($wGuiaPc, 3.6, $gpc['guia'], 0, 0, 'L');
            $pdf->Cell($wFactPc, 3.6, $gpc['facturas'] !== '' ? $gpc['facturas'] : '-', 0, 0, 'C');
            $pdf->Cell($wPendPc, 3.6, '$' . number_format($gpc['por_cobrar'], 2), 0, 1, 'R');
        }

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wGuiaPc + $wFactPc, 4, 'TOTAL PENDIENTE:', 'T', 0, 'L');
        $pdf->Cell($wPendPc, 4, '$' . number_format($total_guias_por_cobrar, 2), 'T', 1, 'R');

        $pdf->SetFont('helvetica', 'I', 6.3);
        $pdf->MultiCell($anchoUtil, 3.2, 'Saldo aun no cobrado: no es dinero recibido y no se suma al esperado de caja.', 0, 'L', false, 1);
        $pdf->Ln(1.5);
    }

    // ─── 4. OTRAS GUÍAS ──────────────────────────────────────────────────────
    if (count($otrasGuias) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'OTRAS GUÍAS', 0, 1, 'C');

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wGuia, 4, 'GUIA', 'B', 0, 'L');
        $pdf->Cell($wCob + $wCant, 4, 'COBRADO', 'B', 1, 'R');

        $pdf->SetFont('courier', '', 7);
        foreach ($otrasGuias as $og) {
            $pdf->Cell($wGuia, 3.6, $og['guia'], 0, 0, 'L');
            $pdf->Cell($wCob + $wCant, 3.6, '$' . number_format($og['monto'], 2), 0, 1, 'R');
        }

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wGuia, 4, 'TOTAL OTRAS:', 'T', 0, 'L');
        $pdf->Cell($wCob + $wCant, 4, '$' . number_format($total_otras_guias, 2), 'T', 1, 'R');
        $pdf->Ln(1.5);
    }

    // ─── 4b. ENTREGADAS EN OFICINA (POR COBRAR DE ESTA OFICINA) ─────────────
    if (count($entregadasOficina) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'ENTREGADAS AQUI - GUÍAS DE ESTA OFICINA', 0, 1, 'C');

        $wGuiaEnt = round($anchoUtil * 0.50, 1);
        $wTotalEnt = round($anchoUtil * 0.22, 1);
        $wPorCobrarEnt = $anchoUtil - ($wGuiaEnt + $wTotalEnt);

        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->Cell($wGuiaEnt, 4, 'GUIA', 'B', 0, 'L');
        $pdf->Cell($wTotalEnt, 4, 'TOTAL', 'B', 0, 'R');
        $pdf->Cell($wPorCobrarEnt, 4, 'POR COBRAR', 'B', 1, 'R');

        $pdf->SetFont('courier', '', 7);
        foreach ($entregadasOficina as $eof) {
            $pdf->Cell($wGuiaEnt, 3.6, $eof['guia'], 0, 0, 'L');
            $pdf->Cell($wTotalEnt, 3.6, '$' . number_format($eof['total'], 2), 0, 0, 'R');
            $pdf->Cell($wPorCobrarEnt, 3.6, '$' . number_format($eof['por_cobrar'], 2), 0, 1, 'R');
        }

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wGuiaEnt, 4, 'TOTAL PENDIENTE:', 'T', 0, 'L');
        $pdf->Cell($wTotalEnt, 4, '', 'T', 0, 'R');
        $pdf->Cell($wPorCobrarEnt, 4, '$' . number_format($total_por_cobrar_oficina, 2), 'T', 1, 'R');
        $pdf->Ln(1.5);
    }

    // ─── 4c. ENTREGADAS DE OTRAS OFICINAS (INFORMATIVO) ─────────────────────
    // Se muestran para no perderlas de vista, pero NO suman al por cobrar ni
    // al total general: ese saldo pertenece a la oficina que emitió la guía.
    if (count($entregadasOtrasOficinas) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'ENTREGADAS AQUI - OTRAS OFICINAS', 0, 1, 'C');

        $wGuiaOtr = round($anchoUtil * 0.50, 1);
        $wTotalOtr = round($anchoUtil * 0.22, 1);
        $wPorCobrarOtr = $anchoUtil - ($wGuiaOtr + $wTotalOtr);

        $pdf->SetFont('helvetica', 'B', 7);
        $pdf->Cell($wGuiaOtr, 4, 'GUIA', 'B', 0, 'L');
        $pdf->Cell($wTotalOtr, 4, 'TOTAL', 'B', 0, 'R');
        $pdf->Cell($wPorCobrarOtr, 4, 'POR COBRAR', 'B', 1, 'R');

        $pdf->SetFont('courier', '', 7);
        foreach ($entregadasOtrasOficinas as $eoo) {
            $pdf->Cell($wGuiaOtr, 3.6, $eoo['guia'], 0, 0, 'L');
            $pdf->Cell($wTotalOtr, 3.6, '$' . number_format($eoo['total'], 2), 0, 0, 'R');
            $pdf->Cell($wPorCobrarOtr, 3.6, '$' . number_format($eoo['por_cobrar'], 2), 0, 1, 'R');
        }

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($wGuiaOtr, 4, 'TOTAL (INFORMATIVO):', 'T', 0, 'L');
        $pdf->Cell($wTotalOtr, 4, '', 'T', 0, 'R');
        $pdf->Cell($wPorCobrarOtr, 4, '$' . number_format($total_por_cobrar_otras_oficinas, 2), 'T', 1, 'R');

        $pdf->SetFont('helvetica', 'I', 6.3);
        $pdf->MultiCell($anchoUtil, 3.2, 'Pertenece a la oficina de origen: no se suma al total general de esta caja.', 0, 'L', false, 1);
        $pdf->Ln(1.5);
    }

    // ─── 5. EGRESOS / INGRESOS ───────────────────────────────────────────────
    if (count($egresos_ingresos) > 0) {
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->Cell($anchoUtil, 4, 'EGRESOS / INGRESOS', 0, 1, 'C');

        $pdf->SetFont('helvetica', 'B', 7.5);
        $pdf->Cell($anchoUtil * 0.6, 4, 'TIPO', 'B', 0, 'L');
        $pdf->Cell($anchoUtil * 0.4, 4, 'TOTAL', 'B', 1, 'R');

        $pdf->SetFont('helvetica', '', 7.5);
        foreach ($egresos_ingresos as $ei) {
            $pdf->Cell($anchoUtil * 0.6, 3.6, $ei['tipo'], 0, 0, 'L');
            $pdf->Cell($anchoUtil * 0.4, 3.6, '$' . number_format($ei['total'], 2), 0, 1, 'R');
        }
        $pdf->Ln(1.5);
    }

    // ─── 6. RESUMEN FINAL ────────────────────────────────────────────────────
    $pdf->SetLineWidth(0.3);
    $pdf->Line($margen, $pdf->GetY(), $margen + $anchoUtil, $pdf->GetY());
    $pdf->Ln(1);

    $wK = round($anchoUtil * 0.65, 1);
    $wV = $anchoUtil - $wK;
    $hTot = 3.6;

    // Cada total mide algo distinto: el POR COBRAR es un saldo pendiente de
    // clientes, no dinero recibido, y solo incluye guías de esta oficina.
    // El TOTAL GENERAL es lo que debe quedar al final cuando se cobre todo.
    $totalesSummary = [
        ['TOTAL COBRADO:', '$' . number_format($total_cobrado, 2)],
        ['COBRADO EN EFECTIVO:', '$' . number_format((float)($efectivo_sp ?? 0), 2)],
        ['TOTAL EGRESOS:', '$' . number_format($total_egresos, 2)],
        ['TOTAL INGRESOS:', '$' . number_format($total_ingresos, 2)],
        ['TOTAL CANTIDAD:', (string)$total_cantidad],
        ['POR COBRAR (esta oficina):', '$' . number_format($total_por_cobrar, 2)],
        ['ESPERADO EN CAJA:', '$' . number_format($total_efectivo_caja, 2)],
        ['TOTAL GENERAL:', '$' . number_format($total_efectivo_caja + $total_por_cobrar, 2)],
    ];

    foreach ($totalesSummary as $idx => $ts) {
        $pdf->SetFont('helvetica', ($idx >= 5) ? 'B' : '', 7.5);
        $pdf->Cell($wK, $hTot, $ts[0], 0, 0, 'L');
        $pdf->Cell($wV, $hTot, $ts[1], 0, 1, 'R');
    }

    $pdf->SetFont('helvetica', 'I', 6.3);
    $pdf->MultiCell($anchoUtil, 3.2, 'TOTAL GENERAL = esperado en caja + por cobrar de esta oficina: es lo que debe quedar al cobrar todo. Los saldos de guías de otras oficinas no se suman.', 0, 'L', false, 1);

    $pdf->Ln(2);
    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($anchoUtil, 3.2, 'Impresión: ' . $fecha_actual, 0, 1, 'C');

    // ─── SALIDA CON CACHÉ NIVEL 2 (hash de datos) ─────────────────────────────
    $fileName = 'caja_impresion_' . $id_caja . '.pdf';
    $pdfContent = $pdf->Output('', 'S');
    // Invalidar versiones anteriores de esta caja: los datos cambiaron
    foreach (glob($pdfCacheDir . 'caja_imp_' . $id_caja . '_*.pdf') as $oldPdf) {
        @unlink($oldPdf);
    }
    @file_put_contents($cachePdfFile, $pdfContent);
    // Copia rápida TTL corto: la reimpresión inmediata no toca DB ni TCPDF
    @copy($cachePdfFile, $fastPdfFile);
    $tTotalMs = round((microtime(true) - $t0) * 1000);
    if (ob_get_length()) {
        ob_clean();
    }
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Cache-Control: no-cache, must-revalidate');
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
    header('Content-Type: application/json');
    echo json_encode([
        "error" => $e->getMessage(),
        "success" => false
    ]);
    exit();
}
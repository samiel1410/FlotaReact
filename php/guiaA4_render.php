<?php
/**
 * Render de la guía de remisión en A4 con el formato RIDE del SRI.
 */
require_once __DIR__ . '/ride_layout.php';

function render_guia_a4($pdf, $guia, $items, $empresa, $opciones = [])
{
    $reimpresoPor = trim((string)($opciones['reimpreso_por'] ?? ''));
    $formaPago = trim((string)($opciones['forma_pago'] ?? ''));
    $leyenda = trim((string)($opciones['leyenda'] ?? ''));

    $sucursalEmision = limpiarTextoPdf($guia['punto_emision_sucursal'] ?? '', '001');
    $puntoEmision = limpiarTextoPdf($guia['punto_emision_guia'] ?? '', '001');
    $secuencial = sprintf('%09s', limpiarTextoPdf($guia['numero_guia'] ?? '0', '0'));
    $numeroGuia = $sucursalEmision . '-' . $puntoEmision . '-' . $secuencial;

    $fechaEmision = ride_fecha_hora($guia['fecha_creacion_guia'] ?? null);
    if ($fechaEmision === '') {
        $fechaEmision = ride_fecha_hora($guia['fecha_guia'] ?? null, 'd/m/Y');
    }

    $nombreRemitente = mb_strtoupper(limpiarTextoPdf($guia['nombre_cliente_remitente'] ?? '', '—'), 'UTF-8');
    $nombreReceptor = mb_strtoupper(limpiarTextoPdf($guia['nombre_cliente_receptor'] ?? '', '—'), 'UTF-8');
    $cedulaRemitente = limpiarTextoPdf($guia['cedula_cliente_remitente'] ?? '', '—');
    $cedulaReceptor = limpiarTextoPdf($guia['cedula_cliente_receptor'] ?? '', '—');
    $telefonoReceptor = limpiarTextoPdf($guia['telefono_cliente_receptor'] ?? '', '—');
    $correoRemitente = limpiarTextoPdf($guia['correo_cliente_emisor'] ?? '', '—');
    $correoReceptor = limpiarTextoPdf($guia['correo_cliente_receptor'] ?? '', '');
    $direccionReceptor = limpiarTextoPdf($guia['direccion_cliente_receptor'] ?? '', '—');
    $numeroManual = limpiarTextoPdf($guia['numero_manual_guia'] ?? '', '');

    $origen = mb_strtoupper(limpiarTextoPdf($guia['origen_guia'] ?? '', '—'), 'UTF-8');
    $destino = mb_strtoupper(limpiarTextoPdf($guia['destino_guia'] ?? '', '—'), 'UTF-8');
    $observacion = limpiarTextoPdf($guia['observacion_guia'] ?? '', '');

    $claveFactura = trim((string)($guia['clave_acceso_factura'] ?? ''));

    $pdf->SetMargins(RIDE_MARGEN, RIDE_MARGEN, RIDE_MARGEN, true);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // ── CAJAS SUPERIORES ──────────────────────────────────────────────────────
    $regimen = trim((string)($empresa['regimen_fiscal'] ?? ''));
    if ($regimen !== '' && stripos($regimen, 'CONTRIBUYENTE') === false && stripos($regimen, 'RÉGIMEN') === false && stripos($regimen, 'REGIMEN') === false) {
        $regimen = 'RÉGIMEN ' . $regimen;
    }

    ride_caja_empresa($pdf, RIDE_MARGEN, 10, 90, 62, [
        'razon_social' => $empresa['razon_social_empresa'] ?? '',
        'direccion_matriz' => $empresa['direccion_empresa'] ?? '',
        'direccion_sucursal' => limpiarTextoPdf($guia['ubicacion_sucursal'] ?? '', limpiarTextoPdf($guia['nombre_sucursal'] ?? '', '')),
        'telefono' => $empresa['telefono_empresa'] ?? '',
        'correo' => $empresa['correo_empresa'] ?? '',
        'obligado_contabilidad' => $empresa['obligado_contabilidad'] ?? 'NO',
        'regimen' => $regimen,
        'contribuyente_especial' => $empresa['contribuyente_especial'] ?? '',
    ]);

    ride_caja_documento($pdf, 104, 10, 96, 62, [
        'ruc' => $empresa['ruc_empresa'] ?? '',
        'tipo' => 'GUÍA DE REMISIÓN',
        'numero' => $numeroGuia,
        'autorizacion' => $claveFactura,
        'etiqueta_autorizacion' => 'N° AUTORIZACIÓN FACTURA:',
        'fecha_autorizacion' => $fechaEmision !== '' ? $fechaEmision : '—',
        'etiqueta_fecha' => 'FECHA Y HORA DE EMISIÓN:',
        'ambiente' => ride_ambiente_sri($empresa['ambiente_sri'] ?? ''),
        'emision' => 'NORMAL',
        'clave' => $claveFactura,
        'qr' => $claveFactura !== '' ? $claveFactura : $numeroGuia,
    ]);

    // ── REMITENTE / DESTINATARIO ──────────────────────────────────────────────
    $filasCliente = [
        [
            'label' => 'Remitente:',
            'valor' => $nombreRemitente,
        ],
        [
            'label' => 'Identificación:',
            'valor' => $cedulaRemitente,
            'label2' => 'Fecha de Emisión:',
            'valor2' => $fechaEmision !== '' ? $fechaEmision : '—',
        ],
        [
            'label' => 'Destinatario:',
            'valor' => $nombreReceptor,
            'label2' => 'Teléfono:',
            'valor2' => $telefonoReceptor,
        ],
        [
            'label' => 'Identificación:',
            'valor' => $cedulaReceptor,
            'label2' => 'N° Manual:',
            'valor2' => $numeroManual !== '' ? $numeroManual : '—',
        ],
    ];
    ride_caja_cliente($pdf, RIDE_MARGEN, 76, RIDE_ANCHO, $filasCliente, 24.6);

    // ── DETALLE ───────────────────────────────────────────────────────────────
    $filasDetalle = [];
    $sumaSubtotal = 0.0;
    $sumaDescuento = 0.0;
    $sumaTotal = 0.0;

    foreach ($items as $indice => $item) {
        $cantidad = (float)($item['cantidad'] ?? 0);
        $costo = (float)($item['costo'] ?? 0);
        $descuento = (float)($item['descuento'] ?? 0);
        $totalItem = (float)($item['total'] ?? 0);
        if ($totalItem <= 0) {
            $totalItem = max(0, ($costo * $cantidad) - $descuento);
        }

        $sumaSubtotal += $costo * $cantidad;
        $sumaDescuento += $descuento;
        $sumaTotal += $totalItem;

        $filasDetalle[] = [
            'codigo' => 'GUIA-' . str_pad((string)($indice + 1), 2, '0', STR_PAD_LEFT),
            'cantidad' => rtrim(rtrim(number_format($cantidad, 2, '.', ''), '0'), '.'),
            'descripcion' => mb_strtoupper(limpiarTextoPdf($item['contenido'] ?? '', 'SERVICIO DE ENCOMIENDA'), 'UTF-8'),
            'precio' => ride_moneda($costo),
            'descuento' => ride_moneda($descuento),
            'total' => ride_moneda($totalItem),
        ];
    }

    if (empty($filasDetalle)) {
        $totalGuia = (float)($guia['total_guia'] ?? 0);
        $filasDetalle[] = [
            'codigo' => 'GUIA-01',
            'cantidad' => '1',
            'descripcion' => 'SERVICIO DE ENCOMIENDA',
            'precio' => ride_moneda($totalGuia),
            'descuento' => ride_moneda(0),
            'total' => ride_moneda($totalGuia),
        ];
        $sumaSubtotal = $totalGuia;
        $sumaTotal = $totalGuia;
    }

    $columnasDetalle = [
        ['titulo' => 'CÓDIGO', 'clave' => 'codigo', 'ancho' => 22, 'alineacion' => 'C'],
        ['titulo' => 'CANT.', 'clave' => 'cantidad', 'ancho' => 14, 'alineacion' => 'C'],
        ['titulo' => 'DESCRIPCIÓN', 'clave' => 'descripcion', 'ancho' => 78, 'alineacion' => 'L'],
        ['titulo' => 'PRECIO UNIT.', 'clave' => 'precio', 'ancho' => 26, 'alineacion' => 'R'],
        ['titulo' => 'DESCUENTO', 'clave' => 'descuento', 'ancho' => 24, 'alineacion' => 'R'],
        ['titulo' => 'PRECIO TOTAL', 'clave' => 'total', 'ancho' => 26, 'alineacion' => 'R'],
    ];

    $yTabla = 104.6;
    $pdf->SetY($yTabla);
    $yFinTabla = ride_tabla_detalle($pdf, RIDE_MARGEN, $yTabla, $columnasDetalle, $filasDetalle, 252);

    // ── INFORMACIÓN ADICIONAL + TOTALES ───────────────────────────────────────
    $filasInfo = [
        ['Origen:', $origen],
        ['Destino:', $destino],
        ['Fecha / Hora:', $fechaEmision !== '' ? $fechaEmision : '—'],
        ['Correo remitente:', $correoRemitente],
        ['Dirección dest.:', $direccionReceptor],
    ];
    if ($correoReceptor !== '') {
        $filasInfo[] = ['Correo dest.:', $correoReceptor];
    }
    if ($observacion === '' && $leyenda !== '') {
        $observacion = $leyenda;
    }

    $subtotal12 = (float)($guia['subtotal_12_guia'] ?? 0);
    $subtotal0 = (float)($guia['subtotal_0_guia'] ?? 0);
    $subtotal = (float)($guia['subtotal_guia'] ?? 0);
    $descuentoGuia = (float)($guia['descuento_guia'] ?? 0);
    $ivaGuia = (float)($guia['impuesto_iva_guia'] ?? 0);
    $tarifaGuia = (float)($guia['valor_tarifa_adicional_guia'] ?? 0);
    $totalGuia = (float)($guia['total_guia'] ?? 0);

    if ($subtotal <= 0) {
        $subtotal = $subtotal12 + $subtotal0;
    }
    if ($subtotal12 <= 0 && $subtotal0 <= 0) {
        $subtotal12 = max(0, $subtotal);
    }

    $totales = [
        ['label' => 'SUBTOTAL 15% (o 12%):', 'valor' => ride_moneda($subtotal12)],
        ['label' => 'SUBTOTAL 0%:', 'valor' => ride_moneda($subtotal0)],
        ['label' => 'SUBTOTAL NO OBJETO DE IVA:', 'valor' => ride_moneda(0)],
        ['label' => 'SUBTOTAL EXENTO DE IVA:', 'valor' => ride_moneda(0)],
        ['label' => 'SUBTOTAL SIN IMPUESTOS:', 'valor' => ride_moneda($subtotal)],
        ['label' => 'TOTAL DESCUENTO:', 'valor' => ride_moneda($descuentoGuia)],
        ['label' => 'I.V.A.:', 'valor' => ride_moneda($ivaGuia)],
    ];
    if ($tarifaGuia > 0) {
        $totales[] = ['label' => 'TARIFA ADICIONAL:', 'valor' => ride_moneda($tarifaGuia)];
    }
    $totales[] = ['label' => 'VALOR TOTAL:', 'valor' => ride_moneda($totalGuia), 'destacado' => true];

    $altoInfo = 6.8 + (count($filasInfo) * 4.3) + ($observacion !== '' ? 7.2 : 0) + 2.0;
    $altoPago = 8.2;
    $altoTotales = (2.2 * 3) + (count($totales) - 1) * 4.2 + 5.6;
    $altoBloque = max($altoInfo + $altoPago, $altoTotales);
    $altoInfo = max($altoInfo, $altoBloque - $altoPago);

    $pdf->SetY($yFinTabla + 4);
    ride_espacio($pdf, $altoBloque + 2, 262);
    $yBloque = $pdf->GetY();

    ride_info_box($pdf, RIDE_MARGEN, $yBloque, 102, $altoInfo, 'Información adicional', $filasInfo, $observacion);
    ride_forma_pago($pdf, RIDE_MARGEN, $yBloque + $altoInfo, 102, $altoPago, $formaPago !== '' ? $formaPago : 'SIN UTILIZACION DEL SISTEMA FINANCIERO');
    ride_totales_box($pdf, 116, $yBloque, 84, $altoBloque, $totales);
    $pdf->SetY($yBloque + $altoBloque);

    // ── PIE ───────────────────────────────────────────────────────────────────
    $prefijo = $reimpresoPor !== '' ? 'Reimpreso por: ' . $reimpresoPor : '';
    ride_pie_empresa($pdf, $empresa, $prefijo);
}

<?php
/**
 * Render del boleto de viaje en A4 con el formato RIDE del SRI.
 *
 * Recibe los datos ya consultados y dibuja el documento completo. No consulta
 * la base de datos: eso permite generar el mismo layout desde el visor y desde
 * cualquier proceso de impresión.
 */
require_once __DIR__ . '/ride_layout.php';

function render_boleto_a4($pdf, $boleto, $detalles, $empresa, $opciones = [])
{
    $leyenda = trim((string)($opciones['leyenda'] ?? ''));
    $textoRetirar = trim((string)($opciones['texto_retirar'] ?? ''));
    $formaPago = trim((string)($opciones['forma_pago'] ?? ''));

    $sucursalEmision = !empty($boleto['sucursal_emision_boleto']) ? $boleto['sucursal_emision_boleto'] : '001';
    $puntoEmision = !empty($boleto['punto_emision_boleto']) ? $boleto['punto_emision_boleto'] : '001';
    $secuencial = !empty($boleto['numero_boleto']) ? sprintf('%09s', $boleto['numero_boleto']) : '000000000';
    $numeroBoleto = "{$sucursalEmision}-{$puntoEmision}-{$secuencial}";

    $fechaSalidaRaw = !empty($boleto['fecha_cierre']) ? $boleto['fecha_cierre'] : ($boleto['fecha_salida'] ?? null);
    $fechaSalida = ride_fecha_hora($fechaSalidaRaw, 'd/m/Y');
    $horaSalida = limpiarTextoPdf($boleto['hora_origen_salida'] ?? ($boleto['hora_salida'] ?? ''), '');
    $fechaEmision = ride_fecha_hora($boleto['fecha_creacion_boleto'] ?? null);

    $estado = mb_strtoupper(limpiarTextoPdf($boleto['estado_boleto'] ?? '', 'EMITIDO'), 'UTF-8');
    $claveAcceso = trim((string)($boleto['clave_acceso_boletos'] ?? ''));
    $destinoGeneral = resolver_destino_general($boleto);
    $puntoFinal = trim((string)($boleto['punto_final_boleto'] ?? ''));

    $origen = limpiarTextoPdf($boleto['nombre_origen'] ?? '', '—');
    $bus = limpiarTextoPdf($boleto['disco_buses'] ?? '', '—');
    $placa = limpiarTextoPdf($boleto['placa_buses'] ?? '', '');
    $anden = limpiarTextoPdf($boleto['anden_sub_rutas'] ?? '', '');
    if ($anden === '') {
        $anden = limpiarTextoPdf($boleto['andes_rutas'] ?? '', '—');
    }
    $piso = limpiarTextoPdf($boleto['piso_sub_rutas'] ?? '', '');
    if ($piso === '') {
        $piso = limpiarTextoPdf($boleto['piso_rutas'] ?? '', '1');
    }
    $vendedor = limpiarTextoPdf($boleto['nombre_usuario'] ?? '', '—');

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
        'direccion_sucursal' => limpiarTextoPdf($boleto['sucursal_direccion'] ?? '', limpiarTextoPdf($boleto['nombre_sucursal'] ?? '', '')),
        'telefono' => $empresa['telefono_empresa'] ?? '',
        'correo' => $empresa['correo_empresa'] ?? '',
        'obligado_contabilidad' => $empresa['obligado_contabilidad'] ?? 'NO',
        'regimen' => $regimen,
        'contribuyente_especial' => $empresa['contribuyente_especial'] ?? '',
    ]);

    ride_caja_documento($pdf, 104, 10, 96, 62, [
        'ruc' => $empresa['ruc_empresa'] ?? '',
        'tipo' => 'BOLETO DE VIAJE',
        'numero' => $numeroBoleto,
        'autorizacion' => $claveAcceso,
        'fecha_autorizacion' => $fechaEmision,
        'etiqueta_fecha' => 'FECHA Y HORA DE EMISIÓN:',
        'ambiente' => ride_ambiente_sri($empresa['ambiente_sri'] ?? ''),
        'emision' => 'NORMAL',
        'clave' => $claveAcceso,
        'qr' => $claveAcceso !== '' ? $claveAcceso : $numeroBoleto,
    ]);

    // ── DATOS DEL PASAJERO / ADQUIRIENTE ──────────────────────────────────────
    $filasCliente = [
        [
            'label' => 'Razón Social / Nombres y Apellidos:',
            'valor' => mb_strtoupper(limpiarTextoPdf($boleto['nombres_boleto'] ?? '', 'CONSUMIDOR FINAL'), 'UTF-8'),
        ],
        [
            'label' => 'Identificación (RUC / C.I.):',
            'valor' => limpiarTextoPdf($boleto['identificacion_boleto'] ?? '', '—'),
            'label2' => 'Fecha de Emisión:',
            'valor2' => $fechaEmision !== '' ? $fechaEmision : '—',
        ],
        [
            'label' => 'Teléfono:',
            'valor' => limpiarTextoPdf($boleto['celular_boleto'] ?? '', '—'),
            'label2' => 'Estado del comprobante:',
            'valor2' => $estado,
        ],
    ];
    ride_caja_cliente($pdf, RIDE_MARGEN, 76, RIDE_ANCHO, $filasCliente, 22);

    if (strpos($estado, 'ANUL') !== false) {
        $pdf->SetFont('helvetica', 'B', 50);
        $anchoMarca = $pdf->GetStringWidth('ANULADO') + 6;
        $pdf->StartTransform();
        $pdf->Rotate(18, 105, 140);
        $pdf->SetAlpha(0.16);
        $pdf->SetTextColor(190, 30, 45);
        $pdf->SetXY(105 - ($anchoMarca / 2), 132);
        $pdf->Cell($anchoMarca, 16, 'ANULADO', 0, 0, 'C');
        $pdf->SetAlpha(1);
        $pdf->StopTransform();
        ride_texto_negro($pdf);
    }

    // ── DETALLE ───────────────────────────────────────────────────────────────
    $filasDetalle = [];
    $sumaPrecios = 0.0;
    $sumaDescuentos = 0.0;
    $sumaIva = 0.0;
    $sumaTotales = 0.0;

    foreach ($detalles as $detalle) {
        $asiento = str_pad((string)($detalle['asiento_boleto_detalle'] ?? '1'), 2, '0', STR_PAD_LEFT);
        $pasajero = mb_strtoupper(limpiarTextoPdf($detalle['nombre_cliente_boleto_detalle'] ?? '', limpiarTextoPdf($boleto['nombres_boleto'] ?? '', 'PASAJERO')), 'UTF-8');
        $destino = resolver_destino_pasajero($detalle, $destinoGeneral, $puntoFinal);
        $tarifa = limpiarTextoPdf($detalle['tarifa_boleto_detalle'] ?? '', 'Normal');

        $descripcion = $pasajero . ' - ' . $destino;
        if (strcasecmp($tarifa, 'Normal') !== 0) {
            $descripcion .= ' (' . mb_strtoupper($tarifa, 'UTF-8') . ')';
        }

        $precioUnitario = (float)($detalle['precio_boleto_detalle'] ?? 0);
        $precioAlimento = (float)($detalle['precio_alimento_boleto_detalle'] ?? 0);
        if ($precioAlimento > 0) {
            $descripcion .= ' + ALIMENTO';
        }
        if ($precioUnitario <= 0) {
            $precioUnitario = (float)($detalle['total_boleto_detalle'] ?? 0);
        }

        $descuento = (float)($detalle['descuento_boleto_detalle'] ?? 0);
        $iva = (float)($detalle['iva_boleto_detalle'] ?? 0);
        $totalDetalle = (float)($detalle['total_boleto_detalle'] ?? 0);
        if ($totalDetalle <= 0) {
            $totalDetalle = max(0, $precioUnitario - $descuento + $iva);
        }

        $sumaPrecios += $precioUnitario;
        $sumaDescuentos += $descuento;
        $sumaIva += $iva;
        $sumaTotales += $totalDetalle;

        $filasDetalle[] = [
            'codigo' => 'BUT-' . $asiento,
            'cantidad' => '1',
            'descripcion' => $descripcion,
            'precio' => ride_moneda($precioUnitario),
            'descuento' => ride_moneda($descuento),
            'total' => ride_moneda($totalDetalle),
        ];
    }

    if (empty($filasDetalle)) {
        $totalBoleto = (float)($boleto['total_boleto'] ?? 0);
        $filasDetalle[] = [
            'codigo' => 'BUT-01',
            'cantidad' => '1',
            'descripcion' => mb_strtoupper(limpiarTextoPdf($boleto['nombres_boleto'] ?? '', 'PASAJERO'), 'UTF-8') . ' - ' . $destinoGeneral,
            'precio' => ride_moneda($totalBoleto),
            'descuento' => ride_moneda(0),
            'total' => ride_moneda($totalBoleto),
        ];
        $sumaPrecios = $totalBoleto;
        $sumaTotales = $totalBoleto;
    }

    $columnasDetalle = [
        ['titulo' => 'CÓDIGO', 'clave' => 'codigo', 'ancho' => 22, 'alineacion' => 'C'],
        ['titulo' => 'CANT.', 'clave' => 'cantidad', 'ancho' => 14, 'alineacion' => 'C'],
        ['titulo' => 'DESCRIPCIÓN', 'clave' => 'descripcion', 'ancho' => 78, 'alineacion' => 'L'],
        ['titulo' => 'PRECIO UNIT.', 'clave' => 'precio', 'ancho' => 26, 'alineacion' => 'R'],
        ['titulo' => 'DESCUENTO', 'clave' => 'descuento', 'ancho' => 24, 'alineacion' => 'R'],
        ['titulo' => 'PRECIO TOTAL', 'clave' => 'total', 'ancho' => 26, 'alineacion' => 'R'],
    ];

    $yTabla = 102;
    $pdf->SetY($yTabla);
    $yFinTabla = ride_tabla_detalle($pdf, RIDE_MARGEN, $yTabla, $columnasDetalle, $filasDetalle, 252);

    // ── PRODUCTOS A RETIRAR ───────────────────────────────────────────────────
    $y = $yFinTabla + 4;
    if ($textoRetirar !== '') {
        $pdf->SetY($y);
        ride_espacio($pdf, 14, 258);
        $y = $pdf->GetY();
        ride_fill($pdf, '255,248,214');
        ride_color($pdf, '214,178,60');
        $pdf->SetLineWidth(0.35);
        $pdf->SetXY(RIDE_MARGEN, $y);
        $pdf->SetFont('helvetica', 'B', 9.2);
        ride_texto_negro($pdf);
        $pdf->Cell(RIDE_ANCHO, 9, '*** RETIRAR ' . mb_strtoupper($textoRetirar, 'UTF-8') . ' ***', 1, 1, 'C', true);
        $pdf->SetDrawColor(170, 180, 195);
        $y = $pdf->GetY() + 4;
    }

    // ── INFORMACIÓN ADICIONAL + TOTALES ───────────────────────────────────────
    $observacion = limpiarTextoPdf($boleto['observacion_boleto'] ?? '', '');
    $observacion = trim(str_replace('[SRI_DIRECTO]', '', $observacion));
    if ($observacion === '') {
        $observacion = $leyenda;
    }

    $filasInfo = [
        ['Origen / Salida:', $origen],
        ['Destino:', $destinoGeneral !== '' ? $destinoGeneral : '—'],
        ['Fecha / Hora:', trim($fechaSalida . ' ' . $horaSalida)],
        ['Bus / Disco:', trim($bus . ($placa !== '' ? '  ·  Placa ' . $placa : ''))],
        ['Andén / Piso:', trim('Andén ' . $anden . '  ·  Piso ' . $piso)],
        ['Vendido por:', $vendedor],
    ];

    $baseGravada = max(0, $sumaPrecios - $sumaDescuentos);
    $totalBoleto = (float)($boleto['total_boleto'] ?? 0);
    if ($totalBoleto <= 0) {
        $totalBoleto = $sumaTotales;
    }

    $totales = [
        ['label' => 'SUBTOTAL 15% (o 12%):', 'valor' => ride_moneda($baseGravada)],
        ['label' => 'SUBTOTAL 0%:', 'valor' => ride_moneda(0)],
        ['label' => 'SUBTOTAL NO OBJETO DE IVA:', 'valor' => ride_moneda(0)],
        ['label' => 'SUBTOTAL EXENTO DE IVA:', 'valor' => ride_moneda(0)],
        ['label' => 'SUBTOTAL SIN IMPUESTOS:', 'valor' => ride_moneda($baseGravada)],
        ['label' => 'TOTAL DESCUENTO:', 'valor' => ride_moneda($sumaDescuentos)],
        ['label' => 'I.V.A.:', 'valor' => ride_moneda($sumaIva)],
    ];

    // Alimentos u otros valores que el boleto suma y no vienen en el detalle.
    $adicionales = round($totalBoleto - ($baseGravada + $sumaIva), 2);
    if ($adicionales > 0.009) {
        $totales[] = ['label' => 'ALIMENTOS / ADICIONALES:', 'valor' => ride_moneda($adicionales)];
    }

    $totales[] = ['label' => 'VALOR TOTAL:', 'valor' => ride_moneda($totalBoleto), 'destacado' => true];

    $altoInfo = 6.8 + (count($filasInfo) * 4.3) + ($observacion !== '' ? 7.2 : 0) + 2.0;
    $altoPago = 8.2;
    $altoTotales = (2.2 * 3) + (count($totales) - 1) * 4.2 + 5.6;
    $altoBloque = max($altoInfo + $altoPago, $altoTotales);
    $altoInfo = max($altoInfo, $altoBloque - $altoPago);

    $pdf->SetY($y);
    ride_espacio($pdf, $altoBloque + 2, 262);
    $yBloque = $pdf->GetY();

    ride_info_box($pdf, RIDE_MARGEN, $yBloque, 102, $altoInfo, 'Información adicional', $filasInfo, $observacion);
    ride_forma_pago($pdf, RIDE_MARGEN, $yBloque + $altoInfo, 102, $altoPago, $formaPago !== '' ? $formaPago : 'EFECTIVO');
    ride_totales_box($pdf, 116, $yBloque, 84, $altoBloque, $totales);
    $pdf->SetY($yBloque + $altoBloque);

    // ── PIE ───────────────────────────────────────────────────────────────────
    ride_pie_empresa($pdf, $empresa);
}

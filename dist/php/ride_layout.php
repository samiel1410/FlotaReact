<?php
/**
 * Bloques reutilizables para los comprobantes A4 con formato RIDE del SRI.
 *
 * Se usan en el boleto de viaje (boletoFacturaA4.php) y en la guía de remisión
 * (guiaPdf.php). Todos los bloques se dibujan con métodos nativos de TCPDF.
 */

define('RIDE_MARGEN', 10.0);
define('RIDE_ANCHO', 190.0);
define('RIDE_NAVY', '23,55,94');
define('RIDE_BORDE', '120,135,155');
define('RIDE_GRIS', '242,246,250');

function ride_color($pdf, $rgb)
{
    [$r, $g, $b] = array_map('intval', explode(',', $rgb));
    $pdf->SetDrawColor($r, $g, $b);
    $pdf->SetTextColor($r, $g, $b);
}

function ride_fill($pdf, $rgb)
{
    [$r, $g, $b] = array_map('intval', explode(',', $rgb));
    $pdf->SetFillColor($r, $g, $b);
}

function ride_texto_negro($pdf)
{
    $pdf->SetTextColor(0, 0, 0);
}

function ride_moneda($valor)
{
    return '$' . number_format((float)$valor, 2, '.', ',');
}

/**
 * Recorta un texto para que no exceda el ancho disponible con la fuente actual.
 */
function ride_recortar($pdf, $texto, $anchoMm)
{
    $texto = trim(str_replace(["\r\n", "\r", "\n"], ' ', (string)$texto));
    if ($texto === '' || $anchoMm <= 0) {
        return '';
    }
    if ($pdf->GetStringWidth($texto) <= $anchoMm) {
        return $texto;
    }
    $sufijo = '...';
    $limite = $anchoMm - $pdf->GetStringWidth($sufijo);
    while ($texto !== '' && $pdf->GetStringWidth($texto) > $limite) {
        $texto = mb_substr($texto, 0, -1, 'UTF-8');
    }
    return rtrim($texto) . $sufijo;
}

function ride_fecha_hora($fecha, $formato = 'd/m/Y H:i:s')
{
    if (empty($fecha) || $fecha === '0000-00-00' || $fecha === '0000-00-00 00:00:00') {
        return '';
    }
    $ts = strtotime($fecha);
    return $ts ? date($formato, $ts) : (string)$fecha;
}

function ride_ambiente_sri($valor)
{
    $valor = strtoupper(trim((string)$valor));
    if ($valor === '1' || strpos($valor, 'PRUEBA') !== false) {
        return 'PRUEBAS';
    }
    return 'PRODUCCIÓN';
}

/**
 * Caja superior izquierda: datos de la empresa emisora.
 *
 * @param array $empresa claves: razon_social, ruc, direccion_matriz, direccion_sucursal,
 *                       telefono, correo, obligado_contabilidad, regimen
 */
function ride_caja_empresa($pdf, $x, $y, $w, $h, $empresa)
{
    $pdf->SetLineWidth(0.3);
    ride_color($pdf, RIDE_BORDE);
    ride_texto_negro($pdf);
    $pdf->Rect($x, $y, $w, $h, 'D');

    $ix = $x + 3;
    $iw = $w - 6;

    // Logo de la empresa (opcional). Se dibuja arriba y se descuenta del alto
    // para que el texto siga centrado y nunca se sobreponga.
    $rutaLogo = $empresa['logo'] ?? null;
    $logoW = 0.0;
    $logoH = 0.0;
    if (!empty($rutaLogo) && @is_file($rutaLogo)) {
        $infoLogo = @getimagesize($rutaLogo);
        if ($infoLogo && !empty($infoLogo[0]) && !empty($infoLogo[1])) {
            $logoW = min($iw * 0.75, 40.0);
            $logoH = ($infoLogo[1] / $infoLogo[0]) * $logoW;
            if ($logoH > 16.0) {
                $logoH = 16.0;
                $logoW = ($infoLogo[0] / $infoLogo[1]) * $logoH;
            }
        }
    }

    $razonSocial = mb_strtoupper((string)($empresa['razon_social'] ?? 'EMPRESA'), 'UTF-8');
    $lineas = [
        ['Dirección Matriz:', (string)($empresa['direccion_matriz'] ?? ''), 30],
        ['Dirección Sucursal:', (string)($empresa['direccion_sucursal'] ?? ''), 33],
        ['Teléfono:', (string)($empresa['telefono'] ?? ''), 18],
    ];
    if (!empty($empresa['correo'])) {
        $lineas[] = ['Correo:', (string)$empresa['correo'], 18];
    }
    $lineas = array_values(array_filter($lineas, fn($l) => trim($l[1]) !== ''));

    $regimen = trim((string)($empresa['regimen'] ?? ''));
    $especial = trim((string)($empresa['contribuyente_especial'] ?? ''));
    if (in_array(strtoupper($especial), ['NO', '0', 'FALSE'], true)) {
        $especial = '';
    }
    $obligado = !empty($empresa['obligado_contabilidad']) ? strtoupper((string)$empresa['obligado_contabilidad']) : 'NO';

    // Altura real del contenido para centrarlo verticalmente en la caja.
    $pdf->SetFont('helvetica', 'B', 10.2);
    $altoContenido = $pdf->getStringHeight($iw, $razonSocial) + 1.6;
    if ($logoH > 0) {
        $altoContenido += $logoH + 2.0;
    }
    foreach ($lineas as $linea) {
        $pdf->SetFont('helvetica', '', 7.2);
        $altoContenido += max(4.2, $pdf->getStringHeight($iw - $linea[2], $linea[1]) + 0.8);
    }
    $altoContenido += 4.4;
    if ($regimen !== '') {
        $altoContenido += 4.4;
    }
    if ($especial !== '') {
        $altoContenido += 4.4;
    }

    $cy = $y + max(2.8, ($h - $altoContenido) / 2);

    if ($logoH > 0) {
        $pdf->Image($rutaLogo, $x + ($w - $logoW) / 2, $cy, $logoW, $logoH, '', '', 'T', false, 300, 'C');
        $cy += $logoH + 2.0;
    }

    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 10.2);
    $pdf->MultiCell($iw, 4.4, $razonSocial, 0, 'C', false, 1);
    $cy = $pdf->GetY() + 1.6;

    foreach ($lineas as $linea) {
        $pdf->SetXY($ix, $cy);
        $pdf->SetFont('helvetica', 'B', 7.2);
        $pdf->Cell($linea[2], 3.9, $linea[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.2);
        $pdf->MultiCell($iw - $linea[2], 3.4, $linea[1], 0, 'L', false, 1, $ix + $linea[2], $cy);
        $cy = max($cy + 4.2, $pdf->GetY() + 0.8);
    }

    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 7.2);
    $pdf->Cell($iw, 3.9, 'OBLIGADO A LLEVAR CONTABILIDAD: ' . $obligado, 0, 1, 'L');
    $cy += 4.4;

    if ($regimen !== '') {
        $pdf->SetXY($ix, $cy);
        $pdf->SetFont('helvetica', 'B', 7.2);
        $pdf->Cell($iw, 3.9, 'CONTRIBUYENTE ' . mb_strtoupper($regimen, 'UTF-8'), 0, 1, 'C');
        $cy += 4.4;
    }

    if ($especial !== '') {
        $pdf->SetXY($ix, $cy);
        $pdf->SetFont('helvetica', 'B', 7.2);
        $pdf->MultiCell($iw, 3.4, 'CONTRIBUYENTE ESPECIAL: ' . mb_strtoupper($especial, 'UTF-8'), 0, 'C', false, 1);
    }
}

/**
 * Caja superior derecha: identificación del comprobante electrónico + QR.
 *
 * @param array $doc claves: ruc, tipo, numero, autorizacion, fecha_autorizacion,
 *                   ambiente, emision, clave, qr
 */
function ride_caja_documento($pdf, $x, $y, $w, $h, $doc)
{
    $pdf->SetLineWidth(0.3);
    ride_color($pdf, RIDE_BORDE);
    ride_texto_negro($pdf);
    $pdf->Rect($x, $y, $w, $h, 'D');

    $ix = $x + 2.5;
    $iw = $w - 5;
    $cy = $y + 2.5;

    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 7.4);
    $pdf->Cell(12, 3.8, 'R.U.C.:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 8.4);
    $pdf->Cell($iw - 12, 3.8, (string)($doc['ruc'] ?? ''), 0, 1, 'L');

    $cy += 5;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 12.5);
    $pdf->Cell($iw, 5.5, (string)($doc['tipo'] ?? 'COMPROBANTE'), 0, 1, 'L');

    $cy += 6.2;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 7.4);
    $pdf->Cell(10, 4, 'No.', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 9.6);
    $pdf->Cell($iw - 10, 4, (string)($doc['numero'] ?? ''), 0, 1, 'L');

    $anchoTexto = $iw - 25; // espacio reservado para el QR
    $cy += 5.4;

    $autorizacion = trim((string)($doc['autorizacion'] ?? ''));
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 6.4);
    $pdf->Cell($anchoTexto, 3.2, (string)($doc['etiqueta_autorizacion'] ?? 'NÚMERO DE AUTORIZACIÓN:'), 0, 1, 'L');
    $cy += 3.1;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', '', 5.7);
    $pdf->MultiCell($anchoTexto, 2.7, $autorizacion !== '' ? $autorizacion : 'PENDIENTE DE AUTORIZACIÓN', 0, 'L', false, 1);

    $cy = max($cy + 3.4, $pdf->GetY() + 0.6);
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 6.2);
    $pdf->Cell(40, 3.2, (string)($doc['etiqueta_fecha'] ?? 'FECHA Y HORA DE AUTORIZACIÓN:'), 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 6.2);
    $pdf->Cell($anchoTexto - 40, 3.2, (string)($doc['fecha_autorizacion'] ?? ''), 0, 1, 'L');

    $cy += 3.9;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 6.5);
    $pdf->Cell(19, 3.2, 'AMBIENTE:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell(35, 3.2, (string)($doc['ambiente'] ?? 'PRODUCCIÓN'), 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 6.5);
    $pdf->Cell(17, 3.2, 'EMISIÓN:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 6.5);
    $pdf->Cell($iw - 71, 3.2, (string)($doc['emision'] ?? 'NORMAL'), 0, 1, 'L');

    $clave = trim((string)($doc['clave'] ?? ''));
    $cy += 4.1;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', 'B', 6.4);
    $pdf->Cell($anchoTexto, 3.2, 'CLAVE DE ACCESO:', 0, 1, 'L');
    $cy += 3.1;
    $pdf->SetXY($ix, $cy);
    $pdf->SetFont('helvetica', '', 5.7);
    $pdf->MultiCell($anchoTexto, 2.7, $clave !== '' ? $clave : (string)($doc['numero'] ?? ''), 0, 'L', false, 1);

    $qr = trim((string)($doc['qr'] ?? ''));
    if ($qr === '') {
        $qr = $clave;
    }
    if ($qr !== '') {
        $tamQr = 19.0;
        $estiloQr = [
            'border' => false,
            'padding' => 0,
            'fgcolor' => [0, 0, 0],
            'bgcolor' => false,
        ];
        $pdf->write2DBarcode($qr, 'QRCODE,L', $x + $w - $tamQr - 3, $y + $h - $tamQr - 3, $tamQr, $tamQr, $estiloQr, 'N');
    }
}

/**
 * Caja de datos del cliente.
 *
 * @param array $filas cada fila: ['label' => ..., 'valor' => ..., 'label2' => ..., 'valor2' => ...]
 */
function ride_caja_cliente($pdf, $x, $y, $w, $filas, $alto)
{
    $pdf->SetLineWidth(0.3);
    ride_color($pdf, RIDE_BORDE);
    ride_texto_negro($pdf);
    $pdf->Rect($x, $y, $w, $alto, 'D');

    $cy = $y + 2.6;
    $colIzq = ($w - 6) * 0.55;
    $colDer = ($w - 6) - $colIzq;
    $mitad = $x + 3 + $colIzq;

    foreach ($filas as $fila) {
        $conSegunda = isset($fila['label2']);

        $labelW = $conSegunda ? 42.0 : 52.0;
        $pdf->SetXY($x + 3, $cy);
        $pdf->SetFont('helvetica', 'B', 7.6);
        $pdf->Cell($labelW, 4.4, $fila['label'], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.6);
        $anchoValor = ($conSegunda ? $colIzq : ($w - 6)) - $labelW;
        $pdf->Cell($anchoValor, 4.4, ride_recortar($pdf, $fila['valor'], $anchoValor - 1), 0, 0, 'L');

        if ($conSegunda) {
            $pdf->SetFont('helvetica', 'B', 7.6);
            $pdf->Cell(34, 4.4, $fila['label2'], 0, 0, 'L');
            $pdf->SetFont('helvetica', '', 7.6);
            $pdf->Cell($colDer - 34, 4.4, ride_recortar($pdf, $fila['valor2'], $colDer - 35), 0, 0, 'L');
        }
        $cy += 4.9;
    }
}

/**
 * Tabla de detalle con cabecera azul y filas que ajustan su alto al contenido.
 *
 * @param array $columnas [['titulo','clave','ancho','alineacion']]
 * @param array $filas    filas asociativas
 * @return float Y final de la tabla
 */
function ride_tabla_detalle($pdf, $x, $y, $columnas, $filas, $yMax = 258)
{
    $dibujarCabecera = function ($yy) use ($pdf, $x, $columnas) {
        ride_fill($pdf, RIDE_NAVY);
        ride_color($pdf, RIDE_NAVY);
        $pdf->SetFont('helvetica', 'B', 7.6);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetXY($x, $yy);
        foreach ($columnas as $col) {
            $pdf->Cell($col['ancho'], 8.6, $col['titulo'], 1, 0, $col['alineacion'] ?? 'C', true);
        }
        ride_texto_negro($pdf);
        $pdf->SetDrawColor(170, 180, 195);
        $pdf->SetY($yy + 8.6);
        return $yy + 8.6;
    };

    $y = $dibujarCabecera($y);
    $pdf->SetDrawColor(170, 180, 195);
    $pdf->SetLineWidth(0.25);

    foreach ($filas as $fila) {
        $pdf->SetFont('helvetica', '', 7.4);
        $altura = 7.2;
        foreach ($columnas as $col) {
            $texto = (string)($fila[$col['clave']] ?? '');
            if ($texto === '') {
                continue;
            }
            $altoTexto = $pdf->getStringHeight($col['ancho'] - 2.4, $texto);
            if ($altoTexto + 2.2 > $altura) {
                $altura = $altoTexto + 2.2;
            }
        }
        $altura = max(7.2, min($altura, 20));

        if ($y + $altura > $yMax) {
            $pdf->AddPage();
            $y = $dibujarCabecera(RIDE_MARGEN);
            $pdf->SetDrawColor(170, 180, 195);
        }

        $cx = $x;
        $pdf->SetFont('helvetica', '', 7.4);
        foreach ($columnas as $col) {
            $texto = (string)($fila[$col['clave']] ?? '');
            $pdf->MultiCell(
                $col['ancho'],
                $altura,
                $texto,
                1,
                $col['alineacion'] ?? 'L',
                false,
                0,
                $cx,
                $y,
                true,
                0,
                false,
                true,
                $altura,
                'M'
            );
            $cx += $col['ancho'];
        }
        $y += $altura;
        $pdf->SetY($y);
    }

    return $y;
}

/**
 * Bloque "INFORMACIÓN ADICIONAL" (titulo azul + filas etiqueta/valor).
 */
function ride_info_box($pdf, $x, $y, $w, $h, $titulo, $filas, $observacion = '')
{
    $pdf->SetLineWidth(0.3);
    ride_color($pdf, RIDE_BORDE);
    ride_texto_negro($pdf);
    $pdf->Rect($x, $y, $w, $h, 'D');

    ride_fill($pdf, RIDE_NAVY);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 7.6);
    $pdf->SetXY($x, $y);
    $pdf->Cell($w, 6.8, '  ' . mb_strtoupper($titulo, 'UTF-8'), 0, 1, 'L', true);
    ride_texto_negro($pdf);

    $cy = $y + 8.6;
    $labelW = 33.0;
    foreach ($filas as $fila) {
        $pdf->SetXY($x + 2.2, $cy);
        $pdf->SetFont('helvetica', 'B', 7.1);
        $pdf->Cell($labelW, 4.2, $fila[0], 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 7.1);
        $pdf->Cell($w - $labelW - 3.4, 4.2, ride_recortar($pdf, $fila[1], $w - $labelW - 4.4), 0, 0, 'L');
        $cy += 4.3;
    }

    if ($observacion !== '') {
        // Se limita a dos líneas para no desbordar el recuadro.
        $maxCaracteres = max(40, (int)(($w - $labelW - 8) / 1.35) * 2);
        $observacion = mb_strimwidth(trim($observacion), 0, $maxCaracteres, '...', 'UTF-8');

        $pdf->SetXY($x + 2.2, $cy);
        $pdf->SetFont('helvetica', 'B', 7.1);
        $pdf->Cell($labelW, 3.8, 'Observaciones:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 6.9);
        $pdf->MultiCell($w - $labelW - 4.4, 3.2, $observacion, 0, 'L', false, 1, $x + 2.2 + $labelW, $cy);
    }
}

/**
 * Franja "FORMA DE PAGO".
 */
function ride_forma_pago($pdf, $x, $y, $w, $h, $texto)
{
    $pdf->SetLineWidth(0.3);
    ride_color($pdf, RIDE_BORDE);
    ride_texto_negro($pdf);
    $pdf->Rect($x, $y, $w, $h, 'D');

    $pdf->SetXY($x + 2.2, $y + 1.4);
    $pdf->SetFont('helvetica', 'B', 7.4);
    $pdf->Cell(28, 4.4, 'FORMA DE PAGO:', 0, 0, 'L');
    $pdf->SetFont('helvetica', '', 7.4);
    $pdf->Cell($w - 32, 4.4, ride_recortar($pdf, $texto, $w - 34), 0, 0, 'L');
}

/**
 * Caja de totales. La última fila con 'destacado' => true se resalta.
 *
 * @param array $totales [['label' => ..., 'valor' => ..., 'destacado' => bool]]
 */
function ride_totales_box($pdf, $x, $y, $w, $h, $totales)
{
    ride_fill($pdf, RIDE_GRIS);
    ride_color($pdf, RIDE_BORDE);
    $pdf->SetLineWidth(0.3);
    $pdf->Rect($x, $y, $w, $h, 'DF');

    $totalFilas = max(1, count($totales));
    $altoFila = ($h - 4.4 - 5.6) / $totalFilas;
    $altoFila = max(4.2, min(6.4, $altoFila));

    $cy = $y + 2.2;
    foreach ($totales as $fila) {
        $destacado = !empty($fila['destacado']);
        if ($destacado) {
            ride_color($pdf, RIDE_NAVY);
            $pdf->Line($x, $cy + 0.6, $x + $w, $cy + 0.6);
            $cy += 2.2;
        }
        $pdf->SetXY($x + 2.4, $cy);
        $pdf->SetFont('helvetica', $destacado ? 'B' : '', $destacado ? 8.8 : 7.2);
        ride_texto_negro($pdf);
        $pdf->Cell($w * 0.58, $altoFila - 0.6, ' ' . $fila['label'], 0, 0, 'L');
        $pdf->Cell($w * 0.42 - 2.4, $altoFila - 0.6, $fila['valor'], 0, 0, 'R');
        $cy += $destacado ? 5.6 : $altoFila;
    }
}

/**
 * Pie R.I.D.E. que se fija al final de la última página.
 */
function ride_pie($pdf, $generadoPor)
{
    $y = $pdf->getPageHeight() - 22;
    ride_fill($pdf, RIDE_GRIS);
    ride_color($pdf, RIDE_BORDE);
    $pdf->SetLineWidth(0.3);
    $pdf->Rect(RIDE_MARGEN, $y, RIDE_ANCHO, 14, 'DF');

    ride_texto_negro($pdf);
    $pdf->SetXY(RIDE_MARGEN, $y + 1.4);
    $pdf->SetFont('helvetica', 'B', 7.6);
    $pdf->Cell(RIDE_ANCHO, 4, 'DOCUMENTO TRIBUTARIO ELECTRÓNICO (R.I.D.E.)', 0, 1, 'C');

    $pdf->SetX(RIDE_MARGEN);
    $pdf->SetFont('helvetica', '', 6.6);
    $pdf->Cell(RIDE_ANCHO, 3.4, 'Consulte la validez y autorización de este comprobante en el portal del SRI (www.sri.gob.ec).', 0, 1, 'C');

    $pdf->SetX(RIDE_MARGEN);
    $tamano = 6.6;
    $pdf->SetFont('helvetica', '', $tamano);
    while ($tamano > 5.0 && $pdf->GetStringWidth($generadoPor) > (RIDE_ANCHO - 4)) {
        $tamano -= 0.2;
        $pdf->SetFont('helvetica', '', $tamano);
    }
    $pdf->Cell(RIDE_ANCHO, 3.4, $generadoPor, 0, 1, 'C');

    $pdf->SetY($y - 1);
}

/**
 * Pie con los datos de la empresa emisora en lugar de la marca del sistema.
 */
function ride_pie_empresa($pdf, $empresa, $prefijo = '')
{
    $partes = [];

    if ($prefijo !== '') {
        $partes[] = $prefijo;
    }

    $razonSocial = mb_strtoupper(trim((string)($empresa['razon_social_empresa'] ?? '')), 'UTF-8');
    if ($razonSocial !== '') {
        $partes[] = $razonSocial;
    }
    if (!empty($empresa['ruc_empresa'])) {
        $partes[] = 'RUC: ' . $empresa['ruc_empresa'];
    }
    if (!empty($empresa['telefono_empresa'])) {
        $partes[] = 'Tel: ' . $empresa['telefono_empresa'];
    }
    $partes[] = 'Fecha: ' . date('d/m/Y, g:i:s A');

    ride_pie($pdf, implode('  |  ', $partes));
}

/**
 * Asegura espacio vertical antes de dibujar un bloque; si no cabe, abre página.
 */
function ride_espacio($pdf, $alto, $yMax = 262)
{
    if ($pdf->GetY() + $alto > $yMax) {
        $pdf->AddPage();
    }
}

/**
 * ¿Existe la columna? Evita que un tenant con una migración pendiente rompa el PDF.
 */
function ride_existe_columna($conn, $tabla, $columna)
{
    static $cache = [];
    $clave = $tabla . '.' . $columna;
    if (array_key_exists($clave, $cache)) {
        return $cache[$clave];
    }
    $cache[$clave] = false;
    $tablaSegura = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
    $columnaSegura = preg_replace('/[^a-zA-Z0-9_]/', '', $columna);
    try {
        $res = @mysqli_query($conn, "SHOW COLUMNS FROM `{$tablaSegura}` LIKE '{$columnaSegura}'");
        if ($res && mysqli_num_rows($res) > 0) {
            $cache[$clave] = true;
        }
    } catch (Throwable $e) {
        $cache[$clave] = false;
    }
    return $cache[$clave];
}

/**
 * SELECT de la empresa tolerante a columnas inexistentes en bases antiguas.
 */
function ride_select_empresa($conn)
{
    $columnas = ['id_empresa', 'telefono_empresa', 'correo_empresa', 'ruc_empresa', 'direccion_empresa', 'razon_social_empresa'];
    foreach (['obligado_contabilidad', 'regimen_fiscal', 'contribuyente_especial', 'ambiente_sri'] as $opcional) {
        $columnas[] = ride_existe_columna($conn, 'empresa', $opcional) ? $opcional : "NULL AS {$opcional}";
    }
    return 'SELECT ' . implode(', ', $columnas) . ' FROM empresa LIMIT 1';
}

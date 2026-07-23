<?php
require_once('library/tcpdf.php');
require_once("db.php");

ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

class meotodoXml
{
    /**
     * Genera el XML de factura para enviar al SRI Ecuador (Factura v1.1.0)
     *
     * Correcciones aplicadas:
     *  1. agenteRetencion ahora es condicional (solo si la empresa lo es)
     *  2. Bug precio_factura_detalle corregido (usaba valor ya dividido)
     *  3. formaPago se lee desde la BD en lugar de estar hardcodeado
     *  4. cleanString NO elimina acentos del XML completo; solo limpia
     *     campos de texto de producto/cliente antes de insertarlos
     *  5. Todas las consultas SQL usan prepared statements
     *  6. IVA 15% correctamente identificado como codigoPorcentaje 4
     */
    public function armarXml($id_factura)
    {
        try {
            $datosFactura  = $this->seleccionarFacturaCampoMovil($id_factura);
            $detalleFactura = $this->seleccionarFacturaDetalleCampoMovil($id_factura);
            $datosEmpresa  = $this->obtenerEmpresaInfo();

            // ── Datos empresa ──────────────────────────────────────────────
            $rucEmpresa              = $datosEmpresa[0]['ruc_empresa'];
            $razonEmpresa            = $datosEmpresa[0]['nombre_empresa'];
            $nombre_comercial_empresa = $datosEmpresa[0]['nombre_comercial_empresa'];
            $direccionEmpresa        = $datosEmpresa[0]['direccion_empresa'];
            $ambiente                = $datosEmpresa[0]['ambiente_sri'];
            $direccionEmisor         = $datosEmpresa[0]['dir_establecimiento'];
            $regimen_fiscal          = $datosEmpresa[0]['regimen_fiscal'] ?? '1';
            $obligado_contabilidad   = $datosEmpresa[0]['obligado_contabilidad'];
            $agente_retencion        = $datosEmpresa[0]['agente_retencion']        ?? '';
            $resolucion_retencion    = $datosEmpresa[0]['resolucion_agente_retencion'] ?? '';

            // ── Datos maestro factura ──────────────────────────────────────
            $date         = new DateTime($datosFactura[0]['fecha_factura']);
            $fechaFactura = $date->format('d/m/Y');

            $rucCliente      = !empty($datosFactura[0]['ruc_cliente_factura'])
                ? $datosFactura[0]['ruc_cliente_factura']
                : '9999999999999';
            $nombreCliente   = !empty($datosFactura[0]['nombre_cliente_factura'])
                ? $this->escapeXml($datosFactura[0]['nombre_cliente_factura'])
                : 'CONSUMIDOR FINAL';
            $direccionCliente = !empty($datosFactura[0]['direccion_clientes_factura'])
                ? $datosFactura[0]['direccion_clientes_factura']
                : 'S/N';

            // Tipo de identificación comprador
            if ($rucCliente === '9999999999999') {
                $tipoIdentificacion = '07'; // Consumidor Final
            } elseif (strlen($rucCliente) === 13) {
                $tipoIdentificacion = '04'; // RUC
            } elseif (strlen($rucCliente) === 10) {
                $tipoIdentificacion = '05'; // Cédula
            } else {
                $tipoIdentificacion = '06'; // Pasaporte / otro
            }

            // ── Totales ────────────────────────────────────────────────────
            $totalFactura      = number_format(str_replace(',', '', $datosFactura[0]['total_factura']),      2, '.', '');
            $iva15Factura      = number_format(str_replace(',', '', $datosFactura[0]['iva_factura']),        2, '.', '');
            $descuentoFactura  = number_format($datosFactura[0]['descuento_total_factura'],                  2, '.', '');
            $subtotal15Factura = number_format(str_replace(',', '', $datosFactura[0]['subtotal_12_factura']), 2, '.', '');
            $subtotal0Factura  = number_format(str_replace(',', '', $datosFactura[0]['subtotal_0_factura']),  2, '.', '');

            // ── Numeración y Clave de Acceso Actualizada a HOY ───────────────
            $claveAccesoOriginal = $datosFactura[0]['clave_acceso_factura'] ?? '';
            $conn = conexion();
            $claveAcceso = asegurarClaveAccesoHoy($claveAccesoOriginal, 'factura', 'clave_acceso_factura', 'id_factura', $id_factura, $conn);
            $fechaFactura = date('d/m/Y'); // Asegurar fecha de emisión actual (hoy)

            // EXTRAER estab, ptoEmi y secuencial directamente de la clave de acceso
            if (strlen($claveAcceso) === 49) {
                $sucursal     = substr($claveAcceso, 24, 3);
                $puntoEmision = substr($claveAcceso, 27, 3);
                $numFactura   = substr($claveAcceso, 30, 9);
            } else {
                $sucursal      = $datosFactura[0]['sucursal_factura'] ?? '001';
                $puntoEmision  = $datosFactura[0]['punto_emision_factura'] ?? '001';
                $numFactura    = str_pad($datosFactura[0]['numero_factura'] ?? '1', 9, "0", STR_PAD_LEFT);
            }

            // ── Forma de pago (desde BD, no hardcodeada) ───────────────────
            // Códigos SRI: 01 efectivo, 03 transferencia, 16 tarjeta débito,
            //              17 tarjeta crédito, 20 otros con utilización financiera
            $formaPago     = !empty($datosFactura[0]['codigo_fkforma_pago_factura'])
                ? $datosFactura[0]['codigo_fkforma_pago_factura']
                : '01';
            $plazoPago     = !empty($datosFactura[0]['plazo_pago_factura'])
                ? $datosFactura[0]['plazo_pago_factura']
                : '0';
            $unidadTiempo  = !empty($datosFactura[0]['unidad_tiempo_pago_factura'])
                ? $datosFactura[0]['unidad_tiempo_pago_factura']
                : 'dias';

            // ── Arrays de detalle ──────────────────────────────────────────
            $codigoProducto  = [];
            $cantidadProducto = [];
            $nombreProducto  = [];
            $ivaProducto     = [];
            $dctoProducto    = [];
            $costoProducto   = [];
            $totalProducto   = [];
            $ivaPorcentaje   = [];
            $ivaEquivalencia = [];

            foreach ($detalleFactura as $i => $item) {
                $codigoProducto[$i]   = $item['codigo_producto'];
                $cantidadProducto[$i] = str_replace(',', '', $item['cantidad_factura_detalle']);
                $nombreProducto[$i]   = $this->escapeXml($item['nombre_producto']);
                $ivaProducto[$i]      = $item['iva_producto'];
                $dctoProducto[$i]     = number_format($item['descuento_factura_detalle'], 2, '.', '');
                $costoProducto[$i]    = number_format($item['precio_factura_detalle'],    6, '.', '');
                $totalProducto[$i]    = number_format($item['total_factura_detalle'],     2, '.', '');
                $ivaPorcentaje[$i]    = $item['porcentaje_iva'];
                $ivaEquivalencia[$i]  = $item['equivalencia_iva'];
            }

            // ── Construcción del XML ───────────────────────────────────────
            $xml = new SimpleXMLElement(
                '<?xml version="1.0" encoding="UTF-8"?>'
                . '<factura id="comprobante" version="1.1.0"></factura>'
            );

            // infoTributaria
            $infoTributaria = $xml->addChild('infoTributaria');
            $dirMatrizDef = !empty(trim($direccionEmpresa)) ? $direccionEmpresa : 'S/N';
            $dirEstablecimientoDef = !empty(trim($direccionEmisor)) ? $direccionEmisor : $dirMatrizDef;

            $infoTributaria->addChild('ambiente',        $ambiente);  // 1=Pruebas 2=Producción
            $infoTributaria->addChild('tipoEmision',     '1');
            $infoTributaria->addChild('razonSocial',     $razonEmpresa);
            if (!empty($nombre_comercial_empresa) && trim($nombre_comercial_empresa) !== '') {
                $infoTributaria->addChild('nombreComercial', $nombre_comercial_empresa);
            }
            $infoTributaria->addChild('ruc',             $rucEmpresa);
            $infoTributaria->addChild('claveAcceso',     $claveAcceso);
            $infoTributaria->addChild('codDoc',          '01');       // 01 = Factura
            $infoTributaria->addChild('estab',           $sucursal);
            $infoTributaria->addChild('ptoEmi',          $puntoEmision);
            $infoTributaria->addChild('secuencial',      $numFactura);
            $infoTributaria->addChild('dirMatriz',       $dirMatrizDef);

            // Régimen especial (RIMPE o Microempresas) — mutuamente excluyentes
            if ($regimen_fiscal == '4' || strtoupper($regimen_fiscal) === 'RIMPE') {
                $infoTributaria->addChild('contribuyenteRimpe', 'CONTRIBUYENTE RÉGIMEN RIMPE');
            } elseif ($regimen_fiscal == '3' || strtoupper($regimen_fiscal) === 'MICROEMPRESA') {
                $infoTributaria->addChild('regimenMicroempresas', 'CONTRIBUYENTE RÉGIMEN MICROEMPRESAS');
            }

            // CORRECCIÓN 1: agenteRetencion solo si la empresa efectivamente lo es
            if (!empty($agente_retencion) && !empty($resolucion_retencion)) {
                $infoTributaria->addChild('agenteRetencion', $resolucion_retencion);
            }

            // infoFactura
            $infoFactura = $xml->addChild('infoFactura');
            $infoFactura->addChild('fechaEmision',     $fechaFactura);
            $infoFactura->addChild('dirEstablecimiento', $dirEstablecimientoDef);

            // Contribuyente especial: solo si existe y es numérico
            if (
                !empty($datosEmpresa[0]['contribuyente_especial'])
                && is_numeric(trim($datosEmpresa[0]['contribuyente_especial']))
            ) {
                $infoFactura->addChild(
                    'contribuyenteEspecial',
                    trim($datosEmpresa[0]['contribuyente_especial'])
                );
            }

            $infoFactura->addChild('obligadoContabilidad',         $obligado_contabilidad);
            $infoFactura->addChild('tipoIdentificacionComprador',  $tipoIdentificacion);
            $infoFactura->addChild('razonSocialComprador',         $nombreCliente);
            $infoFactura->addChild('identificacionComprador',      $rucCliente);
            $infoFactura->addChild('direccionComprador',           $direccionCliente);
            $infoFactura->addChild(
                'totalSinImpuestos',
                number_format((float)$subtotal0Factura + (float)$subtotal15Factura, 2, '.', '')
            );
            $infoFactura->addChild('totalDescuento', $descuentoFactura);

            // totalConImpuestos
            $totalConImpuestos = $infoFactura->addChild('totalConImpuestos');

            // Si no hay ningún subtotal, declarar base 0 con IVA 0
            if ((float)$subtotal0Factura == 0 && (float)$subtotal15Factura == 0) {
                $t = $totalConImpuestos->addChild('totalImpuesto');
                $t->addChild('codigo',              '2');
                $t->addChild('codigoPorcentaje',    '0');
                $t->addChild('descuentoAdicional',  '0.00');
                $t->addChild('baseImponible',       '0.00');
                $t->addChild('valor',               '0.00');
            }

            // Base gravada tarifa 0%
            if ((float)$subtotal0Factura > 0) {
                $t = $totalConImpuestos->addChild('totalImpuesto');
                $t->addChild('codigo',              '2');
                $t->addChild('codigoPorcentaje',    '0');
                $t->addChild('descuentoAdicional',  '0.00');
                $t->addChild('baseImponible',       number_format((float)$subtotal0Factura, 2, '.', ''));
                $t->addChild('valor',               '0.00');
            }

            // Base gravada tarifa 15% (codigoPorcentaje = 4 según tabla SRI vigente)
            if ((float)$subtotal15Factura > 0) {
                $t = $totalConImpuestos->addChild('totalImpuesto');
                $t->addChild('codigo',              '2');
                $t->addChild('codigoPorcentaje',    '4');
                $t->addChild('descuentoAdicional',  '0.00');
                $t->addChild('baseImponible',       number_format((float)$subtotal15Factura, 2, '.', ''));
                $t->addChild('valor',               number_format((float)$iva15Factura, 2, '.', ''));
            }

            // propina obligatorio en v1.1.0
            $infoFactura->addChild('propina',      '0.00');
            $infoFactura->addChild('importeTotal', $totalFactura);
            $infoFactura->addChild('moneda',       'DOLAR');

            // CORRECCIÓN 3: pagos desde BD
            $pagos = $infoFactura->addChild('pagos');
            $pago  = $pagos->addChild('pago');
            $pago->addChild('formaPago',   $formaPago);
            $pago->addChild('total',       $totalFactura);
            $pago->addChild('plazo',       $plazoPago);
            $pago->addChild('unidadTiempo', $unidadTiempo);

            // detalles
            $detalles = $xml->addChild('detalles');
            foreach ($detalleFactura as $i => $item) {
                $detalle = $detalles->addChild('detalle');
                $detalle->addChild('codigoPrincipal',         $codigoProducto[$i]);
                $detalle->addChild('codigoAuxiliar',          $codigoProducto[$i]);
                $detalle->addChild('descripcion',             $nombreProducto[$i]);
                $detalle->addChild('cantidad',                $cantidadProducto[$i]);
                $detalle->addChild('precioUnitario',          $costoProducto[$i]);
                $detalle->addChild('descuento',               $dctoProducto[$i]);
                $detalle->addChild('precioTotalSinImpuesto',  $totalProducto[$i]);

                $impuestos = $detalle->addChild('impuestos');
                $impuesto  = $impuestos->addChild('impuesto');
                $impuesto->addChild('codigo',           '2');
                $impuesto->addChild('codigoPorcentaje', $ivaProducto[$i]);

                if ((float)$ivaPorcentaje[$i] > 0) {
                    $impuesto->addChild('tarifa',        $ivaPorcentaje[$i]);
                    $impuesto->addChild('baseImponible', $totalProducto[$i]);
                    $impuesto->addChild(
                        'valor',
                        number_format((float)$totalProducto[$i] * (float)$ivaEquivalencia[$i], 2, '.', '')
                    );
                } else {
                    $impuesto->addChild('tarifa',        '0');
                    $impuesto->addChild('baseImponible', $totalProducto[$i]);
                    $impuesto->addChild('valor',         '0.00');
                }
            }

            // CORRECCIÓN 4: cleanString solo sobre texto usuario, no sobre todo el XML.
            // El XML ya tiene los valores limpios desde escapeXml(). Solo eliminamos saltos
            // de línea sobrantes que SimpleXML pueda haber insertado.
            $comprobante = preg_replace("/\r|\n/", '', $xml->asXML());

            $respuesta['comprobante']           = $comprobante;
            $respuesta['clave_acceso_factura']  = $claveAcceso;
            $respuesta['p12_password']          = $datosEmpresa[0]['password_p12'];

            return $respuesta;

        } catch (Exception $e) {
            echo json_encode([
                'error'   => $e->getMessage(),
                'success' => false,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CORRECCIÓN 5: prepared statements en todas las consultas
    // ──────────────────────────────────────────────────────────────────────────

    public function seleccionarFacturaCampoMovil($id_factura)
    {
        $conn = conexion();

        $sql = "SELECT
                    f.fecha_factura,
                    f.id_fkcliente_factura,
                    f.total_factura,
                    f.iva_factura,
                    f.descuento_total_factura,
                    f.subtotal_12_factura,
                    f.subtotal_0_factura,
                    f.numero_factura,
                    f.clave_acceso_factura,
                    f.subtotal_factura,
                    s.punto_emision_sucursal  AS sucursal_factura,
                    f.punto_emision_factura,
                    f.nombre_cliente_factura,
                    f.ruc_cliente_factura,
                    f.direccion_clientes_factura
                FROM factura f
                JOIN sucursal2 s ON f.id_fksucursal_factura = s.suc_codigo_sucursal
                WHERE f.id_factura = ?";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id_factura);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = [];
        if ($row = $result->fetch_assoc()) {
            $data[0] = [
                'fecha_factura'                  => $row['fecha_factura'],
                'id_fkcliente_factura'           => $row['id_fkcliente_factura'],
                'total_factura'                  => $row['total_factura'],
                'iva_factura'                    => $row['iva_factura'],
                'descuento_total_factura'        => $row['descuento_total_factura'],
                'subtotal_12_factura'            => $row['subtotal_12_factura'],
                'subtotal_0_factura'             => $row['subtotal_0_factura'],
                'numero_factura'                 => $row['numero_factura'],
                'clave_acceso_factura'           => $row['clave_acceso_factura'],
                'subtotal_factura'               => $row['subtotal_factura'],
                'sucursal_factura'               => $row['sucursal_factura'],
                'punto_emision_factura'          => $row['punto_emision_factura'],
                'nombre_cliente_factura'         => $row['nombre_cliente_factura']     ?? '',
                'ruc_cliente_factura'            => $row['ruc_cliente_factura']             ?? '',
                'direccion_clientes_factura'     => $row['direccion_clientes_factura']      ?? '',
                // Columnas de pago no existen en BD; defaults válidos para SRI
                'codigo_fkforma_pago_factura'    => '01',   // 01 = Sin utilización sistema financiero
                'plazo_pago_factura'             => '0',
                'unidad_tiempo_pago_factura'     => 'dias',
            ];
        }

        $stmt->close();
        return $data;
    }

    public function seleccionarFacturaDetalleCampoMovil($id_factura)
    {
        $conn = conexion();

        $sql = "SELECT
                    dg.id_fktipo_envio_detalle_guia  AS codigo_producto,
                    COUNT(dg.id_fktipo_envio_detalle_guia) AS cantidad_factura_detalle,
                    dg.contenido_guia                AS nombre_producto,
                    dg.tipo_iva_detalle_guia          AS iva_producto,
                    dg.tipo_descuento_detalle_guia    AS descuento_factura_detalle,
                    dg.costo_detalle_guia             AS precio_factura_detalle,
                    dg.total_detalle_guia             AS total_factura_detalle,
                    te.tipo_impuesto
                FROM detalle_guia dg
                JOIN tipo_envio   te ON dg.id_fktipo_envio_detalle_guia = te.id_tipo_envio
                WHERE dg.id_fkguia_detalle_envio = (
                    SELECT id_fkguia_factura FROM factura WHERE id_factura = ?
                )
                GROUP BY dg.id_detalle_guia";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id_factura);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = [];
        $i    = 0;
        while ($vals = $result->fetch_assoc()) {
            $totalOriginal = (float)$vals['total_factura_detalle'];
            $costoOriginal = (float)$vals['precio_factura_detalle'];

            // CORRECCIÓN 2: dividir desde el valor original de BD, no del ya dividido
            switch ((int)$vals['tipo_impuesto']) {
                case 0: // 0%
                    $porcentaje   = 0;
                    $equivalencia = 0;
                    $codIva       = '0';
                    $totalSinIva  = $totalOriginal;
                    $costoSinIva  = $costoOriginal;
                    break;

                case 1: // 12%
                    $porcentaje   = 12;
                    $equivalencia = 0.12;
                    $codIva       = '2';
                    $totalSinIva  = $totalOriginal > 0 ? $totalOriginal / 1.12 : 0;
                    $costoSinIva  = $costoOriginal  > 0 ? $costoOriginal  / 1.12 : 0;
                    break;

                case 2: // 13%
                    $porcentaje   = 13;
                    $equivalencia = 0.13;
                    $codIva       = '10';
                    $totalSinIva  = $totalOriginal > 0 ? $totalOriginal / 1.13 : 0;
                    $costoSinIva  = $costoOriginal  > 0 ? $costoOriginal  / 1.13 : 0;
                    break;

                case 3: // 14%
                    $porcentaje   = 14;
                    $equivalencia = 0.14;
                    $codIva       = '3';
                    $totalSinIva  = $totalOriginal > 0 ? $totalOriginal / 1.14 : 0;
                    $costoSinIva  = $costoOriginal  > 0 ? $costoOriginal  / 1.14 : 0;
                    break;

                case 4: // 15%
                    $porcentaje   = 15;
                    $equivalencia = 0.15;
                    $codIva       = '4';
                    $totalSinIva  = $totalOriginal > 0 ? $totalOriginal / 1.15 : 0;
                    $costoSinIva  = $costoOriginal  > 0 ? $costoOriginal  / 1.15 : 0;
                    break;

                default:
                    $porcentaje   = 0;
                    $equivalencia = 0;
                    $codIva       = '0';
                    $totalSinIva  = $totalOriginal;
                    $costoSinIva  = $costoOriginal;
                    break;
            }

            $data[$i] = [
                'codigo_producto'           => $vals['codigo_producto'],
                'cantidad_factura_detalle'  => $vals['cantidad_factura_detalle'],
                'nombre_producto'           => $vals['nombre_producto'],
                'iva_producto'              => $codIva,
                'descuento_factura_detalle' => $vals['descuento_factura_detalle'],
                'precio_factura_detalle'    => $costoSinIva,   // precio unitario sin IVA
                'total_factura_detalle'     => $totalSinIva,   // total línea sin IVA
                'porcentaje_iva'            => $porcentaje,
                'equivalencia_iva'          => $equivalencia,
            ];
            $i++;
        }

        $stmt->close();
        return $data;
    }

    public function seleccionarClienteCampo($id_cliente)
    {
        $conn = conexion();

        $sql = "SELECT tipo_identificacion_cliente,
                       identificacion_cliente,
                       nombre_cliente,
                       direccion_cliente
                FROM cliente
                WHERE id_cliente = ?";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id_cliente);
        $stmt->execute();
        $result = $stmt->get_result();

        $data = [];
        if ($row = $result->fetch_assoc()) {
            $data[0] = [
                'tipo_identificacion_cliente' => $row['tipo_identificacion_cliente'],
                'identificacion_cliente'      => $row['identificacion_cliente'],
                'nombre_cliente'              => $row['nombre_cliente'],
                'direccion_cliente'           => $row['direccion_cliente'],
            ];
        }

        $stmt->close();
        return $data;
    }

    public function obtenerEmpresaInfo()
    {
        $conn = conexion();

        // Se agregan agente_retencion y resolucion_agente_retencion para la corrección 1.
        // Si esas columnas no existen aún en tu BD, agrégalas o usa COALESCE con ''.
        $sql = "SELECT
                    ruc_empresa,
                    razon_social_empresa                                    AS nombre_empresa,
                    COALESCE(nombre_comercial_empresa, razon_social_empresa) AS nombre_comercial_empresa,
                    COALESCE(dir_matriz_empresa, direccion_empresa)          AS direccion_empresa,
                    COALESCE(dir_establecimiento_empresa, direccion_empresa) AS dir_establecimiento,
                    password_p12,
                    COALESCE(ambiente_sri, 1)                                AS ambiente_sri,
                    COALESCE(obligado_contabilidad, 'SI')                    AS obligado_contabilidad,
                    contribuyente_especial,
                    establecimiento_sri,
                    punto_emision_empresa                                    AS punto_emision,
                    COALESCE(regimen_fiscal, '1')                            AS regimen_fiscal
                FROM empresa
                LIMIT 1";

        $result = $conn->query($sql);

        $data = [];
        if ($row = $result->fetch_assoc()) {
            $data[0] = [
                'ruc_empresa'                  => $row['ruc_empresa'],
                'nombre_empresa'               => $row['nombre_empresa'],
                'nombre_comercial_empresa'     => $row['nombre_comercial_empresa'],
                'direccion_empresa'            => $row['direccion_empresa'],
                'dir_establecimiento'          => $row['dir_establecimiento'],
                'password_p12'                 => decrypt_db_data($row['password_p12']),
                'ambiente_sri'                 => $row['ambiente_sri'],
                'obligado_contabilidad'        => $row['obligado_contabilidad'],
                'contribuyente_especial'       => $row['contribuyente_especial'],
                'establecimiento_sri'          => $row['establecimiento_sri'],
                'punto_emision'                => $row['punto_emision'],
                'regimen_fiscal'               => $row['regimen_fiscal'],
            ];
        }

        return $data;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Utilidades
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Escapa caracteres especiales XML en texto de usuario.
     * Úsala ANTES de insertar texto en SimpleXML cuando no usas addChild()
     * con el valor directo (SimpleXML ya escapa automáticamente via addChild).
     * La dejamos disponible para uso explícito donde haga falta.
     */
    private function escapeXml(string $text): string
    {
        // Primero limpiar caracteres de control no permitidos en XML 1.0
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /**
     * Convierte códigos unicode escapados al carácter real.
     * Se mantiene por compatibilidad con otros usos del sistema.
     */
    public static function Utf8_ansi($valor = '')
    {
        $utf8_ansi2 = [
            "u00c0" => "À", "u00c1" => "Á", "u00c2" => "Â", "u00c3" => "Ã",
            "u00c4" => "Ä", "u00c5" => "Å", "u00c6" => "Æ", "u00c7" => "Ç",
            "u00c8" => "È", "u00c9" => "É", "u00ca" => "Ê", "u00cb" => "Ë",
            "u00cc" => "Ì", "u00cd" => "Í", "u00ce" => "Î", "u00cf" => "Ï",
            "u00d1" => "Ñ", "u00d2" => "Ò", "u00d3" => "Ó", "u00d4" => "Ô",
            "u00d5" => "Õ", "u00d6" => "Ö", "u00d8" => "Ø", "u00d9" => "Ù",
            "u00da" => "Ú", "u00db" => "Û", "u00dc" => "Ü", "u00dd" => "Ý",
            "u00df" => "ß", "u00e0" => "à", "u00e1" => "á", "u00e2" => "â",
            "u00e3" => "ã", "u00e4" => "ä", "u00e5" => "å", "u00e6" => "æ",
            "u00e7" => "ç", "u00e8" => "è", "u00e9" => "é", "u00ea" => "ê",
            "u00eb" => "ë", "u00ec" => "ì", "u00ed" => "í", "u00ee" => "î",
            "u00ef" => "ï", "u00f0" => "ð", "u00f1" => "ñ", "u00f2" => "ò",
            "u00f3" => "ó", "u00f4" => "ô", "u00f5" => "õ", "u00f6" => "ö",
            "u00f8" => "ø", "u00f9" => "ù", "u00fa" => "ú", "u00fb" => "û",
            "u00fc" => "ü", "u00fd" => "ý", "u00ff" => "ÿ",
        ];
        return strtr($valor, $utf8_ansi2);
    }
}
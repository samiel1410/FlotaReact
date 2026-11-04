<?php
require_once("db.php");
ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

class metodoXmlBoleto
{
    public function armarXmlBoleto($id_boleto)
    {
        try {
            // 1. Obtener datos del boleto y empresa
            $datosBoleto = $this->seleccionarBoleto($id_boleto);
            if (empty($datosBoleto) || empty($datosBoleto[0])) {
                throw new Exception("Boleto #{$id_boleto} no encontrado en la base de datos.");
            }
            $detallesBoleto = $this->seleccionarDetallesBoleto($id_boleto);
            $datosEmpresa = $this->obtenerEmpresaInfo();

            $rucEmpresa = $datosEmpresa[0]['ruc_empresa'];
            $razonEmpresa = $datosEmpresa[0]['nombre_empresa'];
            $nombre_comercial_empresa = !empty(trim($datosEmpresa[0]['nombre_comercial_empresa'] ?? '')) ? trim($datosEmpresa[0]['nombre_comercial_empresa']) : $razonEmpresa;
            $direccionEmpresa = !empty(trim($datosEmpresa[0]['direccion_empresa'] ?? '')) ? trim($datosEmpresa[0]['direccion_empresa']) : 'OFICINA PRINCIPAL';
            $ambiente = $datosEmpresa[0]['ambiente_sri'];
            $direccionEmisor = !empty(trim($datosEmpresa[0]['dir_establecimiento'] ?? '')) ? trim($datosEmpresa[0]['dir_establecimiento']) : $direccionEmpresa;
            $regimen_fiscal = $datosEmpresa[0]['regimen_fiscal'] ?? '1';
            $agenteRetencion = trim((string)($datosEmpresa[0]['agente_retencion'] ?? '0'));
            $resolucionRetencion = trim((string)($datosEmpresa[0]['resolucion_agente_retencion'] ?? ''));

            // Datos del boleto (factura) con fecha de emisión HOY y clave actualizada
            $fechaEmision = date('d/m/Y');
            $claveAccesoOriginal = $datosBoleto[0]['clave_acceso_boletos'] ?? '';
            $conn = conexion();
            $claveAcceso = asegurarClaveAccesoHoy($claveAccesoOriginal, 'boletos', 'clave_acceso_boletos', 'id_boleto', $id_boleto, $conn);

            // Estab, P.E. y secuencial deben ser exactamente los de la clave de
            // acceso; si se toman de las columnas sin rellenar con ceros, el
            // comprobante no coincide con la clave y el SRI lo rechaza.
            [$sucursal, $puntoEmision, $numFactura] = $this->datosEmisionDesdeClave(
                $claveAcceso,
                $datosBoleto[0]['sucursal_emision_boleto'] ?? '',
                $datosBoleto[0]['punto_emision_boleto'] ?? '',
                $datosBoleto[0]['numero_boleto'] ?? ''
            );

            // La dirección del establecimiento es la de la oficina que vende el
            // boleto (sucursal del vendedor), no la dirección matriz.
            $direccionEstablecimiento = $this->obtenerDireccionSucursal(
                (int)($datosBoleto[0]['id_fksucursal_boleto'] ?? 0),
                $sucursal
            );
            if ($direccionEstablecimiento === '') {
                $direccionEstablecimiento = $direccionEmisor;
            }

            // Datos del cliente principal y mapeo del Tipo de Identificación SRI (formato 2 dígitos [0][4-8])
            $rucCliente = trim($datosBoleto[0]['identificacion_boleto'] ?? '');
            $nombreCliente = str_replace("&", "&amp;", $datosBoleto[0]['nombres_boleto'] ?? '');

            $rawTipoId = str_pad(trim($datosBoleto[0]['tipo_identificacion_boleto'] ?? ''), 2, '0', STR_PAD_LEFT);
            if (in_array($rawTipoId, ['04', '05', '06', '07', '08'])) {
                $tipoIdentificacion = $rawTipoId;
            } elseif ($rucCliente === '9999999999999' || $rucCliente === '9999999999') {
                $tipoIdentificacion = '07'; // Consumidor Final
            } elseif (strlen($rucCliente) === 13) {
                $tipoIdentificacion = '04'; // RUC
            } elseif (strlen($rucCliente) === 10) {
                $tipoIdentificacion = '05'; // Cédula
            } else {
                $tipoIdentificacion = '06'; // Pasaporte / Identificación Exterior
            }

            // Valores monetarios. La base imponible se obtiene de los detalles:
            // la venta guarda boleto.subtotal_boleto en 0, así que usarlo dejaba
            // totalSinImpuestos = 0.00 con un importeTotal mayor y el SRI rechaza.
            $sumaTotalDetalles = 0.0;
            $sumaDescuentosDetalles = 0.0;
            foreach ($detallesBoleto as $d) {
                $sumaTotalDetalles += (float)($d['total_boleto_detalle'] ?? 0);
                $sumaDescuentosDetalles += (float)($d['descuento_boleto_detalle'] ?? 0);
            }

            $ivaNum = (float)($datosBoleto[0]['iva_boleto'] ?? 0);
            $totalFactura = number_format((float)($datosBoleto[0]['total_boleto'] ?? 0), 2, '.', '');
            $ivaFactura = number_format($ivaNum, 2, '.', '');
            // totalDescuento del comprobante = suma de los descuentos de los detalles.
            $descuentoFactura = number_format($sumaDescuentosDetalles, 2, '.', '');

            $baseImponibleNum = (float)($datosBoleto[0]['subtotal_boleto'] ?? 0);
            if ($baseImponibleNum <= 0) {
                $baseImponibleNum = $sumaTotalDetalles > 0
                    ? $sumaTotalDetalles
                    : max(0, (float)$totalFactura - $ivaNum);
            }

            if ($ivaNum > 0) {
                $subtotal15Factura = number_format($baseImponibleNum, 2, '.', '');
                $subtotal0Factura = number_format(0, 2, '.', '');
                $iva15Factura = $ivaFactura;
            } else {
                $subtotal0Factura = number_format($baseImponibleNum, 2, '.', '');
                $subtotal15Factura = number_format(0, 2, '.', '');
                $iva15Factura = number_format(0, 2, '.', '');
            }
            $totalSinImpuestosFactura = number_format((float)$subtotal0Factura + (float)$subtotal15Factura, 2, '.', '');

            // 2. Crear XML
            $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><factura id="comprobante" version="1.1.0"></factura>');

            $infoTributaria = $xml->addChild('infoTributaria');
            $infoTributaria->addChild('ambiente', $ambiente);
            $infoTributaria->addChild('tipoEmision', 1);
            $infoTributaria->addChild('razonSocial', $razonEmpresa);
            if (!empty($nombre_comercial_empresa)) {
                $infoTributaria->addChild('nombreComercial', $nombre_comercial_empresa);
            }
            $infoTributaria->addChild('ruc', $rucEmpresa);
            $infoTributaria->addChild('claveAcceso', $claveAcceso);
            $infoTributaria->addChild('codDoc', '01');
            $infoTributaria->addChild('estab', $sucursal);
            $infoTributaria->addChild('ptoEmi', $puntoEmision);
            $infoTributaria->addChild('secuencial', $numFactura);
            $infoTributaria->addChild('dirMatriz', $direccionEmpresa);
            if ($agenteRetencion !== '' && $agenteRetencion !== '0' && $resolucionRetencion !== '') {
                $infoTributaria->addChild('agenteRetencion', $resolucionRetencion);
            }
            // Régimen fiscal SRI: 1=General, 2=RIMPE Emprendedor, 3=RIMPE Popular,
            // 4=Microempresa, 5=RISE, 6=Agropecuario
            $regimenInt = (int)$regimen_fiscal;
            if ($regimenInt === 2) {
                $infoTributaria->addChild('contribuyenteRimpe', 'CONTRIBUYENTE RÉGIMEN RIMPE');
            } elseif ($regimenInt === 3) {
                $infoTributaria->addChild('contribuyenteRimpe', 'CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE');
            } elseif ($regimenInt === 4) {
                $infoTributaria->addChild('regimenMicroempresas', 'CONTRIBUYENTE RÉGIMEN MICROEMPRESAS');
            }
            // 1=General, 5=RISE, 6=Agropecuario → no requieren tag adicional


            $infoFactura = $xml->addChild('infoFactura');
            $infoFactura->addChild('fechaEmision', $fechaEmision);
            $infoFactura->addChild('dirEstablecimiento', $direccionEstablecimiento);
            // Orden exigido por el XSD de factura 1.1.0: contribuyenteEspecial va antes de obligadoContabilidad
            // El XSD exige el N° de resolución (3 a 5 dígitos). Un valor tipo "SI"
            // (bandera de configuración) hace que el SRI rechace el comprobante.
            $contribEspecial = trim((string)($datosEmpresa[0]['contribuyente_especial'] ?? ''));
            if (preg_match('/^\d{3,5}$/', $contribEspecial)) {
                $infoFactura->addChild('contribuyenteEspecial', $contribEspecial);
            }
            $infoFactura->addChild('obligadoContabilidad', $datosEmpresa[0]['obligado_contabilidad']);
            $infoFactura->addChild('tipoIdentificacionComprador', $tipoIdentificacion);
            $infoFactura->addChild('razonSocialComprador', $nombreCliente);
            $infoFactura->addChild('identificacionComprador', $rucCliente);
            $infoFactura->addChild('totalSinImpuestos', $totalSinImpuestosFactura);
            $infoFactura->addChild('totalDescuento', $descuentoFactura);

            $totalConImpuestos = $infoFactura->addChild('totalConImpuestos');
            
            if ($subtotal0Factura > 0 || ($subtotal0Factura == 0 && $subtotal15Factura == 0)) {
                $totalImpuesto = $totalConImpuestos->addChild('totalImpuesto');
                $totalImpuesto->addChild('codigo', '2');
                $totalImpuesto->addChild('codigoPorcentaje', '0');
                $totalImpuesto->addChild('baseImponible', $subtotal0Factura);
                $totalImpuesto->addChild('tarifa', '0.00');
                $totalImpuesto->addChild('valor', '0.00');
            }

            if ($subtotal15Factura > 0) {
                $totalImpuesto2 = $totalConImpuestos->addChild('totalImpuesto');
                $totalImpuesto2->addChild('codigo', '2');
                $totalImpuesto2->addChild('codigoPorcentaje', '4');
                $totalImpuesto2->addChild('baseImponible', $subtotal15Factura);
                $totalImpuesto2->addChild('tarifa', '15.00');
                $totalImpuesto2->addChild('valor', $iva15Factura);
            }

            $infoFactura->addChild('propina', '0.00');
            $infoFactura->addChild('importeTotal', $totalFactura);
            $infoFactura->addChild('moneda', 'DOLAR');

            $pagos = $infoFactura->addChild('pagos');
            $pago = $pagos->addChild('pago');
            $pago->addChild('formaPago', '01');
            $pago->addChild('total', $totalFactura);

            // 3. Detalles de los boletos/pasajeros
            $detalles = $xml->addChild('detalles');
            foreach ($detallesBoleto as $detalleBoleto) {
                // Obtener datos del viaje y ruta para armar la descripción
                $id_viaje = $datosBoleto[0]['id_fkviaje_boleto'];
                $viaje = $this->seleccionarViaje($id_viaje);
                $id_ruta = $viaje['id_fkruta_viajes'];
                $ruta = $this->seleccionarRuta($id_ruta);

                // Fecha real de salida del viaje: fecha_cierre guarda la fecha
                // (dia_viajes solo guarda el día de la semana).
                $fechaSalidaViaje = !empty($viaje['fecha_cierre'])
                    ? $viaje['fecha_cierre']
                    : ($datosBoleto[0]['fecha_boleto'] ?? '');
                $tsSalidaViaje = strtotime((string)$fechaSalidaViaje);
                if ($tsSalidaViaje === false) {
                    $tsSalidaViaje = time();
                }
                $fecha_viaje = date('dMY', $tsSalidaViaje);
                $hora_salida = date('H i', strtotime($viaje['hora_salida_estimado']));

                // Manejar asiento opcional para la descripción
                $asientoDisplay = ($detalleBoleto['asiento_boleto_detalle'] == '0' || empty($detalleBoleto['asiento_boleto_detalle'])) ? 'S/N' : $detalleBoleto['asiento_boleto_detalle'];

                // Armar descripción según formato solicitado.
                // El SRI limita <detalle><descripcion> a 300 caracteres
                // (cvc-maxLength-valid). Las rutas con muchos ramales superan ese
                // límite, por eso se recorta el encabezado de la ruta conservando
                // siempre fecha, hora, asiento y pasajero.
                $descripcionRuta = sprintf(
                    "BOL.%s VIAJE %s",
                    mb_strtoupper(trim((string)$ruta['nombre_rutas']), 'UTF-8'),
                    mb_strtoupper(trim((string)$ruta['descripcion_rutas']), 'UTF-8')
                );
                $descripcionDatos = sprintf(
                    "%s %s  ASIENTO  %s PASAJERO %s",
                    strtoupper($fecha_viaje),
                    $hora_salida,
                    $asientoDisplay,
                    mb_strtoupper(trim((string)$detalleBoleto['nombre_cliente_boleto_detalle']), 'UTF-8')
                );
                $descripcion = $this->limitarDescripcionSri($descripcionRuta, $descripcionDatos, 300);

                $codigoRuta = trim((string)($ruta['codigo_rutas'] ?? ''));
                if ($codigoRuta === '') {
                    $codigoRuta = str_pad((string)($ruta['id_rutas'] ?? ''), 2, '0', STR_PAD_LEFT);
                }
                $detalle = $detalles->addChild('detalle');
                $detalle->addChild('codigoPrincipal', 'BOL.' . $codigoRuta);
                $detalle->addChild('codigoAuxiliar', 'H49200');
                $detalle->addChild('descripcion', str_replace("&", "&amp;", $descripcion));
                $detalle->addChild('cantidad', 1);

                // El total del detalle ya viene con el descuento aplicado, por eso
                // el precio unitario se declara con la tarifa completa: el SRI
                // exige que precioUnitario - descuento = precioTotalSinImpuesto.
                $precioDet = (float)$detalleBoleto['precio_boleto_detalle'];
                $descuentoDet = (float)$detalleBoleto['descuento_boleto_detalle'];
                $totalDet = (float)$detalleBoleto['total_boleto_detalle'];
                if ($descuentoDet > 0) {
                    $precioDet = $totalDet + $descuentoDet;
                }

                $detalle->addChild('precioUnitario', number_format($precioDet, 2, '.', ''));
                $detalle->addChild('descuento', number_format($descuentoDet, 2, '.', ''));
                $detalle->addChild('precioTotalSinImpuesto', number_format($totalDet, 2, '.', ''));

                $impuestos = $detalle->addChild('impuestos');
                $impuesto = $impuestos->addChild('impuesto');
                $impuesto->addChild('codigo', '2');
                
                $iva_detalle = number_format($detalleBoleto['iva_boleto_detalle'], 2, '.', '');
                
                if ($iva_detalle > 0) {
                    $impuesto->addChild('codigoPorcentaje', '4');
                    $impuesto->addChild('tarifa', '15.00');
                } else {
                    $impuesto->addChild('codigoPorcentaje', '0');
                    $impuesto->addChild('tarifa', '0.00');
                }
                
                $impuesto->addChild('baseImponible', number_format($totalDet, 2, '.', ''));
                $impuesto->addChild('valor', $iva_detalle);
            }

            // 4. Retornar XML
            $comprobante = preg_replace("/\r|\n/", '', $xml->asXML());
            $comprobante = (str_replace("/\040/", '', $comprobante));
            $comprobante = $this->cleanString($comprobante);
            $comprobante = $this->Utf8_ansi($comprobante);

            $respuesta['comprobante'] = $comprobante;
            $respuesta['clave_acceso_boletos'] = $claveAcceso;
            $respuesta['ruc_empresa'] = $rucEmpresa;
            $respuesta['ruc'] = $rucEmpresa;
            $respuesta['p12_password'] = $datosEmpresa[0]['password_p12']; // Devuelve la contraseña del P12

            return ($respuesta);
        } catch (Exception $e) {
            $array = array(
                "error" => $e->getMessage(),
                "success" => false,
            );
            echo json_encode($array);
        }
    }

    /**
     * Devuelve [estab, ptoEmi, secuencial] tal como están dentro de la clave de
     * acceso. Si la clave no es válida, usa las columnas del boleto rellenando
     * con ceros a la izquierda.
     */
    private function datosEmisionDesdeClave($claveAcceso, $estabBd, $ptoEmiBd, $secuencialBd)
    {
        $clave = trim((string)$claveAcceso);
        if (strlen($clave) === 49 && ctype_digit($clave)) {
            return [substr($clave, 24, 3), substr($clave, 27, 3), substr($clave, 30, 9)];
        }

        $estab = preg_replace('/\D/', '', (string)$estabBd);
        $ptoEmi = preg_replace('/\D/', '', (string)$ptoEmiBd);
        $secuencial = preg_replace('/\D/', '', (string)$secuencialBd);

        return [
            str_pad($estab !== '' ? (string)(int)$estab : '001', 3, '0', STR_PAD_LEFT),
            str_pad($ptoEmi !== '' ? (string)(int)$ptoEmi : '001', 3, '0', STR_PAD_LEFT),
            str_pad($secuencial !== '' ? (string)(int)$secuencial : '1', 9, '0', STR_PAD_LEFT),
        ];
    }

    /**
     * Dirección de la oficina que emite el comprobante. El boleto guarda el
     * código de la sucursal del vendedor (suc_codigo_sucursal), pero también se
     * acepta la PK o el P.E. de boletería como respaldo.
     */
    private function obtenerDireccionSucursal($idSucursal, $estab = '')
    {
        $conn = conexion();
        $idSucursal = (int)$idSucursal;
        $estab = trim((string)$estab);
        $direccion = '';

        if ($idSucursal > 0) {
            $stmt = $conn->prepare(
                "SELECT direccion_sucursal FROM sucursal2
                 WHERE suc_codigo_sucursal = ? OR id_sucursal = ?
                 ORDER BY (suc_codigo_sucursal = ?) DESC
                 LIMIT 1"
            );
            if ($stmt) {
                $stmt->bind_param('iii', $idSucursal, $idSucursal, $idSucursal);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res ? $res->fetch_assoc() : null;
                $stmt->close();
                $direccion = trim((string)($row['direccion_sucursal'] ?? ''));
            }
        }

        if ($direccion === '' && $estab !== '') {
            $stmt = $conn->prepare(
                "SELECT direccion_sucursal FROM sucursal2
                 WHERE punto_emision_boleteria_sucursal = ?
                 LIMIT 1"
            );
            if ($stmt) {
                $stmt->bind_param('s', $estab);
                $stmt->execute();
                $res = $stmt->get_result();
                $row = $res ? $res->fetch_assoc() : null;
                $stmt->close();
                $direccion = trim((string)($row['direccion_sucursal'] ?? ''));
            }
        }

        return $direccion;
    }

    // Consulta principal de la factura de boletos
    public function seleccionarBoleto($id_boleto)
    {
        $conn = conexion();
        $query = "SELECT 
            id_boleto,
            identificacion_boleto,
            tipo_identificacion_boleto,
            nombres_boleto,
            correo_boleto,
            celular_boleto,
            fecha_nacimiento_boleto,
            id_fkcliente_boleto,
            id_fkbus_boleto,
            id_fkviaje_boleto,
            descuento_boleto,
            subtotal_boleto,
            iva_boleto,
            total_boleto,
            numero_boleto,
            punto_emision_boleto,
            sucursal_emision_boleto,
            id_fkusuario_boleto,
            estado_boleto,
            fecha_creacion_boleto,
            motivo_anulacion_boleto,
            fecha_boleto,
            id_fkcaja_boleto,
            id_fkusuario_anulacion,
            estado_cobro_boleto,
            origen_boleto,
            destino_boleto,
            id_fksucursal_boleto,
            clave_acceso_boletos,
            fecha_autorizacion,
            nombre_origen,
            nombre_destino,
            id_fksubruta_boleto,
            observacion_boleto
        FROM boletos
        WHERE id_boleto = $id_boleto";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            foreach ($vals as $key => $value) {
                $data[0][$key] = $value;
            }
        }
        return ($data);
    }

    // Consulta de los detalles (pasajeros/asientos)
    public function seleccionarDetallesBoleto($id_boleto)
    {
        $conn = conexion();
        $query = "SELECT 
            id_boleto_detalle,
            fecha_creacion_boleto_detalle,
            id_fkboleto_boleto_detalle,
            total_boleto_detalle,
            asiento_boleto_detalle,
            precio_boleto_detalle,
            descuento_boleto_detalle,
            iva_boleto_detalle,
            id_fksucursal_boleto_detalle,
            nombre_cliente_boleto_detalle,
            identificacion_boleto_detalle,
            tarifa_boleto_detalle,
            estado_boleto_detalle,
            id_destino_boleto
        FROM boleto_detalle
        WHERE id_fkboleto_boleto_detalle = $id_boleto";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            $row = array();
            foreach ($vals as $key => $value) {
                $row[$key] = $value;
            }
            $data[] = $row;
        }
        return ($data);
    }

    public function obtenerEmpresaInfo()
    {
        $conn = conexion();
        $query = "SELECT ruc_empresa,
            razon_social_empresa as nombre_empresa,
            COALESCE(nombre_comercial_empresa, razon_social_empresa) as nombre_comercial_empresa,
            COALESCE(dir_matriz_empresa, direccion_empresa) as direccion_empresa,
            COALESCE(dir_establecimiento_empresa, direccion_empresa) as dir_establecimiento,
            password_p12,
            COALESCE(ambiente_sri, 1) as ambiente_sri,
            COALESCE(obligado_contabilidad, 'SI') as obligado_contabilidad,
            contribuyente_especial,
            COALESCE(regimen_fiscal, '1') as regimen_fiscal,
            COALESCE(agente_retencion, 0) as agente_retencion,
            COALESCE(resolucion_agente_retencion, '') as resolucion_agente_retencion
            FROM empresa";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            $data[0]['ruc_empresa'] = $vals['ruc_empresa'];
            $data[0]['nombre_empresa'] = $vals['nombre_empresa'];
            $data[0]['nombre_comercial_empresa'] = $vals['nombre_comercial_empresa'];
            $data[0]['direccion_empresa'] = $vals['direccion_empresa'];
            $data[0]['dir_establecimiento'] = $vals['dir_establecimiento'];
            $data[0]['password_p12'] = $vals['password_p12'];
            $data[0]['ambiente_sri'] = $vals['ambiente_sri'];
            $data[0]['obligado_contabilidad'] = $vals['obligado_contabilidad'];
            $data[0]['contribuyente_especial'] = $vals['contribuyente_especial'];
            $data[0]['regimen_fiscal'] = $vals['regimen_fiscal'];
            $data[0]['agente_retencion'] = $vals['agente_retencion'];
            $data[0]['resolucion_agente_retencion'] = $vals['resolucion_agente_retencion'];
        }
        return ($data);
    }

    public static function Utf8_ansi($valor = '')
    {
        $utf8_ansi2 = array(
            "u00c0" => "À",
            "u00c1" => "Á",
            "u00c2" => "Â",
            "u00c3" => "Ã",
            "u00c4" => "Ä",
            "u00c5" => "Å",
            "u00c6" => "Æ",
            "u00c7" => "Ç",
            "u00c8" => "È",
            "u00c9" => "É",
            "u00ca" => "Ê",
            "u00cb" => "Ë",
            "u00cc" => "Ì",
            "u00cd" => "Í",
            "u00ce" => "Î",
            "u00cf" => "Ï",
            "u00d1" => "Ñ",
            "u00d2" => "Ò",
            "u00d3" => "Ó",
            "u00d4" => "Ô",
            "u00d5" => "Õ",
            "u00d6" => "Ö",
            "u00d8" => "Ø",
            "u00d9" => "Ù",
            "u00da" => "Ú",
            "u00db" => "Û",
            "u00dc" => "Ü",
            "u00dd" => "Ý",
            "u00df" => "ß",
            "u00e0" => "à",
            "u00e1" => "á",
            "u00e2" => "â",
            "u00e3" => "ã",
            "u00e4" => "ä",
            "u00e5" => "å",
            "u00e6" => "æ",
            "u00e7" => "ç",
            "u00e8" => "è",
            "u00e9" => "é",
            "u00ea" => "ê",
            "u00eb" => "ë",
            "u00ec" => "ì",
            "u00ed" => "í",
            "u00ee" => "î",
            "u00ef" => "ï",
            "u00f0" => "ð",
            "u00f1" => "ñ",
            "u00f2" => "ò",
            "u00f3" => "ó",
            "u00f4" => "ô",
            "u00f5" => "õ",
            "u00f6" => "ö",
            "u00f8" => "ø",
            "u00f9" => "ù",
            "u00fa" => "ú",
            "u00fb" => "û",
            "u00fc" => "ü",
            "u00fd" => "ý",
            "u00ff" => "ÿ"
        );
        return strtr($valor, $utf8_ansi2);
    }

    private function cleanString($text)
    {
        $utf8 = array(
            '/[áàâãªä]/u' => 'a',
            '/[ÁÀÂÃÄ]/u' => 'A',
            '/[ÍÌÎÏ]/u' => 'I',
            '/[íìîï]/u' => 'i',
            '/[éèêë]/u' => 'e',
            '/[ÉÈÊË]/u' => 'E',
            '/[óòôõºö]/u' => 'o',
            '/[ÓÒÔÕÖ]/u' => 'O',
            '/[úùûü]/u' => 'u',
            '/[ÚÙÛÜ]/u' => 'U',
            '/ç/' => 'c',
            '/Ç/' => 'C',
            '/ñ/' => 'n',
            '/Ñ/' => 'N'
        );
        return preg_replace(array_keys($utf8), array_values($utf8), $text);
    }

    /**
     * Recorta la descripción del detalle al máximo permitido por el SRI (300),
     * conservando intacta la parte final (fecha, hora, asiento y pasajero).
     */
    private function limitarDescripcionSri($encabezado, $datos, $maximo = 300)
    {
        $descripcion = trim($encabezado . ' ' . $datos);
        if (mb_strlen($descripcion, 'UTF-8') <= $maximo) {
            return $descripcion;
        }

        $disponible = $maximo - mb_strlen($datos, 'UTF-8') - 1;
        if ($disponible <= 0) {
            return mb_substr($descripcion, 0, $maximo, 'UTF-8');
        }

        $encabezadoRecortado = rtrim(mb_substr($encabezado, 0, $disponible, 'UTF-8'));
        return $encabezadoRecortado . ' ' . $datos;
    }

    public function seleccionarViaje($id_viaje)
    {
        $conn = conexion();
        $query = "SELECT id_viajes, id_fkruta_viajes, id_fkbus_viajes, id_fkalimento_viajes, dia_viajes, hora_salida_estimado, fecha_cierre, hora_origen_salida, estado_viajes FROM viajes WHERE id_viajes = $id_viaje LIMIT 1";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        return mysqli_fetch_assoc($result);
    }

    public function seleccionarRuta($id_ruta)
    {
        $conn = conexion();
        $query = "SELECT id_rutas, codigo_rutas, nombre_rutas, descripcion_rutas FROM rutas WHERE id_rutas = $id_ruta LIMIT 1";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        return mysqli_fetch_assoc($result);
    }
}
?>
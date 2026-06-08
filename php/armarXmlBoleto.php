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
            $detallesBoleto = $this->seleccionarDetallesBoleto($id_boleto);
            $datosEmpresa = $this->obtenerEmpresaInfo();

            $rucEmpresa = $datosEmpresa[0]['ruc_empresa'];
            $razonEmpresa = $datosEmpresa[0]['nombre_empresa'];
            $nombre_comercial_empresa = $datosEmpresa[0]['nombre_comercial_empresa'];
            $direccionEmpresa = $datosEmpresa[0]['direccion_empresa'];
            $ambiente = $datosEmpresa[0]['ambiente_sri'];
            $direccionEmisor = $datosEmpresa[0]['dir_establecimiento'];
            $regimen_fiscal = $datosEmpresa[0]['regimen_fiscal'] ?? '1';

            // Datos del boleto (factura)
            $fechaEmision = date('d/m/Y', strtotime($datosBoleto[0]['fecha_boleto']));
            $claveAcceso = $datosBoleto[0]['clave_acceso_boletos'];
            $numFactura = sprintf("%09s", $datosBoleto[0]['numero_boleto']);
            $sucursal = $datosBoleto[0]['sucursal_emision_boleto'];
            $puntoEmision = $datosBoleto[0]['punto_emision_boleto'];

            // Datos del cliente principal
            $tipoIdentificacion = $datosBoleto[0]['tipo_identificacion_boleto'];
            $rucCliente = $datosBoleto[0]['identificacion_boleto'];
            $nombreCliente = str_replace("&", "&amp;", $datosBoleto[0]['nombres_boleto']);
            $direccionCliente = $datosBoleto[0]['origen_boleto'] . ' - ' . $datosBoleto[0]['destino_boleto'];

            // Valores monetarios
            $totalFactura = number_format($datosBoleto[0]['total_boleto'], 2, '.', '');
            $ivaFactura = number_format($datosBoleto[0]['iva_boleto'], 2, '.', '');
            $descuentoFactura = number_format($datosBoleto[0]['descuento_boleto'], 2, '.', '');

            if ($ivaFactura > 0) {
                $subtotal15Factura = number_format($datosBoleto[0]['subtotal_boleto'], 2, '.', '');
                $subtotal0Factura = number_format(0, 2, '.', '');
                $iva15Factura = $ivaFactura;
            } else {
                $subtotal0Factura = number_format($datosBoleto[0]['subtotal_boleto'], 2, '.', '');
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
            $infoTributaria->addChild('nombreComercial', $nombre_comercial_empresa);
            $infoTributaria->addChild('ruc', $rucEmpresa);
            $infoTributaria->addChild('claveAcceso', $claveAcceso);
            $infoTributaria->addChild('codDoc', '01');
            $infoTributaria->addChild('estab', $sucursal);
            $infoTributaria->addChild('ptoEmi', $puntoEmision);
            $infoTributaria->addChild('secuencial', $numFactura);
            $infoTributaria->addChild('dirMatriz', $direccionEmpresa);
            $infoTributaria->addChild('regimen', $regimen_fiscal);

            $infoFactura = $xml->addChild('infoFactura');
            $infoFactura->addChild('fechaEmision', $fechaEmision);
            $infoFactura->addChild('dirEstablecimiento', $direccionEmisor);
            $infoFactura->addChild('obligadoContabilidad', $datosEmpresa[0]['obligado_contabilidad']);
            if (!empty($datosEmpresa[0]['contribuyente_especial'])) {
                $infoFactura->addChild('contribuyenteEspecial', $datosEmpresa[0]['contribuyente_especial']);
            }
            $infoFactura->addChild('tipoIdentificacionComprador', $tipoIdentificacion);
            $infoFactura->addChild('razonSocialComprador', $nombreCliente);
            $infoFactura->addChild('identificacionComprador', $rucCliente);
            $infoFactura->addChild('direccionComprador', $direccionCliente);
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

                // Formatear fecha y hora del viaje
                $fecha_viaje = date('dM.Y', strtotime($viaje['dia_viajes']));
                $hora_salida = date('H i', strtotime($viaje['hora_salida_estimado']));

                // Manejar asiento opcional para la descripción
                $asientoDisplay = ($detalleBoleto['asiento_boleto_detalle'] == '0' || empty($detalleBoleto['asiento_boleto_detalle'])) ? 'S/N' : $detalleBoleto['asiento_boleto_detalle'];

                // Armar descripción según formato solicitado
                $descripcion = sprintf(
                    "BOL.%s %s VIAJE %s-%s %s %s ASIENTO %s PASAJERO %s",
                    $ruta['codigo_rutas'],
                    strtoupper($ruta['nombre_rutas']),
                    strtoupper($ruta['nombre_rutas']),
                    strtoupper($ruta['descripcion_rutas']),
                    $fecha_viaje,
                    $hora_salida,
                    $asientoDisplay,
                    strtoupper($detalleBoleto['nombre_cliente_boleto_detalle'])
                );

                $detalle = $detalles->addChild('detalle');
                $detalle->addChild('codigoPrincipal', 'BOL.' . $ruta['codigo_rutas']);
                $detalle->addChild('codigoAuxiliar', 'BOL.' . $ruta['codigo_rutas']);
                $detalle->addChild('descripcion', str_replace("&", "&amp;", $descripcion));
                $detalle->addChild('cantidad', 1);
                $detalle->addChild('precioUnitario', number_format($detalleBoleto['precio_boleto_detalle'], 2, '.', ''));
                $detalle->addChild('descuento', number_format($detalleBoleto['descuento_boleto_detalle'], 2, '.', ''));
                $detalle->addChild('precioTotalSinImpuesto', number_format($detalleBoleto['total_boleto_detalle'], 2, '.', ''));

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
                
                $impuesto->addChild('baseImponible', number_format($detalleBoleto['precio_boleto_detalle'] - $detalleBoleto['descuento_boleto_detalle'], 2, '.', ''));
                $impuesto->addChild('valor', $iva_detalle);
            }

            // 4. Retornar XML
            $comprobante = preg_replace("/\r|\n/", '', $xml->asXML());
            $comprobante = (str_replace("/\040/", '', $comprobante));
            $comprobante = $this->cleanString($comprobante);
            $comprobante = $this->Utf8_ansi($comprobante);

            $respuesta['comprobante'] = $comprobante;
            $respuesta['clave_acceso_boletos'] = $claveAcceso;
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
            COALESCE(regimen_fiscal, '1') as regimen_fiscal
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

    public function seleccionarViaje($id_viaje)
    {
        $conn = conexion();
        $query = "SELECT * FROM viajes WHERE id_viajes = $id_viaje LIMIT 1";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        return mysqli_fetch_assoc($result);
    }

    public function seleccionarRuta($id_ruta)
    {
        $conn = conexion();
        $query = "SELECT * FROM rutas WHERE id_rutas = $id_ruta LIMIT 1";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        return mysqli_fetch_assoc($result);
    }
}
?>
<?php
require_once("db.php");
ini_set('display_errors', 0);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

class metodoXmlNotaCredito
{
    public function armarXmlNotaCredito($id_boleto, $motivo)
    {
        try {
            // 1. Obtener datos del boleto (Factura original y datos NC)
            $datosNC = $this->seleccionarDatosNC($id_boleto);
            if (!$datosNC)
                throw new Exception("Boleto no encontrado para NC.");

            $detallesBoleto = $this->seleccionarDetallesBoleto($id_boleto);
            $datosEmpresa = $this->obtenerEmpresaInfo();

            $rucEmpresa = $datosEmpresa[0]['ruc_empresa'];
            $razonEmpresa = $datosEmpresa[0]['nombre_empresa'];
            $nombre_comercial_empresa = $datosEmpresa[0]['nombre_comercial_empresa'];
            $direccionEmpresa = $datosEmpresa[0]['direccion_empresa'];
            $ambiente = $datosEmpresa[0]['ambiente_sri'];
            $direccionEmisor = $datosEmpresa[0]['dir_establecimiento'];

            // Datos de la Nota de Crédito
            $fechaEmisionNC = date('d/m/Y');
            $claveAccesoNC = $datosNC[0]['clave_acceso_nota_credito'];
            $numNC = sprintf("%09s", $datosNC[0]['numero_nota_credito']);
            $sucursal = $datosNC[0]['sucursal_emision_boleto'];
            $puntoEmision = $datosNC[0]['punto_emision_boleto'];

            // Datos de la Factura Modificada (Original)
            $fechaOriginal = date('d/m/Y', strtotime($datosNC[0]['fecha_boleto']));
            $numFacturaOriginal = $datosNC[0]['sucursal_emision_boleto'] . '-' . $datosNC[0]['punto_emision_boleto'] . '-' . sprintf("%09s", $datosNC[0]['numero_boleto']);

            // Datos del cliente
            $tipoIdentificacion = $datosNC[0]['tipo_identificacion_boleto'];
            $rucCliente = $datosNC[0]['identificacion_boleto'];
            $nombreCliente = str_replace("&", "&amp;", $datosNC[0]['nombres_boleto']);

            // Valores monetarios
            $totalFactura = number_format($datosNC[0]['total_boleto'], 2, '.', '');
            $subtotal0 = number_format($datosNC[0]['subtotal_boleto'], 2, '.', '');
            $iva = number_format($datosNC[0]['iva_boleto'], 2, '.', '');

            // 2. Crear XML Nota de Crédito
            $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><notaCredito id="comprobante" version="1.1.0"></notaCredito>');

            $infoTributaria = $xml->addChild('infoTributaria');
            $infoTributaria->addChild('ambiente', $ambiente);
            $infoTributaria->addChild('tipoEmision', 1);
            $infoTributaria->addChild('razonSocial', $razonEmpresa);
            $infoTributaria->addChild('nombreComercial', $nombre_comercial_empresa);
            $infoTributaria->addChild('ruc', $rucEmpresa);
            $infoTributaria->addChild('claveAcceso', $claveAccesoNC);
            $infoTributaria->addChild('codDoc', '04');
            $infoTributaria->addChild('estab', $sucursal);
            $infoTributaria->addChild('ptoEmi', $puntoEmision);
            $infoTributaria->addChild('secuencial', $numNC);
            $infoTributaria->addChild('dirMatriz', $direccionEmpresa);

            $infoNotaCredito = $xml->addChild('infoNotaCredito');
            $infoNotaCredito->addChild('fechaEmision', $fechaEmisionNC);
            $infoNotaCredito->addChild('dirEstablecimiento', $direccionEmisor);
            $infoNotaCredito->addChild('tipoIdentificacionComprador', $tipoIdentificacion);
            $infoNotaCredito->addChild('razonSocialComprador', $nombreCliente);
            $infoNotaCredito->addChild('identificacionComprador', $rucCliente);
            $infoNotaCredito->addChild('obligadoContabilidad', $datosEmpresa[0]['obligado_contabilidad']);
            if (!empty($datosEmpresa[0]['contribuyente_especial'])) {
                $infoNotaCredito->addChild('contribuyenteEspecial', $datosEmpresa[0]['contribuyente_especial']);
            }
            $infoNotaCredito->addChild('codDocModificado', '01');
            $infoNotaCredito->addChild('numDocModificado', $numFacturaOriginal);
            $infoNotaCredito->addChild('fechaEmisionDocSustento', $fechaOriginal);
            $infoNotaCredito->addChild('totalSinImpuestos', $subtotal0);
            $infoNotaCredito->addChild('valorModificacion', $totalFactura);
            $infoNotaCredito->addChild('moneda', 'DOLAR');

            $totalConImpuestos = $infoNotaCredito->addChild('totalConImpuestos');
            $totalImpuesto = $totalConImpuestos->addChild('totalImpuesto');
            $totalImpuesto->addChild('codigo', '2');
            $totalImpuesto->addChild('codigoPorcentaje', '0');
            $totalImpuesto->addChild('baseImponible', $subtotal0);
            $totalImpuesto->addChild('valor', '0.00');

            $infoNotaCredito->addChild('motivo', $motivo);

            // 3. Detalles (Deben coincidir con la factura o ser el total anulado)
            $detalles = $xml->addChild('detalles');
            foreach ($detallesBoleto as $detalleBoleto) {
                $detalle = $detalles->addChild('detalle');
                $detalle->addChild('codigoInterno', 'BOL-NC');
                $detalle->addChild('descripcion', 'ANULACIÓN TICKET ASIENTO ' . $detalleBoleto['asiento_boleto_detalle']);
                $detalle->addChild('cantidad', 1);
                $detalle->addChild('precioUnitario', number_format($detalleBoleto['precio_boleto_detalle'], 2, '.', ''));
                $detalle->addChild('descuento', number_format($detalleBoleto['descuento_boleto_detalle'], 2, '.', ''));
                $detalle->addChild('precioTotalSinImpuesto', number_format($detalleBoleto['total_boleto_detalle'], 2, '.', ''));

                $impuestos = $detalle->addChild('impuestos');
                $impuesto = $impuestos->addChild('impuesto');
                $impuesto->addChild('codigo', '2');
                $impuesto->addChild('codigoPorcentaje', '0');
                $impuesto->addChild('tarifa', '0');
                $impuesto->addChild('baseImponible', number_format($detalleBoleto['total_boleto_detalle'], 2, '.', ''));
                $impuesto->addChild('valor', '0.00');
            }

            // 4. Retornar XML
            $comprobante = preg_replace("/\r|\n/", '', $xml->asXML());
            $comprobante = $this->cleanString($comprobante);
            $comprobante = $this->Utf8_ansi($comprobante);

            $respuesta['success'] = true;
            $respuesta['comprobante'] = $comprobante;
            $respuesta['clave_acceso'] = $claveAccesoNC;
            $respuesta['p12_password'] = $datosEmpresa[0]['password_p12'];

            return ($respuesta);
        } catch (Exception $e) {
            return [
                "error" => $e->getMessage(),
                "success" => false,
            ];
        }
    }

    public function seleccionarDatosNC($id_boleto)
    {
        $conn = conexion();
        $query = "SELECT * FROM boletos WHERE id_boleto = $id_boleto";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            $data[] = $vals;
        }
        return ($data);
    }

    public function seleccionarDetallesBoleto($id_boleto)
    {
        $conn = conexion();
        $query = "SELECT * FROM boleto_detalle WHERE id_fkboleto_boleto_detalle = $id_boleto";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            $data[] = $vals;
        }
        return ($data);
    }

    public function obtenerEmpresaInfo()
    {
        $conn = conexion();
        $query = "SELECT ruc_empresa, razon_social_empresa as nombre_empresa,
            COALESCE(nombre_comercial_empresa, razon_social_empresa) as nombre_comercial_empresa,
            COALESCE(dir_matriz_empresa, direccion_empresa) as direccion_empresa,
            COALESCE(dir_establecimiento_empresa, direccion_empresa) as dir_establecimiento,
            password_p12,
            COALESCE(ambiente_sri, 1) as ambiente_sri,
            COALESCE(obligado_contabilidad, 'SI') as obligado_contabilidad,
            contribuyente_especial
            FROM empresa";
        $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
        $data = array();
        while ($vals = mysqli_fetch_array($result)) {
            $data[] = $vals;
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
}
?>
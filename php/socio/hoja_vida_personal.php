<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$tInicio = microtime(true);
require_once('../library/tcpdf.php');
require_once("../db.php");
if (file_exists(__DIR__ . '/../pdf_utils.php')) {
    require_once(__DIR__ . '/../pdf_utils.php');
}
date_default_timezone_set('America/Guayaquil');

try {
    // Obtener id_personal de forma segura
    $id_personal = 0;
    if (isset($_GET['id_personal'])) $id_personal = intval($_GET['id_personal']);
    if ($id_personal <= 0) throw new Exception('ID inválido');

    $tenantId = isset($_GET['tenantId']) ? intval($_GET['tenantId']) : 1;
    $noCache = isset($_GET['nocache']) || isset($_GET['no_cache']);

    // Conexión
    $conn = conexion();
    if ($conn->connect_error) throw new Exception('Error de conexión: ' . $conn->connect_error);

    // Obtener datos de la empresa
    $query3 = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa, nombre_comercial_empresa, imagen_empresa FROM empresa WHERE 1 LIMIT 1";
    $res_empresa = $conn->query($query3);
    if ($res_empresa === false) throw new Exception('Error consulta empresa: ' . $conn->error);
    $empresa = $res_empresa->fetch_assoc();
    if (!$empresa) {
        $empresa = [
            'ruc_empresa' => '',
            'direccion_empresa' => '',
            'telefono_empresa' => '',
            'razon_social_empresa' => 'SISTEMA FLOTA',
            'nombre_comercial_empresa' => '',
            'imagen_empresa' => ''
        ];
    }

    // Consulta del personal
    $sql = "SELECT
                id_personal,
                per_codigo_personal,
                per_cedula_personal,
                per_nombres_persona,
                per_apellidos_personal,
                genero_personal,
                fecha_nacimiento_personal,
                estado_civil_personal,
                celular_personal,
                telefono_personal,
                nombre_apellido_emergencia,
                parentesco_emergencia,
                celular_fijo_emergencia,
                direccion_emergencia,
                perfil_personal,
                tipo_licencia,
                puntos_licencia,
                estado_personal,
                fecha_creacion,
                ruta_imagen_personal
            FROM personal
            WHERE id_personal = ?
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Error en prepare: ' . $conn->error);
    $stmt->bind_param('i', $id_personal);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) throw new Exception('Personal no encontrado');
    $p = $res->fetch_assoc();
    $stmt->close();

    // Obtener datos del bus (si existe asignación en la tabla `buses`)
    $placa_bus = '-';
    $numero_bus = '-';
    try {
        $stmtBus = $conn->prepare("SELECT placa_buses, disco_buses FROM buses WHERE (id_fkpersonal_buses = ? OR id_fkauxiliar_buses = ?) AND estado_buses = 1 LIMIT 1");
        if ($stmtBus) {
            $stmtBus->bind_param('ii', $p['id_personal'], $p['id_personal']);
            $stmtBus->execute();
            $resBus = $stmtBus->get_result();
            if ($resBus && $resBus->num_rows > 0) {
                $busRow = $resBus->fetch_assoc();
                if (!empty($busRow['placa_buses'])) $placa_bus = $busRow['placa_buses'];
                if (!empty($busRow['disco_buses'])) $numero_bus = $busRow['disco_buses'];
            }
            $stmtBus->close();
        }
    } catch (Exception $e) {
        // ignorar errores de bus y usar valores por defecto
    }

    // ─── CACHÉ NIVEL 2: PDF COMPILADO ──────────────────────────────────────────
    $tmpPdfsDir = __DIR__ . '/../tmp/pdfs/';
    if (!is_dir($tmpPdfsDir)) {
        @mkdir($tmpPdfsDir, 0777, true);
    }
    $cedulaClean = preg_replace('/[^a-zA-Z0-9_-]/', '', $p['per_cedula_personal'] ?? '0');
    $nombreArchivo = 'ficha_personal_' . $cedulaClean . '.pdf';
    $datosHash = md5($id_personal . '_' . ($p['fecha_creacion'] ?? '') . '_' . ($p['puntos_licencia'] ?? '') . '_' . ($p['ruta_imagen_personal'] ?? '') . '_' . ($p['estado_personal'] ?? '') . '_' . $placa_bus . '_' . $numero_bus);
    $cachePdfFile = $tmpPdfsDir . "hoja_vida_{$id_personal}_{$datosHash}.pdf";

    if (!$noCache && file_exists($cachePdfFile) && filesize($cachePdfFile) > 1000) {
        $tTotalMs = round((microtime(true) - $tInicio) * 1000);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $nombreArchivo . '"');
        header('X-PDF-Cache: HIT');
        header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
        header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
        readfile($cachePdfFile);
        $conn->close();
        exit;
    }

    // Mapeos y formatos
    $nombre_completo = trim($p['per_nombres_persona'] . ' ' . $p['per_apellidos_personal']);
    $fecha_nacimiento = !empty($p['fecha_nacimiento_personal']) ? date('d/m/Y', strtotime($p['fecha_nacimiento_personal'])) : '-';
    $fecha_creacion = !empty($p['fecha_creacion']) ? date('d/m/Y', strtotime($p['fecha_creacion'])) : '-';
    
    $genero_map = [1 => 'MASCULINO', 2 => 'FEMENINO'];
    $estado_civil_map = [1 => 'SOLTERO(A)', 2 => 'CASADO(A)', 3 => 'DIVORCIADO(A)', 4 => 'VIUDO(A)'];
    $perfil_map = ['0' => 'Conductor', '1' => 'Auxiliar', '2' => 'Socio'];
    $tipo_licencia_map = [1 => 'A', 2 => 'B', 3 => 'C', 4 => 'D', 5 => 'E'];

    $genero = $genero_map[$p['genero_personal']] ?? '-';
    $estado_civil = $estado_civil_map[$p['estado_civil_personal']] ?? '-';

    $perfil = '-';
    if (isset($p['perfil_personal']) && $p['perfil_personal'] !== '') {
        $raw = (string)$p['perfil_personal'];
        $parts = preg_split('/\s*,\s*/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        $mapped = [];
        foreach ($parts as $part) {
            $key = trim((string)$part);
            if ($key === '') continue;
            if (isset($perfil_map[$key])) $mapped[] = $perfil_map[$key];
            else if (is_numeric($key) && isset($perfil_map[(int)$key])) $mapped[] = $perfil_map[(int)$key];
            else $mapped[] = $key;
        }
        if (!empty($mapped)) $perfil = implode(', ', array_unique($mapped));
    }
    $tipo_licencia = $tipo_licencia_map[$p['tipo_licencia']] ?? '-';

    // Obtener logo de empresa optimizado para TCPDF
    $logoEmpresa = null;
    if (function_exists('obtenerRutaLogoEmpresa')) {
        $logoEmpresa = obtenerRutaLogoEmpresa($conn, $empresa['imagen_empresa'] ?? null);
    }
    $conn->close();

    // ─── RESOLVER FOTO DEL PERSONAL (DIRECTO A ARCHIVO EN DISCO) ───────────────
    $ruta = trim($p['ruta_imagen_personal'] ?? '');
    $fotoLocal = null;

    if ($ruta !== '') {
        $cleanRuta = ltrim($ruta, '/\\');
        $baseName = basename($cleanRuta);

        $candidatePaths = [
            dirname(__DIR__, 3) . '/Back/' . $cleanRuta,
            dirname(__DIR__, 3) . '/Back/uploads/personal/' . $baseName,
            dirname(__DIR__, 3) . '/Back/personal/' . $baseName,
            dirname(__DIR__, 2) . '/Back/' . $cleanRuta,
            dirname(__DIR__, 2) . '/Back/uploads/personal/' . $baseName,
            dirname(__DIR__, 2) . '/Back/personal/' . $baseName,
            dirname(__DIR__, 4) . '/Back/' . $cleanRuta,
            dirname(__DIR__, 4) . '/Back/uploads/personal/' . $baseName,
            'c:/laragon/www/SistemaFlota/Back/' . $cleanRuta,
            'c:/laragon/www/SistemaFlota/Back/uploads/personal/' . $baseName,
            'c:/laragon/www/SistemaFlota/Back/personal/' . $baseName,
            __DIR__ . '/../' . $cleanRuta,
            __DIR__ . '/../../' . $cleanRuta,
        ];

        foreach ($candidatePaths as $cand) {
            if (@file_exists($cand) && @is_file($cand)) {
                $imgInfo = @getimagesize($cand);
                if ($imgInfo !== false && !empty($imgInfo[0]) && !empty($imgInfo[1])) {
                    $fotoLocal = realpath($cand);
                    break;
                }
            }
        }

        // Si no está en disco local, probar descarga remota a carpeta tmp
        if (!$fotoLocal) {
            $tmpFotosDir = __DIR__ . '/../tmp/personal/';
            if (!is_dir($tmpFotosDir)) {
                @mkdir($tmpFotosDir, 0777, true);
            }
            $targetTmpFoto = $tmpFotosDir . 'foto_' . $id_personal . '_' . md5($ruta) . '.jpg';

            if (file_exists($targetTmpFoto) && filesize($targetTmpFoto) > 500 && @getimagesize($targetTmpFoto) !== false) {
                $fotoLocal = $targetTmpFoto;
            } else {
                $remoteUrls = [];
                if (preg_match('#^https?://#i', $ruta)) {
                    $remoteUrls[] = $ruta;
                } else {
                    $remoteUrls[] = 'http://localhost:3000/uploads/personal/' . $baseName;
                    $remoteUrls[] = 'http://localhost:3000/personal/foto/' . $id_personal;
                    $remoteUrls[] = 'http://localhost:3000/' . $cleanRuta;
                }

                foreach ($remoteUrls as $url) {
                    if (function_exists('curl_init')) {
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, $url);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
                        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        $resData = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);
                        if ($httpCode === 200 && !empty($resData) && strlen($resData) > 500) {
                            @file_put_contents($targetTmpFoto, $resData);
                            if (@getimagesize($targetTmpFoto) !== false) {
                                $fotoLocal = $targetTmpFoto;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // Configuración badge de puntos de licencia
    $puntos = (isset($p['puntos_licencia']) && $p['puntos_licencia'] !== null && $p['puntos_licencia'] !== '') ? intval($p['puntos_licencia']) : null;
    if ($puntos === null) {
        $puntosBgR = 158; $puntosBgG = 158; $puntosBgB = 158;
        $puntos_display = '-';
    } elseif ($puntos < 10) {
        $puntosBgR = 211; $puntosBgG = 47; $puntosBgB = 47; // Rojo
        $puntos_display = $puntos . ' pts';
    } elseif ($puntos <= 25) {
        $puntosBgR = 255; $puntosBgG = 112; $puntosBgB = 67; // Naranja
        $puntos_display = $puntos . ' pts';
    } else {
        $puntosBgR = 46; $puntosBgG = 125; $puntosBgB = 50; // Verde
        $puntos_display = $puntos . ' pts';
    }

    // ─── INICIALIZAR TCPDF ─────────────────────────────────────────────────────
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('SistemaFlota');
    $pdf->SetAuthor(!empty($empresa['razon_social_empresa']) ? $empresa['razon_social_empresa'] : 'SistemaFlota');
    $pdf->SetTitle('Ficha Personal - ' . $nombre_completo);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(12, 10, 12);
    $pdf->SetAutoPageBreak(true, 10);
    $pdf->AddPage();

    // ─── 1. HEADER NATIVO (LOGO + INFORMACIÓN + FOTO DEL SOCIO) ────────────────
    $startX = 12;
    $startY = 10;
    $usableW = 186;

    // Logo empresa a la izquierda
    if (!empty($logoEmpresa) && @file_exists($logoEmpresa)) {
        $pdf->Image($logoEmpresa, $startX, $startY, 26, 26, '', '', 'T', false, 300, '', false, false, 0, false, false, false);
    }

    // Foto del socio a la derecha (tamaño carnet visible 26 x 32 mm)
    $fotoX = 172;
    $fotoY = $startY;
    $fotoW = 26;
    $fotoH = 32;

    if (!empty($fotoLocal) && @file_exists($fotoLocal)) {
        $pdf->Image($fotoLocal, $fotoX, $fotoY, $fotoW, $fotoH, '', '', 'T', false, 300, '', false, false, 1, false, false, false);
    } else {
        // Marco con texto "SIN FOTO"
        $pdf->SetDrawColor(120, 120, 120);
        $pdf->SetFillColor(245, 245, 245);
        $pdf->Rect($fotoX, $fotoY, $fotoW, $fotoH, 'DF');
        $pdf->SetXY($fotoX, $fotoY + 12);
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetTextColor(100, 100, 100);
        $pdf->Cell($fotoW, 4, 'SIN FOTO', 0, 1, 'C');
    }

    // Información de la empresa (Centrada)
    $infoX = $startX + 28;
    $infoW = $fotoX - $infoX - 2;

    $pdf->SetXY($infoX, $startY + 2);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->SetTextColor(0, 0, 0);
    $companyName = !empty($empresa['razon_social_empresa']) ? $empresa['razon_social_empresa'] : (!empty($empresa['nombre_comercial_empresa']) ? $empresa['nombre_comercial_empresa'] : 'EMPRESA');
    $pdf->Cell($infoW, 6, mb_strtoupper($companyName, 'UTF-8'), 0, 1, 'C');

    $pdf->SetX($infoX);
    $pdf->SetFont('helvetica', '', 8.5);
    $pdf->SetTextColor(50, 50, 50);
    $pdf->Cell($infoW, 4.5, 'RUC: ' . ($empresa['ruc_empresa'] ?? '-') . ' | Tel: ' . ($empresa['telefono_empresa'] ?? '-'), 0, 1, 'C');

    $pdf->SetX($infoX);
    $pdf->Cell($infoW, 4.5, 'Dirección: ' . ($empresa['direccion_empresa'] ?? '-'), 0, 1, 'C');

    // Línea divisoria bajo el header
    $lineY = $startY + 35;
    $pdf->SetDrawColor(0, 0, 0);
    $pdf->SetLineWidth(0.35);
    $pdf->Line($startX, $lineY, $startX + $usableW, $lineY);

    // ─── 2. TÍTULO PRINCIPAL ───────────────────────────────────────────────────
    $pdf->SetXY($startX, $lineY + 3);
    $pdf->SetFont('helvetica', 'B', 11);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($usableW, 6, 'DATOS PERSONALES', 0, 1, 'C');

    // ─── 3. TABLA DE DATOS PERSONALES (ANCHO COMPLETO) ─────────────────────────
    $pdf->SetY($pdf->GetY() + 1);
    $lblW = 42;
    $valW = $usableW - $lblW;
    $rowH = 5.2;

    $datosGenerales = [
        'CÉDULA:' => $p['per_cedula_personal'] ?? '-',
        'NOMBRES:' => $p['per_nombres_persona'] ?? '-',
        'APELLIDOS:' => $p['per_apellidos_personal'] ?? '-',
        'GÉNERO:' => $genero,
        'FECHA NACIMIENTO:' => $fecha_nacimiento,
        'CONTACTO:' => trim(($p['celular_personal'] ?? '') . ($p['telefono_personal'] ? ' / ' . $p['telefono_personal'] : '')) ?: '-',
        'ESTADO CIVIL:' => $estado_civil,
        'DIRECCIÓN:' => $p['direccion_emergencia'] ?? '-',
    ];

    $pdf->SetDrawColor(180, 180, 180);
    $pdf->SetLineWidth(0.2);

    foreach ($datosGenerales as $label => $value) {
        $pdf->SetFont('helvetica', 'B', 8.5);
        $pdf->SetFillColor(242, 242, 242);
        $pdf->SetTextColor(30, 30, 30);
        $pdf->Cell($lblW, $rowH, '  ' . $label, 1, 0, 'L', true);

        $pdf->SetFont('helvetica', '', 8.5);
        $pdf->SetFillColor(255, 255, 255);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($valW, $rowH, '  ' . $value, 1, 1, 'L', false);
    }

    // ─── 4. DOS COLUMNAS (EMERGENCIA / BUS VS LICENCIA / ADICIONALES) ──────────
    $colY = $pdf->GetY() + 4;
    $colW = ($usableW - 4) / 2; // 91 mm cada columna
    $col1X = $startX;
    $col2X = $startX + $colW + 4;
    $secH = 5.2;
    $cRowH = 5.0;
    $cLblW = 32;
    $cValW = $colW - $cLblW;

    // ── COLUMNA 1 (IZQUIERDA) ──
    $pdf->SetXY($col1X, $colY);

    // Sección Contacto de Emergencia
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->SetFillColor(210, 210, 210);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($colW, $secH, ' CONTACTO DE EMERGENCIA', 1, 1, 'L', true);

    $emergencia = [
        'NOMBRES:' => $p['nombre_apellido_emergencia'] ?? '-',
        'PARENTESCO:' => $p['parentesco_emergencia'] ?? '-',
        'CONTACTO:' => $p['celular_fijo_emergencia'] ?? '-',
        'DIRECCIÓN:' => $p['direccion_emergencia'] ?? '-',
    ];

    foreach ($emergencia as $lbl => $val) {
        $pdf->SetX($col1X);
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetFillColor(245, 245, 245);
        $pdf->SetTextColor(40, 40, 40);
        $pdf->Cell($cLblW, $cRowH, ' ' . $lbl, 1, 0, 'L', true);

        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($cValW, $cRowH, ' ' . $val, 1, 1, 'L', false);
    }

    // Sección Datos Bus
    $pdf->SetY($pdf->GetY() + 3);
    $pdf->SetX($col1X);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->SetFillColor(210, 210, 210);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($colW, $secH, ' DATOS BUS', 1, 1, 'L', true);

    $datosBus = [
        'PLACA:' => $placa_bus,
        'Nº BUS:' => $numero_bus,
    ];

    foreach ($datosBus as $lbl => $val) {
        $pdf->SetX($col1X);
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetFillColor(245, 245, 245);
        $pdf->SetTextColor(40, 40, 40);
        $pdf->Cell($cLblW, $cRowH, ' ' . $lbl, 1, 0, 'L', true);

        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($cValW, $cRowH, ' ' . $val, 1, 1, 'L', false);
    }

    // ── COLUMNA 2 (DERECHA) ──
    $pdf->SetXY($col2X, $colY);

    // Sección Datos Licencia
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->SetFillColor(210, 210, 210);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($colW, $secH, ' DATOS LICENCIA', 1, 1, 'L', true);

    // Fila Tipo
    $pdf->SetX($col2X);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetFillColor(245, 245, 245);
    $pdf->SetTextColor(40, 40, 40);
    $pdf->Cell($cLblW, $cRowH, ' TIPO:', 1, 0, 'L', true);

    $pdf->SetFont('helvetica', '', 8);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($cValW, $cRowH, ' ' . $tipo_licencia, 1, 1, 'L', false);

    // Fila Puntos con Badge coloreado
    $pdf->SetX($col2X);
    $pdf->SetFont('helvetica', 'B', 8);
    $pdf->SetFillColor(245, 245, 245);
    $pdf->SetTextColor(40, 40, 40);
    $pdf->Cell($cLblW, $cRowH, ' PUNTOS:', 1, 0, 'L', true);

    $currX = $pdf->GetX();
    $currY = $pdf->GetY();
    $pdf->Cell($cValW, $cRowH, '', 1, 1, 'L', false);

    // Dibujar badge dentro de la celda de puntos
    $badgeW = 16;
    $badgeH = 3.6;
    $badgeX = $currX + 3;
    $badgeY = $currY + 0.7;

    $pdf->SetFillColor($puntosBgR, $puntosBgG, $puntosBgB);
    $pdf->Rect($badgeX, $badgeY, $badgeW, $badgeH, 'F');
    $pdf->SetXY($badgeX, $badgeY);
    $pdf->SetFont('helvetica', 'B', 7.5);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell($badgeW, $badgeH, $puntos_display, 0, 0, 'C');

    // Sección Datos Adicionales
    $pdf->SetY($pdf->GetY() + 4.3);
    $pdf->SetX($col2X);
    $pdf->SetFont('helvetica', 'B', 8.5);
    $pdf->SetFillColor(210, 210, 210);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->Cell($colW, $secH, ' DATOS ADICIONALES', 1, 1, 'L', true);

    $adicionales = [
        'PERFIL:' => $perfil,
        'CÓDIGO:' => $p['per_codigo_personal'] ?? '-',
        'ESTADO:' => ($p['estado_personal'] == 1 ? 'ACTIVO' : 'INACTIVO'),
        'FECHA REGISTRO:' => $fecha_creacion,
    ];

    foreach ($adicionales as $lbl => $val) {
        $pdf->SetX($col2X);
        $pdf->SetFont('helvetica', 'B', 8);
        $pdf->SetFillColor(245, 245, 245);
        $pdf->SetTextColor(40, 40, 40);
        $pdf->Cell($cLblW, $cRowH, ' ' . $lbl, 1, 0, 'L', true);

        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($cValW, $cRowH, ' ' . $val, 1, 1, 'L', false);
    }

    // ─── 5. FOOTER NATIVO ──────────────────────────────────────────────────────
    $footerY = 280;
    $pdf->SetDrawColor(200, 200, 200);
    $pdf->SetLineWidth(0.2);
    $pdf->Line($startX, $footerY, $startX + $usableW, $footerY);

    $pdf->SetXY($startX, $footerY + 1.5);
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetTextColor(110, 110, 110);
    $pdf->Cell($usableW, 4, 'Documento generado el ' . date('d/m/Y H:i:s') . ' | ' . (!empty($empresa['razon_social_empresa']) ? $empresa['razon_social_empresa'] : 'SistemaFlota'), 0, 1, 'C');

    // ─── GENERACIÓN Y GUARDADO EN CACHÉ ────────────────────────────────────────
    $pdfContent = $pdf->Output('', 'S');
    @file_put_contents($cachePdfFile, $pdfContent);

    $tTotalMs = round((microtime(true) - $tInicio) * 1000);
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $nombreArchivo . '"');
    header('X-PDF-Cache: MISS');
    header('X-PDF-Time-Total: ' . $tTotalMs . 'ms');
    header('X-PDF-Memory-Peak: ' . round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB');
    echo $pdfContent;
    exit;

} catch (Exception $e) {
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Error: ' . $e->getMessage();
    exit;
}
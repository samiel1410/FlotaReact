<?php
require_once('../library/tcpdf.php');
require_once("../db.php");
date_default_timezone_set('America/Guayaquil');

try {
    // Obtener id_personal de forma segura
    $id_personal = 0;
    if (isset($_GET['id_personal'])) $id_personal = intval($_GET['id_personal']);
    if ($id_personal <= 0) throw new Exception('ID inválido');

    // Conexión
    $conn = conexion();
    if ($conn->connect_error) throw new Exception('Error de conexión: ' . $conn->connect_error);

    // Obtener datos de la empresa
    $query3 = "SELECT id_empresa, telefono_empresa, correo_empresa, ruc_empresa, direccion_empresa, razon_social_empresa, imagen_empresa FROM empresa WHERE 1";
    $res_empresa = $conn->query($query3);
    if ($res_empresa === false) throw new Exception('Error consulta empresa: ' . $conn->error);
    $empresa = $res_empresa->fetch_assoc();
    if (!$empresa) {
        $empresa = [
            'ruc_empresa' => '',
            'direccion_empresa' => '',
            'telefono_empresa' => '',
            'razon_social_empresa' => '',
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
    $conn->close();

    // Mapeos y formatos
    $nombre_completo = trim($p['per_nombres_persona'] . ' ' . $p['per_apellidos_personal']);
    $fecha_nacimiento = $p['fecha_nacimiento_personal'] ? date('d/m/Y', strtotime($p['fecha_nacimiento_personal'])) : '';
    $fecha_creacion = $p['fecha_creacion'] ? date('d/m/Y', strtotime($p['fecha_creacion'])) : '';
    
    $genero_map = [1 => 'MASCULINO', 2 => 'FEMENINO'];
    $estado_civil_map = [1 => 'SOLTERO(A)', 2 => 'CASADO(A)', 3 => 'DIVORCIADO(A)', 4 => 'VIUDO(A)'];
    // Perfil puede ser CSV (ej: "0,2"). Mapear a nombres legibles.
    $perfil_map = [
        '0' => 'Conductor',
        '1' => 'Auxiliar',
        '2' => 'Socio'
    ];
    $tipo_licencia_map = [1 => 'A', 2 => 'B', 3 => 'C', 4 => 'D', 5 => 'E'];

    $genero = isset($genero_map[$p['genero_personal']]) ? $genero_map[$p['genero_personal']] : '';
    $estado_civil = isset($estado_civil_map[$p['estado_civil_personal']]) ? $estado_civil_map[$p['estado_civil_personal']] : '';
    // Normalizar y separar perfiles si vienen en formato CSV
    $perfil = '';
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
    $tipo_licencia = isset($tipo_licencia_map[$p['tipo_licencia']]) ? $tipo_licencia_map[$p['tipo_licencia']] : '';

    // Preparar ruta de la imagen
    if (!empty($_GET['api_url'])) {
        $apiBase = rtrim($_GET['api_url'], '/');
    } else {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
        if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
            $apiBase = 'http://localhost/flota_node';
        } else {
            $apiBase = $scheme . '://' . $host;
        }
    }

    $ruta = trim($p['ruta_imagen_personal']);
    $imgFull = '';
    if ($ruta !== '') {
        if (preg_match('#^https?://#i', $ruta)) {
            $imgFull = $ruta;
        } else {
            $imgFull = rtrim($apiBase, '/') . '/' . ltrim($ruta, '/\\');
        }
    }

    // Verificar si la imagen es accesible
    $hasImage = false;
    if ($imgFull !== '') {
        $imgInfo = @getimagesize($imgFull);
        if ($imgInfo !== false) {
            $hasImage = true;
        } else {
            $cand = __DIR__ . '/../' . ltrim($ruta, '/\\');
            if (file_exists($cand)) {
                $imgFull = $cand;
                $hasImage = true;
            } else {
                $cand2 = __DIR__ . '/../../' . ltrim($ruta, '/\\');
                if (file_exists($cand2)) {
                    $imgFull = $cand2;
                    $hasImage = true;
                }
            }
        }
    }

    // Preparar estilo para puntos_licencia
    $puntos = isset($p['puntos_licencia']) ? intval($p['puntos_licencia']) : 0;
    if ($puntos < 10) {
        $puntosBg = '#d32f2f';
        $puntosColor = '#ffffff';
    } elseif ($puntos >= 10 && $puntos <= 25) {
        $puntosBg = '#ff7043';
        $puntosColor = '#ffffff';
    } elseif ($puntos >= 30) {
        $puntosBg = '#2e7d32';
        $puntosColor = '#ffffff';
    } else {
        $puntosBg = '#9e9e9e';
        $puntosColor = '#ffffff';
    }

    // Calcular color de texto óptimo según contraste del fondo (mejora legibilidad)
    function hexToRgb($hex) {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        return [hexdec(substr($hex,0,2)), hexdec(substr($hex,2,2)), hexdec(substr($hex,4,2))];
    }
    function getLuminance($r, $g, $b) {
        $rs = $r/255; $gs = $g/255; $bs = $b/255;
        $rs = ($rs <= 0.03928) ? $rs/12.92 : pow((($rs+0.055)/1.055), 2.4);
        $gs = ($gs <= 0.03928) ? $gs/12.92 : pow((($gs+0.055)/1.055), 2.4);
        $bs = ($bs <= 0.03928) ? $bs/12.92 : pow((($bs+0.055)/1.055), 2.4);
        return 0.2126 * $rs + 0.7152 * $gs + 0.0722 * $bs;
    }
    try {
        list($rr, $gg, $bb) = hexToRgb($puntosBg);
        $lum = getLuminance($rr, $gg, $bb);
        // Si el fondo es claro, usar texto negro, si es oscuro usar blanco
        $puntosColor = ($lum > 0.5) ? '#000000' : '#ffffff';
    } catch (Exception $e) {
        // fallback
        $puntosColor = '#ffffff';
    }

    // Preparar texto a mostrar para puntos (si no existe, mostrar '-')
    $puntos_display = (isset($p['puntos_licencia']) && $p['puntos_licencia'] !== null && $p['puntos_licencia'] !== '') ? intval($p['puntos_licencia']) . ' pts' : '-';

    // Log para depuración (se puede quitar luego)
    error_log('[hoja_vida_personal] id_personal=' . $id_personal . ' puntos_raw=' . var_export(isset($p['puntos_licencia']) ? $p['puntos_licencia'] : null, true));

    // Crear PDF
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('FlotaPelileo');
    $pdf->SetAuthor('FlotaPelileo');
    $pdf->SetTitle('Ficha Personal - ' . $nombre_completo);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(8, 8, 8);
    $pdf->SetAutoPageBreak(true, 10);
    $pdf->AddPage();

    // Estilos CSS optimizados
    $css = '<style>
        .header {
            width: 100%;
            margin-bottom: 6px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 3px;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: top;
            padding: 0;
        }
        .logo-cell {
            width: 60px;
            text-align: left;
        }
        .info-cell {
            text-align: center;
            padding: 0 5px;
        }
        .photo-cell {
            width: 70px;
            text-align: right;
        }
        .logo-img {
            max-width: 50px;
            max-height: 50px;
            width: auto;
            height: auto;
        }
        .coop-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 1px;
            line-height: 1.1;
        }
        .coop-info {
            font-size: 8px;
            margin-bottom: 1px;
            line-height: 1.1;
        }
        .photo-frame {
            border: 1px solid #000;
            padding: 1px;
            background: white;
            width: 60px;
            height: 70px;
            display: inline-block;
        }
        .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .main-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 6px 0;
            text-decoration: underline;
        }
        .section-title {
            font-size: 10px;
            font-weight: bold;
            background-color: #d0d0d0;
            padding: 2px 6px;
            margin: 5px 0 3px 0;
            border: 0.5px solid #000;
        }
        .data-table {
            width: 100%;
            font-size: 9px;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        .data-table td {
            padding: 3px 5px;
            vertical-align: top;
            border: 0.5px solid #000;
        }
        .label {
            font-weight: bold;
            width: 35%;
            background-color: #f0f0f0;
        }
        .value {
            width: 65%;
        }
        .two-columns {
            display: flex;
            gap: 6px;
            margin-bottom: 4px;
        }
        .column {
            flex: 1;
        }
        .footer {
            text-align: center;
            margin-top: 8px;
            font-size: 7px;
            color: #555;
            border-top: 0.5px solid #ccc;
            padding-top: 3px;
        }
    </style>';

    // Contenido HTML optimizado
    $html = $css;
    
    // Header con tabla para mejor control de posiciones
    $html .= '<div class="header">';
    $html .= '<table class="header-table">';
    $html .= '<tr>';
    
    // Celda izquierda: Logo de la empresa (pequeño)
    $html .= '<td class="logo-cell">';
    if (!empty($empresa['imagen_empresa'])) {
        $html .= '<img class="logo-img" src="data:image/*;base64,' . $empresa['imagen_empresa'] . '"/>';
    }
    $html .= '</td>';
    
    // Celda central: Información de la empresa
    $html .= '<td class="info-cell">';
    $companyName = !empty($empresa['razon_social_empresa']) ? $empresa['razon_social_empresa'] : 'COOPERATIVA DE TRANSPORTES FLOTA PELILEO';
    $html .= '<div class="coop-title">' . htmlspecialchars($companyName) . '</div>';
    $html .= '<div class="coop-info">RUC: ' . htmlspecialchars($empresa['ruc_empresa']) . ' | Tel: ' . htmlspecialchars($empresa['telefono_empresa']) . '</div>';
    $html .= '<div class="coop-info">Dirección: ' . htmlspecialchars($empresa['direccion_empresa']) . '</div>';
    $html .= '</td>';
    
    // Celda derecha: Foto del socio (esquina superior derecha, pequeña)
    $html .= '<td class="photo-cell">';
    if ($hasImage) {
        $imgForHtml = str_replace('\\', '/', $imgFull);
        $html .= '<div class="photo-frame"><img src="' . htmlspecialchars($imgForHtml) . '" alt="Foto"/></div>';
    } else {
        $html .= '<div class="photo-frame" style="display:flex;align-items:center;justify-content:center;background:#f0f0f0;">';
        $html .= '<div style="color:#666;font-size:7px;text-align:center;">SIN<br>FOTO</div>';
        $html .= '</div>';
    }
    $html .= '</td>';
    
    $html .= '</tr>';
    $html .= '</table>';
    $html .= '</div>';

    // Título principal
    $html .= '<div class="main-title">DATOS PERSONALES</div>';

    // Datos personales en tabla
    $html .= '<table class="data-table">';
    $html .= '<tr><td class="label">CÉDULA:</td><td class="value">' . htmlspecialchars($p['per_cedula_personal']) . '</td></tr>';
    $html .= '<tr><td class="label">NOMBRES:</td><td class="value">' . htmlspecialchars($p['per_nombres_persona']) . '</td></tr>';
    $html .= '<tr><td class="label">APELLIDOS:</td><td class="value">' . htmlspecialchars($p['per_apellidos_personal']) . '</td></tr>';
    $html .= '<tr><td class="label">GÉNERO:</td><td class="value">' . htmlspecialchars($genero) . '</td></tr>';
    $html .= '<tr><td class="label">FECHA NACIMIENTO:</td><td class="value">' . htmlspecialchars($fecha_nacimiento) . '</td></tr>';
    $html .= '<tr><td class="label">CONTACTO:</td><td class="value">' . htmlspecialchars($p['celular_personal']) . 
             ($p['telefono_personal'] ? ' / ' . htmlspecialchars($p['telefono_personal']) : '') . '</td></tr>';
    $html .= '<tr><td class="label">ESTADO CIVIL:</td><td class="value">' . htmlspecialchars($estado_civil) . '</td></tr>';
    $html .= '<tr><td class="label">DIRECCIÓN:</td><td class="value">' . htmlspecialchars($p['direccion_emergencia']) . '</td></tr>';
    $html .= '</table>';

    // Información en dos columnas para el resto de datos
    $html .= '<div class="two-columns">';
    
    // Columna izquierda - Contacto de emergencia y datos bus
    $html .= '<div class="column">';
    $html .= '<div class="section-title">CONTACTO DE EMERGENCIA</div>';
    $html .= '<table class="data-table">';
    $html .= '<tr><td class="label">NOMBRES:</td><td class="value">' . htmlspecialchars($p['nombre_apellido_emergencia']) . '</td></tr>';
    $html .= '<tr><td class="label">PARENTESCO:</td><td class="value">' . htmlspecialchars($p['parentesco_emergencia']) . '</td></tr>';
    $html .= '<tr><td class="label">CONTACTO:</td><td class="value">' . htmlspecialchars($p['celular_fijo_emergencia']) . '</td></tr>';
    $html .= '<tr><td class="label">DIRECCIÓN:</td><td class="value">' . htmlspecialchars($p['direccion_emergencia']) . '</td></tr>';
    $html .= '</table>';
    
    $html .= '<div class="section-title">DATOS BUS</div>';
    $html .= '<table class="data-table">';
    $html .= '<tr><td class="label">PLACA:</td><td class="value">' . htmlspecialchars($placa_bus) . '</td></tr>';
    $html .= '<tr><td class="label">Nº BUS:</td><td class="value">' . htmlspecialchars($numero_bus) . '</td></tr>';
    $html .= '</table>';
    $html .= '</div>';

    // Columna derecha - Datos licencia y adicionales
    $html .= '<div class="column">';
    $html .= '<div class="section-title">DATOS LICENCIA</div>';
    $html .= '<table class="data-table">';
    $html .= '<tr><td class="label">TIPO:</td><td class="value">' . htmlspecialchars($tipo_licencia) . '</td></tr>';
    $html .= '<tr><td class="label">PUNTOS:</td><td class="value">';
    // Mostrar tanto el badge estilizado como texto plano para asegurar visibilidad en TCPDF
    $html .= '<span style="display:inline-block;background:' . $puntosBg . ';color:' . $puntosColor . ';padding:4px 8px;border-radius:4px;font-weight:bold;font-size:10px;">' . htmlspecialchars($puntos_display) . '</span>';
    $html .= '&nbsp;<span style="font-size:10px;color:#000000;">' . htmlspecialchars($puntos_display) . '</span>';
    $html .= '</td></tr>';
    $html .= '</table>';
    
    $html .= '<div class="section-title">DATOS ADICIONALES</div>';
    $html .= '<table class="data-table">';
    $html .= '<tr><td class="label">PERFIL:</td><td class="value">' . htmlspecialchars($perfil) . '</td></tr>';
    $html .= '<tr><td class="label">CÓDIGO:</td><td class="value">' . htmlspecialchars($p['per_codigo_personal']) . '</td></tr>';
    $html .= '<tr><td class="label">ESTADO:</td><td class="value">' . ($p['estado_personal'] == 1 ? 'ACTIVO' : 'INACTIVO') . '</td></tr>';
    $html .= '<tr><td class="label">FECHA REGISTRO:</td><td class="value">' . htmlspecialchars($fecha_creacion) . '</td></tr>';
    $html .= '</table>';
    $html .= '</div>';
    
    $html .= '</div>';

    // Footer
    $html .= '<div class="footer">';
    $html .= 'Documento generado el ' . date('d/m/Y H:i:s') . ' | ' . htmlspecialchars($empresa['razon_social_empresa']);
    $html .= '</div>';

    // Escribir HTML
    $pdf->writeHTML($html, true, false, true, false, '');

    // Salida PDF
    $pdf->Output('ficha_personal_' . $p['per_cedula_personal'] . '.pdf', 'I');
    exit;

} catch (Exception $e) {
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Error: ' . $e->getMessage();
    exit;
}
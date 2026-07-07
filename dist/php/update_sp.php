<?php
require 'db.php';
$conn = conexion();
$drop = "DROP PROCEDURE IF EXISTS insertar_ruta";
mysqli_query($conn, $drop);
$create = "CREATE DEFINER=`root`@`localhost` PROCEDURE `insertar_ruta`(IN `nombre_rutas` VARCHAR(200), IN `id_fkorigen_rutas` INT, IN `id_fkdestino_rutas` INT, IN `minutos_rutas` INT, IN `estado_rutas` INT, IN `id_fkusuario_rutas` INT, IN `fecha_inicio_rutas` DATETIME, IN `valor_rutas` DOUBLE, IN `piso_rutas` INT, IN `andes_rutas` VARCHAR(20), IN `hora_salida_rutas` VARCHAR(100), IN `codigo_rutas` VARCHAR(20))
INSERT INTO rutas( nombre_rutas, id_fkorigen_rutas, id_fkdestino_rutas, minutos_rutas, estado_rutas, id_fkusuario_rutas, fecha_inicio_rutas, valor_rutas, piso_rutas, andes_rutas, hora_salida_rutas,codigo_rutas ) VALUES (nombre_rutas, id_fkorigen_rutas, id_fkdestino_rutas, minutos_rutas, estado_rutas, id_fkusuario_rutas, fecha_inicio_rutas, valor_rutas, piso_rutas, andes_rutas, hora_salida_rutas,codigo_rutas)";
mysqli_query($conn, $create);
echo mysqli_error($conn) . "\n";
echo "SP updated\n";
?>

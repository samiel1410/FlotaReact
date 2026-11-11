<?php
require 'db.php';
$conn = conexion();
mysqli_query($conn, "ALTER TABLE rutas MODIFY andes_rutas VARCHAR(20) NULL");
echo mysqli_error($conn) . "\n";
echo "Altered rutas\n";
?>

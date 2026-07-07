<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SHOW CREATE PROCEDURE insertar_ruta");
$row = mysqli_fetch_assoc($res);
echo $row['Create Procedure'] . "\n";
?>

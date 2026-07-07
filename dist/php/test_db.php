<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SELECT id_usuario, id_fksucursal_usuario FROM usuario LIMIT 10");
while($row = mysqli_fetch_assoc($res)) {
    echo "user: " . $row['id_usuario'] . " - suc: " . $row['id_fksucursal_usuario'] . "\n";
}
?>

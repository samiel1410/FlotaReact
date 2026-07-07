<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SELECT id_usuario, username_usuario, id_fkrol_usuario FROM usuario LIMIT 10");
while($row = mysqli_fetch_assoc($res)) {
    echo "user: " . $row['username_usuario'] . " - rol: " . $row['id_fkrol_usuario'] . "\n";
}
?>

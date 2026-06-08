<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SELECT imagen_empresa FROM empresa LIMIT 1");
if ($row = mysqli_fetch_assoc($res)) {
    file_put_contents('logo_raw.txt', substr($row['imagen_empresa'], 0, 500));
    echo "Done";
} else {
    echo "No logo found";
}

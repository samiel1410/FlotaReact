<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SHOW CREATE VIEW guia_nota_venta_lista");
$row = mysqli_fetch_assoc($res);
echo $row['Create View'] . "\n\n";

$res2 = mysqli_query($conn, "SHOW CREATE VIEW guia_lista");
$row2 = mysqli_fetch_assoc($res2);
echo $row2['Create View'] . "\n";
?>

<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, "SELECT id_fksucursal_boleto FROM boletos ORDER BY id_boleto DESC LIMIT 5");
while($row = mysqli_fetch_assoc($res)) {
    echo "id_fksucursal_boleto: " . $row['id_fksucursal_boleto'] . "\n";
}
?>

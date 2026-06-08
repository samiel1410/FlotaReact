<?php
require 'db.php';
$conn = conexion();
$res = mysqli_query($conn, 'SELECT count(*) as c FROM sucursal');
print_r(mysqli_fetch_assoc($res));

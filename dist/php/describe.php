<?php
require 'db.php';
$c = conexion();
$r = $c->query('DESCRIBE factura');
while($row = $r->fetch_assoc()) {
    echo $row['Field'] . PHP_EOL;
}

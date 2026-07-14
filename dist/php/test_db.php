<?php
require 'db.php';
$c=conexion();
$res=mysqli_query($c, "SELECT * FROM forma_pago WHERE tipo_forma_pago=4");
while($row=mysqli_fetch_assoc($res)) print_r($row);
$res2=mysqli_query($c, "SELECT cc.*, fp.tipo_forma_pago FROM comprobante_cobro cc JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago WHERE fp.tipo_forma_pago = 4");
echo "Comprobante cobro:\n";
while($row=mysqli_fetch_assoc($res2)) print_r($row);

$res3=mysqli_query($c, "SELECT cc.*, fp.tipo_forma_pago FROM comprobante_cobro_nota_venta cc JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago WHERE fp.tipo_forma_pago = 4");
echo "Comprobante cobro nota venta:\n";
while($row=mysqli_fetch_assoc($res3)) print_r($row);

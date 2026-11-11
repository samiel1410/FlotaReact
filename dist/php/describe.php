<?php
require 'db.php';
$c = conexion();
$r = $c->query('SELECT id_guia, fecha_guia, fecha_creacion_guia, estado_cobro_guia, cancelado_por_guia, total_guia, cedula_cliente_remitente, nombre_cliente_remitente FROM guia_nota_venta ORDER BY id_guia DESC LIMIT 5');
if ($r) {
    echo "=== ULTIMAS NOTAS DE VENTA ===\n";
    while ($row = $r->fetch_assoc()) {
        print_r($row);
    }
}
$r2 = $c->query('SELECT cc.*, fp.nombre_forma_pago, fp.tipo_forma_pago FROM comprobante_cobro_nota_venta cc LEFT JOIN forma_pago fp ON cc.id_fkforma_pago = fp.id_forma_pago ORDER BY id_comprobante_cobro DESC LIMIT 5');
if ($r2) {
    echo "=== ULTIMOS COMPROBANTES COBRO NV ===\n";
    while ($row2 = $r2->fetch_assoc()) {
        print_r($row2);
    }
}










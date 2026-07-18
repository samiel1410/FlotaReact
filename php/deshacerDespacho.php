<?php
require_once("db.php");
$id_viaje = $_GET['id_viajes'] ?? 0;

if ($id_viaje > 0) {
    $conn = conexion();
    
    // Buscar el despacho asociado a ese viaje
    $result = $conn->query("SELECT id_despacho_viaje FROM despacho_viaje WHERE id_fkviaje_despacho_viaje = $id_viaje ORDER BY id_despacho_viaje DESC LIMIT 1");
    
    if ($result->num_rows > 0) {
        $despacho = $result->fetch_assoc();
        $id_despacho = $despacho['id_despacho_viaje'];
        
        // 1. Revertir el estado de los cobros a pendiente (0)
        $conn->query("UPDATE cobros c 
                      JOIN despacho_viaje_reteciones dvr ON c.id_cobros = dvr.id_fkcobro_despacho_viaje_reteciones 
                      SET c.estado_cobros = 0, c.fecha_pagado = NULL 
                      WHERE dvr.id_fkdespacho_viaje = $id_despacho");
        
        // 2. Eliminar el historial de retenciones de ese despacho
        $conn->query("DELETE FROM despacho_viaje_reteciones WHERE id_fkdespacho_viaje = $id_despacho");
        
        // 2.5 Eliminar los cobros automáticos que se generaron en ese despacho
        $conn->query("DELETE FROM cobros WHERE id_fkviajes_cobros = $id_viaje AND observacion_cobros = 'Cobro automático en despacho'");
        
        // 3. Revertir deudas en el nuevo motor si aplicara
        $conn->query("UPDATE deudas d 
                      JOIN despacho_retencion_log drl ON d.id_deuda = drl.id_deuda 
                      SET d.valor_pagado = d.valor_pagado - drl.monto_aplicado, 
                          d.saldo_pendiente = d.saldo_pendiente + drl.monto_aplicado,
                          d.estado = 'pendiente'
                      WHERE drl.id_despacho_viaje = $id_despacho");
        $conn->query("DELETE FROM despacho_retencion_log WHERE id_despacho_viaje = $id_despacho");
        
        // 4. Eliminar el despacho
        $conn->query("DELETE FROM despacho_viaje WHERE id_despacho_viaje = $id_despacho");
        
        // 5. Devolver el viaje a estado 1 (Activo / No despachado)
        $conn->query("UPDATE viajes SET estado_viajes = 1 WHERE id_viajes = $id_viaje");
        
        echo "<div style='font-family: sans-serif; padding: 20px;'>";
        echo "<h2 style='color: green;'>¡Éxito! El despacho del viaje $id_viaje ha sido anulado y reiniciado.</h2>";
        echo "<p>Se han eliminado las retenciones, los cobros han vuelto a su estado pendiente y el viaje ya no consta como despachado.</p>";
        echo "<p><b>Ya puedes regresar al sistema y volver a hacer clic en 'Despachar' para que se calcule correctamente con los nuevos cambios.</b></p>";
        echo "<a href='http://localhost:5173/#/despacho-viajes' style='padding: 10px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;'>Volver a Despachos</a>";
        echo "</div>";
    } else {
        echo "<h2 style='color: red; font-family: sans-serif;'>No se encontró ningún despacho para el viaje $id_viaje.</h2>";
    }
} else {
    echo "Por favor provee un ?id_viajes= en la URL.";
}
?>

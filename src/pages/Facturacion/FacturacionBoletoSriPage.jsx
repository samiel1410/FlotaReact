import { useState, useEffect, useRef, useCallback } from 'react';
import { api, clienteApi } from '../../config/axios';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';

export const FacturacionBoletoSriPage = () => {
  const { user } = useAuth();
  const logRef = useRef(null);

  // --- Cliente ---
  const [cliente, setCliente] = useState({
    identificacion: '',
    nombres: '',
    correo: '',
    celular: '',
    direccion: '',
    tipo_identificacion: '05',
    id_cliente: ''
  });

  // --- Viaje / Servicio ---
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [fechaViaje, setFechaViaje] = useState(getLocalDate());
  const [viajes, setViajes] = useState([]);
  const [idViaje, setIdViaje] = useState('');
  const [destinos, setDestinos] = useState([]);
  const [idDestino, setIdDestino] = useState('');
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  // --- Items grid ---
  const [items, setItems] = useState([]);

  // --- Totales ---
  const [subtotal, setSubtotal] = useState(0);
  const [iva, setIva] = useState(0);
  const [total, setTotal] = useState(0);

  // --- Log ---
  const [log, setLog] = useState([]);

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // ─── LOG ───────────────────────────────────────────────────────────────────
  const addLog = useCallback((msg) => {
    const now = new Date().toLocaleTimeString('es-EC', { hour12: false });
    setLog(prev => [...prev, `[${now}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // ─── CARGAR VIAJES POR FECHA ──────────────────────────────────────────────
  const cargarViajes = useCallback(async (fecha) => {
    if (!fecha) return;
    try {
      const res = await api.get('/viajes/viajesSelectBoleto', { params: { fecha } });
      const data = res.data?.data || res.data || [];
      const lista = Array.isArray(data) ? data : [];
      setViajes(lista);
      setIdViaje('');
      setDestinos([]);
      setIdDestino('');
      setViajeSeleccionado(null);
    } catch (err) {
      console.error('Error cargando viajes:', err);
      setViajes([]);
    }
  }, []);

  useEffect(() => {
    if (fechaViaje) cargarViajes(fechaViaje);
  }, [fechaViaje, cargarViajes]);

  // ─── CARGAR DESTINOS POR VIAJE ─────────────────────────────────────────────
  const cargarDestinos = useCallback(async (viajeId) => {
    if (!viajeId) { setDestinos([]); return; }
    try {
      const res = await api.get('/sub_rutas/subrutasSeleccionPaginado', {
        params: { id_viaje: viajeId }
      });
      const data = res.data?.data || res.data || [];
      setDestinos(Array.isArray(data) ? data : []);
      setIdDestino('');
    } catch {
      setDestinos([]);
    }
  }, []);

  const handleViajeChange = (e) => {
    const val = e.target.value;
    setIdViaje(val);
    const viaje = viajes.find(v => String(v.id_viajes) === val || String(v.id_viaje) === val);
    setViajeSeleccionado(viaje || null);
    cargarDestinos(val);
  };

  // ─── BUSCAR CLIENTE ────────────────────────────────────────────────────────
  const buscarCliente = async () => {
    const ident = cliente.identificacion;
    if (!ident || ident.length < 2) {
      Swal.fire('Aviso', 'Ingrese al menos 2 caracteres para buscar', 'warning');
      return;
    }
    setBuscandoCliente(true);
    try {
      const res = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: ident }
      });
      if (res.data?.success && res.data?.total > 0) {
        const c = res.data.data[0];
        setCliente(prev => ({
          ...prev,
          id_cliente: c.id_cliente || '',
          identificacion: c.identificacion_cliente || '',
          nombres: c.nombre_cliente || '',
          correo: c.email_cliente || '',
          celular: c.telefono_cliente || '',
          direccion: c.direccion_cliente || '',
          tipo_identificacion: ident.length === 13 ? '04' : ident.length === 10 ? '05' : '06'
        }));
        addLog(`Cliente encontrado: ${c.nombre_cliente}`);
      } else {
        Swal.fire('Info', 'Identificación no registrada', 'info');
        addLog('Cliente no encontrado');
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
      Swal.fire('Error', 'Fallo al consultar cliente', 'error');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleClienteKeyDown = (e) => {
    if (e.key === 'Enter') buscarCliente();
  };

  // ─── AGREGAR ITEM ──────────────────────────────────────────────────────────
  const agregarItem = () => {
    if (!idDestino) {
      Swal.fire('Aviso', 'Seleccione un destino', 'warning');
      return;
    }
    const destino = destinos.find(d =>
      String(d.id_sub_rutas) === idDestino || String(d.id_sub_ruta) === idDestino
    );
    if (!destino) return;

    const nombreRuta = viajeSeleccionado?.nombre_rutas || viajeSeleccionado?.nombre_ruta || 'Ruta';
    const nombreDestino = destino.nombre_sub_rutas || destino.nombre_sub_ruta || 'Destino';
    const valor = parseFloat(destino.valor_sub_rutas || destino.valor_sub_ruta || 0);
    const descripcion = `${nombreRuta} (${nombreDestino})`;

    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        descripcion,
        cantidad: 1,
        precio: valor,
        total: valor,
        id_viaje: idViaje,
        id_bus: viajeSeleccionado?.id_fkbus_viajes || viajeSeleccionado?.id_bus || '',
        id_destino: idDestino
      }
    ]);
    addLog(`Agregado: ${descripcion} - $${valor.toFixed(2)}`);
  };

  // ─── ELIMINAR ITEM ─────────────────────────────────────────────────────────
  const eliminarItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // ─── CALCULAR TOTALES ──────────────────────────────────────────────────────
  useEffect(() => {
    const sum = items.reduce((acc, item) => acc + (item.total || 0), 0);
    setSubtotal(sum);
    setIva(0); // Boletos de transporte están exentos de IVA (tarifa 0%)
    setTotal(sum);
  }, [items]);

  // ─── LIMPIAR FORMULARIO ────────────────────────────────────────────────────
  const limpiarFormulario = () => {
    setCliente({
      identificacion: '', nombres: '', correo: '', celular: '',
      direccion: '', tipo_identificacion: '05', id_cliente: ''
    });
    setItems([]);
    setSubtotal(0);
    setIva(0);
    setTotal(0);
    setLog([]);
    addLog('Formulario limpiado');
  };

  // ─── GENERAR FACTURA SRI ───────────────────────────────────────────────────
  const generarFactura = async () => {
    // Validaciones
    if (!cliente.identificacion || !cliente.nombres) {
      Swal.fire('Validación', 'Complete los datos del receptor', 'warning');
      return;
    }
    if (items.length === 0) {
      Swal.fire('Validación', 'No hay servicios seleccionados', 'warning');
      return;
    }
    if (!idViaje) {
      Swal.fire('Validación', 'Seleccione un viaje', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Emisión SRI',
      text: '¿Proceder con la transmisión electrónica?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    addLog(`Iniciando transmisión para ${items.length} ítem(s)...`);

    try {
      // Paso 1: Insertar boleto
      const detalles = items.map(item => ({
        total_boleto_detalle: item.total,
        asiento_boleto_detalle: 0,
        precio_boleto_detalle: item.precio,
        descuento_boleto_detalle: 0,
        iva_boleto_detalle: 0,
        nombre_cliente_boleto_detalle: cliente.nombres,
        id_destino: item.id_destino,
        identificacion_boleto_detalle: cliente.identificacion,
        tarifa_boleto_detalle: 'Normal'
      }));

      const firstItem = items[0];
      const idCajaGlobal = user?.id_caja_global || user?.id_caja_boleteria_global || 0;

      addLog('Paso 1: Registrando boleto...');
      const insertRes = await api.post('/boleto/insertarBoleto', {
        identificacion: cliente.identificacion,
        nombres: cliente.nombres,
        viaje: idViaje,
        destino: firstItem.id_destino,
        id_bus: firstItem.id_bus,
        total_final: total,
        detalles_boletos: JSON.stringify(detalles),
        es_reserva: 0,
        es_facturacion_directa: 1,
        origen_emision: 'SRI_DIRECTO',
        tipo_boleto: 'SRI_DIRECTO',
        celular: cliente.celular || '',
        correo: cliente.correo || '',
        direccion: cliente.direccion || '',
        id_caja_global: idCajaGlobal
      });

      if (!insertRes.data?.success) {
        addLog(`❌ Error Paso 1: ${insertRes.data?.message || 'Error al registrar'}`);
        Swal.fire('Error', insertRes.data?.message || 'Error al registrar boleto', 'error');
        setLoading(false);
        return;
      }

      const idBoleto = insertRes.data.id_boleto || insertRes.data.data?.id_boleto;
      addLog(`✅ Boleto registrado (ID: ${idBoleto})`);

      // Limpiar formulario inmediatamente
      limpiarFormulario();

      // Paso 2: Preparar clave de acceso SRI
      addLog('Paso 2: Preparando clave SRI...');
      const prepRes = await api.post('/boleto/prepararBoleto', { id_boleto: idBoleto });

      if (prepRes.data?.success) {
        addLog(`✅ Clave generada: ${prepRes.data.clave_acceso}`);
      } else {
        addLog('⚠️ No se pudo preparar la clave SRI');
      }

      // Paso 3: Generar XML (usa PHP)
      addLog('Paso 3: Generando XML...');
      try {
        const baseUrl = window.location.origin;
        const xmlRes = await fetch(`${baseUrl}/php/negocioXmlBoleto.php?id_boleto=${idBoleto}`);
        const xmlData = await xmlRes.json();

        if (xmlData.success) {
          addLog('✅ XML generado correctamente');
          addLog('Paso 4: Firmando y enviando al SRI...');

          // Paso 4: Enviar a firmar
          const firmaUrl = import.meta.env.VITE_API_FIRMA || '';
          if (firmaUrl) {
            const firmaRes = await fetch(`${firmaUrl}/firmar-enviar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                xml: xmlData.xml,
                ruc: xmlData.ruc || '',
                clave: xmlData.p12_password || ''
              })
            });
            const firmaData = await firmaRes.json();

            if (firmaData.success) {
              addLog(`✅ SRI: ${firmaData.estado || 'AUTORIZADO'}`);
              addLog(`Mensaje: ${firmaData.message || firmaData.mensaje || 'Sin detalles'}`);

              // Registrar autorización
              await api.post('/boleto/registrarAutorizacion', {
                id_boleto: idBoleto,
                estado: firmaData.estado || 'AUTORIZADO',
                mensaje: firmaData.message || firmaData.mensaje || ''
              });

              if (firmaData.estado === 'AUTORIZADO' || firmaData.estado === 'AUTORIZADA') {
                addLog('✅ FACTURA AUTORIZADA EXITOSAMENTE');
                Swal.fire('Éxito', 'El comprobante ha sido autorizado por el SRI.', 'success');
              } else {
                addLog(`⚠️ Estado SRI: ${firmaData.estado}`);
                Swal.fire('Aviso', `Estado: ${firmaData.estado} - ${firmaData.message || ''}`, 'info');
              }
            } else {
              const errorMsg = firmaData.message || firmaData.mensaje || 'Error en firma';
              addLog(`❌ Error al firmar: ${errorMsg}`);
              await api.post('/boleto/registrarAutorizacion', {
                id_boleto: idBoleto,
                estado: 'RECHAZADO',
                mensaje: errorMsg
              });
              Swal.fire('Error al firmar', errorMsg, 'error');
            }
          } else {
            addLog('⚠️ No hay servicio de firma configurado (VITE_API_FIRMA)');
            addLog('✅ Proceso completado. Esperando autorización manual.');
            Swal.fire('Completado', 'Boleto registrado. La autorización SRI se procesará manualmente.', 'success');
          }
        } else {
          addLog('❌ Error generando XML');
          Swal.fire('Error', 'No se pudo generar el XML del boleto', 'error');
        }
      } catch (xmlErr) {
        addLog(`❌ Error en generación XML: ${xmlErr.message}`);
        Swal.fire('Error', 'Error al generar/enviar XML', 'error');
      }
    } catch (err) {
      addLog(`❌ Error crítico: ${err.message}`);
      Swal.fire('Error crítico', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-file-invoice-dollar text-indigo-600"></i>
        Facturación Boleto SRI
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── COLUMNA IZQUIERDA: Cliente + Servicio + Items + Totales ───── */}
        <div className="lg:col-span-2 space-y-6">

          {/* --- SECCIÓN CLIENTE --- */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
              <h2 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                <i className="fas fa-user"></i> DATOS DEL RECEPTOR
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Identificación */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Identificación</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ingrese CI/RUC"
                    value={cliente.identificacion}
                    onChange={e => setCliente(prev => ({ ...prev, identificacion: e.target.value.replace(/\D/g, '') }))}
                    onKeyDown={handleClienteKeyDown}
                    disabled={loading}
                  />
                  <button
                    onClick={buscarCliente}
                    disabled={buscandoCliente || loading}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                    title="Buscar cliente"
                  >
                    <i className={`fas ${buscandoCliente ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                  </button>
                </div>
              </div>
              {/* Nombres */}
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nombres / Razón Social</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  value={cliente.nombres}
                  onChange={e => setCliente(prev => ({ ...prev, nombres: e.target.value }))}
                  required
                />
              </div>
              {/* Correo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  value={cliente.correo}
                  onChange={e => setCliente(prev => ({ ...prev, correo: e.target.value }))}
                />
              </div>
              {/* Teléfono */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Teléfono / Celular</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  value={cliente.celular}
                  onChange={e => setCliente(prev => ({ ...prev, celular: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              {/* Tipo Identificación */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tipo Identificación</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  value={cliente.tipo_identificacion}
                  onChange={e => setCliente(prev => ({ ...prev, tipo_identificacion: e.target.value }))}
                >
                  <option value="04">RUC</option>
                  <option value="05">CÉDULA</option>
                  <option value="06">PASAPORTE</option>
                  <option value="07">CONS. FINAL</option>
                </select>
              </div>
              {/* Dirección (full width) */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  value={cliente.direccion}
                  onChange={e => setCliente(prev => ({ ...prev, direccion: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* --- SECCIÓN SERVICIO --- */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
              <h2 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <i className="fas fa-bus"></i> DETALLES DEL SERVICIO
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Fecha + Ruta + Destino + Botón */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    value={fechaViaje}
                    onChange={e => setFechaViaje(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ruta / Frecuencia</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    value={idViaje}
                    onChange={handleViajeChange}
                  >
                    <option value="">Seleccione...</option>
                    {viajes.map(v => (
                      <option key={v.id_viajes || v.id_viaje} value={v.id_viajes || v.id_viaje}>
                        {v.nombre_rutas || v.nombre_ruta || `Viaje #${v.id_viajes || v.id_viaje}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Destino Final</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    value={idDestino}
                    onChange={e => setIdDestino(e.target.value)}
                    disabled={!idViaje}
                  >
                    <option value="">Seleccione...</option>
                    {destinos.map(d => (
                      <option key={d.id_sub_rutas} value={d.id_sub_rutas}>
                        {d.nombre_sub_rutas} - ${parseFloat(d.valor_sub_rutas || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={agregarItem}
                    disabled={loading || !idDestino}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-plus"></i> Agregar
                  </button>
                </div>
              </div>

              {/* Grid de Items */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase">Descripción</th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-bold text-slate-600 uppercase w-16">Cant.</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-600 uppercase w-24">P. Unit.</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-600 uppercase w-24">Total</th>
                      <th className="px-4 py-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          <i className="fas fa-inbox text-2xl mb-2 block"></i>
                          No hay servicios agregados. Seleccione ruta, destino y presione "Agregar".
                        </td>
                      </tr>
                    ) : (
                      items.map(item => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-700">{item.descripcion}</td>
                          <td className="px-4 py-2.5 text-center">{item.cantidad}</td>
                          <td className="px-4 py-2.5 text-right font-medium">${item.precio.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700">${item.total.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => eliminarItem(item.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUMNA DERECHA: Totales + Log + Acciones ──────────────────── */}
        <div className="space-y-6">

          {/* Totales */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fas fa-calculator"></i> TOTALES
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Subtotal 0%</span>
                <span className="text-sm font-bold text-slate-800">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">IVA</span>
                <span className="text-sm font-bold text-slate-800">${iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-base font-bold text-slate-800">TOTAL A PAGAR</span>
                <span className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fas fa-terminal"></i> LOG
              </h2>
            </div>
            <div
              ref={logRef}
              className="p-3 h-40 overflow-y-auto font-mono text-[11px] leading-relaxed bg-slate-900 text-emerald-300"
            >
              {log.length === 0 ? (
                <span className="text-slate-500 italic">Historial de procesamiento...</span>
              ) : (
                log.map((line, i) => (
                  <div key={i} className={line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-emerald-300' : ''}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            <button
              onClick={limpiarFormulario}
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 font-bold text-sm border border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-sync"></i>
              Limpiar Formulario
            </button>
            <button
              onClick={generarFactura}
              disabled={loading}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-bold text-sm shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
              ) : (
                <><i className="fas fa-cloud-upload-alt"></i> Generar Factura SRI</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

const PagarDeudaModal = ({ deuda, onClose, onSuccess }) => {
  const [monto, setMonto] = useState(deuda?.saldo_pendiente || 0);
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePagar = async () => {
    if (!monto || parseFloat(monto) <= 0) { Swal.fire('Validación', 'Ingrese un monto válido', 'warning'); return; }
    setLoading(true);
    try {
      const res = await api.post('/deuda/pagar', { id_deuda: deuda.id_deuda, monto, observacion });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Pago registrado', 'success');
        onSuccess();
      } else Swal.fire('Error', res.data?.error, 'error');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pagar - ${deuda?.concepto || ''}`} width="max-w-md">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
          <p><span className="font-bold text-slate-600">Deuda:</span> {deuda?.concepto}</p>
          <p><span className="font-bold text-slate-600">Original:</span> {formatCurrency(deuda?.valor_original)}</p>
          <p><span className="font-bold text-slate-600">Pagado:</span> <span className="text-emerald-600">{formatCurrency(deuda?.valor_pagado)}</span></p>
          <p><span className="font-bold text-slate-600">Saldo:</span> <span className="text-amber-600 font-bold">{formatCurrency(deuda?.saldo_pendiente)}</span></p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Monto a pagar</label>
          <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" value={monto} onChange={e => setMonto(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Observación</label>
          <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3} value={observacion} onChange={e => setObservacion(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handlePagar} disabled={loading} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Pagando...</> : <><i className="fas fa-check"></i> Pagar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const CarteraSocioPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState('cedula');
  const [loading, setLoading] = useState(false);
  const [cartera, setCartera] = useState(null);
  const [pagarDeuda, setPagarDeuda] = useState(null);

  const buscar = async () => {
    if (!busqueda) { Swal.fire('Aviso', 'Ingrese un valor de búsqueda', 'warning'); return; }
    setLoading(true);
    setCartera(null);
    try {
      let params = {};
      if (tipoBusqueda === 'cedula') {
        const [pRes] = await Promise.all([
          api.get('/personal/personalSeleccionPaginado', { params: { per_cedula_personal: busqueda, limit: 1 } })
        ]);
        const socio = pRes.data?.data?.[0];
        if (!socio) { Swal.fire('Error', 'Socio no encontrado', 'error'); setLoading(false); return; }
        params = { id_socio: socio.id_personal };
      } else {
        const [bRes] = await Promise.all([
          api.get('/buses/seleccionarBuses', { params: { disco_buses: busqueda, limit: 1 } })
        ]);
        const bus = bRes.data?.data?.[0];
        if (!bus) { Swal.fire('Error', 'Bus no encontrado', 'error'); setLoading(false); return; }
        params = { id_bus: bus.id_buses };
      }
      const res = await api.get('/deuda/carteraSocio', { params });
      if (res.data?.success) setCartera(res.data);
      else Swal.fire('Error', res.data?.error || 'Error al consultar', 'error');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cardsResumen = [
    { label: 'Multas', color: 'bg-red-500', filter: 1 },
    { label: 'Créditos', color: 'bg-purple-500', filter: 2 },
    { label: 'Cuota Admin.', color: 'bg-blue-500', filter: 3 },
    { label: 'Accidentes', color: 'bg-orange-500', filter: 4 },
    { label: 'Tumurahua', color: 'bg-teal-500', filter: 5 },
  ];

  const getResumenValue = (tipoId) => cartera?.resumen?.find(r => r.id_tipo_deuda === tipoId)?.total_pendiente || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {pagarDeuda && <PagarDeudaModal deuda={pagarDeuda} onClose={() => setPagarDeuda(null)} onSuccess={() => { setPagarDeuda(null); buscar(); }} />}

      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-wallet text-emerald-600"></i> Cartera del Socio
      </h1>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar por</label>
            <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={tipoBusqueda} onChange={e => setTipoBusqueda(e.target.value)}>
              <option value="cedula">Cédula del Socio</option>
              <option value="bus">Número de Bus</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{tipoBusqueda === 'cedula' ? 'Cédula' : 'Número de Bus'}</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder={tipoBusqueda === 'cedula' ? 'Ingrese cédula del socio' : 'Ingrese número de bus'}
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
          </div>
          <button onClick={buscar} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Buscando...</> : <><i className="fas fa-search"></i> Buscar</>}
          </button>
        </div>
      </div>

      {cartera && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-4">
            <i className="fas fa-user-circle text-3xl text-emerald-600"></i>
            <div>
              <p className="font-bold text-emerald-800">{cartera.info?.socio || 'Socio'}</p>
              <p className="text-sm text-emerald-600">Bus: {cartera.info?.bus || '-'} | Cédula: {cartera.info?.cedula || '-'}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-500">Total Pendiente</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(cartera.total_pendiente)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cardsResumen.map(card => {
              const valor = getResumenValue(card.filter);
              return (
                <div key={card.label} className={`${card.color} rounded-lg p-4 text-white`}>
                  <p className="text-xs opacity-80">{card.label}</p>
                  <p className="text-xl font-bold">{formatCurrency(valor)}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700"><i className="fas fa-list mr-2"></i>Deudas Registradas</span>
              <span className="text-xs text-slate-500">{cartera.data?.length || 0} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">ID</th>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">Tipo</th>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">Concepto</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Original</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Pagado</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-600">Saldo</th>
                    <th className="px-3 py-2.5 text-center font-bold text-slate-600">Estado</th>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-600">Fecha</th>
                    <th className="px-3 py-2.5 text-center font-bold text-slate-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cartera.data?.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sin deudas registradas</td></tr>
                  ) : cartera.data.map(d => (
                    <tr key={d.id_deuda} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{d.id_deuda}</td>
                      <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${d.prioridad === 1 ? 'bg-red-100 text-red-700' : d.prioridad === 2 ? 'bg-purple-100 text-purple-700' : d.prioridad === 3 ? 'bg-blue-100 text-blue-700' : d.prioridad === 4 ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{d.tipo_nombre}</span></td>
                      <td className="px-3 py-2">{d.concepto}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(d.valor_original)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(d.valor_pagado)}</td>
                      <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(d.saldo_pendiente)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : d.estado === 'parcial' ? 'bg-amber-100 text-amber-700' : d.estado === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {d.estado === 'pagado' ? 'Pagado' : d.estado === 'parcial' ? 'Parcial' : d.estado === 'anulado' ? 'Anulado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{d.fecha_creacion?.split(' ')[0]}</td>
                      <td className="px-3 py-2 text-center">
                        {d.estado !== 'pagado' && d.estado !== 'anulado' && (
                          <button onClick={() => setPagarDeuda(d)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Pagar">
                            <i className="fas fa-hand-holding-usd text-sm"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
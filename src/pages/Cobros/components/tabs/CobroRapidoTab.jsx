import { useState } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/cobrosHelpers';
import { ProcesarCobroRapidoModal } from '../modals/ProcesarCobroRapidoModal';

export const CobroRapidoTab = () => {
  const [cedula, setCedula] = useState('');
  const [numeroBus, setNumeroBus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const buscar = async () => {
    if (!cedula && !numeroBus) {
      toast.error('Ingrese al menos la cédula o el número de bus');
      return;
    }
    setLoading(true);
    setResultados(null);
    try {
      const res = await api.post('/cobro/buscarInfo', { cedula, numero_bus: numeroBus });
      if (res.data?.success) {
        const pendientes = (res.data.data || []).filter(r => r.estado_cobros != 1);
        setResultados({ ...res.data, data: pendientes });
        if (pendientes.length === 0) {
          toast('No se encontraron cobros pendientes', { icon: 'ℹ️' });
        }
      } else {
        toast.error(res.data?.message || 'Error al buscar información');
      }
    } catch (err) {
      toast.error(err.message || 'Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const ejecutarProcesarCobro = async () => {
    if (!resultados || !resultados.data?.length) return;
    setProcesando(true);
    const ids = resultados.data.map(r => r.id_cobros);
    try {
      const res = await api.post('/cobro/procesarCobroDetallado', {
        cedula,
        numero_bus: numeroBus,
        ids: JSON.stringify(ids),
        monto: resultados.info_clave?.total_pendiente || 0,
        idformapago: 1,
        fecha_comprobante: new Date().toISOString().split('T')[0],
        concepto: 'Cobro rápido',
        id_bus: resultados.data[0]?.id_fkbus_cobros
      });
      if (res.data?.success) {
        toast.success(`Cobro procesado correctamente. ${res.data.mensaje || ''}`);
        setModalConfirmOpen(false);
        setResultados(null);
        setCedula('');
        setNumeroBus('');
      } else {
        toast.error(res.data?.error || 'Error al procesar el cobro');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Modal Confirmación de Cobro Rápido */}
      {modalConfirmOpen && (
        <ProcesarCobroRapidoModal
          info={resultados}
          onConfirm={ejecutarProcesarCobro}
          onClose={() => setModalConfirmOpen(false)}
          guardando={procesando}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <i className="fas fa-search text-blue-600"></i> Buscar Información para Cobro Rápido
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cédula</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="Ingrese cédula" value={cedula} onChange={e => setCedula(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Número de Bus (Disco)</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ingrese número de bus" value={numeroBus} onChange={e => setNumeroBus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={buscar} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Buscando...</> : <><i className="fas fa-search"></i> Buscar</>}
          </button>
          <button onClick={() => setModalConfirmOpen(true)} disabled={!resultados || !resultados.data?.length}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
            <i className="fas fa-hand-holding-usd"></i> Procesar Cobro
          </button>
        </div>
      </div>

      {/* Resultados */}
      {resultados && resultados.data?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800">
              <i className="fas fa-info-circle mr-1.5"></i> 
              {resultados.data[0]?.per_nombres_persona || ''} {resultados.data[0]?.per_apellidos_personal || ''} 
              {resultados.data[0]?.disco_buses ? ` — Bus: ${resultados.data[0].disco_buses}` : ''}
            </span>
            <span className="text-xs font-bold text-emerald-800">
              Total Pendiente: {formatCurrency(resultados.info_clave?.total_pendiente || 0)} ({resultados.data.length} cobros)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">ID</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">Tipo</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Monto</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Pagado</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Saldo</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultados.data.map(r => (
                  <tr key={r.id_cobros} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">#{r.id_cobros}</td>
                    <td className="px-3 py-2">{r.nombre_tipo_cobros}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.monto_cobros)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">{formatCurrency(r.total_pagado)}</td>
                    <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(r.saldo_pendiente)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.estado_cobros == 1
                        ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Pagado</span>
                        : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">No Pagado</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

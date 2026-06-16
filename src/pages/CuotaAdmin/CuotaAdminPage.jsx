import { useState } from 'react';
import Swal from 'sweetalert2';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { cobrosService } from '../../services/cobros.service';

export const CuotaAdminPage = () => {
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [valor, setValor] = useState('700');

  const meses = [
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ];
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  const handleGenerar = async () => {
    setShowConfirm(false);
    setGenerando(true);
    setResultado(null);
    try {
      const res = await cobrosService.generarCuotaMensual({ mes, anio, valor, concepto: `Cuota administrativa ${meses.find(m => m.value === mes)?.label} ${anio}` });
      if (res.success) {
        setResultado(res.data);
        Swal.fire('Completado', `Cuota generada para ${res.data?.insertados || 0} socios`, 'success');
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {showConfirm && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleGenerar}
          title="¿Generar cuota administrativa?"
          message={`Mes: ${meses.find(m => m.value === mes)?.label} ${anio}\nValor: $${parseFloat(valor).toFixed(2)} por socio\n\nSe generará una deuda para cada socio con bus activo.`}
          confirmText="Sí, generar"
          type="primary"
        />
      )}

      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-calendar-alt text-blue-600"></i> Cuota Administrativa Mensual
      </h1>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Mes</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={mes} onChange={e => setMes(e.target.value)}>
              {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Año</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={anio} onChange={e => setAnio(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor por Socio ($)</label>
            <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
        </div>

        <button onClick={() => setShowConfirm(true)} disabled={generando}
          className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {generando ? <><i className="fas fa-spinner fa-spin"></i> Generando...</> : <><i className="fas fa-play"></i> Generar Cuota Mensual</>}
        </button>

        {resultado && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-bold text-blue-800">Resultado:</p>
            <p className="text-sm text-blue-700 mt-1">Se generaron <b>{resultado.insertados}</b> deudas de cuota administrativa de un total de <b>{resultado.total_socios}</b> socios activos.</p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p><i className="fas fa-info-circle mr-2"></i> La cuota administrativa se genera para todos los socios con buses activos. Las deudas se descuentan automáticamente en los despachos según la prioridad establecida (después de multas y créditos).</p>
      </div>
    </div>
  );
};
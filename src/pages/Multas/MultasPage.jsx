import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { cobrosService } from '../../services/cobros.service';
import { NuevaMultaModal } from './components/NuevaMultaModal';
import { AnularMultaModal } from './components/AnularMultaModal';
import { PagarMultaModal } from './components/PagarMultaModal';
import { VerDetalleMultaModal } from './components/VerDetalleMultaModal';
import { ComprobanteMultaModal } from './components/ComprobanteMultaModal';
import { MultasResumenCards } from './components/MultasResumenCards';
import { MultasFiltros } from './components/MultasFiltros';
import { MultasTable } from './components/MultasTable';

export const MultasPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    id_socio: '',
    id_bus: '',
    estado: 'todos',
    fecha_desde: '',
    fecha_hasta: '',
    search: ''
  });

  // Modales React
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [anularRow, setAnularRow] = useState(null);
  const [pagarRow, setPagarRow] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [comprobanteRow, setComprobanteRow] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        page,
        id_tipo_deuda: 1 // Multas
      };
      if (filtros.estado && filtros.estado !== 'todos') params.estado = filtros.estado;
      if (filtros.fecha_desde && filtros.fecha_hasta) {
        params.fecha_desde = filtros.fecha_desde;
        params.fecha_hasta = filtros.fecha_hasta;
      }
      if (filtros.id_socio) params.id_socio = filtros.id_socio;
      if (filtros.id_bus) params.id_bus = filtros.id_bus;

      const res = await cobrosService.listarMultas(params);
      if (res.success) {
        let rows = res.data || [];
        if (filtros.search.trim()) {
          const s = filtros.search.toLowerCase();
          rows = rows.filter(r => 
            (r.socio_nombre || '').toLowerCase().includes(s) ||
            String(r.disco_buses || '').includes(s) ||
            (r.concepto || '').toLowerCase().includes(s) ||
            String(r.id_deuda || '').includes(s)
          );
        }
        setData(rows);
        setTotal(res.total || rows.length);
      }
    } catch {
      toast.error('Error al cargar multas');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos de tarjetas resumen
  const resumen = useMemo(() => {
    const totalOriginal = data.reduce((s, r) => s + parseFloat(r.valor_original || 0), 0);
    const totalPagado = data.reduce((s, r) => s + parseFloat(r.valor_pagado || 0), 0);
    const totalPendiente = data.reduce((s, r) => s + parseFloat(r.saldo_pendiente || 0), 0);
    return { totalOriginal, totalPagado, totalPendiente, count: total };
  }, [data, total]);

  const handleLimpiarFiltros = () => {
    setFiltros({ id_socio: '', id_bus: '', estado: 'todos', fecha_desde: '', fecha_hasta: '', search: '' });
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <i className="fas fa-gavel text-lg"></i>
            </span>
            Gestión de Multas
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Registro, control de descuentos automáticos en despachos, comprobantes y anulación de multas.
          </p>
        </div>

        <button
          onClick={() => setShowNuevaModal(true)}
          className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus-circle text-sm"></i>
          <span>Nueva Multa</span>
        </button>
      </div>

      {/* 1. Tarjetas Resumen */}
      <MultasResumenCards resumen={resumen} />

      {/* 2. Barra de Filtros */}
      <MultasFiltros
        filtros={filtros}
        onFiltrosChange={(newFiltros) => {
          setFiltros(newFiltros);
          setPage(1);
        }}
        onLimpiar={handleLimpiarFiltros}
      />

      {/* 3. Tabla de Multas */}
      <MultasTable
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onVerDetalle={setDetalleId}
        onVerComprobante={setComprobanteRow}
        onPagar={setPagarRow}
        onAnular={setAnularRow}
      />

      {/* ─── MODALES DE ACCIÓN ─── */}
      {showNuevaModal && (
        <NuevaMultaModal
          onClose={() => setShowNuevaModal(false)}
          onSuccess={() => { setShowNuevaModal(false); loadData(); }}
        />
      )}

      {anularRow && (
        <AnularMultaModal
          multa={anularRow}
          onClose={() => setAnularRow(null)}
          onSuccess={() => { setAnularRow(null); loadData(); }}
        />
      )}

      {pagarRow && (
        <PagarMultaModal
          multa={pagarRow}
          onClose={() => setPagarRow(null)}
          onSuccess={() => { setPagarRow(null); loadData(); }}
        />
      )}

      {detalleId && (
        <VerDetalleMultaModal
          idMulta={detalleId}
          onClose={() => setDetalleId(null)}
          onVerComprobante={(det) => {
            setDetalleId(null);
            setComprobanteRow(det);
          }}
        />
      )}

      {comprobanteRow && (
        <ComprobanteMultaModal
          multa={comprobanteRow}
          onClose={() => setComprobanteRow(null)}
        />
      )}
    </div>
  );
};

export default MultasPage;

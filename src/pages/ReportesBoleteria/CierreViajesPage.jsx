import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import { reportesService } from '../../services/reportes.service';
import toast from 'react-hot-toast';

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtHora = (h) => (h ? h.substring(0, 5) : '-');

export const CierreViajesPage = () => {
  const hoy = new Date().toISOString().split('T')[0];
  const [filtros, setFiltros] = useState({ fecha_desde: hoy, fecha_hasta: hoy, id_sucursal: '' });
  const [sucursales, setSucursales] = useState([]);
  const [data, setData] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ pdf: false, excel: false });
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    api.get('/sucursal/sucursalListar').then(r => {
      if (r.data?.success || Array.isArray(r.data?.data)) setSucursales(r.data.data || []);
    }).catch(() => { });
  }, []);

  const getParams = () => ({
    fecha_desde: filtros.fecha_desde,
    fecha_hasta: filtros.fecha_hasta || filtros.fecha_desde,
    ...(filtros.id_sucursal ? { id_sucursal: filtros.id_sucursal } : {})
  });

  const handleBuscar = async () => {
    if (!filtros.fecha_desde) { toast.error('Ingrese la fecha desde'); return; }
    setLoading(true);
    try {
      const params = getParams();
      const r = await api.get('/reportes/cierreViajes', { params });
      if (r.data?.success) {
        setData(r.data.data || []);
        setEmpresa(r.data.empresa || {});
        if ((r.data.data || []).length === 0) toast('No se encontraron viajes en ese rango', { icon: 'ℹ️' });
      } else {
        toast.error('Error: ' + (r.data?.error || 'No se pudo cargar el reporte'));
      }
    } catch (e) {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) { toast.error('No hay datos para exportar'); return; }
    setExporting(p => ({ ...p, pdf: true }));
    setShowProgress(true);
    setProgress({ percent: 0, message: 'Encolando reporte PDF...' });

    try {
      const result = await reportesService.enqueueAndWait(
        'cierre_viajes_pdf',
        getParams(),
        (percent, message) => setProgress({ percent, message })
      );

      setShowProgress(false);

      if (result?.html) {
        await reportesService.generatePdfFromHtml(result.html, `cierre_viajes_${filtros.fecha_desde}_${filtros.fecha_hasta || filtros.fecha_desde}`);
        toast.success('PDF descargado correctamente');
      } else {
        toast.error('No se pudo generar el PDF');
      }
    } catch (error) {
      toast.error(error.message || 'Error al generar PDF');
      setShowProgress(false);
    } finally {
      setExporting(p => ({ ...p, pdf: false }));
    }
  };

  const handleExportExcel = async () => {
    if (data.length === 0) { toast.error('No hay datos para exportar'); return; }
    setExporting(p => ({ ...p, excel: true }));
    setShowProgress(true);
    setProgress({ percent: 0, message: 'Generando Excel...' });

    try {
      const result = await reportesService.enqueueAndWait(
        'cierre_viajes_excel',
        getParams(),
        (percent, message) => setProgress({ percent, message })
      );

      setShowProgress(false);

      if (result?.data && Array.isArray(result.data)) {
        const ExcelJS = await import('exceljs');

        const wb = new ExcelJS.Workbook();
        wb.creator = 'SistemaFlota';
        wb.created = new Date();

        const ws = wb.addWorksheet('Cierre Viajes', {
          views: [{ state: 'frozen', ySplit: 1 }]
        });

        // Columnas
        const columns = [
          { header: 'Agencia', key: 'agencia', width: 22 },
          { header: 'Oficinista', key: 'oficinista', width: 25 },
          { header: '# Viaje', key: 'id_viaje', width: 10 },
          { header: 'Fecha', key: 'fecha', width: 14 },
          { header: 'Hora', key: 'hora', width: 10 },
          { header: 'Disco', key: 'disco', width: 10 },
          { header: 'Placa', key: 'placa', width: 14 },
          { header: 'Chofer', key: 'chofer', width: 28 },
          { header: 'Ruta', key: 'ruta', width: 22 },
          { header: 'Subtotal', key: 'subtotal', width: 14 },
          { header: 'Retiene', key: 'retiene', width: 14 },
          { header: 'Entrega', key: 'entrega', width: 14 },
        ];

        // Estilo del header
        const headerStyle = {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: 'FF333333' } },
            bottom: { style: 'thin', color: { argb: 'FF333333' } },
            left: { style: 'thin', color: { argb: 'FF333333' } },
            right: { style: 'thin', color: { argb: 'FF333333' } },
          }
        };

        // Estilo de celdas de datos
        const cellStyle = {
          font: { size: 10, name: 'Calibri', color: { argb: 'FF333333' } },
          alignment: { vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          }
        };

        // Estilo para montos
        const montoStyle = {
          ...cellStyle,
          alignment: { ...cellStyle.alignment, horizontal: 'right' },
          numFmt: '$#,##0.00',
        };

        // Agregar columnas al worksheet
        ws.columns = columns;

        // Agregar filas de datos
        result.data.forEach(row => {
          ws.addRow({
            agencia: row.agencia || '',
            oficinista: row.oficinista || '',
            id_viaje: row.id_viaje,
            fecha: row.fecha || '',
            hora: row.hora || '',
            disco: row.disco || '',
            placa: row.placa || '',
            chofer: row.chofer || '',
            ruta: row.ruta || '',
            subtotal: parseFloat(row.subtotal || 0),
            retiene: parseFloat(row.retiene || 0),
            entrega: parseFloat(row.entrega || 0),
          });
        });

        // Aplicar estilos al header
        const headerRow = ws.getRow(1);
        headerRow.height = 22;
        columns.forEach((col, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.font = headerStyle.font;
          cell.fill = headerStyle.fill;
          cell.alignment = headerStyle.alignment;
          cell.border = headerStyle.border;
        });

        // Aplicar estilos a celdas de datos
        ws.eachRow((row, rowIndex) => {
          if (rowIndex === 1) return; // skip header
          row.eachCell((cell, colIndex) => {
            if ([10, 11, 12].includes(colIndex)) {
              // Columnas de montos: Subtotal, Retiene, Entrega
              cell.font = montoStyle.font;
              cell.alignment = montoStyle.alignment;
              cell.numFmt = montoStyle.numFmt;
              cell.border = montoStyle.border;
            } else {
              cell.font = cellStyle.font;
              cell.alignment = cellStyle.alignment;
              cell.border = cellStyle.border;
            }
          });
          // Alternar color de fondo en filas
          if (rowIndex % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
            });
          }
        });

        // Auto-filtro
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: result.data.length + 1, column: columns.length } };

        // Generar y descargar
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cierre_viajes_${filtros.fecha_desde}_${filtros.fecha_hasta || filtros.fecha_desde}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success(`${result.data.length} registros exportados a Excel`);
      } else {
        toast.error('No se pudieron obtener los datos para Excel');
      }
    } catch (error) {
      console.error('Error exportando Excel:', error);
      toast.error(error.message || 'Error al exportar Excel');
      setShowProgress(false);
    } finally {
      setExporting(p => ({ ...p, excel: false }));
    }
  };



  const totalGeneral = data.reduce((acc, ag) => ({
    subtotal: acc.subtotal + ag.totales.subtotal,
    retiene: acc.retiene + ag.totales.retiene,
    entrega: acc.entrega + ag.totales.entrega,
    viajes: acc.viajes + ag.oficinistas.reduce((s, o) => s + o.viajes.length, 0)
  }), { subtotal: 0, retiene: 0, entrega: 0, viajes: 0 });

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f1f5f9', minHeight: '100vh', padding: 16 }}>
      {/* FILTROS */}
      <div style={{ background: 'white', borderRadius: 8, padding: '12px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 3 }}>REPORTE</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>Cierre de Viajes por Agencia</div>
        </div>
        <div style={{ flex: 1 }} />

        <div>
          <label style={lbl}>Desde</label>
          <input type="date" style={inp} value={filtros.fecha_desde} onChange={e => setFiltros(p => ({ ...p, fecha_desde: e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Hasta</label>
          <input type="date" style={inp} value={filtros.fecha_hasta} onChange={e => setFiltros(p => ({ ...p, fecha_hasta: e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Agencia</label>
          <select style={inp} value={filtros.id_sucursal} onChange={e => setFiltros(p => ({ ...p, id_sucursal: e.target.value }))}>
            <option value="">Todas</option>
            {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_sucursal}</option>)}
          </select>
        </div>

        <button onClick={handleBuscar} disabled={loading} style={btnPrimary}>
          <i className="fas fa-search" /> {loading ? 'Buscando...' : 'Generar'}
        </button>
        {data.length > 0 && (
          <>
            <button onClick={handleExportPDF} disabled={exporting.pdf} style={{ ...btnSecondary, background: '#dc2626' }}>
              <i className={`fas ${exporting.pdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} /> {exporting.pdf ? 'Generando...' : 'PDF'}
            </button>
            <button onClick={handleExportExcel} disabled={exporting.excel} style={{ ...btnSecondary, background: '#059669' }}>
              <i className={`fas ${exporting.excel ? 'fa-spinner fa-spin' : 'fa-file-excel'}`} /> {exporting.excel ? 'Generando...' : 'Excel'}
            </button>
          </>
        )}
      </div>

      {/* INDICADOR DE PROGRESO */}
      {showProgress && (
        <div style={{ background: 'white', borderRadius: 8, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
              {progress.message || 'Procesando...'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f' }}>{progress.percent}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${progress.percent}%`, height: '100%', background: '#1e3a5f', borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* REPORTE */}
      {data.length > 0 && (
        <div>
          {/* ENCABEZADO EMPRESA */}
          <div className="empresa-header" style={{ background: 'white', borderRadius: 8, padding: '10px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#1e3a5f', textTransform: 'uppercase' }}>{empresa.razon_social_empresa || 'COOPERATIVA DE TRANSPORTES FLOTA PELILEO'}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>RUC: {empresa.ruc_empresa || ''} &nbsp;|&nbsp; Dirección: {empresa.direccion_empresa || ''}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#1e3a5f', marginTop: 4, textDecoration: 'underline' }}>REPORTE CIERRE DE VIAJES</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Cierre Desde: <strong>{filtros.fecha_desde}</strong> &nbsp;|&nbsp;
              Cierre Hasta: <strong>{filtros.fecha_hasta || filtros.fecha_desde}</strong>
            </div>
          </div>

          {/* AGENCIAS */}
          {data.map((ag, ai) => (
            <div key={ai} style={{ background: 'white', borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              {/* CABECERA AGENCIA */}
              <div className="ag-header" style={{ background: '#1e3a5f', color: 'white', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>
                  <i className="fas fa-building" style={{ marginRight: 6 }} />
                  AGENCIA: {ag.nombre_sucursal?.toUpperCase()}
                </span>
                <span style={{ fontSize: 10 }}>{ag.oficinistas.reduce((s, o) => s + o.viajes.length, 0)} viajes</span>
              </div>

              {/* POR OFICINISTA */}
              {ag.oficinistas.map((of, oi) => (
                <div key={oi}>
                  <div className="of-header" style={{ background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '3px 14px', fontWeight: 700, fontSize: 10, color: '#78350f' }}>
                    <i className="fas fa-user" style={{ marginRight: 4 }} />
                    Oficinista: {of.nombre_oficinista}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0' }}>
                        <th style={th}># Viaje</th>
                        <th style={th}>F. Viaje</th>
                        <th style={th}>Hora</th>
                        <th style={th}>Disco</th>
                        <th style={th}>Recibe (Chofer)</th>
                        <th style={th}>Ruta</th>
                        <th style={{ ...th, textAlign: 'right' }}>Total</th>
                        <th style={{ ...th, textAlign: 'right' }}>Retiene</th>
                        <th style={{ ...th, textAlign: 'right' }}>Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {of.viajes.map((v, vi) => {
                        const isHighlight = v.retiene > 0;
                        return (
                          <tr key={vi} style={{ background: isHighlight ? '#f0fdf4' : (vi % 2 === 0 ? 'white' : '#f8fafc') }}>
                            <td style={td}>{v.id_viajes}</td>
                            <td style={td}>{v.fecha_viaje || '-'}</td>
                            <td style={{ ...td, textAlign: 'center' }}>{v.hora_salida || '-'}</td>
                            <td style={{ ...td, textAlign: 'center' }}>{v.disco}</td>
                            <td style={td}>{v.chofer}</td>
                            <td style={td}>{v.ruta}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{fmt(v.subtotal)}</td>
                            <td style={{ ...td, textAlign: 'right', background: isHighlight ? '#bbf7d0' : 'inherit' }}>{fmt(v.retiene)}</td>
                            <td style={{ ...td, textAlign: 'right', background: isHighlight ? '#bbf7d0' : 'inherit' }}>{fmt(v.entrega)}</td>
                          </tr>
                        );
                      })}
                      {/* SUBTOTAL OFICINISTA */}
                      <tr style={{ background: '#dbeafe', fontWeight: 700 }}>
                        <td colSpan={6} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>SUBTOTAL ({of.viajes.length} viajes)</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(of.total_subtotal)}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(of.total_retiene)}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(of.total_entrega)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* TOTAL AGENCIA */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 800, fontSize: 11 }}>
                    <td colSpan={6} style={{ ...td, textAlign: 'right', border: 'none', color: 'white', fontWeight: 800 }}>
                      TOTAL AGENCIA ({ag.oficinistas.reduce((s, o) => s + o.viajes.length, 0)} viajes)
                    </td>
                    <td style={{ ...td, textAlign: 'right', border: 'none', color: 'white', fontWeight: 800, width: 90 }}>{fmt(ag.totales.subtotal)}</td>
                    <td style={{ ...td, textAlign: 'right', border: 'none', color: 'white', fontWeight: 800, width: 90 }}>{fmt(ag.totales.retiene)}</td>
                    <td style={{ ...td, textAlign: 'right', border: 'none', color: 'white', fontWeight: 800, width: 90 }}>{fmt(ag.totales.entrega)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* TOTAL GENERAL */}
          <div style={{ background: '#0f172a', color: 'white', borderRadius: 8, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 13 }}>TOTAL GENERAL — {totalGeneral.viajes} viajes en {data.length} agencia(s)</span>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, opacity: 0.7 }}>TOTAL</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>${fmt(totalGeneral.subtotal)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, opacity: 0.7 }}>RETIENE</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>${fmt(totalGeneral.retiene)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, opacity: 0.7 }}>ENTREGA</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>${fmt(totalGeneral.entrega)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <i className="fas fa-file-alt" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
          <p style={{ fontSize: 13 }}>Configure los filtros y presione <strong>Generar</strong> para ver el reporte</p>
        </div>
      )}
    </div>
  );
};

const lbl = { display: 'block', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 3 };
const inp = { height: 32, padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11, outline: 'none', background: 'white', minWidth: 130 };
const btnPrimary = { height: 32, padding: '0 14px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const btnSecondary = { height: 32, padding: '0 14px', background: '#64748b', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const th = { padding: '4px 6px', border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'left', fontSize: 9 };
const td = { padding: '3px 6px', border: '1px solid #e2e8f0', fontSize: 9 };

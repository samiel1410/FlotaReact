import { useState, useEffect, useRef } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const CELL_TYPES = {
  asiento: { label: 'Asiento', color: '#5fa2dd' },
  pasillo: { label: 'Pasillo', color: '#f0f0f0' },
  bano: { label: 'Baño', color: '#ffc107', icon: 'WC' },
  escalera: { label: 'Escalera', color: '#17a2b8', icon: 'ESC' },
  puerta: { label: 'Puerta', color: '#6c757d', icon: 'PTR' },
  chofer: { label: 'Chofer', color: '#343a40' },
};

const TEMPLATE_KEY = 'plantillas_asientos';

const MapaAsientosModal = ({ bus, isOpen, onClose, onSaved }) => {
  const [mapaData, setMapaData] = useState({ gridWidth: 12, gridHeight: 12, pisos: [{}] });
  const [currentPiso, setCurrentPiso] = useState(0);
  const [numPisos, setNumPisos] = useState(1);
  const [drawMode, setDrawMode] = useState('asiento');
  const [gridWidth, setGridWidth] = useState(12);
  const [gridHeight, setGridHeight] = useState(12);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef(null);
  const mapaRef = useRef(mapaData);
  const drawModeRef = useRef(drawMode);

  useEffect(() => { mapaRef.current = mapaData; }, [mapaData]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  useEffect(() => {
    if (!isOpen) return;
    setReady(false);
    const stored = localStorage.getItem(TEMPLATE_KEY);
    if (stored) {
      try { setTemplates(JSON.parse(stored)); } catch { }
    }
    if (bus?.mapa_asientos) {
      try {
        const parsed = typeof bus.mapa_asientos === 'string' ? JSON.parse(bus.mapa_asientos) : bus.mapa_asientos;
        if (parsed?.pisos) {
          const nuevo = JSON.parse(JSON.stringify(parsed));
          nuevo.pisos = nuevo.pisos.map((piso, idx) => {
            const normalizado = {};
            for (const [key, val] of Object.entries(piso)) {
              const match = key.match(/^(?:cell|mc)_(\d+)_(\d+)_(\d+)$/);
              if (match) {
                const newKey = `mc_${match[1]}_${match[2]}_${match[3]}`;
                normalizado[newKey] = val;
              } else {
                normalizado[key] = val;
              }
            }
            return normalizado;
          });
          mapaRef.current = nuevo;
          setMapaData(nuevo);
          setNumPisos(parsed.pisos.length || 1);
          setGridWidth(parsed.gridWidth || 12);
          setGridHeight(parsed.gridHeight || 12);
          setCurrentPiso(0);
        }
      } catch { }
    }
    setReady(true);
  }, [isOpen, bus]);

  useEffect(() => {
    if (!isOpen || !ready) return;
    const timer = setTimeout(() => dibujarPiso(), 100);
    return () => clearTimeout(timer);
  }, [isOpen, ready, currentPiso, gridWidth, gridHeight, mapaData]);

  function dibujarPiso() {
    const container = canvasRef.current;
    if (!container) return;
    const cellSize = Math.min(40, Math.floor((container.clientWidth - 40) / gridWidth));
    const piso = currentPiso;
    const data = mapaRef.current;

    let html = '<div style="text-align:center;padding-top:10px;">';
    html += '<div style="background:#343a40;color:white;padding:8px 16px;margin-bottom:10px;border-radius:5px;display:inline-block;font-size:12px;font-weight:700;">FRENTE DEL BUS (CABINA)</div>';
    html += '<table style="margin:0 auto;border-collapse:collapse;border:3px solid #333;background:white;box-shadow:0 4px 8px rgba(0,0,0,0.15);">';

    for (let row = 0; row < gridHeight; row++) {
      html += '<tr>';
      for (let col = 0; col < gridWidth; col++) {
        const cellId = `mc_${piso + 1}_${row}_${col}`;
        const cellData = data.pisos[piso]?.[cellId] || null;
        let bgColor = '#ffffff', content = '';
        if (cellData) {
          if (cellData.tipo === 'asiento') {
            bgColor = '#5fa2dd';
            content = `<span style="color:white;font-weight:bold;font-size:11px;">${cellData.numero || ''}</span>`;
          } else if (cellData.tipo === 'pasillo') {
            bgColor = '#f0f0f0';
          } else if (cellData.tipo === 'bano') {
            bgColor = '#ffc107'; content = 'WC';
          } else if (cellData.tipo === 'escalera') {
            bgColor = '#17a2b8'; content = 'ESC';
          } else if (cellData.tipo === 'puerta') {
            bgColor = '#6c757d'; content = 'PTR';
          } else if (cellData.tipo === 'chofer') {
            bgColor = '#343a40';
          }
        }
        html += `<td id="${cellId}" class="map-cell" style="width:${cellSize}px;height:${cellSize}px;background:${bgColor};border:1px solid #dee2e6;cursor:pointer;text-align:center;vertical-align:middle;font-size:10px;font-weight:700;color:${cellData?.tipo === 'asiento' ? 'white' : (cellData?.tipo === 'chofer' ? 'white' : '#333')};">${content}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    html += '<div style="background:#e9ecef;padding:8px 16px;margin-top:10px;border-radius:5px;display:inline-block;font-size:12px;font-weight:700;">PARTE POSTERIOR</div></div>';
    container.innerHTML = html;

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const cellId = `mc_${piso + 1}_${row}_${col}`;
        const cell = document.getElementById(cellId);
        if (cell) {
          cell.onclick = () => handleCellClick(piso, row, col);
        }
      }
    }
  }

  function handleCellClick(piso, row, col) {
    const cellId = `mc_${piso + 1}_${row}_${col}`;
    const cell = document.getElementById(cellId);
    if (!cell) return;
    const mode = drawModeRef.current;
    const currentData = mapaRef.current;

    if (mode === 'borrar') {
      updateCell(piso, cellId, null);
      cell.style.background = '#ffffff'; cell.innerHTML = ''; cell.style.color = '#333';
      return;
    }
    if (mode === 'asiento') {
      const existing = currentData.pisos[piso]?.[cellId] || null;
      const defaultVal = existing?.tipo === 'asiento' ? existing.numero : '';
      const numero = prompt('Número de asiento:', defaultVal);
      if (numero !== null && numero !== '') {
        let duplicate = false;
        for (let p = 0; p < numPisos; p++) {
          const pd = currentData.pisos[p];
          if (!pd) continue;
          for (const [key, val] of Object.entries(pd)) {
            if (key === cellId && p === piso) continue;
            if (val.tipo === 'asiento' && val.numero === numero) { duplicate = true; break; }
          }
          if (duplicate) break;
        }
        if (duplicate) { toast.error(`El número de asiento ${numero} ya existe.`); return; }
        updateCell(piso, cellId, { tipo: 'asiento', numero });
        cell.style.background = '#5fa2dd';
        cell.innerHTML = `<span style="color:white;font-weight:bold;font-size:11px;">${numero}</span>`;
      }
      return;
    }
    if (mode === 'pasillo') {
      updateCell(piso, cellId, { tipo: 'pasillo' });
      cell.style.background = '#f0f0f0'; cell.innerHTML = ''; cell.style.color = '#333';
      return;
    }
    const typeInfo = CELL_TYPES[mode];
    if (typeInfo) {
      updateCell(piso, cellId, { tipo: mode });
      cell.style.background = typeInfo.color;
      cell.innerHTML = typeInfo.icon || '';
      cell.style.color = '#333';
    }
  }

  function updateCell(piso, cellId, data) {
    const nuevo = JSON.parse(JSON.stringify(mapaRef.current));
    if (!nuevo.pisos[piso]) nuevo.pisos[piso] = {};
    if (data === null) {
      delete nuevo.pisos[piso][cellId];
    } else {
      nuevo.pisos[piso][cellId] = data;
    }
    mapaRef.current = nuevo;
    setMapaData(nuevo);
  }

  function aplicarCuadricula() {
    setMapaData(prev => {
      const nuevo = JSON.parse(JSON.stringify(prev));
      nuevo.gridWidth = gridWidth;
      nuevo.gridHeight = gridHeight;
      while (nuevo.pisos.length < numPisos) nuevo.pisos.push({});
      while (nuevo.pisos.length > numPisos) nuevo.pisos.pop();
      return nuevo;
    });
    if (currentPiso >= numPisos) setCurrentPiso(numPisos - 1);
  }

  async function limpiarMapa() {
    const confirmLimpiar = await Swal.fire({ title: '¿Limpiar mapa?', text: '¿Limpiar todo el mapa?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, limpiar', cancelButtonText: 'Cancelar' });
    if (!confirmLimpiar.isConfirmed) return;
    setMapaData(prev => {
      const nuevo = JSON.parse(JSON.stringify(prev));
      for (let p = 0; p < nuevo.pisos.length; p++) nuevo.pisos[p] = {};
      return nuevo;
    });
  }

  function autoNumerar() {
    let numero = 1;
    setMapaData(prev => {
      const nuevo = JSON.parse(JSON.stringify(prev));
      for (let p = 0; p < nuevo.pisos.length; p++) {
        for (let row = 0; row < gridHeight; row++) {
          for (let col = 0; col < gridWidth; col++) {
            const cellId = `mc_${p + 1}_${row}_${col}`;
            if (nuevo.pisos[p]?.[cellId]?.tipo === 'asiento') {
              nuevo.pisos[p][cellId].numero = String(numero++);
              const cell = document.getElementById(cellId);
              if (cell) cell.innerHTML = `<span style="color:white;font-weight:bold;font-size:11px;">${numero - 1}</span>`;
            }
          }
        }
      }
      return nuevo;
    });
    toast.success('Asientos numerados');
  }

  async function guardarPlantilla() {
    const { value: nombre } = await Swal.fire({ title: 'Nombre de la plantilla', input: 'text', inputLabel: 'Nombre de la plantilla:', showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un nombre'; } });
    if (!nombre) return;
    const config = { gridWidth, gridHeight, pisos: mapaData.pisos.map(p => ({ ...p })) };
    let plantillas = [];
    try { const stored = localStorage.getItem(TEMPLATE_KEY); if (stored) plantillas = JSON.parse(stored); } catch { }
    const existe = plantillas.findIndex(p => p.nombre === nombre);
    if (existe >= 0) {
      const confirmReplace = await Swal.fire({ title: '¿Reemplazar?', text: `Ya existe una plantilla con el nombre "${nombre}". ¿Reemplazar?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, reemplazar', cancelButtonText: 'Cancelar' });
      if (!confirmReplace.isConfirmed) return;
      plantillas[existe] = { id: Date.now(), nombre, config };
    } else {
      plantillas.push({ id: Date.now(), nombre, config });
    }
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(plantillas));
    setTemplates(plantillas);
    toast.success('Plantilla guardada');
  }

  function cargarPlantilla(config) {
    if (!config) return;
    setGridWidth(config.gridWidth || 12);
    setGridHeight(config.gridHeight || 12);
    setNumPisos(config.pisos?.length || 1);
    setMapaData({ gridWidth: config.gridWidth || 12, gridHeight: config.gridHeight || 12, pisos: config.pisos?.map(p => ({ ...p })) || [{}] });
    setCurrentPiso(0);
    toast.success('Plantilla cargada');
  }

  async function guardarMapa() {
    // Validar que el bus tenga conductor y auxiliar asignados
    if (!bus.id_fkpersonal_buses || bus.id_fkpersonal_buses === '' || bus.id_fkpersonal_buses === '0') {
      toast.error('El bus no tiene conductor asignado. Primero asígnelo en la edición del bus.');
      return;
    }
    if (!bus.id_fkauxiliar_buses || bus.id_fkauxiliar_buses === '' || bus.id_fkauxiliar_buses === '0') {
      toast.error('El bus no tiene auxiliar asignado. Primero asígnelo en la edición del bus.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...bus,
        pisos_buses: numPisos,
        estado_buses: bus.estado_buses ? '1' : '0',
        mapa_asientos: JSON.stringify({ gridWidth, gridHeight, pisos: mapaData.pisos.map(p => ({ ...p })) }),
      };
      await api.post('/buses/insertarActualizarBus', payload);
      toast.success('Mapa de asientos guardado');
      onSaved?.(payload.mapa_asientos);
      onClose();
    } catch (err) {
      toast.error('Error al guardar: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setSaving(false);
    }
  }

  const drawModes = [
    { id: 'asiento', label: 'Asiento', color: 'bg-blue-400' },
    { id: 'pasillo', label: 'Pasillo', color: 'bg-gray-200' },
    { id: 'bano', label: 'Baño', color: 'bg-amber-400' },
    { id: 'escalera', label: 'Escalera', color: 'bg-cyan-400' },
    { id: 'puerta', label: 'Puerta', color: 'bg-gray-500' },
    { id: 'borrar', label: 'Borrar', color: 'bg-red-400' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-[95vw] max-w-[1200px] h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fas fa-chair text-blue-400"></i>
            Configurador Visual de Mapa de Asientos
            <span className="ml-3 text-sm font-normal text-slate-400">Bus: {bus?.disco_buses || ''} | {bus?.placa_buses || ''}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[270px] shrink-0 border-r border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plantillas</label>
              <select className="w-full h-8 text-xs border border-slate-300 rounded px-2" value=""
                onChange={e => { const idx = parseInt(e.target.value); if (idx >= 0) cargarPlantilla(templates[idx]?.config); }}>
                <option value="">Seleccionar...</option>
                {templates.map((t, i) => <option key={t.id} value={i}>{t.nombre}</option>)}
              </select>
              <button onClick={guardarPlantilla} className="mt-1 w-full h-7 text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-white rounded">
                <i className="fas fa-bookmark mr-1"></i> Guardar Plantilla
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pisos</label>
              <input type="number" min={1} max={3} value={numPisos}
                onChange={e => setNumPisos(parseInt(e.target.value) || 1)}
                className="w-full h-8 text-xs border border-slate-300 rounded px-2" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Modo</label>
              <div className="space-y-1">
                {drawModes.map(m => (
                  <button key={m.id} onClick={() => setDrawMode(m.id)}
                    className={`w-full h-8 text-xs font-bold rounded flex items-center gap-2 px-3 ${drawMode === m.id ? 'ring-2 ring-indigo-400 ring-offset-1 ' + m.color + ' text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                    <span className={`w-3 h-3 rounded ${m.color}`}></span> {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tamaño Cuadrícula</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400">Ancho</label>
                  <input type="number" min={5} max={20} value={gridWidth}
                    onChange={e => setGridWidth(parseInt(e.target.value) || 12)}
                    className="w-full h-8 text-xs border border-slate-300 rounded px-2" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400">Alto</label>
                  <input type="number" min={5} max={20} value={gridHeight}
                    onChange={e => setGridHeight(parseInt(e.target.value) || 12)}
                    className="w-full h-8 text-xs border border-slate-300 rounded px-2" />
                </div>
              </div>
              <button onClick={aplicarCuadricula} className="mt-1 w-full h-7 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded">
                <i className="fas fa-sync mr-1"></i> Aplicar Cuadrícula
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Acciones</label>
              <button onClick={limpiarMapa} className="w-full h-8 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded mb-1">
                <i className="fas fa-trash mr-1"></i> Limpiar Todo
              </button>
              <button onClick={autoNumerar} className="w-full h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded">
                <i className="fas fa-sort-numeric-down mr-1"></i> Auto-numerar
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Leyenda</label>
              <div className="space-y-1 text-xs">
                {Object.entries(CELL_TYPES).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ background: val.color }}></span>
                    <span className="text-slate-600">{val.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-100 shrink-0">
              {Array.from({ length: numPisos }, (_, i) => (
                <button key={i} onClick={() => setCurrentPiso(i)}
                  className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors ${currentPiso === i ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <i className="fas fa-layer-group mr-1.5"></i> Piso {i + 1}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-4 bg-white">
              <div ref={canvasRef} className="min-h-[300px]"></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold">
            <i className="fas fa-times mr-2"></i>Cancelar
          </button>
          <button onClick={guardarMapa} disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
            {saving ? <><i className="fas fa-spinner fa-spin"></i>Guardando...</> : <><i className="fas fa-save"></i>Guardar Configuración</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapaAsientosModal;

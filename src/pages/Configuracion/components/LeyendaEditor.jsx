import { useEffect, useRef } from 'react';
import { htmlAMarkup, markupAHtml, ptToPx } from './leyendaFormato';

/**
 * Editor de leyendas con formato para las impresiones térmicas.
 * El marcado generado lo interpreta imprimirLeyendaEnriquecida() en pdf_utils.php.
 */

const SIZE_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 26];
const COLOR_OPTIONS = ['#000000', '#dc2626', '#ea580c', '#16a34a', '#1d4ed8', '#7c3aed', '#0f766e'];

const ToolbarButton = ({ title, onClick, active, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'
    }`}
  >
    {children}
  </button>
);

export const LeyendaEditor = ({ value, onChange, placeholder = 'Texto en las guías de transporte...' }) => {
  const editorRef = useRef(null);
  const ultimoValor = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === ultimoValor.current) return;
    ultimoValor.current = value ?? null;
    if (document.activeElement === editor) return;
    editor.innerHTML = markupAHtml(value);
  }, [value]);

  const emitir = () => {
    const markup = htmlAMarkup(editorRef.current);
    ultimoValor.current = markup;
    onChange?.(markup);
  };

  const enfocar = () => {
    editorRef.current?.focus();
  };

  const aplicarComando = (comando, css = false) => {
    enfocar();
    try {
      document.execCommand('styleWithCSS', false, css);
      document.execCommand(comando, false);
    } catch (e) {
      // Sin soporte del navegador: se ignora
    }
    emitir();
  };

  const envolverSeleccion = (aplicarEstilo) => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    aplicarEstilo(span);
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const nuevo = document.createRange();
      nuevo.selectNodeContents(span);
      sel.addRange(nuevo);
    } catch (e) {
      return;
    }
    emitir();
  };

  const aplicarTamano = (pt) => {
    envolverSeleccion((span) => { span.style.fontSize = ptToPx(pt); });
  };

  const aplicarColor = (hex) => {
    envolverSeleccion((span) => { span.style.color = hex; });
  };

  const limpiarFormato = () => {
    enfocar();
    try {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('removeFormat', false);
    } catch (e) {
      // Sin soporte: se limpia manualmente abajo
    }
    editorRef.current?.querySelectorAll('font, span').forEach((el) => {
      el.replaceWith(...Array.from(el.childNodes));
    });
    emitir();
  };

  const pegarTexto = (e) => {
    e.preventDefault();
    const plano = e.clipboardData?.getData('text/plain') || '';
    if (plano) document.execCommand('insertText', false, plano);
    emitir();
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-1 px-1.5 py-1.5 border border-slate-200 bg-white rounded-t-lg">
        <ToolbarButton title="Negrita" onClick={() => aplicarComando('bold', true)}>
          <i className="fas fa-bold"></i>
        </ToolbarButton>
        <ToolbarButton title="Cursiva" onClick={() => aplicarComando('italic', true)}>
          <i className="fas fa-italic"></i>
        </ToolbarButton>
        <ToolbarButton title="Subrayado" onClick={() => aplicarComando('underline', true)}>
          <i className="fas fa-underline"></i>
        </ToolbarButton>

        <span className="w-px h-5 bg-slate-200 mx-0.5"></span>

        <ToolbarButton title="Alinear a la izquierda" onClick={() => aplicarComando('justifyLeft')}>
          <i className="fas fa-align-left"></i>
        </ToolbarButton>
        <ToolbarButton title="Centrar" onClick={() => aplicarComando('justifyCenter')}>
          <i className="fas fa-align-center"></i>
        </ToolbarButton>
        <ToolbarButton title="Alinear a la derecha" onClick={() => aplicarComando('justifyRight')}>
          <i className="fas fa-align-right"></i>
        </ToolbarButton>

        <span className="w-px h-5 bg-slate-200 mx-0.5"></span>

        <select
          defaultValue=""
          onChange={(e) => {
            const pt = parseFloat(e.target.value);
            if (pt) aplicarTamano(pt);
            e.target.value = '';
          }}
          title="Tamaño de letra"
          className="h-7 text-xs bg-slate-50 border border-slate-200 rounded px-1 text-slate-600 outline-none focus:border-blue-400"
        >
          <option value="">Tamaño</option>
          {SIZE_OPTIONS.map((pt) => (
            <option key={pt} value={pt}>{pt} pt</option>
          ))}
        </select>

        {COLOR_OPTIONS.map((hex) => (
          <button
            key={hex}
            type="button"
            title={`Color ${hex}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => aplicarColor(hex)}
            className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
          />
        ))}

        <label className="relative w-6 h-6 rounded-full border border-slate-300 cursor-pointer overflow-hidden flex items-center justify-center bg-white" title="Otro color">
          <i className="fas fa-palette text-[10px] text-slate-500"></i>
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => aplicarColor(e.target.value)}
          />
        </label>

        <span className="w-px h-5 bg-slate-200 mx-0.5"></span>

        <ToolbarButton title="Quitar formato" onClick={limpiarFormato}>
          <i className="fas fa-eraser"></i>
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitir}
        onBlur={emitir}
        onPaste={pegarTexto}
        className="leyenda-editor min-h-[80px] max-h-40 overflow-y-auto px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-b-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
      />

      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
        Selecciona el texto y aplica formato: se imprime igual en la guía.
      </p>
    </div>
  );
};

export default LeyendaEditor;

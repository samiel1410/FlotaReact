import React, { useCallback, useEffect, useRef, useState } from 'react';
import { setDialogHandler } from './dialog';

const ICONS = {
  success: { bg: 'bg-emerald-100', color: 'text-emerald-600', fa: 'fa-circle-check' },
  error: { bg: 'bg-rose-100', color: 'text-rose-600', fa: 'fa-circle-xmark' },
  warning: { bg: 'bg-amber-100', color: 'text-amber-600', fa: 'fa-triangle-exclamation' },
  info: { bg: 'bg-blue-100', color: 'text-blue-600', fa: 'fa-circle-info' },
  question: { bg: 'bg-indigo-100', color: 'text-indigo-600', fa: 'fa-circle-question' },
};

/**
 * Reemplazo React de SweetAlert2. Mantiene la forma de respuesta de Swal
 * ({ isConfirmed, isDismissed, value }) para que la migración sea directa.
 */
const DialogView = ({ options, onClose }) => {
  const [value, setValue] = useState(options.inputValue ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const confirmRef = useRef(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const showCancel = !!options.showCancelButton;
  const icon = ICONS[options.icon] || null;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (options.input) inputRef.current?.focus();
    else confirmRef.current?.focus();
  }, [options.input]);

  useEffect(() => {
    if (!options.timer) return undefined;
    const timer = setTimeout(
      () => onClose({ isConfirmed: false, isDismissed: true, isDenied: false, value: valueRef.current }),
      options.timer
    );
    return () => clearTimeout(timer);
  }, [options.timer, onClose]);

  const dismiss = () => onClose({ isConfirmed: false, isDismissed: true, isDenied: false, value: valueRef.current });

  const confirm = async () => {
    if (busy) return;
    if (options.input && typeof options.inputValidator === 'function') {
      setBusy(true);
      try {
        const mensaje = await options.inputValidator(valueRef.current);
        if (mensaje) {
          setError(String(mensaje));
          return;
        }
      } catch (e) {
        setError(e?.message || 'Valor inválido');
        return;
      } finally {
        setBusy(false);
      }
    }
    onClose({ isConfirmed: true, isDismissed: false, isDenied: false, value: valueRef.current });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && options.allowEscapeKey !== false) {
      e.preventDefault();
      dismiss();
    } else if (e.key === 'Enter' && options.input !== 'textarea') {
      e.preventDefault();
      confirm();
    }
  };

  const renderInput = () => {
    const common = {
      value,
      onChange: (e) => { setValue(e.target.value); setError(''); },
      placeholder: options.inputPlaceholder || '',
      className: 'w-full mt-3 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none',
    };

    if (options.input === 'textarea') {
      return <textarea ref={inputRef} rows={3} {...common} />;
    }
    if (options.input === 'select') {
      const opciones = Array.isArray(options.inputOptions)
        ? options.inputOptions
        : Object.entries(options.inputOptions || {}).map(([k, v]) => ({ value: k, label: v }));
      return (
        <select ref={inputRef} {...common}>
          {opciones.map((o) => (
            <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
          ))}
        </select>
      );
    }
    return <input ref={inputRef} type={options.input === 'number' ? 'number' : 'text'} {...common} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={onKeyDown} tabIndex={-1}>
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => { if (options.allowOutsideClick !== false) dismiss(); }}
      />

      <div className={`relative w-full ${options.width || 'max-w-md'} bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150`}>
        {icon && (
          <div className={`mx-auto mb-4 w-14 h-14 rounded-full ${icon.bg} ${icon.color} flex items-center justify-center`}>
            <i className={`fas ${icon.fa} text-2xl`} />
          </div>
        )}

        {options.title && (
          <h3 className="text-center text-lg font-extrabold text-slate-800 leading-snug">{options.title}</h3>
        )}

        {options.text && (
          <p className="mt-2 text-center text-sm text-slate-600 whitespace-pre-line">{options.text}</p>
        )}

        {options.html && (
          typeof options.html === 'string'
            ? <div className="mt-2 text-center text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: options.html }} />
            : <div className="mt-2 text-sm text-slate-600">{options.html}</div>
        )}

        {options.input && renderInput()}

        {error && <p className="mt-2 text-center text-xs font-bold text-rose-600">{error}</p>}

        <div className="mt-6 flex items-center justify-center gap-2">
          {showCancel && (
            <button
              type="button"
              onClick={dismiss}
              className="px-4 py-2 text-xs font-bold rounded-lg border transition-all active:scale-95"
              style={{
                borderColor: options.cancelButtonColor || '#cbd5e1',
                color: options.cancelButtonColor || '#475569',
                backgroundColor: '#fff',
              }}
            >
              {typeof options.cancelButtonText === 'string' && options.cancelButtonText.includes('<')
                ? <span dangerouslySetInnerHTML={{ __html: options.cancelButtonText }} />
                : (options.cancelButtonText || 'Cancelar')}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            disabled={busy}
            className="px-5 py-2 text-xs font-bold rounded-lg text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: options.confirmButtonColor || '#059669' }}
          >
            {busy
              ? <><i className="fas fa-spinner fa-spin mr-1.5" />Procesando...</>
              : (typeof options.confirmButtonText === 'string' && options.confirmButtonText.includes('<')
                ? <span dangerouslySetInnerHTML={{ __html: options.confirmButtonText }} />
                : (options.confirmButtonText || 'Aceptar'))}
          </button>
        </div>

        {options.footer && (
          <p className="mt-4 text-center text-[11px] text-slate-400">{options.footer}</p>
        )}
      </div>
    </div>
  );
};

export const DialogProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const fire = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setState({ ...options });
  }), []);

  const close = useCallback((result) => {
    setState(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  useEffect(() => setDialogHandler(fire), [fire]);

  return (
    <>
      {children}
      {state && <DialogView options={state} onClose={close} />}
    </>
  );
};

export default DialogProvider;

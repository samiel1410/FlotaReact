import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';

// Registrar idioma español
registerLocale('es', es);

/**
 * Componente unificado de selección de rango de fechas (Desde - Hasta)
 * Permite seleccionar ambas fechas en un solo input interactivo con calendario.
 */
// Custom Input para estilizar como el resto de inputs del sistema
const CustomRangeInput = forwardRef(({ value, onClick, placeholder, disabled, className, isClearable, hasDates, onClear }, ref) => (
  <div className="relative w-full flex items-center">
    <div className="absolute left-3 pointer-events-none text-slate-400 text-xs">
      <i className="far fa-calendar-alt"></i>
    </div>
    <input
      ref={ref}
      onClick={onClick}
      value={value}
      readOnly
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full h-9 pl-8 pr-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed ${className}`}
    />
    {isClearable && hasDates && !disabled && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClear) onClear();
        }}
        className="absolute right-2.5 h-4 w-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-colors"
        title="Limpiar rango"
      >
        <i className="fas fa-times text-[10px]"></i>
      </button>
    )}
  </div>
));

CustomRangeInput.displayName = 'CustomRangeInput';

export const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  placeholder = 'Seleccionar rango de fechas...',
  className = '',
  isClearable = true,
  dateFormat = 'yyyy-MM-dd',
  disabled = false,
  minDate,
  maxDate,
  monthsShown = 1,
}) => {
  // Manejo de fechas que pueden venir como strings 'YYYY-MM-DD' o Date objects
  const parseDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string') {
      const parts = d.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const handleChange = (dates) => {
    const [newStart, newEnd] = dates;
    const formatToString = (date) => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (onChange) {
      onChange({
        startDate: newStart,
        endDate: newEnd,
        startDateStr: formatToString(newStart),
        endDateStr: formatToString(newEnd),
      });
    }
  };

  return (
    <div className="relative w-full date-range-picker-container">
      <DatePicker
        selectsRange={true}
        startDate={start}
        endDate={end}
        onChange={handleChange}
        locale="es"
        dateFormat={dateFormat}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        isClearable={false}
        customInput={
          <CustomRangeInput
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            isClearable={isClearable}
            hasDates={Boolean(start || end)}
            onClear={() => handleChange([null, null])}
          />
        }
        monthsShown={monthsShown}
        popperPlacement="bottom-start"
        popperClassName="z-[99999]"
      />
    </div>
  );
};

export default DateRangePicker;

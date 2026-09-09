import Select from 'react-select';

const customStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '2.25rem', // 36px (h-9)
    height: '2.25rem',
    backgroundColor: state.isDisabled ? '#f8fafc' : '#ffffff',
    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
    borderRadius: '0.5rem',
    fontSize: '0.75rem', // 12px (text-xs)
    fontWeight: '600',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 0.625rem',
    height: '2.25rem',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  }),
  singleValue: (base) => ({
    ...base,
    margin: 0,
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#334155',
    lineHeight: '1rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  }),
  placeholder: (base) => ({
    ...base,
    margin: 0,
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#94a3b8',
    lineHeight: '1rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1rem',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '2.25rem',
    display: 'flex',
    alignItems: 'center',
    paddingRight: '0.25rem',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#6366f1' : '#94a3b8',
    padding: '0 0.35rem',
    cursor: 'pointer',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease, color 0.15s ease',
    '&:hover': { color: '#6366f1' },
    svg: {
      width: '14px',
      height: '14px',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '0 0.25rem',
    cursor: 'pointer',
    '&:hover': { color: '#ef4444' },
    svg: {
      width: '13px',
      height: '13px',
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.625rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    zIndex: 99999,
    overflow: 'hidden',
    marginTop: '4px',
    backgroundColor: '#ffffff',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
    maxHeight: '220px',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '4px' },
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '0.375rem',
    backgroundColor: state.isSelected
      ? '#4f46e5'
      : state.isFocused
        ? '#f1f5f9'
        : 'transparent',
    color: state.isSelected ? '#ffffff' : '#334155',
    padding: '0.45rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: state.isSelected ? '700' : '600',
    cursor: 'pointer',
    marginBottom: '2px',
    transition: 'background-color 0.1s ease',
    '&:active': { backgroundColor: '#4338ca' },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: '500',
    padding: '0.75rem',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e0e7ff',
    borderRadius: '0.375rem',
    margin: '2px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#4338ca',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.1rem 0.35rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#4338ca',
    ':hover': {
      backgroundColor: '#c7d2fe',
      color: '#312e81',
    },
  }),
};

export const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  isClearable = true,
  isDisabled = false,
  isMulti = false,
  name,
  className = '',
}) => {
  const formattedOptions = options.map(opt => ({
    value: opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : ''),
    label: opt.label !== undefined ? opt.label : (opt.nombre !== undefined ? opt.nombre : ''),
  }));

  const selectedOption = isMulti
    ? formattedOptions.filter(o => Array.isArray(value) && value.includes(o.value))
    : formattedOptions.find(o => String(o.value) === String(value)) || null;

  return (
    <div className={`w-full ${className}`}>
      <Select
        name={name}
        options={formattedOptions}
        value={selectedOption}
        onChange={(option) => {
          if (isMulti) {
            onChange(option ? option.map(o => o.value) : []);
          } else {
            onChange(option ? option.value : '');
          }
        }}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isSearchable={true}
        styles={customStyles}
        menuPosition="fixed"
        noOptionsMessage={() => 'Sin resultados'}
        loadingMessage={() => 'Cargando...'}
      />
    </div>
  );
};

export default SearchableSelect;

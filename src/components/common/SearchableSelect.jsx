import Select from 'react-select';

const customStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '2.25rem',
    height: 'auto',
    borderColor: state.isFocused ? '#818cf8' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(129, 140, 248, 0.1)' : 'none',
    '&:hover': { borderColor: '#818cf8' },
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'text',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 0.75rem',
    height: '2.25rem',
    display: 'flex',
    alignItems: 'center',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: '0.875rem',
    color: '#1e293b',
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#94a3b8',
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#1e293b',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    zIndex: 9999,
    fontSize: '0.875rem',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '220px',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '2px' },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#818cf8'
      : state.isFocused
        ? '#eef2ff'
        : 'transparent',
    color: state.isSelected ? '#fff' : '#1e293b',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    '&:active': { backgroundColor: state.isSelected ? '#6366f1' : '#e0e7ff' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: '#94a3b8',
    padding: '0 0.5rem',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '0 0.25rem',
    cursor: 'pointer',
    '&:hover': { color: '#ef4444' },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#94a3b8',
    padding: '1rem',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e0e7ff',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#4338ca',
    fontSize: '0.75rem',
    fontWeight: 'bold',
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
  placeholder = 'Buscar y seleccionar...',
  isClearable = true,
  isDisabled = false,
  isMulti = false,
  name,
}) => {
  const formattedOptions = options.map(opt => ({
    value: opt.value ?? opt.id ?? '',
    label: opt.label ?? opt.nombre ?? '',
  }));

  let selectedOption = null;
  if (isMulti) {
    selectedOption = formattedOptions.filter(o => Array.isArray(value) && value.includes(o.value));
  } else {
    selectedOption = formattedOptions.find(o => o.value === value) || null;
  }

  return (
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
  );
};

export default SearchableSelect;

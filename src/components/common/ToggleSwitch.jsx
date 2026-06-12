/**
 * ToggleSwitch - Switch de estado Activo/Inactivo reutilizable
 * Compatible con react-hook-form (usa register)
 */
import React from 'react';

const ToggleSwitch = ({ label = 'Activo', register, ...props }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer mt-1">
      <input type="checkbox" className="sr-only peer" {...register} {...props} />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
      <span className="ml-3 text-sm font-semibold text-slate-700">{label}</span>
    </label>
  );
};

export default ToggleSwitch;

import React from 'react';

export const DespachoOcupacionBar = ({ capacidad, ocupados }) => {
  const cap = capacidad || 40;
  const ocup = ocupados || 0;
  const pct = cap > 0 ? Math.min(Math.round((ocup / cap) * 100), 100) : 0;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${pct}%`, background: color }}
    />
  );
};

export default DespachoOcupacionBar;

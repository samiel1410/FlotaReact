import { jsx, jsxs } from "react/jsx-runtime";
import React from "react";
const formatFecha = (f) => {
  if (!f || f === "0000-00-00" || String(f).startsWith("0000-00-00")) return null;
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
};
const fmt = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
export const DespachoRetencionesModal = ({
  valores,
  valoresVista,
  sucursalActual,
  deudas,
  unidad,
  viajeDesc,
  onClose
}) => {
  const valoresSucursal = valoresVista?.esPorSucursal ? valoresVista : valores?.sucursal_usuario || (valores?.sucursales_desglose?.length === 1 ? valores.sucursales_desglose[0] : null);
  const nombreSucursalActiva = valoresVista?.sucursalNombre || sucursalActual?.nombre_sucursal || valores?.sucursal_usuario?.nombre_sucursal || "Mi Sucursal";
  const boletosSucursalActiva = parseFloat(
    (valoresVista?.esPorSucursal ? valoresVista?.boletos : valores?.sucursal_usuario?.boletos) ?? 0
  ) || 0;
  const [modoVista, setModoVista] = React.useState(
    valoresSucursal && boletosSucursalActiva > 0 ? "SUCURSAL" : "GENERAL"
  );
  const avisosRetencion = React.useMemo(() => valores?.avisos_retencion || [], [valores?.avisos_retencion]);
  const conceptosRetencion = React.useMemo(() => valores?.conceptos_retencion || [], [valores?.conceptos_retencion]);
  const conceptosPendientes = React.useMemo(() => valores?.conceptos_pendientes || [], [valores?.conceptos_pendientes]);
  const isSucursal = modoVista === "SUCURSAL" && valoresSucursal;
  const totalBoletos = isSucursal ? parseFloat(valoresSucursal?.boletos ?? valoresSucursal?.total_boletos ?? valores?.boletos ?? 0) : parseFloat(valores?.boletos ?? 0);
  const totalRetenciones = isSucursal ? parseFloat(valoresSucursal?.retencion_aplicada ?? valoresSucursal?.retencion ?? valoresSucursal?.retencion_monto ?? valores?.retencion ?? 0) : parseFloat(valores?.retencion ?? 0);
  const techoRetencion = parseFloat(
    (isSucursal ? valoresSucursal?.retencion ?? valoresSucursal?.retencion_monto : valores?.retencion_porcentual) ?? 0
  ) || 0;
  const totalEntrega = isSucursal ? parseFloat(valoresSucursal?.entrega ?? totalBoletos - totalRetenciones) : parseFloat(valores?.entrega ?? 0);
  const sucursalesDesgloseFiltrado = React.useMemo(() => {
    const todosDesgloses = valores?.sucursales_desglose || [];
    if (!isSucursal) return todosDesgloses;
    const sucId = Number(sucursalActual?.id_sucursal || valoresSucursal?.id_sucursal || 0);
    const sucCod = String(sucursalActual?.suc_codigo || valoresSucursal?.suc_codigo || "").trim();
    const sucNom = String(nombreSucursalActiva || "").trim().toLowerCase();
    const matches = todosDesgloses.filter((s) => {
      const sId = Number(s.id_sucursal || 0);
      const sCod = String(s.suc_codigo || "").trim();
      const sNom = String(s.nombre_sucursal || "").trim().toLowerCase();
      if (sucId > 0 && sId === sucId) return true;
      if (sucCod && sCod === sucCod) return true;
      if (sucNom && (sNom.includes(sucNom) || sucNom.includes(sNom))) return true;
      return false;
    });
    if (matches.length > 0) return matches;
    return [{
      nombre_sucursal: nombreSucursalActiva,
      cantidad_boletos: valoresSucursal?.cantidad_boletos || valores?.cantidad_boletos || 0,
      total_boletos: totalBoletos,
      porcentaje_retencion: valoresSucursal?.porcentaje_retencion || valores?.porcentaje_retencion || 0,
      retencion_calculada: totalRetenciones,
      retencion_monto: totalRetenciones
    }];
  }, [valores?.sucursales_desglose, isSucursal, sucursalActual, valoresSucursal, nombreSucursalActiva, totalBoletos, totalRetenciones]);
  const retencionesRaw = valores?.retenciones_detalle || [];
  const retenciones = [...retencionesRaw].sort((a, b) => {
    const grpA = Number(a.grupo ?? (a.cobro_total_despacho == 1 ? 0 : a.tipo === "DEUDA_SOCIO" ? 1 : 2));
    const grpB = Number(b.grupo ?? (b.cobro_total_despacho == 1 ? 0 : b.tipo === "DEUDA_SOCIO" ? 1 : 2));
    if (grpA !== grpB) return grpA - grpB;
    const prioA = Number(a.prioridad ?? 3);
    const prioB = Number(b.prioridad ?? 3);
    if (prioA !== prioB) return prioA - prioB;
    return Number(a.orden_secuencia || 0) - Number(b.orden_secuencia || 0);
  });
  const deudasItems = deudas?.items || [];
  const idsDeudaEnRetenciones = new Set(
    retenciones.filter((r) => r.tipo === "DEUDA_SOCIO").map((r) => r.id)
  );
  const deudasNoIncluidas = deudasItems.filter((d) => !idsDeudaEnRetenciones.has(d.id_deuda));
  const getPrioridadBadge = (item) => {
    if (item.grupo === 0 || item.tipo === "DEUDA_SOCIO" && (item.prioridad || 1) <= 1 || item.cobro_total_despacho == 1) {
      return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-200", children: [
        /* @__PURE__ */ jsx("i", { className: "fas fa-bolt text-[9px]" }),
        " 1\xB0 Multa (100% Boletos)"
      ] });
    }
    if (item.tipo === "DEUDA_SOCIO") {
      return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200", children: [
        /* @__PURE__ */ jsx("i", { className: "fas fa-user-tag text-[9px]" }),
        " Deuda Socio (Prio ",
        item.prioridad || 1,
        ")"
      ] });
    }
    const prio = item.prioridad || 3;
    const prioLabels = {
      1: "Orden 1 (M\xE1xima)",
      2: "Orden 2 (Alta)",
      3: "Orden 3 (Media-Alta)",
      4: "Orden 4 (Media)",
      5: "Orden 5 (Media-Baja)",
      6: "Orden 6 (Baja)",
      7: "Orden 7 (Baja 2)",
      8: "Orden 8 (Muy Baja)",
      9: "Orden 9 (Muy Baja 2)",
      10: "Orden 10 (M\xEDnima)"
    };
    const label = prioLabels[prio] || `Orden ${prio}`;
    const colorClasses = {
      1: "bg-emerald-100 text-emerald-800 border-emerald-300",
      2: "bg-blue-100 text-blue-800 border-blue-300",
      3: "bg-indigo-100 text-indigo-800 border-indigo-300",
      4: "bg-amber-100 text-amber-800 border-amber-300",
      5: "bg-amber-100/80 text-amber-700 border-amber-200",
      6: "bg-slate-100 text-slate-700 border-slate-300",
      7: "bg-slate-100 text-slate-700 border-slate-300",
      8: "bg-slate-100 text-slate-600 border-slate-200",
      9: "bg-slate-100 text-slate-600 border-slate-200",
      10: "bg-slate-100 text-slate-500 border-slate-200"
    };
    const colorClass = colorClasses[prio] || "bg-slate-100 text-slate-700 border-slate-200";
    return /* @__PURE__ */ jsxs("span", { className: `inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}`, children: [
      /* @__PURE__ */ jsx("i", { className: "fas fa-sort-amount-down text-[9px]" }),
      " ",
      label
    ] });
  };
  const tipoBadge = (item) => {
    if (item.tipo === "COBRO_AUTOMATICO") return /* @__PURE__ */ jsx("span", { className: "bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200", children: "Autom\xE1tico" });
    if (item.tipo === "DEUDA_SOCIO") return /* @__PURE__ */ jsx("span", { className: "bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-200", children: "Deuda Socio" });
    return null;
  };
  const dotColor = (item) => {
    if (item.tipo === "COBRO_AUTOMATICO") return "bg-blue-500";
    if (item.tipo === "DEUDA_SOCIO") return "bg-purple-500";
    if (item.cobro_total_despacho == 1) return "bg-rose-600";
    return "bg-indigo-500";
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150",
      onClick: onClose,
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-200 shrink-0 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-sm", children: /* @__PURE__ */ jsx("i", { className: "fas fa-receipt text-lg" }) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("h3", { className: "text-base font-extrabold text-slate-800 flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { children: "Desglose de Retenciones y Gastos" }),
                    isSucursal && /* @__PURE__ */ jsx("span", { className: "bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200", children: nombreSucursalActiva })
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 font-medium", children: [
                    viajeDesc,
                    " ",
                    unidad?.numero_unidad ? `\u2014 Bus ${unidad.numero_unidad}` : ""
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 text-xs font-bold", children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setModoVista("SUCURSAL"),
                      className: `px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${modoVista === "SUCURSAL" ? "bg-white text-blue-700 shadow-sm font-black" : "text-slate-600 hover:text-slate-900"}`,
                      children: [
                        /* @__PURE__ */ jsx("i", { className: "fas fa-building text-[10px]" }),
                        /* @__PURE__ */ jsxs("span", { children: [
                          "Solo ",
                          nombreSucursalActiva
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setModoVista("GENERAL"),
                      className: `px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${modoVista === "GENERAL" ? "bg-white text-blue-700 shadow-sm font-black" : "text-slate-600 hover:text-slate-900"}`,
                      children: [
                        /* @__PURE__ */ jsx("i", { className: "fas fa-globe text-[10px]" }),
                        /* @__PURE__ */ jsx("span", { children: "Consolidado General" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors", children: /* @__PURE__ */ jsx("i", { className: "fas fa-times text-sm" }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-4 bg-gradient-to-r from-slate-50 via-rose-50/30 to-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-3 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center", children: [
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-blue-600 uppercase tracking-wider block", children: [
                  "Recaudaci\xF3n Boletos ",
                  isSucursal ? `(${nombreSucursalActiva})` : ""
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-base font-black font-mono text-blue-900 mt-0.5 block", children: fmt(totalBoletos) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "bg-white p-3 rounded-xl border border-rose-200 shadow-sm text-center", children: [
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-rose-600 uppercase tracking-wider block", children: [
                  "Total Retenido ",
                  isSucursal ? `(${nombreSucursalActiva})` : ""
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-base font-black font-mono text-rose-600 mt-0.5 block", children: [
                  "-",
                  fmt(totalRetenciones)
                ] }),
                techoRetencion > totalRetenciones + 9e-3 && /* @__PURE__ */ jsxs("span", { className: "text-[9px] font-bold text-slate-400 block mt-0.5", children: [
                  "Techo del %: ",
                  fmt(techoRetencion)
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "bg-white p-3 rounded-xl border border-emerald-200 shadow-sm text-center", children: [
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-emerald-700 uppercase tracking-wider block", children: [
                  "Neto a Entregar ",
                  isSucursal ? `(${nombreSucursalActiva})` : ""
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-base font-black font-mono text-emerald-700 mt-0.5 block", children: fmt(totalEntrega) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-6 overflow-y-auto space-y-4 flex-1", children: [
              sucursalesDesgloseFiltrado && sucursalesDesgloseFiltrado.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border border-blue-200 rounded-xl overflow-hidden bg-blue-50/20 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-blue-50/80 px-4 py-2.5 border-b border-blue-200 flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("i", { className: "fas fa-building text-blue-600 text-xs" }),
                    /* @__PURE__ */ jsx("h4", { className: "text-xs font-black uppercase tracking-wider text-blue-900", children: isSucursal ? `Retenci\xF3n de Sucursal: ${nombreSucursalActiva}` : "Retenci\xF3n por Sucursal / Oficina de Venta" })
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200", children: [
                    sucursalesDesgloseFiltrado.length,
                    " ",
                    sucursalesDesgloseFiltrado.length === 1 ? "sucursal" : "sucursales"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 border-b border-blue-100 text-slate-500 text-[10px] font-black uppercase tracking-wider", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left", children: "Sucursal" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center w-24", children: "Boletos" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right w-28", children: "Total Venta" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center w-28", children: "% Retenci\xF3n" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right w-28 text-rose-600", children: "Retenci\xF3n" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-blue-50", children: sucursalesDesgloseFiltrado.map((suc, sIdx) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-blue-50/40 transition-colors", children: [
                    /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 font-bold text-slate-800 flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx("i", { className: "fas fa-map-marker-alt text-blue-500 text-[10px]" }),
                      suc.nombre_sucursal || "Oficina Principal"
                    ] }),
                    /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-center font-mono font-bold text-slate-700", children: suc.cantidad_boletos }),
                    /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-right font-mono font-bold text-slate-800", children: fmt(suc.total_boletos) }),
                    /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-center", children: /* @__PURE__ */ jsxs("span", { className: "bg-indigo-50 text-indigo-700 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-indigo-200", children: [
                      parseFloat(suc.porcentaje_retencion || 0).toFixed(2),
                      "%"
                    ] }) }),
                    /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 text-right font-mono font-black text-rose-600 text-[12px]", children: [
                      "-",
                      fmt(suc.retencion_calculada ?? suc.retencion_monto)
                    ] })
                  ] }, sIdx)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 font-bold text-slate-700", children: [
                  /* @__PURE__ */ jsx("i", { className: "fas fa-layer-group text-rose-500" }),
                  /* @__PURE__ */ jsx("span", { children: "Jerarqu\xEDa de Descuento:" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1.5 text-[10px]", children: [
                  /* @__PURE__ */ jsx("span", { className: "bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded border border-rose-200", children: "1\xB0 Multas (100% Boletos)" }),
                  /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "\u2794" }),
                  /* @__PURE__ */ jsx("span", { className: "bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200", children: "2\xB0 Deudas Socio" }),
                  /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "\u2794" }),
                  /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200", children: "3\xB0 Cobros de Bus (Orden 1..10)" })
                ] })
              ] }),
              avisosRetencion.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [
                  /* @__PURE__ */ jsx("i", { className: "fas fa-exclamation-triangle text-amber-600 text-xs" }),
                  /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-black uppercase tracking-wider text-amber-800", children: [
                    "Avisos de configuraci\xF3n (",
                    avisosRetencion.length,
                    ")"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("ul", { className: "space-y-1.5", children: avisosRetencion.map((a, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2 text-[11px] text-amber-900 leading-snug", children: [
                  /* @__PURE__ */ jsx("i", { className: "fas fa-circle text-[5px] mt-1.5 text-amber-500 shrink-0" }),
                  /* @__PURE__ */ jsx("span", { children: a.mensaje })
                ] }, i)) })
              ] }),
              conceptosRetencion.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("i", { className: "fas fa-sitemap text-slate-500 text-xs" }),
                    /* @__PURE__ */ jsx("h4", { className: "text-xs font-black uppercase tracking-wider text-slate-700", children: "Orden de aplicaci\xF3n de conceptos" })
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200", children: [
                    conceptosRetencion.length,
                    " concepto",
                    conceptosRetencion.length === 1 ? "" : "s"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50/60 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center w-14", children: "Orden" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left", children: "Concepto" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center w-36", children: "Tope aplicado" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right w-24", children: "Saldo" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right w-24 text-rose-600", children: "Retenido" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right w-28 text-amber-700", children: "Queda pendiente" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: conceptosRetencion.map((c, i) => {
                    const aplicado = parseFloat(c.aplicado || 0);
                    const saldo = parseFloat(c.saldo || 0);
                    const pendiente = Math.max(0, saldo - aplicado);
                    const omitido = Boolean(c.omitido_por_falta_porcentaje);
                    return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50/60 transition-colors", children: [
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-2.5 text-center", children: /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-300 font-mono font-bold text-slate-700 text-[11px]", children: i + 1 }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-2.5", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                          /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800", children: c.concepto }),
                          /* @__PURE__ */ jsx("span", { className: `text-[9px] font-black px-1.5 py-0.5 rounded border ${c.origen === "COBRO" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-purple-50 text-purple-700 border-purple-200"}`, children: c.origen === "COBRO" ? "COBRO" : c.origen === "SISTEMA" ? "SISTEMA" : "DEUDA" }),
                          c.cobrar_siempre ? /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200", children: "SIEMPRE" }) : null
                        ] }),
                        omitido && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-amber-600 font-bold", children: "Pendiente: la sucursal no tiene porcentaje de retenci\xF3n configurado" })
                      ] }) }),
                      /* @__PURE__ */ jsxs("td", { className: "px-3 py-2.5 text-center", children: [
                        /* @__PURE__ */ jsx("span", { className: `text-[10px] font-black px-2 py-0.5 rounded border ${c.tope === "TOTAL" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-600 border-slate-200"}`, children: c.tope === "TOTAL" ? "100% boletos" : "% sucursal" }),
                        c.porcentaje_usado !== null && c.porcentaje_usado !== void 0 && /* @__PURE__ */ jsxs("span", { className: "block text-[9px] text-slate-400 font-mono mt-0.5", children: [
                          parseFloat(c.porcentaje_usado || 0).toFixed(2),
                          "%"
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-2.5 text-right font-mono font-bold text-slate-700", children: fmt(saldo) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-2.5 text-right font-mono font-black text-rose-600", children: aplicado > 0 ? `-${fmt(aplicado)}` : /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "\u2014" }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-2.5 text-right font-mono font-bold text-amber-700", children: omitido || pendiente > 0 ? fmt(pendiente) : /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "\u2014" }) })
                    ] }, i);
                  }) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [
                  /* @__PURE__ */ jsxs("h4", { className: "text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("i", { className: "fas fa-list-ul text-rose-500" }),
                    "Retenciones Aplicadas (",
                    retenciones.length,
                    ")"
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-slate-500", children: "Ordenadas estrictamente seg\xFAn la prioridad configurada" })
                ] }),
                retenciones.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400", children: [
                  /* @__PURE__ */ jsx("i", { className: "fas fa-hand-holding-usd text-3xl text-slate-300 mb-2" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-600", children: "No hay retenciones aplicadas" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400 mt-0.5", children: conceptosPendientes.length > 0 ? `${conceptosPendientes.length} concepto(s) quedaron pendientes por configuraci\xF3n de la sucursal.` : "Este viaje no tiene comisiones ni cobros pendientes por descontar." })
                ] }) : /* @__PURE__ */ jsx("div", { className: "border border-slate-200 rounded-xl overflow-hidden shadow-sm", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-center w-14", children: "Orden" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-left", children: "Concepto / Gasto" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-center w-40", children: "Prioridad Configurada" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-right w-24", children: "Deuda Total" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-right w-24 text-rose-600", children: "Se Cobra" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-right w-28 text-amber-700", children: "Saldo Restante" }),
                    /* @__PURE__ */ jsx("th", { className: "px-3 py-2.5 text-center w-24", children: "Fecha" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: retenciones.map((item, idx) => {
                    const saldoRestante = parseFloat(item.saldo_restante ?? 0);
                    const montoCobrado = parseFloat(item.monto || 0);
                    const totalDeuda = montoCobrado + saldoRestante;
                    const fechaFmt = formatFecha(item.fecha);
                    return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50/80 transition-colors", children: [
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-300 font-mono font-bold text-slate-700 text-[11px]", children: idx + 1 }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                          /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${dotColor(item)}` }),
                          /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800", children: item.nombre }),
                          tipoBadge(item)
                        ] }),
                        item.observacion && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 pl-3.5 italic", children: item.observacion })
                      ] }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center", children: getPrioridadBadge(item) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-right font-mono text-slate-500 text-[11px]", children: fmt(totalDeuda) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-right", children: /* @__PURE__ */ jsxs("span", { className: "font-black font-mono text-rose-600 text-[12px]", children: [
                        "-",
                        fmt(montoCobrado)
                      ] }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-right", children: saldoRestante > 0 ? /* @__PURE__ */ jsx("span", { className: "font-bold font-mono text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200", children: fmt(saldoRestante) }) : /* @__PURE__ */ jsx("span", { className: "text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200", children: "\u2713 Saldado" }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center font-mono text-[11px] text-slate-500", children: item.tipo === "COBRO_AUTOMATICO" || item.tipo === "DEUDA_SOCIO" ? /* @__PURE__ */ jsx("span", { className: "text-blue-500 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100", children: "En despacho" }) : fechaFmt ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-medium", children: [
                        /* @__PURE__ */ jsx("i", { className: "far fa-calendar-alt text-[9px] text-slate-400" }),
                        fechaFmt
                      ] }) : /* @__PURE__ */ jsx("span", { className: "text-slate-400 text-[10px] italic", children: "Sin fecha" }) })
                    ] }, idx);
                  }) }),
                  /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-rose-50/60 border-t-2 border-rose-200 text-slate-800 font-extrabold", children: [
                    /* @__PURE__ */ jsx("td", { colSpan: 4, className: "px-3 py-2.5 text-right uppercase tracking-wider text-[11px] text-rose-800", children: "Total Retenciones / Gastos Deducidos:" }),
                    /* @__PURE__ */ jsxs("td", { className: "px-3 py-2.5 text-right font-black font-mono text-rose-700 text-sm", children: [
                      "-",
                      fmt(totalRetenciones)
                    ] }),
                    /* @__PURE__ */ jsx("td", { colSpan: 2 })
                  ] }) })
                ] }) })
              ] }),
              deudasNoIncluidas.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-4 border-t border-slate-200", children: [
                /* @__PURE__ */ jsxs("h4", { className: "text-xs font-black uppercase tracking-wider text-amber-700 mb-2.5 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("i", { className: "fas fa-exclamation-circle text-amber-500" }),
                  "Deudas Pendientes NO Cobradas en este Viaje (",
                  deudasNoIncluidas.length,
                  ")",
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium text-slate-400 normal-case", children: "\u2014 sin retenci\xF3n disponible" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100/50 border-b border-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-left", children: "Concepto / Tipo" }),
                    /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-right w-32", children: "Saldo Pendiente" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-amber-100", children: deudasNoIncluidas.map((d, i) => /* @__PURE__ */ jsxs("tr", { children: [
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 font-medium text-slate-700", children: d.concepto || d.tipo_nombre || "Deuda" }),
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 text-right font-black font-mono text-amber-800", children: fmt(d.saldo_pendiente) })
                  ] }, i)) })
                ] }) })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end shrink-0", children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                className: "px-5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95",
                children: "Cerrar"
              }
            ) })
          ]
        }
      )
    }
  );
};
export default DespachoRetencionesModal;

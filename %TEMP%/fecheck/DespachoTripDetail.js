import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import DespachoOcupacionBar from "./DespachoOcupacionBar";
import DespachoAsientosTable from "./DespachoAsientosTable";
import { buildPdfUrl } from "../../../../utils/pdfUrlUtils";
import { useAuth } from "../../../../context/AuthContext";
const formatFecha = (f) => {
  if (!f) return "--/--/----";
  const d = new Date(f);
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
};
export const DespachoTripDetail = ({
  selectedTrip,
  detailLoading,
  detailData,
  despachando,
  noCumpliendo = false,
  onDespachar,
  onNoCumple,
  onOpenUnidadModal,
  onOpenConductorModal,
  onOpenRetencionesModal
}) => {
  const { user } = useAuth();
  const tripId = selectedTrip?.id_viajes || selectedTrip?.id_viaje || null;
  const isDespachado = detailData?.despachado_en_mi_sucursal !== void 0 ? detailData.despachado_en_mi_sucursal : Number(selectedTrip?.estado || selectedTrip?.estado_viajes || 0) === 2;
  const despachosDelViaje = detailData?.despachos_viaje || [];
  const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
  const totalAsientosOcupados = detailData?.asientos?.length || detailData?.cantidad_boletos || 0;
  const capacidadBus = detailData?.capacidad_bus || 40;
  const ocupacionPct = Math.round(totalAsientosOcupados / capacidadBus * 100);
  const todosAsientos = detailData?.asientos || [];
  const sucursalesEnViaje = React.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    todosAsientos.forEach((a) => {
      const id = Number(a.id_sucursal || a.pasajero?.id_sucursal || 0);
      const codigo = String(a.suc_codigo || a.pasajero?.suc_codigo || "").trim();
      const nombre = String(a.nombre_sucursal || a.pasajero?.nombre_sucursal || "Oficina").trim();
      const key = id > 0 ? `id_${id}` : codigo ? `code_${codigo}` : `nom_${nombre}`;
      if (!map.has(key)) {
        map.set(key, { key, id, codigo, nombre, count: 0, total: 0 });
      }
      const item = map.get(key);
      item.count += 1;
      item.total += parseFloat(a.pasajero?.precio || a.total_boleto_detalle || 0);
    });
    return Array.from(map.values());
  }, [todosAsientos]);
  const backendSucId = Number(detailData?.sucursal_actual?.id_sucursal || 0);
  const backendSucCodigo = String(detailData?.sucursal_actual?.suc_codigo || "").trim();
  const backendSucNombre = String(detailData?.sucursal_actual?.nombre_sucursal || "").trim().toLowerCase();
  const userSucursalId = Number(
    user?.id_fksucursal_usuario || user?.id_sucursal || user?.id_fksucursal || user?.sucursal_usuario || user?.suc_codigo_sucursal || user?.sucursal?.id_sucursal || 0
  );
  const userSucursalCodigo = String(user?.suc_codigo_sucursal || user?.punto_emision_sucursal || user?.sucursal_usuario || "").trim();
  const userSucursalNombre = typeof user?.nombre_sucursal === "string" ? user.nombre_sucursal : typeof user?.sucursal_usuario === "string" && isNaN(Number(user.sucursal_usuario)) ? user.sucursal_usuario : typeof user?.sucursal === "string" ? user.sucursal : typeof user?.sucursal?.nombre_sucursal === "string" ? user.sucursal.nombre_sucursal : "";
  const miSucursalActiva = React.useMemo(() => {
    if (sucursalesEnViaje.length === 0) return null;
    if (backendSucId > 0) {
      const match = sucursalesEnViaje.find((s) => Number(s.id) === backendSucId);
      if (match) return match;
    }
    if (backendSucCodigo) {
      const match = sucursalesEnViaje.find((s) => s.codigo === backendSucCodigo || String(s.id) === backendSucCodigo);
      if (match) return match;
    }
    if (backendSucNombre) {
      const match = sucursalesEnViaje.find((s) => s.nombre.toLowerCase().includes(backendSucNombre) || backendSucNombre.includes(s.nombre.toLowerCase()));
      if (match) return match;
    }
    if (userSucursalId > 0) {
      const matchId = sucursalesEnViaje.find((s) => Number(s.id) === userSucursalId);
      if (matchId) return matchId;
    }
    if (userSucursalCodigo) {
      const matchCod = sucursalesEnViaje.find((s) => s.codigo === userSucursalCodigo || String(s.id) === userSucursalCodigo);
      if (matchCod) return matchCod;
    }
    if (userSucursalNombre) {
      const nomU = userSucursalNombre.toLowerCase();
      const matchNom = sucursalesEnViaje.find((s) => {
        const nomS = s.nombre.toLowerCase();
        return nomS.includes(nomU) || nomU.includes(nomS);
      });
      if (matchNom) return matchNom;
    }
    return sucursalesEnViaje[0];
  }, [sucursalesEnViaje, backendSucId, backendSucCodigo, backendSucNombre, userSucursalId, userSucursalCodigo, userSucursalNombre]);
  const [selectedSucursalKey, setSelectedSucursalKey] = React.useState("SUCURSAL");
  React.useEffect(() => {
    setSelectedSucursalKey("SUCURSAL");
  }, [tripId]);
  const targetSucursalActiva = React.useMemo(() => {
    if (selectedSucursalKey === "TODOS") return null;
    return selectedSucursalKey === "SUCURSAL" ? miSucursalActiva : sucursalesEnViaje.find((s) => s.key === selectedSucursalKey);
  }, [selectedSucursalKey, miSucursalActiva, sucursalesEnViaje]);
  const asientosFiltrados = React.useMemo(() => {
    if (selectedSucursalKey === "TODOS") {
      return todosAsientos;
    }
    if (selectedSucursalKey === "SUCURSAL" && detailData?.asientos_sucursal && detailData.asientos_sucursal.length > 0) {
      return detailData.asientos_sucursal;
    }
    if (!targetSucursalActiva) return todosAsientos;
    return todosAsientos.filter((a) => {
      const aId = Number(a.id_sucursal || a.pasajero?.id_sucursal || 0);
      const aCod = String(a.suc_codigo || a.pasajero?.suc_codigo || "").trim();
      const aNom = String(a.nombre_sucursal || a.pasajero?.nombre_sucursal || "").trim().toLowerCase();
      if (targetSucursalActiva.id > 0 && aId > 0 && aId === targetSucursalActiva.id) return true;
      if (targetSucursalActiva.codigo && aCod && aCod === targetSucursalActiva.codigo) return true;
      if (targetSucursalActiva.nombre && aNom && (aNom.includes(targetSucursalActiva.nombre.toLowerCase()) || targetSucursalActiva.nombre.toLowerCase().includes(aNom))) return true;
      return false;
    });
  }, [todosAsientos, selectedSucursalKey, targetSucursalActiva, detailData?.asientos_sucursal]);
  const valoresVista = React.useMemo(() => {
    const globalBoletos = parseFloat(detailData?.valores?.boletos || 0);
    const globalRetencion = parseFloat(detailData?.valores?.retencion || 0);
    const globalEntrega = parseFloat(detailData?.valores?.entrega || 0);
    if (selectedSucursalKey === "TODOS") {
      return {
        boletos: globalBoletos,
        retencion: globalRetencion,
        entrega: globalEntrega,
        esPorSucursal: false,
        sucursalNombre: "General"
      };
    }
    if (selectedSucursalKey === "SUCURSAL" && detailData?.valores?.sucursal_usuario) {
      const sucVal = detailData.valores.sucursal_usuario;
      const retencionAplicada = sucVal.retencion_aplicada !== void 0 ? parseFloat(sucVal.retencion_aplicada || 0) : parseFloat(sucVal.retencion || 0);
      return {
        boletos: parseFloat(sucVal.boletos || 0),
        retencion: retencionAplicada,
        retencion_techo: parseFloat(sucVal.retencion || 0),
        entrega: Math.max(0, parseFloat(sucVal.boletos || 0) - retencionAplicada),
        porcentaje_retencion: parseFloat(sucVal.porcentaje_retencion || 0),
        esPorSucursal: true,
        sucursalNombre: sucVal.nombre_sucursal || targetSucursalActiva?.nombre || "Mi Sucursal"
      };
    }
    const desgloseMatch = (detailData?.valores?.sucursales_desglose || []).find((s) => {
      if (targetSucursalActiva?.id > 0 && Number(s.id_sucursal) === targetSucursalActiva.id) return true;
      if (targetSucursalActiva?.codigo && String(s.suc_codigo) === targetSucursalActiva.codigo) return true;
      if (targetSucursalActiva?.nombre && s.nombre_sucursal && s.nombre_sucursal.toLowerCase().includes(targetSucursalActiva.nombre.toLowerCase())) return true;
      return false;
    });
    if (desgloseMatch) {
      return {
        boletos: parseFloat(desgloseMatch.total_boletos || 0),
        retencion: parseFloat(desgloseMatch.retencion_monto || 0),
        entrega: parseFloat(desgloseMatch.entrega ?? Math.max(0, desgloseMatch.total_boletos - desgloseMatch.retencion_monto)),
        porcentaje_retencion: parseFloat(desgloseMatch.porcentaje_retencion || 0),
        esPorSucursal: true,
        sucursalNombre: targetSucursalActiva?.nombre || desgloseMatch.nombre_sucursal
      };
    }
    return {
      boletos: globalBoletos,
      retencion: globalRetencion,
      entrega: globalEntrega,
      esPorSucursal: false,
      sucursalNombre: "General"
    };
  }, [detailData?.valores, selectedSucursalKey, targetSucursalActiva]);
  if (!selectedTrip) {
    return /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center justify-center text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm mb-4", children: /* @__PURE__ */ jsx("i", { className: "fas fa-hand-pointer text-3xl text-blue-500/70 animate-bounce" }) }),
      /* @__PURE__ */ jsx("h3", { className: "text-base font-bold text-slate-700", children: "Seleccione un viaje del listado" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1 max-w-sm", children: "Haga clic en cualquier viaje de la izquierda para revisar lista de pasajeros, validar asignaciones de tripulaci\xF3n y realizar el despacho operativo." })
    ] });
  }
  if (detailLoading) {
    return /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsx("i", { className: "fas fa-circle-notch fa-spin text-3xl text-blue-600" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500", children: "Cargando informaci\xF3n del viaje..." })
    ] });
  }
  if (!detailData) {
    return /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 flex items-center justify-center text-slate-400", children: /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: "No se pudo cargar la informaci\xF3n del viaje" }) });
  }
  return /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto w-full space-y-4 pb-12", children: [
    /* @__PURE__ */ jsx("div", { className: "bg-gradient-to-r from-blue-50 via-white to-indigo-50/50 rounded-2xl p-5 text-slate-800 shadow-sm border border-blue-200/80", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [
          /* @__PURE__ */ jsxs("span", { className: "bg-blue-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm", children: [
            "N\xB0 VIAJE #",
            tripId
          ] }),
          selectedTrip.codigo_viaje && /* @__PURE__ */ jsxs("span", { className: "bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200", children: [
            "Frecuencia: ",
            selectedTrip.codigo_viaje
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900", children: [
          /* @__PURE__ */ jsx("span", { children: selectedTrip.origen || "Origen" }),
          /* @__PURE__ */ jsx("i", { className: "fas fa-arrow-right text-blue-600 text-base mx-1" }),
          /* @__PURE__ */ jsx("span", { children: selectedTrip.destino || "Destino" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx("div", { className: "text-3xl font-black tracking-tight leading-none text-blue-700 font-mono", children: selectedTrip.hora_salida || "--:--" }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs font-bold text-slate-500 mt-1.5 flex items-center justify-end gap-1.5", children: [
          /* @__PURE__ */ jsx("i", { className: "far fa-calendar-alt text-blue-500" }),
          formatFecha(selectedTrip.fecha_viaje)
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs", children: /* @__PURE__ */ jsx("i", { className: "fas fa-chair" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-800", children: "Ocupaci\xF3n de Asientos" }),
            /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-slate-500 ml-2", children: [
              "(",
              totalAsientosOcupados,
              " de ",
              capacidadBus,
              " asientos ocupados)"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs font-black text-slate-800 font-mono", children: [
          ocupacionPct,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-2.5 bg-slate-100 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(DespachoOcupacionBar, { capacidad: capacidadBus, ocupados: totalAsientosOcupados }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-bus text-blue-600" }),
              " Unidad Asignada"
            ] }),
            parseFloat(detailData.cxc || detailData.valores?.cxc || "0") > 0 && /* @__PURE__ */ jsxs("span", { className: "bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200", children: [
              "CxC: $",
              parseFloat(detailData.cxc || detailData.valores?.cxc || 0).toFixed(2)
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xl font-black text-slate-900", children: detailData.unidad?.numero_unidad ? `Bus ${detailData.unidad.numero_unidad}` : "Sin Unidad" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: [
            "Placa: ",
            /* @__PURE__ */ jsx("b", { className: "text-slate-800 font-mono", children: detailData.unidad?.placa || "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: onOpenUnidadModal,
            className: "mt-3.5 w-full h-8 text-xs font-bold border border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm",
            children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-exchange-alt text-blue-600 text-[10px]" }),
              /* @__PURE__ */ jsx("span", { children: "Cambiar Unidad" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-2", children: /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("i", { className: "fas fa-id-card text-emerald-600" }),
            " Conductor Principal"
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-bold text-slate-900 truncate", title: detailData.conductor?.nombre, children: detailData.conductor?.nombre || "Sin Conductor Asignado" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: [
            "C\xE9dula: ",
            /* @__PURE__ */ jsx("b", { className: "text-slate-800 font-mono", children: detailData.conductor?.cedula || "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: onOpenConductorModal,
            className: "mt-3.5 w-full h-8 text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm",
            children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-user-edit text-emerald-600 text-[10px]" }),
              /* @__PURE__ */ jsx("span", { children: "Cambiar Conductor" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-2", children: /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("i", { className: "fas fa-user-friends text-purple-600" }),
            " Auxiliar / Azafata"
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-bold text-slate-900 truncate", title: detailData.auxiliar?.nombre, children: detailData.auxiliar?.nombre || "Sin Auxiliar" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: [
            "C\xE9dula: ",
            /* @__PURE__ */ jsx("b", { className: "text-slate-800 font-mono", children: detailData.auxiliar?.cedula || "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: onOpenConductorModal,
            className: "mt-3.5 w-full h-8 text-xs font-bold border border-purple-200 text-purple-700 bg-purple-50/70 hover:bg-purple-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm",
            children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-user-plus text-purple-600 text-[10px]" }),
              /* @__PURE__ */ jsx("span", { children: "Gestionar Auxiliar" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between border-b border-slate-200 px-4 pt-3 bg-slate-50/70 gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1.5 sm:gap-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setSelectedSucursalKey("SUCURSAL"),
              className: `pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 ${selectedSucursalKey === "SUCURSAL" ? "border-blue-600 text-blue-700 font-black" : "border-transparent text-slate-500 hover:text-slate-800"}`,
              children: [
                /* @__PURE__ */ jsx("i", { className: "fas fa-building text-xs" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Solo Sucursal ",
                  detailData.sucursal_actual?.nombre_sucursal ? `(${detailData.sucursal_actual.nombre_sucursal})` : miSucursalActiva?.nombre ? `(${miSucursalActiva.nombre})` : userSucursalNombre ? `(${userSucursalNombre})` : ""
                ] }),
                /* @__PURE__ */ jsx("span", { className: `text-[10px] font-black px-2 py-0.5 rounded-full border ${selectedSucursalKey === "SUCURSAL" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`, children: detailData.asientos_sucursal?.length ?? miSucursalActiva?.count ?? 0 })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setSelectedSucursalKey("TODOS"),
              className: `pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 ${selectedSucursalKey === "TODOS" ? "border-blue-600 text-blue-700 font-black" : "border-transparent text-slate-500 hover:text-slate-800"}`,
              children: [
                /* @__PURE__ */ jsx("i", { className: "fas fa-users text-xs" }),
                /* @__PURE__ */ jsx("span", { children: "Ver Lista Completa de Pasajeros" }),
                /* @__PURE__ */ jsx("span", { className: `text-[10px] font-black px-2 py-0.5 rounded-full border ${selectedSucursalKey === "TODOS" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`, children: totalAsientosOcupados })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => {
              const activeSuc = selectedSucursalKey === "TODOS" ? null : selectedSucursalKey === "SUCURSAL" ? miSucursalActiva : sucursalesEnViaje.find((s) => s.key === selectedSucursalKey);
              const sucursalParam = activeSuc && activeSuc.id > 0 ? `&id_sucursal=${activeSuc.id}` : "";
              window.open(`${baseUrl}/php/imprimirPasajeros.php?id_viaje=${tripId}${sucursalParam}`, "_blank");
            },
            className: "mb-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all shadow-sm active:scale-95",
            title: selectedSucursalKey === "TODOS" ? "Imprimir manifiesto general de todas las sucursales" : "Imprimir manifiesto de pasajeros de esta sucursal",
            children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-print text-xs text-blue-600" }),
              /* @__PURE__ */ jsx("span", { children: selectedSucursalKey === "TODOS" ? "Imprimir Manifiesto Completo" : "Imprimir Manifiesto Sucursal" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-0", children: /* @__PURE__ */ jsx(DespachoAsientosTable, { asientos: asientosFiltrados, mostrarSucursalColumna: selectedSucursalKey === "TODOS" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl p-5 shadow-sm border border-slate-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between mb-4 pb-2.5 border-b border-slate-100 gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("span", { className: "text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("i", { className: "fas fa-calculator text-blue-600 text-sm" }),
            "Liquidaci\xF3n Financiera ",
            valoresVista.esPorSucursal ? `\u2014 Sucursal ${valoresVista.sucursalNombre}` : "General del Viaje"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 font-medium mt-0.5", children: valoresVista.esPorSucursal ? `Valores correspondientes a los ${asientosFiltrados.length} boletos de ${valoresVista.sucursalNombre}` : "Valores consolidados de todas las sucursales del viaje" })
        ] }),
        valoresVista.esPorSucursal && /* @__PURE__ */ jsxs("span", { className: "bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("i", { className: "fas fa-filter text-[9px]" }),
          "Filtrado por: ",
          valoresVista.sucursalNombre
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-center", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] uppercase font-bold tracking-wider text-blue-700", children: [
            "Total Boletos ",
            valoresVista.esPorSucursal ? `(${valoresVista.sucursalNombre})` : ""
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-2xl font-black font-mono text-blue-900 mt-1", children: [
            "$",
            valoresVista.boletos.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => onOpenRetencionesModal && onOpenRetencionesModal(valoresVista, targetSucursalActiva || detailData?.sucursal_actual),
            className: "bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 hover:border-rose-300 rounded-xl p-3.5 text-center cursor-pointer transition-all shadow-sm hover:shadow-md group active:scale-95 relative",
            title: "Haga clic para ver el desglose detallado de retenciones y cobros",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-1.5", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase font-bold tracking-wider text-rose-700", children: "Retenciones / Gastos" }),
                /* @__PURE__ */ jsx("i", { className: "fas fa-search-plus text-[10px] text-rose-400 group-hover:text-rose-600 transition-colors" })
              ] }),
              /* @__PURE__ */ jsxs("p", { className: "text-2xl font-black font-mono text-rose-600 mt-1", children: [
                "-$",
                valoresVista.retencion.toFixed(2)
              ] }),
              /* @__PURE__ */ jsx("div", { className: "mt-1 flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-white/90 group-hover:bg-rose-200/90 px-2 py-0.5 rounded-full border border-rose-200 transition-colors shadow-xs", children: [
                /* @__PURE__ */ jsx("i", { className: "fas fa-list text-[8px]" }),
                " Ver detalle"
              ] }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 text-center shadow-sm", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] uppercase font-bold tracking-wider text-emerald-800", children: [
            "Neto a Entregar ",
            valoresVista.esPorSucursal ? `(${valoresVista.sucursalNombre})` : ""
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-2xl font-black font-mono text-emerald-700 mt-1", children: [
            "$",
            valoresVista.entrega.toFixed(2)
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pt-2 flex flex-col items-center gap-2", children: isDespachado ? /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("i", { className: "fas fa-check-circle text-emerald-600 text-sm" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Despachado en ",
            detailData?.sucursal_actual?.nombre_sucursal || "esta sucursal",
            " ",
            detailData?.id_despacho_mi_sucursal ? `(#${detailData.id_despacho_mi_sucursal})` : ""
          ] })
        ] }),
        despachosDelViaje.length > 1 && /* @__PURE__ */ jsxs("span", { className: "bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200", children: [
          despachosDelViaje.length,
          " despachos"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            const nombreUsuario = user?.nombre_usuario || user?.nombre || user?.username || "";
            const pdfUrl = baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?id_viajes=${tripId}&usuario=${encodeURIComponent(nombreUsuario)}`);
            window.open(pdfUrl, "_blank");
          },
          className: "w-full h-12 text-xs font-bold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95",
          children: [
            /* @__PURE__ */ jsx("i", { className: "fas fa-print text-blue-600" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Reimprimir Hoja de Despacho (",
              detailData?.sucursal_actual?.nombre_sucursal || "PDF",
              ")"
            ] })
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      despachosDelViaje.length > 0 && /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 shadow-sm flex flex-col gap-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between font-bold text-[11px]", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 text-amber-800", children: [
            /* @__PURE__ */ jsx("i", { className: "fas fa-info-circle text-amber-600" }),
            "Despacho existente en otras oficinas:"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full", children: [
            despachosDelViaje.length,
            " registrado(s)"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-[10px] text-amber-700 font-medium", children: despachosDelViaje.map((d) => `${d.nombre_sucursal || "Oficina"} (#${d.id_despacho_viaje} - ${d.nombre_usuario || "Oficinista"})`).join(" \u2022 ") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onDespachar,
            disabled: despachando || noCumpliendo,
            className: "flex-1 h-13 text-sm font-extrabold rounded-xl text-white tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none",
            style: {
              background: despachando ? "#64748b" : "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              boxShadow: "0 8px 20px -4px rgba(16, 185, 129, 0.35)"
            },
            children: despachando ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-spinner fa-spin text-base" }),
              /* @__PURE__ */ jsx("span", { children: "Despachando SRI..." })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-check-circle text-base" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "DESPACHAR N\xB0 ",
                tripId,
                " ",
                detailData?.sucursal_actual?.nombre_sucursal ? `(${detailData.sucursal_actual.nombre_sucursal})` : ""
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onNoCumple,
            disabled: despachando || noCumpliendo,
            className: "h-13 px-4 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100/90 border border-rose-200 shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 whitespace-nowrap",
            title: "Anular viaje como 'No Cumple' (elimina cobros autom\xE1ticos pendientes y omite en auto-despachos)",
            children: noCumpliendo ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-spinner fa-spin text-sm text-rose-600" }),
              /* @__PURE__ */ jsx("span", { children: "Anulando..." })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fas fa-ban text-sm text-rose-500" }),
              /* @__PURE__ */ jsx("span", { children: "No Cumple" })
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-slate-400 font-medium text-center", children: [
        "Al despachar se emitir\xE1 la hoja de ruta en SRI. Si el bus no sali\xF3, presione ",
        /* @__PURE__ */ jsx("strong", { children: "No Cumple" }),
        " para anular el viaje y sus deudas."
      ] })
    ] }) })
  ] }) });
};
export default DespachoTripDetail;

const fs = require('fs');
const path = require('path');

const reactSrc = path.join(__dirname, 'src');
const despachoDir = path.join(reactSrc, 'pages', 'DespachoGuiasNotaVenta');

// Rename DespachoGuiasPage.jsx -> DespachoGuiasNotaVentaPage.jsx
const oldPage = path.join(despachoDir, 'DespachoGuiasPage.jsx');
const newPage = path.join(despachoDir, 'DespachoGuiasNotaVentaPage.jsx');
if (fs.existsSync(oldPage)) {
  fs.renameSync(oldPage, newPage);
}

// Replace contents of newPage
if (fs.existsSync(newPage)) {
  let content = fs.readFileSync(newPage, 'utf8');
  content = content.replace(/despachoConvenioService/g, 'despachoNotaVentaService');
  content = content.replace(/DespachoGuiasPage/g, 'DespachoGuiasNotaVentaPage');
  content = content.replace(/Despacho de Guías Compañías/g, 'Despacho de Notas de Venta');
  content = content.replace(/NuevoDespachoGuiaCompaniaModal/g, 'NuevoDespachoGuiaNotaVentaModal');
  content = content.replace(/BusquedaGuiaDespachoModal/g, 'BusquedaGuiaDespachoNotaVentaModal');
  content = content.replace(/pdfDespachoConvenios/g, 'pdfDespachoNotasVenta');
  fs.writeFileSync(newPage, content);
}

// Rename Modals
const componentsDir = path.join(despachoDir, 'components');
const oldNuevoModal = path.join(componentsDir, 'NuevoDespachoGuiaCompaniaModal.jsx');
const newNuevoModal = path.join(componentsDir, 'NuevoDespachoGuiaNotaVentaModal.jsx');
if (fs.existsSync(oldNuevoModal)) fs.renameSync(oldNuevoModal, newNuevoModal);

if (fs.existsSync(newNuevoModal)) {
  let content = fs.readFileSync(newNuevoModal, 'utf8');
  content = content.replace(/despachoConvenioService/g, 'despachoNotaVentaService');
  content = content.replace(/NuevoDespachoGuiaCompaniaModal/g, 'NuevoDespachoGuiaNotaVentaModal');
  content = content.replace(/Despacho de Guías Compañías/g, 'Despacho de Notas de Venta');
  fs.writeFileSync(newNuevoModal, content);
}

const oldBusqModal = path.join(componentsDir, 'BusquedaGuiaDespachoModal.jsx');
const newBusqModal = path.join(componentsDir, 'BusquedaGuiaDespachoNotaVentaModal.jsx');
if (fs.existsSync(oldBusqModal)) fs.renameSync(oldBusqModal, newBusqModal);

if (fs.existsSync(newBusqModal)) {
  let content = fs.readFileSync(newBusqModal, 'utf8');
  content = content.replace(/despachoConvenioService/g, 'despachoNotaVentaService');
  content = content.replace(/BusquedaGuiaDespachoModal/g, 'BusquedaGuiaDespachoNotaVentaModal');
  fs.writeFileSync(newBusqModal, content);
}

// Create Service
const servicePath = path.join(reactSrc, 'services', 'despachoNotaVenta.service.js');
let serviceContent = fs.readFileSync(path.join(reactSrc, 'services', 'despachoConvenio.service.js'), 'utf8');
serviceContent = serviceContent.replace(/despachoConvenioService/g, 'despachoNotaVentaService');
serviceContent = serviceContent.replace(/\/despacho_convenio\//g, '/despacho_nota_venta/');
fs.writeFileSync(servicePath, serviceContent);

console.log("React refactor complete");

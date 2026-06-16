const fs = require('fs');

let content = fs.readFileSync('c:/laragon/www/SistemaFlota/FrontReact/src/services/guiaNotaVenta.service.js', 'utf8');

const replacements = {
  "'/guia/actualizarGuia'": "'/guia_nota_venta/actualizarGuia'",
  "'/guia/buscarGuiaId'": "'/guia_nota_venta/buscarGuiaId'",
  "'/guia/anularoficinista'": "'/guia_nota_venta/anularoficinista'",
  "'/guia/anularguiasseleccionadas'": "'/guia_nota_venta/anularguiasseleccionadas'",
  "'/guia/informacionGuia'": "'/guia_nota_venta/informacionGuia'",
  "'/guia/ultimoDestinatarioPorRemitente'": "'/guia_nota_venta/ultimoDestinatarioPorRemitente'",
  "'/guia/guialistadoDespacho'": "'/guia_nota_venta/guialistadoDespacho'",
  "'/guia/updateguiaentregado'": "'/guia_nota_venta/updateguiaentregado'",
  "'/guia/facturarGuia'": "'/guia_nota_venta/facturarGuia'",
  "'/guia/comprobantesxCaja'": "'/guia_nota_venta/comprobantesxCaja'",
  "'/guia/verificacionanulacion'": "'/guia_nota_venta/verificacionanulacion'",
  "'/guia/anularguiastodas'": "'/guia_nota_venta/anularguiastodas'",
  "'/guia/anularadministrador'": "'/guia_nota_venta/anularadministrador'",
  "'/guia/cancelarAnulacion'": "'/guia_nota_venta/cancelarAnulacion'"
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(key, 'g'), value);
}

fs.writeFileSync('c:/laragon/www/SistemaFlota/FrontReact/src/services/guiaNotaVenta.service.js', content);
console.log('Replaced /guia/ with /guia_nota_venta/ in service');

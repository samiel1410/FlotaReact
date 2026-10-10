/**
 * Verifica que el branding se propague desde branding.json a index.html
 * (mismo reemplazo que hace el plugin `branding-html` de vite.config.js).
 *
 * Uso: node scripts/verificar_branding.cjs
 */
const fs = require('fs');
const path = require('path');

const branding = JSON.parse(fs.readFileSync(path.resolve('branding.json'), 'utf8'));
const name = String(branding.name || 'Nexusplus');

const vars = {
  BRAND_NAME: name,
  BRAND_NAME_UPPER: name.toUpperCase(),
  BRAND_LEGAL_NAME: String(branding.legalName || `${name} Solutions`),
  BRAND_TAGLINE: String(branding.tagline || ''),
  BRAND_LOGO: String(branding.logo || ''),
  BRAND_LOGO_ICON: String(branding.logoIcon || ''),
};

const html = fs.readFileSync('index.html', 'utf8');
const out = html.replace(/%([A-Z_]+)%/g, (m, k) => (k in vars ? vars[k] : m));

const title = (out.match(/<title>(.*?)<\/title>/) || [])[1];
const favicon = (out.match(/rel="icon" type="image\/png" href="([^"]+)"/) || [])[1];
const apple = (out.match(/rel="apple-touch-icon" href="([^"]+)"/) || [])[1];
const pendientes = (out.match(/%[A-Z_]+%/g) || []).length;

console.log('  name                       →', name);
console.log('  <title>                    →', title);
console.log('  favicon                    →', favicon);
console.log('  apple-touch-icon           →', apple);
console.log('  placeholders sin reemplazar:', pendientes);

const componentes = [
  'src/components/layout/Sidebar.jsx',
  'src/pages/Inicio/InicioPage.jsx',
  'src/pages/Login/LoginPage.jsx',
];
for (const archivo of componentes) {
  const src = fs.readFileSync(archivo, 'utf8');
  const usaBrand = src.includes('BRAND.');
  const hardcodeado = /EasySplus|EasyPlus|Easysplus|EASYSPLUS/.test(src);
  console.log(`  ${archivo.padEnd(42)} usa BRAND: ${usaBrand ? 'SI' : 'NO'} | nombre fijo: ${hardcodeado ? 'SI (revisar)' : 'NO'}`);
}

const ok =
  title === name.toUpperCase() &&
  pendientes === 0 &&
  favicon === vars.BRAND_LOGO_ICON &&
  apple === vars.BRAND_LOGO_ICON;

console.log(ok ? '\n  OK: index.html se genera desde branding.json' : '\n  FALLO: revisar el reemplazo');
process.exit(ok ? 0 : 1);

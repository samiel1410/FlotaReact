/**
 * Verifica que el branding se propague desde branding.json a:
 *   1. index.html (título e íconos) — mismo reemplazo que hace el plugin de Vite
 *   2. los componentes web (BRAND.*)  — se validan por lint/parse aparte
 *   3. los PDFs en PHP               — se validan con PHP aparte
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

console.log('  name                 →', name);
console.log('  <title>              →', title);
console.log('  favicon              →', favicon);
console.log('  apple-touch-icon     →', apple);
console.log('  placeholders sin reemplazar:', pendientes);

const ok =
  title === name.toUpperCase() &&
  pendientes === 0 &&
  favicon === vars.BRAND_LOGO_ICON &&
  apple === vars.BRAND_LOGO_ICON;

console.log(ok ? '\n  ✅ index.html se genera desde branding.json' : '\n  ❌ revisar el reemplazo');
process.exit(ok ? 0 : 1);

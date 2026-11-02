import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'php');
const dst = join(root, 'dist', 'php');

console.log('📂 Copiando php/ a dist/php/ ...');

if (!existsSync(src)) {
    console.log('⚠️  No se encontró la carpeta php/, se omite copia.');
    process.exit(0);
}

function copyDir(from, to) {
    if (!existsSync(to)) mkdirSync(to, { recursive: true });
    for (const item of readdirSync(from)) {
        const s = join(from, item);
        const d = join(to, item);
        if (statSync(s).isDirectory()) {
            copyDir(s, d);
        } else {
            copyFileSync(s, d);
        }
    }
}

copyDir(src, dst);
console.log('✅ php/ copiado a dist/php/ exitosamente.');

// branding.json lo lee php/branding.php desde el directorio padre (dist/).
const brandingSrc = join(root, 'branding.json');
if (existsSync(brandingSrc)) {
    copyFileSync(brandingSrc, join(root, 'dist', 'branding.json'));
    console.log('✅ branding.json copiado a dist/ exitosamente.');
}

const publicSrc = join(root, 'public');
const publicDst = join(root, 'dist');
if (existsSync(publicSrc)) {
    copyDir(publicSrc, publicDst);
    console.log('✅ public/ copiado a dist/ exitosamente.');
}

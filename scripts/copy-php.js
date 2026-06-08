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

#!/usr/bin/env node
/**
 * Despliegue de FrontReact multiplataforma (Windows, macOS y Linux).
 *
 * Uso:
 *   npm run deploy                      → build + copia php/ + commit + push
 *   DEPLOY_DRY_RUN=1 npm run deploy     → valida todo sin escribir en el remoto
 */

import { execSync, spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.env.DEPLOY_DRY_RUN === '1' || process.argv.includes('--dry-run');
const mensaje = `Deploy automático (${new Date().toLocaleString('es-EC', { hour12: false })})`;

function run(command) {
    const result = spawnSync(command, { cwd: root, stdio: 'inherit', shell: true });
    return result.status === 0;
}

console.log('🚀 Desplegando FrontReact...');

console.log('\n[1/4] Compilando (vite build)...');
if (!run('npm run build')) {
    console.error('❌ ERROR: Falló la compilación. Revisa el log de vite.');
    console.error('   Si el error menciona un binding nativo (rolldown/esbuild), ejecuta: npm install');
    process.exit(1);
}

console.log('\n[2/4] Copiando php/ y public/ a dist/...');
if (!run('node scripts/copy-php.js')) {
    console.error('❌ ERROR: Falló la copia de php/.');
    process.exit(1);
}

console.log('\n[3/4] Sincronizando con Git...');
if (!DRY_RUN && !run('git add .')) {
    console.error('❌ ERROR: No se pudieron preparar los cambios de Git.');
    process.exit(1);
}

const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
if (DRY_RUN) {
    console.log(`[dry-run] ${status.length > 0 ? 'Hay cambios pendientes de commit.' : 'Sin cambios pendientes.'}`);
} else if (status.length > 0) {
    if (!run(`git commit -m "${mensaje}"`)) {
        console.error('❌ ERROR: No se pudo crear el commit.');
        process.exit(1);
    }
} else {
    console.log('ℹ️  Sin cambios nuevos: se omite el commit.');
}

console.log('\n[4/4] Subiendo al repositorio...');
if (!run(DRY_RUN ? 'git push --dry-run' : 'git push')) {
    console.error('❌ ERROR: No se pudo subir al repositorio Git.');
    process.exit(1);
}

console.log(DRY_RUN ? '\n✔ Simulación completada (nada subido).' : '\n✅ FrontReact desplegado correctamente.');

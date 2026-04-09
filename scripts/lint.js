const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', 'scripts', 'tests'];

function walk(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, files);
        } else if (entry.isFile() && full.endsWith('.js')) {
            files.push(full);
        }
    }
    return files;
}

function main() {
    const jsFiles = TARGET_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

    for (const file of jsFiles) {
        const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
        if (result.status !== 0) {
            process.exit(result.status || 1);
        }
    }

    console.log(`Lint syntax OK (${jsFiles.length} archivos)`);
}

main();

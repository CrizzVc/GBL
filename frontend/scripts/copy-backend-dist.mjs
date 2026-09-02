import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'resources', 'backend');
const targetDir = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'backend');

if (!fs.existsSync(sourceDir)) {
  console.error(`[Backend Copy] Source not found: ${sourceDir}`);
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

console.log(`[Backend Copy] Copied ${sourceDir} -> ${targetDir}`);

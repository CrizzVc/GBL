import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendSrc = path.resolve(rootDir, '../backend');
const backendDest = path.join(rootDir, 'resources', 'backend');

fs.rmSync(backendDest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(backendDest), { recursive: true });
fs.cpSync(backendSrc, backendDest, { recursive: true, force: true });

console.log(`[Backend Prep] Copied ${backendSrc} -> ${backendDest}`);

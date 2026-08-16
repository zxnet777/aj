import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testsDir = join(__dirname, 'tests');
const files = readdirSync(testsDir).filter((f) => f.endsWith('.js'));

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--test', join(testsDir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);

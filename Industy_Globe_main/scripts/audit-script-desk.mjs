import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/audit-script-desk.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/audit-script-desk.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/audit-script-desk.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

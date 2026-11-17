import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/audit-opening.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/audit-opening.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/audit-opening.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

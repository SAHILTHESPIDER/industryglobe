import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/audit-clearance.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/audit-clearance.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/audit-clearance.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

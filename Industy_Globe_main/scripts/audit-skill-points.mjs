import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/audit-skill-points.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/audit-skill-points.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/audit-skill-points.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

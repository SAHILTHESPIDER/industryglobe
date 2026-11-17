import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/audit-scenes.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/audit-scenes.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/audit-scenes.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

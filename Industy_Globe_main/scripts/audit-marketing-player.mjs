import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['scripts/marketing-player-audit.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '/tmp/marketing-player-audit.mjs',
    logLevel: 'silent',
});

const result = spawnSync(process.execPath, ['/tmp/marketing-player-audit.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

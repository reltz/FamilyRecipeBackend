import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  await esbuild.build({
    entryPoints: ['./*.ts'], // Adjust this if necessary
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs', 
    sourcemap: true,
    minify: false,
    external: ['@aws-sdk/*'],
    resolveExtensions: ['.ts', '.js'],
    outdir: path.join(__dirname, 'dist'),
    loader: {
      '.ts': 'ts',
    },
  });

  console.log('Lambda functions bundled successfully!');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

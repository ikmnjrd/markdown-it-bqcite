import { build } from 'esbuild'
import dependencies from './package.json' assert { type: 'json' }

const entryFile = 'src/index.ts'
const shared = {
  bundle: true,
  entryPoints: [entryFile],
  external: Object.keys(dependencies),
  logLevel: 'info',
  minify: true,
  sourcemap: true,
  watch: {
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    }
  }
}

build({
  ...shared,
  format: 'esm',
  outfile: './dist/index.esm.js',
  target: ['esnext', 'node16.16.0']
}).then(() => {
  console.log('watching...')
})

build({
  ...shared,
  format: 'cjs',
  outfile: './dist/index.cjs.js',
  target: ['esnext', 'node12.22.0']
}).then(() => {
  console.log('watching...')
})

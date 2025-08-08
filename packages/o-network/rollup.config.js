const typescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');
const dts = require('rollup-plugin-dts').default;

module.exports = [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external: [
      // External dependencies that should not be bundled
      '@supabase/supabase-js',
      '@langchain/community',
      '@langchain/core',
      '@huggingface/transformers',
      'langchain',
      'child_process',
      'commander',
      'cross-spawn',
      'debug',
      'docker-compose',
      'fs-extra',
      'inquirer',
      'open',
      'ora',
      'path',
      'portfinder',
      'validate-npm-package-name',
      // Node.js built-ins
      'fs',
      'path',
      'os',
      'crypto',
      'stream',
      'util',
      'events',
      'child_process',
      'process',
      'url',
      'querystring',
      'http',
      'https',
      'zlib',
      'buffer',
      'assert',
      'constants',
      'domain',
      'punycode',
      'string_decoder',
      'timers',
      'tty',
      'vm',
      'worker_threads'
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true
      }),
      commonjs({
        include: /node_modules/
      }),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        sourceMap: true
      })
    ]
  },
  // TypeScript declaration files bundle
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
]; 
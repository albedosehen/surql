#!/usr/bin/env -S deno run -A

import { build, emptyDir } from 'jsr:@deno/dnt@0.41.3'

await emptyDir('./npm')

await build({
  entryPoints: ['./mod.ts'],
  outDir: './npm',
  shims: {
    // Use Deno shims for compatibility
    deno: true,
  },
  package: {
    name: '@oneiriq/surql',
    version: Deno.args[0] || '0.3.2',
    description: 'A modern, type-safe query builder for SurrealDB designed for Deno and Node.js',
    license: 'MIT',
    author: {
      name: 'oneiriq',
    },
    publishConfig: {
      access: 'public',
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/oneiriq/surql.git',
    },
    bugs: {
      url: 'https://github.com/oneiriq/surql/issues',
    },
    homepage: 'https://github.com/oneiriq/surql#readme',
    keywords: [
      'surrealdb',
      'query-builder',
      'database',
      'typescript',
      'deno',
      'nodejs',
      'type-safe',
      'fluent-api',
      'orm',
    ],
    engines: {
      node: '>=18.0.0',
    },
    dependencies: {
      'surrealdb': '^1.3.2',
    }
  },
  postBuild() {
    // Copy important files to npm directory
    Deno.copyFileSync('LICENSE', 'npm/LICENSE')
    Deno.copyFileSync('README.md', 'npm/README.md')
    Deno.copyFileSync('CHANGELOG.md', 'npm/CHANGELOG.md')
  },
  // Use the import map from deno.json
  importMap: './deno.json',
  // Test configuration
  test: false,
  // Skip type checking for faster builds (can be enabled for thorough checking)
  typeCheck: 'both',
  // Generate declaration files
  declaration: 'separate',
  // ESM and CommonJS support
  scriptModule: 'cjs',
  // Filter out test files
  filterDiagnostic(diagnostic) {
    // Ignore specific diagnostics if needed
    return true
  },
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2022'],
  },
})

console.log('\nNPM package built successfully in ./npm directory')
console.log('To publish: cd npm && npm publish\n')
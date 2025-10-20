# Publishing Guide

This guide explains how to publish the Surql library to both JSR and NPM registries.

## Prerequisites

- Ensure you have an NPM account and are logged in: `npm login`
- Ensure you have permissions to publish to the `@albedosehen` scope on NPM
- For JSR publishing, ensure you have JSR credentials configured

## Publishing to NPM

### 1. Update Version

Update the version in [`deno.json`](deno.json:5):

```json
"version": "0.2.6"
```

### 2. Build the NPM Package

Run the build script:

```bash
deno task build:npm
```

Or with a specific version:

```bash
deno run -A scripts/build_npm.ts 0.2.6
```

This will:
- Clean the `./npm` directory
- Transform Deno code to Node.js compatible code
- Generate both ESM and CommonJS outputs
- Create TypeScript declaration files
- Copy LICENSE, README, and CHANGELOG to the npm directory

### 3. Test the Package Locally (Optional)

Navigate to the npm directory and test:

```bash
cd npm
npm pack
# This creates a .tgz file you can test locally
```

Test in a Node.js project:

```bash
npm install /path/to/albedosehen-surql-0.2.5.tgz
```

### 4. Publish to NPM

From the npm directory:

```bash
cd npm
npm publish --access public
```

For pre-release versions:

```bash
npm publish --access public --tag beta
```

### 5. Verify Publication

Check the package on NPM:
- https://www.npmjs.com/package/@albedosehen/surql

Test installation:

```bash
npm install @albedosehen/surql
```

## Publishing to JSR

JSR publication is handled through the standard JSR workflow. Ensure [`deno.json`](deno.json:1) is properly configured with:

- `name`: Package name
- `version`: Current version
- `exports`: Entry point (`./mod.ts`)

Then publish using JSR CLI or GitHub integration.

## Release Checklist

- [ ] Update version in [`deno.json`](deno.json:5)
- [ ] Update [`CHANGELOG.md`](CHANGELOG.md:1) with release notes
- [ ] Run tests: `deno task test`
- [ ] Run linter: `deno lint`
- [ ] Run formatter: `deno fmt`
- [ ] Build NPM package: `deno task build:npm`
- [ ] Test NPM package locally
- [ ] Publish to NPM: `cd npm && npm publish --access public`
- [ ] Publish to JSR (if applicable)
- [ ] Create GitHub release with tag (e.g., `v0.2.6`)
- [ ] Update documentation if needed

## Version Numbering

Follow semantic versioning:
- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features, backwards compatible
- **Patch** (0.0.x): Bug fixes, backwards compatible

## Troubleshooting

### Build Fails

1. Check that all dependencies in [`deno.json`](deno.json:62) are correctly specified
2. Ensure Deno is up to date: `deno upgrade`
3. Clear the Deno cache: `deno cache --reload mod.ts`

### NPM Publish Fails

1. Verify you're logged in: `npm whoami`
2. Check package name availability: `npm info @albedosehen/surql`
3. Ensure version doesn't already exist

### Import Map Issues

If DNT has issues with imports:
1. Verify [`deno.json`](deno.json:62) `imports` section is correct
2. Ensure all npm: imports are listed
3. Check that the `importMap` option in [`scripts/build_npm.ts`](scripts/build_npm.ts:58) points to the right file

## Maintaining Both Registries

When publishing updates:
1. Always update the version in [`deno.json`](deno.json:5) first
2. Build and publish to NPM
3. Publish to JSR
4. Both should reference the same version number

This ensures consistency across both package registries.
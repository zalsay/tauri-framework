#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_BINARIES_DIR = path.join(__dirname, '..', 'desktop', 'src-tauri', 'binaries');
const TARGET_BINARIES_DIR = path.join(__dirname, 'binaries');

const BINARY_NAMES = ['xhs-agent', 'hyperagent'];

const TARGETS = [
  'aarch64-apple-darwin',
  'x86_64-apple-darwin',
  'x86_64-pc-windows-msvc',
  'x86_64-unknown-linux-gnu',
  'aarch64-unknown-linux-gnu',
];

function copyBinary(name: string, target: string): void {
  const sourcePath = path.join(SOURCE_BINARIES_DIR, `${name}-${target}`);
  const targetPath = path.join(TARGET_BINARIES_DIR, `${name}-${target}`);

  if (fs.existsSync(sourcePath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, 0o755);
    console.log(`✓ Copied: ${name}-${target}`);
  } else {
    console.log(`✗ Missing: ${name}-${target}`);
  }
}

function main(): void {
  console.log('Building Framework Binaries\n');

  if (!fs.existsSync(SOURCE_BINARIES_DIR)) {
    console.error(`Source binaries directory not found: ${SOURCE_BINARIES_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(TARGET_BINARIES_DIR)) {
    fs.mkdirSync(TARGET_BINARIES_DIR, { recursive: true });
  }

  for (const name of BINARY_NAMES) {
    console.log(`\n${name}:`);
    for (const target of TARGETS) {
      copyBinary(name, target);
    }
  }

  console.log('\n✓ Build complete!');
}

main();

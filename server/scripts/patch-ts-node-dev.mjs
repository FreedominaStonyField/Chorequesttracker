import { chmod, lstat, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const originalPath = path.join(binDir, 'ts-node-dev');
const shimSource = path.join(__dirname, '..', 'bin', 'ts-node-dev');

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function installShim() {
  try {
    const stats = await lstat(originalPath);
    if (stats.isSymbolicLink()) {
      await rm(originalPath);
    }
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const shim = await readFile(shimSource, 'utf8');
  await writeFile(originalPath, shim, { mode: fsConstants.S_IRWXU | fsConstants.S_IRGRP | fsConstants.S_IXGRP | fsConstants.S_IROTH | fsConstants.S_IXOTH });
  await chmod(originalPath, 0o755);
}

async function main() {
  const hasBin = await fileExists(originalPath);
  if (!hasBin) {
    console.warn('[patch-ts-node-dev] ts-node-dev binary not found; skipping shim install.');
    return;
  }

  await installShim();
}

main().catch((error) => {
  console.error('[patch-ts-node-dev] Failed to install ts-node-dev shim:', error);
  process.exitCode = 1;
});

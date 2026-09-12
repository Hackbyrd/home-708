import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageRoot, '../..');
const sourceRoot = join(packageRoot, 'src');
const outputRoot = join(packageRoot, 'dist');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await compileDirectory(sourceRoot, outputRoot);

const legacyOutput = join(outputRoot, 'legacy');
await mkdir(join(legacyOutput, 'src'), { recursive: true });
await mkdir(join(legacyOutput, 'data'), { recursive: true });

for (const name of [
  'audio.js',
  'architecture.js',
  'botanical.js',
  'editor.js',
  'furniture.js',
  'landscape.js',
  'materials.js',
  'parts.js',
  'seasons.js',
  'surfaces.js',
]) {
  await cp(join(repositoryRoot, 'src', name), join(legacyOutput, 'src', name));
}
await cp(
  join(repositoryRoot, 'data', 'house.js'),
  join(legacyOutput, 'data', 'house.js'),
);
await cp(
  join(repositoryRoot, 'data', 'blueprint.js'),
  join(legacyOutput, 'data', 'blueprint.js'),
);

async function compileDirectory(inputDirectory, outputDirectory) {
  for (const entry of await readdir(inputDirectory, { withFileTypes: true })) {
    const input = join(inputDirectory, entry.name);
    const output = join(
      outputDirectory,
      entry.isDirectory() ? entry.name : entry.name.replace(/\.ts$/, '.js'),
    );
    if (entry.isDirectory()) {
      await mkdir(output, { recursive: true });
      await compileDirectory(input, output);
      continue;
    }
    if (extname(entry.name) !== '.ts') continue;
    let source = await readFile(input, 'utf8');
    if (relative(sourceRoot, input) === 'legacy.ts') {
      source = source
        .replaceAll("'../../../src/", "'./legacy/src/")
        .replaceAll("'../../../data/", "'./legacy/data/");
    }
    const javascript = stripTypeScriptTypes(source, {
      mode: 'strip',
      sourceMap: false,
    });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${javascript}\n`, 'utf8');
  }
}

import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['LICENSE', 'README.md'];
const expectedFiles = ['bin', 'dist', 'README.md', 'LICENSE'];

for (const file of requiredFiles) {
  await access(file);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));

if (pkg.license !== 'MIT') {
  throw new Error('package.json license must be MIT');
}

if (!Array.isArray(pkg.files) || JSON.stringify(pkg.files) !== JSON.stringify(expectedFiles)) {
  throw new Error(`package.json files must be ${JSON.stringify(expectedFiles)}`);
}

if (!pkg.bin || pkg.bin['i18n-smell-detector'] !== './bin/i18n-smell-detector.js') {
  throw new Error('package.json bin must point to ./bin/i18n-smell-detector.js');
}

if (pkg.types !== './dist/index.d.ts') {
  throw new Error('package.json types must point to ./dist/index.d.ts');
}

if (pkg.exports?.['.']?.types !== './dist/index.d.ts' || pkg.exports?.['.']?.import !== './dist/index.js') {
  throw new Error('package.json exports must expose ./dist/index.js and ./dist/index.d.ts');
}

if (!pkg.repository?.url || !pkg.repository.url.includes('github.com/xue-moe/i18n-smell-detector')) {
  throw new Error('package.json repository URL is missing or incorrect');
}

console.log('Package metadata check passed.');

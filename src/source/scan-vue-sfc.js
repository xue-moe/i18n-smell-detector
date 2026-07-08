import { readFile } from 'node:fs/promises';
import { parse } from '@vue/compiler-sfc';
import { scanVueTemplate } from './scan-vue-template.js';

function lineOffsetBefore(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length - 1;
}

export async function scanVueSfc(file, config) {
  const source = await readFile(file, 'utf8');
  const result = parse(source, { filename: file });

  if (result.errors.length > 0) {
    const [error] = result.errors;
    throw new Error(`Malformed Vue file ${file}: ${error.message || String(error)}`);
  }

  const template = result.descriptor.template;
  if (!template) return [];

  return scanVueTemplate(template.content, {
    file,
    lineOffset: lineOffsetBefore(source, template.loc.start.offset),
    config,
  });
}

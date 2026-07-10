import { NodeTypes, parse } from '@vue/compiler-dom';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';

function offsetToLocation(source, offset) {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isI18nExpression(value) {
  return /\b(?:t|te|\$t|i18n\.t)\s*\(/.test(value);
}

function makeIssue({ file, lineOffset, template, loc, value, kind, reason, severity }) {
  const start = offsetToLocation(template, loc.start.offset);
  return {
    file,
    line: lineOffset + start.line,
    column: start.column,
    value,
    severity,
    reason,
    kind,
  };
}

function scanValue({ file, lineOffset, template, loc, value, kind, baseReason, config }) {
  const text = normalizeText(value);
  if (!text) return null;

  const classification = classifyHardcoded(text, config);
  return makeIssue({
    file,
    lineOffset,
    template,
    loc,
    value: text,
    severity: classification.severity,
    reason: classification.severity === 'ignored' ? classification.reason : baseReason,
    kind,
  });
}

function walk(node, visitor) {
  visitor(node);
  for (const child of node.children || []) walk(child, visitor);
}

export function scanVueTemplate(template, { file, lineOffset = 0, config }) {
  let ast;
  try {
    ast = parse(template, { comments: false });
  } catch (error) {
    throw new Error(`Malformed Vue template in ${file}: ${error.message}`);
  }

  const attributes = new Set(config.hardcoded.vueAttributes);
  const issues = [];

  walk(ast, (node) => {
    if (node.type === NodeTypes.TEXT) {
      const issue = scanValue({
        file,
        lineOffset,
        template,
        loc: node.loc,
        value: node.content,
        kind: 'vue-text',
        baseReason: 'static template text',
        config,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type !== NodeTypes.ELEMENT) return;

    for (const prop of node.props || []) {
      if (prop.type !== NodeTypes.ATTRIBUTE) continue;
      if (!attributes.has(prop.name) || !prop.value) continue;
      if (isI18nExpression(prop.value.content)) continue;

      const issue = scanValue({
        file,
        lineOffset,
        template,
        loc: prop.value.loc,
        value: prop.value.content,
        kind: `vue-attribute:${prop.name}`,
        baseReason: `static ${prop.name} attribute`,
        config,
      });
      if (issue) issues.push(issue);
    }
  });

  return issues;
}

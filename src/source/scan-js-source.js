import { readFile } from 'node:fs/promises';
import { parse } from '@babel/parser';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';

const SKIP_KEYS = new Set([
  'comments',
  'errors',
  'extra',
  'leadingComments',
  'loc',
  'range',
  'start',
  'end',
  'trailingComments',
]);

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function makeIssue({ file, loc, value, kind, baseReason, config }) {
  const text = normalizeText(value);
  if (!text) return null;

  const classification = classifyHardcoded(text, config);
  return {
    file,
    line: loc.start.line,
    column: loc.start.column + 1,
    value: text,
    severity: classification.severity,
    reason: classification.severity === 'ignored' ? classification.reason : baseReason,
    kind,
  };
}

export async function scanJsSource(file, config) {
  const source = await readFile(file, 'utf8');
  return scanJsText(source, { file, config });
}

export function scanJsText(source, { file, config, lineOffset = 0 }) {
  let ast;

  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false,
    });
  } catch (error) {
    throw new Error(`Malformed JavaScript or TypeScript file ${file}: ${error.message}`);
  }

  const issues = [];
  const functions = new Set(config.hardcoded.functions || []);
  const jsxAttributes = new Set(config.hardcoded.jsxAttributes || []);

  walk(ast, (node) => {
    if (node.type === 'CallExpression' && functions.has(calleeName(node.callee))) {
      for (const argument of node.arguments || []) {
        const value = staticString(argument);
        if (value === null) continue;

        const issue = makeIssue({
          file,
          loc: offsetLoc(argument.loc, lineOffset),
          value,
          kind: `js-call:${calleeName(node.callee)}`,
          baseReason: `static string passed to ${calleeName(node.callee)}`,
          config,
        });
        if (issue) issues.push(issue);
      }
      return;
    }

    if (node.type === 'JSXText') {
      const issue = makeIssue({
        file,
        loc: offsetLoc(node.loc, lineOffset),
        value: node.value,
        kind: 'jsx-text',
        baseReason: 'static JSX text',
        config,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type === 'JSXAttribute' && jsxAttributes.has(jsxName(node.name))) {
      const value = staticString(node.value);
      if (value === null) return;

      const issue = makeIssue({
        file,
        loc: offsetLoc(node.value.loc, lineOffset),
        value,
        kind: `jsx-attribute:${jsxName(node.name)}`,
        baseReason: `static ${jsxName(node.name)} attribute`,
        config,
      });
      if (issue) issues.push(issue);
    }
  });

  return issues;
}

function offsetLoc(loc, lineOffset) {
  if (!lineOffset) return loc;
  return {
    ...loc,
    start: {
      ...loc.start,
      line: loc.start.line + lineOffset,
    },
  };
}

function walk(node, visitor) {
  if (!node || typeof node.type !== 'string') return;
  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor);
    } else if (value && typeof value.type === 'string') {
      walk(value, visitor);
    }
  }
}

function calleeName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'Super') return 'super';
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = calleeName(node.object);
    const property = node.computed ? staticString(node.property) : calleeName(node.property);
    return object && property ? `${object}.${property}` : '';
  }
  return '';
}

function jsxName(node) {
  if (!node) return '';
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXNamespacedName') return `${jsxName(node.namespace)}:${jsxName(node.name)}`;
  return '';
}

function staticString(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
  }
  if (node.type === 'JSXExpressionContainer') return staticString(node.expression);
  return null;
}

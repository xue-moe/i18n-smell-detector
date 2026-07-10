import { readFile } from 'node:fs/promises';
import { parse } from '@babel/parser';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';
import type { HardcodedConfig, HardcodedIssue } from '../types.js';

type HardcodedScanConfig = { hardcoded: Partial<HardcodedConfig> };

type SourceLocation = {
  start: {
    line: number;
    column: number;
  };
};

type AstNode = Record<string, unknown> & {
  type?: string;
  loc?: SourceLocation | null;
};

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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function makeIssue({
  file,
  loc,
  value,
  kind,
  baseReason,
  config,
}: {
  file: string;
  loc: SourceLocation | null | undefined;
  value: string;
  kind: string;
  baseReason: string;
  config: HardcodedScanConfig;
}): HardcodedIssue | null {
  const text = normalizeText(value);
  if (!text || !loc) return null;

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

export async function scanJsSource(file: string, config: HardcodedScanConfig): Promise<HardcodedIssue[]> {
  const source = await readFile(file, 'utf8');
  return scanJsText(source, { file, config });
}

export function scanJsText(
  source: string,
  { file, config, lineOffset = 0 }: { file: string; config: HardcodedScanConfig; lineOffset?: number },
): HardcodedIssue[] {
  let ast: AstNode;

  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false,
    }) as unknown as AstNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed JavaScript or TypeScript file ${file}: ${message}`);
  }

  const issues: HardcodedIssue[] = [];
  const functions = new Set(config.hardcoded.functions || []);
  const jsxAttributes = new Set(config.hardcoded.jsxAttributes || []);

  walk(ast, (node) => {
    if (node.type === 'CallExpression' && functions.has(calleeName(node.callee as AstNode))) {
      for (const argument of asArray(node.arguments)) {
        if (!isAstNode(argument)) continue;
        const value = staticString(argument);
        if (value === null) continue;

        const issue = makeIssue({
          file,
          loc: offsetLoc(argument.loc, lineOffset),
          value,
          kind: `js-call:${calleeName(node.callee as AstNode)}`,
          baseReason: `static string passed to ${calleeName(node.callee as AstNode)}`,
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
        value: stringField(node, 'value'),
        kind: 'jsx-text',
        baseReason: 'static JSX text',
        config,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type === 'JSXAttribute' && jsxAttributes.has(jsxName(node.name))) {
      const valueNode = node.value as AstNode | null | undefined;
      const value = staticString(valueNode);
      if (value === null) return;

      const issue = makeIssue({
        file,
        loc: offsetLoc(valueNode?.loc, lineOffset),
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

function offsetLoc(loc: SourceLocation | null | undefined, lineOffset: number): SourceLocation | null | undefined {
  if (!lineOffset) return loc;
  if (!loc) return loc;
  return {
    ...loc,
    start: {
      ...loc.start,
      line: loc.start.line + lineOffset,
    },
  };
}

function walk(node: unknown, visitor: (node: AstNode) => void): void {
  if (!isAstNode(node)) return;
  if (!node || typeof node.type !== 'string') return;
  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor);
    } else if (isAstNode(value)) {
      walk(value, visitor);
    }
  }
}

function calleeName(node: AstNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'Identifier') return stringField(node, 'name');
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'Super') return 'super';
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = calleeName(node.object as AstNode);
    const property = node.computed ? staticString(node.property as AstNode) : calleeName(node.property as AstNode);
    return object && property ? `${object}.${property}` : '';
  }
  return '';
}

function jsxName(node: unknown): string {
  if (!isAstNode(node)) return '';
  if (!node) return '';
  if (node.type === 'JSXIdentifier') return stringField(node, 'name');
  if (node.type === 'JSXNamespacedName') return `${jsxName(node.namespace)}:${jsxName(node.name)}`;
  return '';
}

function staticString(node: AstNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'StringLiteral') return stringField(node, 'value');
  if (node.type === 'TemplateLiteral' && asArray(node.expressions).length === 0) {
    return asArray(node.quasis)
      .map((quasi) => {
        const value = isAstNode(quasi) && isAstNode(quasi.value) ? quasi.value : {};
        return typeof value.cooked === 'string' ? value.cooked : String(value.raw ?? '');
      })
      .join('');
  }
  if (node.type === 'JSXExpressionContainer') return staticString(node.expression as AstNode);
  return null;
}

function isAstNode(value: unknown): value is AstNode {
  return !!value && typeof value === 'object';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(node: AstNode, key: string): string {
  const value = node[key];
  return typeof value === 'string' ? value : '';
}

import type { Rule } from 'eslint';

const userVisibleAttributes = new Set(['placeholder', 'title', 'alt', 'aria-label', 'aria-description']);

type EsTreeNode = {
  type?: string;
  value?: unknown;
  expressions?: unknown[];
};

type JsxAttributeNode = EsTreeNode & {
  name?: {
    name?: unknown;
  };
};

function isStaticString(node: EsTreeNode | null | undefined): boolean {
  if (!node) return false;
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) return true;
  return false;
}

const plugin: { rules: Record<string, Rule.RuleModule> } = {
  rules: {
    'no-static-jsx-text': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Report static JSX text and common user-visible attributes.',
        },
        schema: [],
        messages: {
          staticText: 'Static JSX text should usually be moved to i18n.',
          staticAttribute: 'Static {{name}} attribute should usually be moved to i18n.',
        },
      },
      create(context) {
        return {
          JSXText(node: EsTreeNode) {
            if (typeof node.value === 'string' && node.value.replace(/\s+/g, ' ').trim()) {
              context.report({ node: node as never, messageId: 'staticText' });
            }
          },
          JSXAttribute(node: JsxAttributeNode) {
            const name = node.name?.name;
            if (
              typeof name === 'string' &&
              userVisibleAttributes.has(name) &&
              isStaticString(node.value as EsTreeNode)
            ) {
              context.report({ node: node as never, messageId: 'staticAttribute', data: { name } });
            }
          },
        };
      },
    },
  },
};

export default plugin;

const userVisibleAttributes = new Set(['placeholder', 'title', 'alt', 'aria-label', 'aria-description']);

function isStaticString(node) {
  if (!node) return false;
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return true;
  return false;
}

export default {
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
          JSXText(node) {
            if (node.value.replace(/\s+/g, ' ').trim()) {
              context.report({ node, messageId: 'staticText' });
            }
          },
          JSXAttribute(node) {
            const name = node.name?.name;
            if (typeof name === 'string' && userVisibleAttributes.has(name) && isStaticString(node.value)) {
              context.report({ node, messageId: 'staticAttribute', data: { name } });
            }
          },
        };
      },
    },
  },
};

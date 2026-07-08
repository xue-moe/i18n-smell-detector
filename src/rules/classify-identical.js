import { matchesAnyRule } from './match-rule.js';

function isBlank(value) {
  return value.trim().length === 0;
}

function isExternalReference(value) {
  const text = value.trim();
  return /^(https?:\/\/|tel:)/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isCodeLike(value) {
  const text = value.trim();
  return /^#[0-9a-f]{3,8}$/i.test(text)
    || /^\/[a-z0-9_./:-]*$/i.test(text)
    || /^[A-Z]{2,5}$/.test(text)
    || /^[A-Z]{2,5}\s?[0-9A-Z-]*$/.test(text)
    || (/^[a-z0-9_.:-]+$/.test(text) && !/\s/.test(text) && !/[A-Z]/.test(text));
}

function isPlaceholderOnly(value, patterns) {
  let text = value.trim();

  const orderedPatterns = [...(patterns || [])].sort((a, b) => b.source.length - a.source.length);

  for (const pattern of orderedPatterns) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, '');
  }

  return text.trim() === '';
}

function getLatinWords(value) {
  return value.match(/[\p{L}\p{M}][\p{L}\p{M}']*/gu) || [];
}

function languageFamily(locale) {
  return locale.toLowerCase().split(/[-_]/)[0];
}

function isShortCommonLabel(value) {
  const text = value.trim();
  return text.length <= 3 || /^(ok|id|no|yes|on|off|5g|4g|lte)$/i.test(text);
}

/**
 * @param {Object} input
 * @param {string} input.key
 * @param {string} input.value
 * @param {string} input.baseLocale
 * @param {string} input.targetLocale
 * @param {import('../types.js').DetectorConfig} input.config
 * @returns {{ severity: import('../types.js').Severity, reason: string }}
 */
export function classifyIdentical({ key, value, baseLocale, targetLocale, config }) {
  if (matchesAnyRule(key, config.allowIdenticalKeys || [], { wildcard: true })) {
    return { severity: 'ignored', reason: 'allowed key' };
  }

  if (matchesAnyRule(value, config.allowIdenticalValues || [])) {
    return { severity: 'ignored', reason: 'allowed value' };
  }

  if ((config.ignoreSameLanguageFamily ?? true) && languageFamily(baseLocale) === languageFamily(targetLocale)) {
    return { severity: 'ignored', reason: 'same language family' };
  }

  if (isBlank(value)) return { severity: 'ignored', reason: 'blank value' };
  if (isPlaceholderOnly(value, config.placeholderPatterns || [])) return { severity: 'ignored', reason: 'placeholder only' };
  if (isExternalReference(value)) return { severity: 'ignored', reason: 'external reference' };
  if ((config.ignoreCodeLike ?? true) && isCodeLike(value)) return { severity: 'ignored', reason: 'code-like value' };
  if (isShortCommonLabel(value)) return { severity: 'low', reason: 'short common label' };

  const words = getLatinWords(value);
  const hasSentencePunctuation = /[.!?。！？]/.test(value);

  if (words.length >= 2 || (words.length === 1 && hasSentencePunctuation)) {
    return { severity: 'high', reason: 'copied English phrase' };
  }

  if (words.length === 1) {
    return { severity: 'medium', reason: 'copied English word' };
  }

  return { severity: 'low', reason: 'same text as base locale' };
}

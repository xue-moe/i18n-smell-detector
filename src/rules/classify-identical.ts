import { matchesAnyRule } from './match-rule.js';
import type { DetectorConfig, IssueSuppression, Severity } from '../types.js';

type Classification = { severity: Severity; reason: string; suppression?: IssueSuppression };

const BUILTIN_TECHNICAL_ACRONYMS = new Set([
  'API',
  'CLI',
  'CPU',
  'CSS',
  'DNS',
  'GPU',
  'HTML',
  'HTTP',
  'HTTPS',
  'ID',
  'IP',
  'JSON',
  'SDK',
  'SQL',
  'SSH',
  'TCP',
  'TLS',
  'UI',
  'URI',
  'URL',
  'UUID',
  'XML',
]);

const UI_KEY_SEGMENTS = new Set([
  'action',
  'actions',
  'button',
  'buttons',
  'cta',
  'dialog',
  'label',
  'menu',
  'message',
  'nav',
  'option',
  'placeholder',
  'status',
  'tab',
  'title',
  'tooltip',
]);

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function isExternalReference(value: string): boolean {
  const text = value.trim();
  return /^(https?:\/\/|tel:)/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isClearlyTechnical(value: string): boolean {
  const text = value.trim();
  return (
    /^(?:https?:\/\/|\/)[^\s]+$/i.test(text) ||
    /^#[0-9a-f]{3,8}$/i.test(text) ||
    /^v?\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.-]+)?$/i.test(text) ||
    /^[A-Za-z][A-Za-z0-9]*(?:[._:][A-Za-z0-9]+)+$/.test(text) ||
    /^(?=.*(?:\d|[*-]))[A-Z][A-Z0-9*-]+$/.test(text) ||
    /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(text)
  );
}

function keySegments(key: string): string[] {
  return key
    .toLowerCase()
    .split(/[._:[\]-]+/)
    .filter(Boolean);
}

function hasUiKeyContext(key: string): boolean {
  return keySegments(key).some((segment) => UI_KEY_SEGMENTS.has(segment));
}

function keyMatchesValue(key: string, value: string): boolean {
  return keySegments(key).at(-1) === value.trim().toLowerCase();
}

function isCodeLike(key: string, value: string): boolean {
  const text = value.trim();
  if (isClearlyTechnical(text) || BUILTIN_TECHNICAL_ACRONYMS.has(text)) return true;
  return /^[A-Z]{2,}$/.test(text) && !hasUiKeyContext(key) && !keyMatchesValue(key, text);
}

function isPlaceholderOnly(value: string, patterns: RegExp[]): boolean {
  let text = value.trim();

  for (const pattern of patterns || []) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, '');
  }

  return text.trim() === '';
}

function getLatinWords(value: string): string[] {
  return value.match(/[\p{L}\p{M}][\p{L}\p{M}']*/gu) || [];
}

function languageFamily(locale: string): string {
  return locale.toLowerCase().split(/[-_]/)[0];
}

function isShortCommonLabel(value: string): boolean {
  const text = value.trim();
  return text.length <= 3 || /^(ok|id|no|yes|on|off|5g|4g|lte)$/i.test(text);
}

export function classifyIdentical({
  key,
  value,
  baseLocale,
  targetLocale,
  config,
}: {
  key: string;
  value: string;
  baseLocale: string;
  targetLocale: string;
  config: Partial<DetectorConfig> & { baseLocale?: string };
}): Classification {
  const doNotTranslate = (config.doNotTranslate || []).find((rule) => {
    const keyMatches = !rule.keys || matchesAnyRule(key, rule.keys);
    const valueMatches = !rule.values || matchesAnyRule(value, rule.values);
    return keyMatches && valueMatches;
  });
  if (doNotTranslate) {
    const { category, reason, comment, owner } = doNotTranslate;
    return {
      severity: 'ignored',
      reason,
      suppression: { type: 'do-not-translate', category, reason, comment, owner },
    };
  }
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
  if (isPlaceholderOnly(value, config.placeholderPatterns || []))
    return { severity: 'ignored', reason: 'placeholder only' };
  if (isExternalReference(value)) return { severity: 'ignored', reason: 'external reference' };
  if ((config.ignoreCodeLike ?? true) && isCodeLike(key, value))
    return { severity: 'ignored', reason: 'code-like value' };
  if (isShortCommonLabel(value)) return { severity: 'low', reason: 'short common label' };

  const words = getLatinWords(value);
  const hasSentencePunctuation = /[.!?。！？]/.test(value);

  if (words.length >= 2 || (words.length === 1 && hasSentencePunctuation)) {
    return { severity: 'high', reason: 'copied base-locale phrase' };
  }

  if (words.length === 1) {
    return { severity: 'medium', reason: 'copied base-locale word' };
  }

  return { severity: 'low', reason: 'same text as base locale' };
}

import { matchesAnyRule } from './match-rule.js';

function isBlank(value) {
  return value.trim().length === 0;
}

function isMustacheOnly(value) {
  return /^\{\{[\s\S]*\}\}$/.test(value.trim());
}

function isNonUserFacing(value) {
  const text = value.trim();
  return /^[0-9.,:;+\-*/%()\s]+$/.test(text)
    || /^[\p{P}\p{S}]+$/u.test(text)
    || /^#[0-9a-f]{3,8}$/i.test(text)
    || /^(https?:\/\/|mailto:|tel:)/i.test(text)
    || /^\/[a-z0-9_./:-]*$/i.test(text)
    || /^[a-z0-9_.-]+\.(css|js|png|jpe?g|gif|svg|webp|json)$/i.test(text)
    || /^[A-Z]{2,6}$/.test(text);
}

function latinWords(value) {
  return value.match(/[A-Za-z][A-Za-z']*/g) || [];
}

function isShortCommonLabel(value) {
  const text = value.trim();
  return text.length <= 3 || /^(ok|id|no|yes|on|off)$/i.test(text);
}

export function classifyHardcoded(value, config = {}) {
  const hardcoded = config.hardcoded || {};

  if (matchesAnyRule(value, hardcoded.ignoreValues || [])) {
    return { severity: 'ignored', reason: 'ignored value' };
  }

  if (matchesAnyRule(value, hardcoded.ignorePatterns || [])) {
    return { severity: 'ignored', reason: 'ignored pattern' };
  }

  if (isBlank(value)) return { severity: 'ignored', reason: 'blank value' };
  if (isMustacheOnly(value)) return { severity: 'ignored', reason: 'mustache expression' };
  if (isNonUserFacing(value)) return { severity: 'ignored', reason: 'non-user-facing value' };
  if (isShortCommonLabel(value)) return { severity: 'low', reason: 'short common label' };

  const words = latinWords(value);
  if (words.length >= 2 || /[.!?。！？]/.test(value)) {
    return { severity: 'high', reason: 'sentence-like content' };
  }

  if (words.length === 1) return { severity: 'medium', reason: 'single word' };
  return { severity: 'low', reason: 'possible user-facing text' };
}

import { matchesAnyRule } from './match-rule.js';
import type { Confidence, HardcodedCategory, HardcodedConfig, Severity } from '../types.js';

export interface HardcodedClassification {
  severity: Severity;
  confidence: Confidence;
  category: HardcodedCategory;
  reason: string;
}

export interface HardcodedContext {
  kind?: string;
  nodeType?: string;
  parentNodeType?: string;
  elementName?: string;
  attributeName?: string;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function isMustacheOnly(value: string): boolean {
  return /^\{\{[\s\S]*\}\}$/.test(value.trim());
}

function isNonUserFacing(value: string): boolean {
  const text = value.trim();
  return (
    /^[0-9.,:;+\-*/%()\s]+$/.test(text) ||
    /^[\p{P}\p{S}]+$/u.test(text) ||
    /^#[0-9a-f]{3,8}$/i.test(text) ||
    /^(https?:\/\/|mailto:|tel:)/i.test(text) ||
    /^\/[a-z0-9_./:-]*$/i.test(text) ||
    /^[a-z0-9_.-]+\.(css|js|png|jpe?g|gif|svg|webp|json)$/i.test(text)
  );
}

function isTechnicalIdentifier(value: string): boolean {
  const text = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+$/.test(text)) return false;

  const segments = text.split('_');
  return segments.filter((segment) => /[A-Za-z]/.test(segment)).length >= 2;
}

function hasTechnicalShape(value: string): boolean {
  const text = value.trim();
  return (
    isTechnicalIdentifier(text) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ||
    /^(?:pk|sk|token|key)_[a-z0-9_-]+$/i.test(text) ||
    /^[A-Z]+-\d+$/.test(text) ||
    /^v?\d+(?:\.\d+){1,3}(?:[-+][a-z0-9.-]+)?$/i.test(text) ||
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?Z?)?$/.test(text)
  );
}

function result(
  severity: Severity,
  confidence: Confidence,
  category: HardcodedCategory,
  reason: string,
): HardcodedClassification {
  return { severity, confidence, category, reason };
}

function latinWords(value: string): string[] {
  return value.match(/[\p{L}\p{M}][\p{L}\p{M}']*/gu) || [];
}

function isShortCommonLabel(value: string): boolean {
  const text = value.trim();
  return text.length <= 3 || /^(ok|id|no|yes|on|off)$/i.test(text);
}

export function classifyHardcoded(
  value: string,
  config: { hardcoded?: Partial<HardcodedConfig> } = {},
  context: HardcodedContext = {},
): HardcodedClassification {
  const hardcoded = config.hardcoded || {};

  if (matchesAnyRule(value, hardcoded.ignoreValues || [])) {
    return result('ignored', 'high', 'unknown', 'ignored value');
  }

  if (matchesAnyRule(value, hardcoded.ignorePatterns || [])) {
    return result('ignored', 'high', 'unknown', 'ignored pattern');
  }

  if (isBlank(value)) return result('ignored', 'low', 'format', 'blank value');
  if (isMustacheOnly(value)) return result('ignored', 'low', 'code', 'mustache expression');
  if (matchesAnyRule(value, hardcoded.technicalTerms || []))
    return result('low', 'low', 'technical-identifier', 'configured technical term');
  if (isNonUserFacing(value)) return result('ignored', 'low', 'format', 'non-user-facing value');
  if (hasTechnicalShape(value)) return result('low', 'low', 'technical-identifier', 'technical identifier');
  if (['code', 'pre', 'kbd', 'samp', 'script', 'style'].includes(context.elementName || '')) {
    return result('low', 'low', 'code', 'code context');
  }
  if (isShortCommonLabel(value)) return result('low', 'medium', 'natural-language', 'short common label');

  const words = latinWords(value);
  if (words.length >= 2 || /[.!?。！？]/.test(value)) {
    return result('high', 'high', 'natural-language', 'sentence-like content');
  }

  if (words.length === 1) return result('medium', 'medium', 'natural-language', 'single word');
  return result('low', 'low', 'unknown', 'possible user-facing text');
}

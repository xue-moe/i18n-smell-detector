/**
 * @typedef {'ignored' | 'low' | 'medium' | 'high'} Severity
 * @typedef {'console' | 'json' | 'markdown'} ReportFormat
 *
 * @typedef {Object} DetectorConfig
 * @property {string} baseLocale
 * @property {Record<string, string>} locales
 * @property {string[]=} allowIdenticalKeys
 * @property {string[]=} allowIdenticalValues
 * @property {boolean=} ignoreSameLanguageFamily
 * @property {boolean=} trimWhitespace
 * @property {boolean=} ignoreCase
 * @property {boolean=} includeIgnored
 * @property {'none' | 'low' | 'medium' | 'high'=} failOn
 *
 * @typedef {Object} IdenticalIssue
 * @property {string} key
 * @property {string} baseLocale
 * @property {string} targetLocale
 * @property {string} value
 * @property {Severity} severity
 * @property {string} reason
 */

export {};

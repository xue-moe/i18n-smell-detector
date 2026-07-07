/**
 * @typedef {'ignored' | 'low' | 'medium' | 'high'} Severity
 * @typedef {'console' | 'json' | 'markdown'} ReportFormat
 *
 * @typedef {Object} DetectorConfig
 * @property {string} baseLocale
 * @property {Record<string, string>} locales
 * @property {(string | RegExp)[]=} allowIdenticalKeys
 * @property {(string | RegExp)[]=} allowIdenticalValues
 * @property {(string | RegExp)[]=} placeholderPatterns
 * @property {boolean=} ignoreCodeLike
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

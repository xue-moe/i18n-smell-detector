## [0.5.2](https://github.com/xue-moe/i18n-smell-detector/compare/v0.5.1...v0.5.2) (2026-07-09)


### Bug Fixes

* **reporters:** harden markdown table escaping ([cc7702c](https://github.com/xue-moe/i18n-smell-detector/commit/cc7702c761132f1a34f6247c74d15e1ffde9ed3c))

## [0.5.1](https://github.com/xue-moe/i18n-smell-detector/compare/v0.5.0...v0.5.1) (2026-07-09)


### Bug Fixes

* **cli:** harden parsing and config normalization ([39032f1](https://github.com/xue-moe/i18n-smell-detector/commit/39032f1bed013e94e8d7e4ca6f021c718b4658a2))

# [0.5.0](https://github.com/xue-moe/i18n-smell-detector/compare/v0.4.2...v0.5.0) (2026-07-09)


### Features

* **check:** add placeholders sarif and source scanning ([d9b4340](https://github.com/xue-moe/i18n-smell-detector/commit/d9b4340be28b656afc395fdc7ba69f85e259fbea))

## [0.4.2](https://github.com/xue-moe/i18n-smell-detector/compare/v0.4.1...v0.4.2) (2026-07-08)


### Bug Fixes

* **security:** harden markdown escaping and ci permissions ([3cdd48b](https://github.com/xue-moe/i18n-smell-detector/commit/3cdd48b81103b152b8261f31d433c3102ae91afc))

## [0.4.1](https://github.com/xue-moe/i18n-smell-detector/compare/v0.4.0...v0.4.1) (2026-07-08)


### Bug Fixes

* **rules:** detect unicode letter words ([f873b3c](https://github.com/xue-moe/i18n-smell-detector/commit/f873b3c80a45875d026ff3ff8e3b86d9500ea393))

# Changelog

## v0.4.0

### Added

- Add combined `check` command.
- Add report output files with `--output`.
- Add baseline support for gradual adoption.
- Add combined JSON and Markdown reports.
- Add a neutral `examples/basic` project.

### Changed

- Expand CI and documentation examples for local and GitHub usage.

## v0.3.0

### Added

- Add `check-hardcoded`.
- Detect hardcoded text in Vue template text nodes.
- Detect selected static Vue attributes.
- Add source glob configuration.
- Add hardcoded string reports in console, JSON, and Markdown.

## v0.2.0

### Added

- Support custom placeholder patterns.
- Support `RegExp` entries in `allowIdenticalKeys` and `allowIdenticalValues`.
- Add `ignoreCodeLike`.
- Add `summary` to JSON output.

### Changed

- Document matching behavior and JSON output more clearly.

## v0.1.1

### Changed

- Prepare package release metadata and publishing workflow.

## v0.1.0

### Added

- Add initial `check-identical` implementation.
- Add config loading, locale flattening, CLI, severity handling, and console, JSON, and Markdown reports.

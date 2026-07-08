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

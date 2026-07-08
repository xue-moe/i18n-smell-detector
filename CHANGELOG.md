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

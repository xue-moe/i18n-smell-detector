## [0.9.1](https://github.com/xue-moe/i18n-smell-detector/compare/v0.9.0...v0.9.1) (2026-07-14)


### Bug Fixes

* **hardcoded:** extract dynamic JSX attribute messages ([0ea9a31](https://github.com/xue-moe/i18n-smell-detector/commit/0ea9a3133652de733129d098f66dc7a648d537e8))
* **hardcoded:** respect Vue attribute allowlist for bindings ([810eafd](https://github.com/xue-moe/i18n-smell-detector/commit/810eafdaba605a9bf7475b48c7c35cf8fa6cb171))
* **hardcoded:** scan Vue branches containing i18n calls ([3b35e0d](https://github.com/xue-moe/i18n-smell-detector/commit/3b35e0dab3921a2d5d5ba2920dd61d535cee16a0))
* **identical:** distinguish locale scripts and regions ([ca63558](https://github.com/xue-moe/i18n-smell-detector/commit/ca63558f940f9d21bf476f359397dd7adbcac35c))
* **identical:** refine code-like value classification ([75941cb](https://github.com/xue-moe/i18n-smell-detector/commit/75941cb212e559388766e26e888170b93f3774d0))
* **identical:** use language-neutral classification reasons ([1f457cf](https://github.com/xue-moe/i18n-smell-detector/commit/1f457cfc77858f308d724a3bcfe8e56b31025214))
* **locale:** reject invalid flattened locale data ([2915352](https://github.com/xue-moe/i18n-smell-detector/commit/2915352b6c83e61ffa748c4d0dbd86fe3d241730))
* **placeholders:** normalize regex patterns in public API ([283d0bf](https://github.com/xue-moe/i18n-smell-detector/commit/283d0bfd06441106e57e26571a8905110c0450e9))

# [0.9.0](https://github.com/xue-moe/i18n-smell-detector/compare/v0.8.0...v0.9.0) (2026-07-13)


### Bug Fixes

* **config:** require effective do-not-translate rules ([51b9a81](https://github.com/xue-moe/i18n-smell-detector/commit/51b9a818a0b380e34c884433397b3c8b58d2e73d))


### Features

* **baseline:** add position-independent semantic fingerprints ([e9fab73](https://github.com/xue-moe/i18n-smell-detector/commit/e9fab73ba675ce4f41556e89a5858bf6d91ae47b))
* **hardcoded:** classify technical values using source context ([2cb1b06](https://github.com/xue-moe/i18n-smell-detector/commit/2cb1b06e3b76d436c50f5b93be76be571c44280c))
* **hardcoded:** report interpolated template messages ([b893bb6](https://github.com/xue-moe/i18n-smell-detector/commit/b893bb627e01b931734ecb468c58e937f7d084a4))
* **hardcoded:** scan nested expressions in configured sinks ([a44c9d1](https://github.com/xue-moe/i18n-smell-detector/commit/a44c9d1763448d8582a6449b8145f8ae6ee1e509))
* **identical:** add categorized do-not-translate rules ([9533763](https://github.com/xue-moe/i18n-smell-detector/commit/9533763cef8ea0d76dce69a665b510438e26fb5c))

# [0.8.0](https://github.com/xue-moe/i18n-smell-detector/compare/v0.7.2...v0.8.0) (2026-07-13)


### Bug Fixes

* **config:** reject unknown configuration options ([725d85a](https://github.com/xue-moe/i18n-smell-detector/commit/725d85a632e9cb081c1117c4832511625c73747f))
* **hardcoded:** distinguish technical identifiers ([1f1ec90](https://github.com/xue-moe/i18n-smell-detector/commit/1f1ec9079c755f0babc72f1d98d521e826e88da8))
* harden source ranges and baseline loading ([aad54c8](https://github.com/xue-moe/i18n-smell-detector/commit/aad54c866883f7f652cb48b3f2d8b811c4ddd508))
* **placeholders:** compare placeholder occurrence counts ([cf50c53](https://github.com/xue-moe/i18n-smell-detector/commit/cf50c53b116714fc5f53806c26b144800cbc4096))


### Features

* **baseline:** add contextual fingerprints ([8b3213c](https://github.com/xue-moe/i18n-smell-detector/commit/8b3213c2ecfefca1e7eb0bfe714a1b155f765bd8))
* **cli:** add version option ([f3c3460](https://github.com/xue-moe/i18n-smell-detector/commit/f3c34600c6c108c462f9aee02f4f5bc9f4e8f0ff))
* **hardcoded:** add configurable message sinks ([2071b1a](https://github.com/xue-moe/i18n-smell-detector/commit/2071b1a6d9b944a72e53e79b184c62f20d10ba0b))
* **placeholders:** make dollar-number patterns opt-in ([7cffe53](https://github.com/xue-moe/i18n-smell-detector/commit/7cffe530e3fa470e0844975d0d6d3c8f3b3538ef))
* **source:** add complete finding ranges ([5fa8d1d](https://github.com/xue-moe/i18n-smell-detector/commit/5fa8d1d19cad4eef973290447df8e9789b57efa5))
* **vue:** scan strings in template expressions ([9c489f1](https://github.com/xue-moe/i18n-smell-detector/commit/9c489f10c9430cb95767c06172f8f30c8c32b39b))

## Unreleased

### Breaking Changes

- Baseline schema version 4 makes identical-translation IDs sensitive to the copied value and placeholder IDs
  sensitive to the missing and extra placeholders. Baseline files created by earlier versions must be regenerated
  with `--update-baseline`.

### Changed

- Dollar-number placeholders such as `$1` are no longer detected by default because they are indistinguishable
  from currency values. Add `` String.raw`\$\d+` `` to `placeholderPatterns` to opt in.

## [0.7.2](https://github.com/xue-moe/i18n-smell-detector/compare/v0.7.1...v0.7.2) (2026-07-10)


### Bug Fixes

* typecheck integration templates ([cec26e2](https://github.com/xue-moe/i18n-smell-detector/commit/cec26e220c3cf2d62a6810bb6e71e00b4cdf847a))

## [0.7.1](https://github.com/xue-moe/i18n-smell-detector/compare/v0.7.0...v0.7.1) (2026-07-10)


### Bug Fixes

* enable strict TypeScript checks ([363183f](https://github.com/xue-moe/i18n-smell-detector/commit/363183f4309e5a0d40823f5b96f4a564f98fd700))

# [0.7.0](https://github.com/xue-moe/i18n-smell-detector/compare/v0.6.1...v0.7.0) (2026-07-10)


### Features

* migrate detector to TypeScript ([b449c7f](https://github.com/xue-moe/i18n-smell-detector/commit/b449c7f13f5d8403fb2cc66b3bc2d032364670b8))

## [0.6.1](https://github.com/xue-moe/i18n-smell-detector/compare/v0.6.0...v0.6.1) (2026-07-10)


### Bug Fixes

* **cli:** scan Vue script blocks and validate config ([b57c312](https://github.com/xue-moe/i18n-smell-detector/commit/b57c312b31bc3af766fcdc5a92db722a7536fd0b))

# [0.6.0](https://github.com/xue-moe/i18n-smell-detector/compare/v0.5.2...v0.6.0) (2026-07-09)


### Features

* **cli:** add config init command ([10333db](https://github.com/xue-moe/i18n-smell-detector/commit/10333dbd8905f6d0e5a7023423dae164c3d81921))

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

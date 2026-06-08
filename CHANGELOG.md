# Changelog

All notable changes to Maintainer Signal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `CHANGELOG.md` to track releases and help contributors understand project evolution.

## [0.2.1] - 2026-06-07

### Added
- `renderJSON()` for structured JSON report output.
- `--format json` CLI option for downstream tool consumption.
- Regression tests for JSON formatter (12 tests total, all passing).

### Changed
- README updated with JSON example and updated CLI options.

## [0.2.0] - 2026-06-01

### Added
- Optional OpenAI-generated maintainer brief via `--openai-summary`.
- Public project landing page (`docs/index.html`).
- Launch materials (`LAUNCH.md`) and README badges.
- Sample report (`examples/sample-report.md`) with reproducible fixtures.
- Adoption checklist (`docs/adoption-checklist.md`) for new users.
- Health gate example (`examples/quality-gate.yml`).
- Triage suggestion docs with label detection rules.
- Issue and pull request links in Markdown output when `--repo` is used.

### Changed
- CLI supports `--now` for reproducible report timestamps.
- Improved contributor onboarding in `CONTRIBUTING.md`.

## [0.1.0] - 2026-05-28

### Added
- Initial release: zero-dependency CLI and GitHub Action.
- Issue triage with health scoring, stale detection, and label suggestions.
- Release-note candidates from merged pull requests.
- Deterministic Markdown output with no AI required.
- Read-only CI workflow examples.
- Full test coverage using Node.js built-in test runner.

# Maintainer Signal

[![CI](https://github.com/Luke2program/maintainer-signal/actions/workflows/ci.yml/badge.svg)](https://github.com/Luke2program/maintainer-signal/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue.svg)](action.yml)
[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen.svg)](package.json)

Maintainer Signal is a zero-dependency CLI and GitHub Action that turns issue and pull request activity into a practical maintainer report.

If it saves you time during issue triage or release notes, a GitHub star helps other maintainers discover it.

It is built for open-source maintainers who need a fast weekly picture of what matters:

- which issues are likely bugs, support requests, documentation gaps, or stale work
- which threads need a maintainer response first
- what changed in merged pull requests
- whether the project health trend needs attention
- what to paste into a status update, release note, or sponsorship report

It works without AI and without third-party services by default. If a project wants richer summaries, it can optionally use an OpenAI API key to add an AI maintainer brief while keeping the deterministic report intact.

## Quick Start

Run against exported GitHub issue and pull request JSON:

```bash
npx maintainer-signal --input issues.json --release-input pulls.json
```

Run directly against a public or private GitHub repository:

```bash
GITHUB_TOKEN=ghp_xxx npx maintainer-signal --repo owner/name --days 30
```

Write the report to a file:

```bash
npx maintainer-signal --repo owner/name --output signal-report.md
```

Add an optional OpenAI-generated maintainer brief:

```bash
OPENAI_API_KEY=sk-... npx maintainer-signal --repo owner/name --openai-summary
```

## GitHub Action

```yaml
name: Maintainer Signal

on:
  schedule:
    - cron: "0 8 * * 1"
  workflow_dispatch:

jobs:
  signal:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: Luke2program/maintainer-signal@main
        with:
          days: "30"
          output: signal-report.md
          # Optional. Omit this for local-only deterministic reports.
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: maintainer-signal
          path: signal-report.md
```

## What It Reports

Maintainer Signal produces a Markdown report with:

- project health score
- response backlog
- stale issue count
- top triage candidates
- suggested labels
- likely support/documentation/bug buckets
- release note candidates from merged pull requests
- next recommended maintainer actions
- optional OpenAI-generated maintainer brief

Example:

```bash
npm run check
```

## Why This Exists

Maintainers often do not need another dashboard. They need a concise digest that can run in CI, be reviewed in a terminal, and produce useful text for humans. This project keeps the moving parts small so small open-source projects can adopt it without paying for a SaaS product or adding a bot with write permissions.

## CLI Options

```text
--repo owner/name             Fetch issues and pull requests from GitHub
--token token                 GitHub token, defaults to GITHUB_TOKEN
--days number                 Recent activity window, defaults to 30
--input path                  Read issues JSON from a local file
--release-input path          Read pull request JSON from a local file
--format markdown|json        Output format, defaults to markdown
--output path                 Write output to a file
--min-score number            Exit with code 2 if health score is below this value
--openai-summary              Add an optional OpenAI-generated maintainer brief
--openai-api-key token        OpenAI API key, defaults to OPENAI_API_KEY
--openai-model model          OpenAI model, defaults to OPENAI_MODEL or gpt-4.1-mini
--help                        Show help
```

## Local JSON Shape

The local input mode accepts the shape returned by the GitHub REST API. It only needs a subset of fields:

```json
[
  {
    "number": 12,
    "title": "Crash when loading config",
    "body": "Steps to reproduce...",
    "state": "open",
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z",
    "comments": 3,
    "labels": [{ "name": "bug" }],
    "user": { "login": "contributor" }
  }
]
```

## Design Goals

- Zero runtime dependencies
- Read-only by default
- Works in CI and locally
- Human-readable output first
- Small enough for maintainers to audit
- Optional AI summaries, never required for the core report

## Roadmap

- Comment posting mode for weekly maintainer digests
- Label policy configuration
- Project-specific health baselines
- HTML report output

## License

MIT

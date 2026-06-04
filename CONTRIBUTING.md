# Contributing

Thanks for helping improve Maintainer Signal.

## Development

```bash
npm test
npm run check
```

For docs-only changes, also open `docs/index.html` and the matching README section to keep the landing page and repo docs aligned.

The project intentionally has no runtime dependencies. If a dependency is useful, open an issue first and explain the maintainer value it adds.

## Good First Issues

Useful first contributions:

- add more label detection phrases
- improve Markdown wording
- add fixture coverage for unusual GitHub issue shapes
- add a new report format

## Pull Requests

Please include:

- a short explanation of the maintainer workflow improved by the change
- tests for behavior changes
- docs updates when CLI options or report output changes

## Project Direction

Maintainer Signal should stay:

- read-only by default
- useful without AI or external services
- small enough for maintainers to audit quickly
- practical in CI and terminals

# Maintainer Signal Adoption Checklist

Use this checklist when adding Maintainer Signal to an open-source repository for the first time. It keeps the rollout read-only, reviewable, and easy to explain to contributors.

## 1. Start With Local Fixtures

Run the CLI against exported issue and pull request JSON before connecting it to a live repository:

```bash
npx maintainer-signal --input examples/issues.json --release-input examples/pulls.json --now 2026-06-01T12:00:00Z
```

Check that the report language matches how your project talks about triage, release notes, and maintainer follow-up.

## 2. Keep Permissions Narrow

For a scheduled GitHub Action, start with read-only permissions:

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
```

Maintainer Signal does not need write permissions for the default report mode.

## 3. Choose The Workflow Mode

- Use `examples/weekly-signal.yml` for a weekly digest artifact.
- Use `examples/quality-gate.yml` when you want CI to fail below a minimum project health score.
- Use `examples/weekly-signal-with-openai.yml` only when your project has an `OPENAI_API_KEY` secret and wants an optional AI maintainer brief.

## 4. Review The First Report

Before sharing the report broadly:

- confirm stale issue counts match your project expectations
- skim suggested labels for false positives
- check that release-note candidates reflect merged pull requests in the selected window
- tune `days` and `min-score` for your project size

## 5. Make The Output Useful

Good next steps after the first report:

- paste the top actions into a maintainer planning issue
- add labels that match recurring suggestions
- turn release-note candidates into the next changelog draft
- link the report artifact in a weekly project update

## 6. Keep The Rollout Transparent

If contributors will see the report, add a short note to your repository docs explaining that Maintainer Signal is read-only by default and is used to prioritize maintainer attention, not to judge contributors.

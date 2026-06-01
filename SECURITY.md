# Security Policy

Maintainer Signal is read-only by default and only needs GitHub read permissions for issues and pull requests.

## Reporting a Vulnerability

Please open a private security advisory on GitHub or email the maintainer if you find a vulnerability.

Include:

- affected version or commit
- reproduction steps
- expected impact
- suggested fix, if known

## Token Handling

Do not place GitHub tokens in command arguments in shared shell history. Prefer environment variables:

```bash
GITHUB_TOKEN=... npx maintainer-signal --repo owner/name
```

The tool does not store tokens and does not send repository data to third-party services.

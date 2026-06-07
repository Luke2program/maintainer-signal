#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { analyzeMaintainerSignal, renderMarkdown, renderJSON } from "./analyze.mjs";
import { fetchRepositorySignal } from "./github.mjs";
import { summarizeReportWithOpenAI } from "./openai.mjs";

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(helpText());
    return 0;
  }

  const days = Number(options.days || 30);
  const token = options.token || env.GITHUB_TOKEN;
  let issues = [];
  let pulls = [];

  if (options.repo) {
    ({ issues, pulls } = await fetchRepositorySignal({ repo: options.repo, token, days }));
  }

  if (options.input) {
    issues = JSON.parse(await readFile(options.input, "utf8"));
  }

  if (options.releaseInput) {
    pulls = JSON.parse(await readFile(options.releaseInput, "utf8"));
  }

  if (!options.repo && !options.input) {
    throw new Error("Provide --repo owner/name or --input issues.json");
  }

  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("--now must be an ISO date or timestamp");
  }

  const report = analyzeMaintainerSignal({ issues, pulls, days, now });
  if (options.openaiSummary) {
    report.aiSummary = await summarizeReportWithOpenAI(report, {
      apiKey: options.openaiApiKey || env.OPENAI_API_KEY,
      model: options.openaiModel || env.OPENAI_MODEL || "gpt-4.1-mini"
    });
  }
  const output = options.format === "json"
    ? renderJSON(report)
    : renderMarkdown(report, { repo: options.repo });

  if (options.output) {
    await writeFile(options.output, output);
  } else {
    process.stdout.write(output);
  }

  const minScore = Number(options.minScore || 0);
  return minScore > 0 && report.healthScore < minScore ? 2 : 0;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repo = argv[++i];
    else if (arg === "--token") options.token = argv[++i];
    else if (arg === "--days") options.days = argv[++i];
    else if (arg === "--input") options.input = argv[++i];
    else if (arg === "--release-input") options.releaseInput = argv[++i];
    else if (arg === "--format") options.format = argv[++i];
    else if (arg === "--output") options.output = argv[++i];
    else if (arg === "--min-score") options.minScore = argv[++i];
    else if (arg === "--now") options.now = argv[++i];
    else if (arg === "--openai-summary") options.openaiSummary = true;
    else if (arg === "--openai-api-key") options.openaiApiKey = argv[++i];
    else if (arg === "--openai-model") options.openaiModel = argv[++i];
    else throw new Error(`Unknown option: ${arg}`);
  }
  options.format ||= "markdown";
  if (!["markdown", "json"].includes(options.format)) {
    throw new Error("--format must be markdown or json");
  }
  return options;
}

function helpText() {
  return `Maintainer Signal

Usage:
  maintainer-signal --repo owner/name [--days 30] [--output report.md]
  maintainer-signal --input issues.json [--release-input pulls.json]

Options:
  --repo owner/name             Fetch issues and pull requests from GitHub
  --token token                 GitHub token, defaults to GITHUB_TOKEN
  --days number                 Recent activity window, defaults to 30
  --input path                  Read issues JSON from a local file
  --release-input path          Read pull request JSON from a local file
  --format markdown|json        Output format, defaults to markdown (json for programmatic use)
  --output path                 Write output to a file
  --min-score number            Exit with code 2 if health score is below this value
  --now ISO-date                Override the report timestamp for reproducible examples
  --openai-summary              Add an optional OpenAI-generated maintainer brief
  --openai-api-key token        OpenAI API key, defaults to OPENAI_API_KEY
  --openai-model model          OpenAI model, defaults to OPENAI_MODEL or gpt-4.1-mini
  --help                        Show this help
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

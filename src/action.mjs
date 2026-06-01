import { appendFile, writeFile } from "node:fs/promises";
import { analyzeMaintainerSignal, renderMarkdown } from "./analyze.mjs";
import { fetchRepositorySignal } from "./github.mjs";
import { summarizeReportWithOpenAI } from "./openai.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const token = input("github-token") || process.env.GITHUB_TOKEN;
const days = Number(input("days") || 30);
const output = input("output") || "signal-report.md";
const minScore = Number(input("min-score") || 0);
const openaiApiKey = input("openai-api-key");
const openaiModel = input("openai-model") || "gpt-4.1-mini";

try {
  const { issues, pulls } = await fetchRepositorySignal({ repo, token, days });
  const report = analyzeMaintainerSignal({ issues, pulls, days });
  if (openaiApiKey) {
    report.aiSummary = await summarizeReportWithOpenAI(report, {
      apiKey: openaiApiKey,
      model: openaiModel
    });
  }
  const markdown = renderMarkdown(report, { repo });
  await writeFile(output, markdown);
  await setOutput("health-score", String(report.healthScore));
  await setOutput("report-path", output);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  }

  if (minScore > 0 && report.healthScore < minScore) {
    console.error(`Maintainer Signal score ${report.healthScore} is below min-score ${minScore}`);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function input(name) {
  return process.env[`INPUT_${name.toUpperCase().replaceAll("-", "_")}`];
}

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  } else {
    console.log(`${name}=${value}`);
  }
}

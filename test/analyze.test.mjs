import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { analyzeMaintainerSignal, renderMarkdown, suggestLabels } from "../src/analyze.mjs";
import { main } from "../src/cli.mjs";
import { extractResponseText, summarizeReportWithOpenAI } from "../src/openai.mjs";

const now = new Date("2026-06-01T12:00:00Z");

test("suggests labels from issue content", () => {
  const labels = suggestLabels({
    title: "Crash when loading config",
    body: "Steps to reproduce the regression",
    labels: []
  });
  assert.deepEqual(labels, ["bug"]);
});

test("builds a maintainer report with triage and release notes", () => {
  const report = analyzeMaintainerSignal({
    now,
    issues: [
      {
        number: 1,
        title: "Crash on startup",
        body: "TypeError and reproduce steps",
        state: "open",
        created_at: "2026-05-01T12:00:00Z",
        updated_at: "2026-05-01T12:00:00Z",
        comments: 0,
        labels: [],
        user: { login: "alice" }
      }
    ],
    pulls: [
      {
        number: 2,
        title: "Fix startup crash",
        state: "closed",
        merged_at: "2026-05-20T12:00:00Z",
        labels: [{ name: "bug" }],
        user: { login: "bob" }
      }
    ]
  });

  assert.equal(report.totals.openIssues, 1);
  assert.equal(report.totals.needsResponse, 1);
  assert.equal(report.releaseNotes.length, 1);
  assert.equal(report.triage[0].suggestedLabels[0], "bug");
  assert.ok(report.healthScore < 100);
});

test("renders markdown output", () => {
  const report = analyzeMaintainerSignal({ now, issues: [], pulls: [] });
  const markdown = renderMarkdown(report, { repo: "owner/repo" });
  assert.match(markdown, /Maintainer Signal Report/);
  assert.match(markdown, /Repository: `owner\/repo`/);
  assert.match(markdown, /Health Score/);
});

test("renders optional AI summary section", () => {
  const report = analyzeMaintainerSignal({ now, issues: [], pulls: [] });
  report.aiSummary = "Project is healthy. Keep reviewing weekly.";
  const markdown = renderMarkdown(report, { repo: "owner/repo" });
  assert.match(markdown, /AI Maintainer Brief/);
  assert.match(markdown, /Project is healthy/);
});

test("CLI supports reproducible report timestamps", async () => {
  const dir = await mkdtemp(join(tmpdir(), "maintainer-signal-"));
  const output = join(dir, "report.md");
  try {
    const code = await main([
      "--input", "examples/issues.json",
      "--release-input", "examples/pulls.json",
      "--now", "2026-06-01T12:00:00Z",
      "--output", output
    ], {});

    assert.equal(code, 0);
    const markdown = await readFile(output, "utf8");
    assert.match(markdown, /Generated: 2026-06-01T12:00:00.000Z/);
    assert.match(markdown, /#101 Crash when config file is missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI returns code 2 when health score is below the minimum", async () => {
  const dir = await mkdtemp(join(tmpdir(), "maintainer-signal-gate-"));
  const output = join(dir, "report.md");
  try {
    const code = await main([
      "--input", "examples/issues.json",
      "--release-input", "examples/pulls.json",
      "--now", "2026-06-01T12:00:00Z",
      "--min-score", "101",
      "--output", output
    ], {});

    assert.equal(code, 2);
    const markdown = await readFile(output, "utf8");
    assert.match(markdown, /Health Score/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("extracts Responses API text", () => {
  const text = extractResponseText({
    output: [
      {
        content: [
          { type: "output_text", text: "Brief one." },
          { type: "output_text", text: "Brief two." }
        ]
      }
    ]
  });
  assert.equal(text, "Brief one.\nBrief two.");
});

test("requests optional OpenAI summary with redacted report", async () => {
  const report = analyzeMaintainerSignal({ now, issues: [], pulls: [] });
  const summary = await summarizeReportWithOpenAI(report, {
    apiKey: "test-key",
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(init.method, "POST");
      assert.match(init.headers.Authorization, /Bearer test-key/);
      const body = JSON.parse(init.body);
      assert.equal(body.model, "gpt-4.1-mini");
      assert.match(body.input[1].content, /Report JSON/);
      return {
        ok: true,
        json: async () => ({ output_text: "Maintainer brief" })
      };
    }
  });
  assert.equal(summary, "Maintainer brief");
});

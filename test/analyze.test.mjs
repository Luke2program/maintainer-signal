import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeMaintainerSignal, renderMarkdown, suggestLabels } from "../src/analyze.mjs";

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

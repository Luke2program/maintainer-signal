const DAY_MS = 24 * 60 * 60 * 1000;

const LABEL_RULES = [
  {
    label: "bug",
    terms: ["bug", "crash", "error", "exception", "broken", "fail", "regression", "reproduce"]
  },
  {
    label: "documentation",
    terms: ["docs", "documentation", "readme", "guide", "example", "tutorial"]
  },
  {
    label: "question",
    terms: ["how do i", "how to", "question", "help", "support", "?"]
  },
  {
    label: "enhancement",
    terms: ["feature", "enhancement", "add", "support", "would be useful", "proposal"]
  }
];

export function analyzeMaintainerSignal({ issues = [], pulls = [], now = new Date(), days = 30 } = {}) {
  const windowStart = new Date(now.getTime() - Number(days) * DAY_MS);
  const openIssues = issues.filter((issue) => issue.state !== "closed" && !issue.pull_request);
  const recentIssues = openIssues.filter((issue) => dateOf(issue.created_at) >= windowStart || dateOf(issue.updated_at) >= windowStart);
  const staleIssues = openIssues.filter((issue) => ageInDays(issue.updated_at || issue.created_at, now) >= 30);
  const needsResponse = openIssues.filter((issue) => Number(issue.comments || 0) === 0);
  const unlabeled = openIssues.filter((issue) => labelsOf(issue).length === 0);
  const mergedPulls = pulls
    .filter((pull) => pull.merged_at)
    .filter((pull) => dateOf(pull.merged_at) >= windowStart);

  const triage = openIssues
    .map((issue) => ({
      number: issue.number,
      title: issue.title || "(untitled)",
      ageDays: ageInDays(issue.created_at, now),
      idleDays: ageInDays(issue.updated_at || issue.created_at, now),
      comments: Number(issue.comments || 0),
      author: issue.user?.login || "unknown",
      labels: labelsOf(issue),
      suggestedLabels: suggestLabels(issue),
      priority: priorityForIssue(issue, now)
    }))
    .sort((a, b) => b.priority - a.priority || b.idleDays - a.idleDays)
    .slice(0, 10);

  const categoryCounts = countCategories(openIssues);
  const score = healthScore({
    openIssues: openIssues.length,
    staleIssues: staleIssues.length,
    needsResponse: needsResponse.length,
    unlabeled: unlabeled.length,
    mergedPulls: mergedPulls.length
  });

  return {
    generatedAt: now.toISOString(),
    windowDays: Number(days),
    healthScore: score,
    totals: {
      openIssues: openIssues.length,
      recentIssues: recentIssues.length,
      staleIssues: staleIssues.length,
      needsResponse: needsResponse.length,
      unlabeled: unlabeled.length,
      mergedPulls: mergedPulls.length
    },
    categories: categoryCounts,
    triage,
    releaseNotes: mergedPulls.map((pull) => ({
      number: pull.number,
      title: pull.title || "(untitled)",
      author: pull.user?.login || "unknown",
      labels: labelsOf(pull),
      mergedAt: pull.merged_at
    })),
    recommendations: recommendationsFor({ score, openIssues, staleIssues, needsResponse, unlabeled, mergedPulls })
  };
}

export function renderJSON(report) {
  return JSON.stringify(report, null, 2) + "\n";
}

export function renderMarkdown(report, { repo } = {}) {
  const lines = [];
  const issueRef = (number) => linkedGitHubRef({ repo, number, type: "issues" });
  const pullRef = (number) => linkedGitHubRef({ repo, number, type: "pull" });
  lines.push("# Maintainer Signal Report");
  lines.push("");
  if (repo) lines.push(`Repository: \`${repo}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Window: last ${report.windowDays} days`);
  lines.push("");
  if (report.aiSummary) {
    lines.push("## AI Maintainer Brief");
    lines.push("");
    lines.push(report.aiSummary);
    lines.push("");
  }
  lines.push(`## Health Score: ${report.healthScore}/100`);
  lines.push("");
  lines.push("- Open issues: " + report.totals.openIssues);
  lines.push("- Recent issue activity: " + report.totals.recentIssues);
  lines.push("- Stale issues: " + report.totals.staleIssues);
  lines.push("- Issues waiting for first response: " + report.totals.needsResponse);
  lines.push("- Unlabeled issues: " + report.totals.unlabeled);
  lines.push("- Merged pull requests: " + report.totals.mergedPulls);
  lines.push("");
  lines.push("## Issue Mix");
  lines.push("");
  for (const [label, count] of Object.entries(report.categories)) {
    lines.push(`- ${label}: ${count}`);
  }
  lines.push("");
  lines.push("## Triage Queue");
  lines.push("");
  if (report.triage.length === 0) {
    lines.push("No open issues found.");
  } else {
    for (const item of report.triage) {
      const suggested = item.suggestedLabels.length ? ` Suggested: ${item.suggestedLabels.map((label) => `\`${label}\``).join(", ")}.` : "";
      lines.push(`- ${issueRef(item.number)} ${item.title} by @${item.author} (${item.idleDays} idle days, priority ${item.priority}).${suggested}`);
    }
  }
  lines.push("");
  lines.push("## Release Note Candidates");
  lines.push("");
  if (report.releaseNotes.length === 0) {
    lines.push("No merged pull requests in this window.");
  } else {
    for (const item of report.releaseNotes) {
      lines.push(`- ${pullRef(item.number)} ${item.title} by @${item.author}`);
    }
  }
  lines.push("");
  lines.push("## Recommended Maintainer Actions");
  lines.push("");
  for (const action of report.recommendations) {
    lines.push(`- ${action}`);
  }
  lines.push("");
  return lines.join("\n");
}

function linkedGitHubRef({ repo, number, type }) {
  if (!repo || !number) return `#${number}`;
  return `[#${number}](https://github.com/${repo}/${type}/${number})`;
}

export function suggestLabels(issue) {
  const text = `${issue.title || ""}\n${issue.body || ""}`.toLowerCase();
  const existing = new Set(labelsOf(issue));
  return LABEL_RULES
    .filter((rule) => !existing.has(rule.label))
    .filter((rule) => rule.terms.some((term) => text.includes(term)))
    .map((rule) => rule.label);
}

function countCategories(issues) {
  const counts = {
    bug: 0,
    documentation: 0,
    question: 0,
    enhancement: 0,
    unclassified: 0
  };

  for (const issue of issues) {
    const labels = new Set([...labelsOf(issue), ...suggestLabels(issue)]);
    let matched = false;
    for (const key of Object.keys(counts).filter((key) => key !== "unclassified")) {
      if (labels.has(key)) {
        counts[key] += 1;
        matched = true;
      }
    }
    if (!matched) counts.unclassified += 1;
  }

  return counts;
}

function priorityForIssue(issue, now) {
  let priority = 0;
  const text = `${issue.title || ""}\n${issue.body || ""}`.toLowerCase();
  const labels = new Set(labelsOf(issue));
  if (labels.has("bug") || text.includes("crash") || text.includes("regression")) priority += 40;
  if (Number(issue.comments || 0) === 0) priority += 25;
  if (labelsOf(issue).length === 0) priority += 15;
  priority += Math.min(20, ageInDays(issue.updated_at || issue.created_at, now));
  return priority;
}

function recommendationsFor({ score, staleIssues, needsResponse, unlabeled, mergedPulls }) {
  const actions = [];
  if (needsResponse.length > 0) actions.push(`Reply to ${needsResponse.length} issue(s) that have not received a maintainer response.`);
  if (unlabeled.length > 0) actions.push(`Label ${unlabeled.length} open issue(s) so contributors can find the right work.`);
  if (staleIssues.length > 0) actions.push(`Review ${staleIssues.length} stale issue(s) and close, reproduce, or move them into a milestone.`);
  if (mergedPulls.length > 0) actions.push(`Turn ${mergedPulls.length} merged pull request(s) into release notes.`);
  if (score >= 85) actions.push("Project signal looks healthy. Keep the weekly review cadence.");
  if (actions.length === 0) actions.push("No urgent maintainer action detected.");
  return actions;
}

function healthScore({ openIssues, staleIssues, needsResponse, unlabeled, mergedPulls }) {
  let score = 100;
  score -= Math.min(25, staleIssues * 5);
  score -= Math.min(25, needsResponse * 5);
  score -= Math.min(20, unlabeled * 4);
  if (openIssues > 20) score -= Math.min(20, Math.floor((openIssues - 20) / 5) * 2);
  score += Math.min(10, mergedPulls * 2);
  return Math.max(0, Math.min(100, score));
}

function labelsOf(item) {
  return (item.labels || []).map((label) => typeof label === "string" ? label : label.name).filter(Boolean);
}

function ageInDays(value, now) {
  if (!value) return 0;
  return Math.max(0, Math.floor((now.getTime() - dateOf(value).getTime()) / DAY_MS));
}

function dateOf(value) {
  return value instanceof Date ? value : new Date(value);
}

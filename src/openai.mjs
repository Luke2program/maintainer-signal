export async function summarizeReportWithOpenAI(report, {
  apiKey,
  model = "gpt-4.1-mini",
  fetchImpl = globalThis.fetch
} = {}) {
  if (!apiKey) {
    throw new Error("OpenAI summaries require OPENAI_API_KEY or --openai-api-key");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available");
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "You write concise open-source maintainer briefings. Do not invent facts. Use only the supplied JSON report."
        },
        {
          role: "user",
          content: `Create a maintainer summary with: 1) one-sentence status, 2) top three actions, 3) release-note draft if any merged PRs exist.\n\nReport JSON:\n${JSON.stringify(redactReport(report), null, 2)}`
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error("OpenAI API response did not include summary text");
  }
  return text.trim();
}

export function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function redactReport(report) {
  return {
    generatedAt: report.generatedAt,
    windowDays: report.windowDays,
    healthScore: report.healthScore,
    totals: report.totals,
    categories: report.categories,
    triage: report.triage.map((item) => ({
      number: item.number,
      title: item.title,
      idleDays: item.idleDays,
      comments: item.comments,
      labels: item.labels,
      suggestedLabels: item.suggestedLabels,
      priority: item.priority
    })),
    releaseNotes: report.releaseNotes,
    recommendations: report.recommendations
  };
}

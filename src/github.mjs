const API = "https://api.github.com";

export async function fetchRepositorySignal({ repo, token, days = 30 }) {
  if (!repo || !repo.includes("/")) {
    throw new Error("--repo must be in owner/name format");
  }
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();
  const issues = await fetchAll(`/repos/${repo}/issues?state=open&per_page=100&since=${encodeURIComponent(since)}`, token);
  const pulls = await fetchAll(`/repos/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`, token);
  return {
    issues: issues.filter((item) => !item.pull_request),
    pulls: pulls.filter((item) => item.merged_at || item.state === "closed")
  };
}

async function fetchAll(path, token) {
  const items = [];
  let url = `${API}${path}`;
  while (url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "maintainer-signal",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }
    items.push(...await response.json());
    url = nextLink(response.headers.get("link"));
  }
  return items;
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

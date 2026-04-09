type GitHubWriteInput = {
  repo: string;
  repoPath: string;
  branch?: string;
  title: string;
  content: string;
  force: boolean;
};

const GITHUB_API_ROOT = "https://api.github.com";

export async function writeGitHubFile(input: GitHubWriteInput): Promise<void> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "GitHub write mode requires a GITHUB_TOKEN environment variable with access to the destination repo."
    );
  }

  const existingFile = await fetchExistingFile(input, token);

  if (existingFile && !input.force) {
    throw new Error(
      `Refusing to overwrite existing GitHub file without --force: ${input.repo}/${input.repoPath}`
    );
  }

  const response = await fetch(buildContentsUrl(input.repo, input.repoPath), {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "chatgpt-thread-exporter"
    },
    body: JSON.stringify({
      message: `Export ChatGPT thread: ${input.title}`,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      branch: input.branch,
      sha: existingFile?.sha
    })
  });

  if (!response.ok) {
    throw new Error(await formatGitHubError(response, input));
  }
}

async function fetchExistingFile(
  input: GitHubWriteInput,
  token: string
): Promise<{ sha: string } | null> {
  const response = await fetch(buildContentsUrl(input.repo, input.repoPath, input.branch), {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "chatgpt-thread-exporter"
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await formatGitHubError(response, input));
  }

  const payload = (await response.json()) as { sha?: unknown };
  return typeof payload.sha === "string" ? { sha: payload.sha } : null;
}

function buildContentsUrl(repo: string, repoPath: string, branch?: string): string {
  const encodedRepoPath = repoPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = new URL(`${GITHUB_API_ROOT}/repos/${repo}/contents/${encodedRepoPath}`);

  if (branch) {
    url.searchParams.set("ref", branch);
  }

  return url.toString();
}

async function formatGitHubError(response: Response, input: GitHubWriteInput): Promise<string> {
  const details = await readGitHubErrorMessage(response);

  if (response.status === 401 || response.status === 403) {
    return `GitHub rejected access to ${input.repo}. Check GITHUB_TOKEN permissions and repo access. ${details}`;
  }

  if (response.status === 409 || response.status === 422) {
    return `GitHub could not write ${input.repo}/${input.repoPath}. Check the branch, path, and overwrite settings, then try again. ${details}`;
  }

  return `GitHub write failed for ${input.repo}/${input.repoPath} (HTTP ${response.status}). ${details}`;
}

async function readGitHubErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message.trim();
    }
  } catch {
    // Ignore JSON parse errors and fall back below.
  }

  try {
    const text = await response.text();
    if (text.trim().length > 0) {
      return text.trim();
    }
  } catch {
    // Ignore body read failures.
  }

  return "No additional details were returned by GitHub.";
}

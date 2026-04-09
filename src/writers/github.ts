type GitHubWriteInput = {
  repo: string;
  repoPath: string;
  branch?: string;
  title: string;
  content: string;
  force: boolean;
};

export async function writeGitHubFile(_input: GitHubWriteInput): Promise<void> {
  throw new Error(
    "GitHub write mode is not implemented yet. The local-only exporter is ready now; GitHub output is planned for a later phase."
  );
}

type GitHubWriteInput = {
  repo: string;
  repoPath: string;
  branch?: string;
  title: string;
  content: string;
  force: boolean;
};

export async function writeGitHubFile(_input: GitHubWriteInput): Promise<void> {
  throw new Error("GitHub write mode is scaffolded but not implemented yet.");
}

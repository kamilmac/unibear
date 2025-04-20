export const getGitDiffToBaseBranch = async (): Promise<string> => {
  const checkBranchExists = async (branch: string) => {
    const command = new Deno.Command("git", {
      args: ["show-ref", "--quiet", `refs/heads/${branch}`],
    });
    const { code } = await command.output();
    return code === 0; // 0 means the branch exists
  };

  // Determine which branch exists
  let baseBranch = "master";
  if (await checkBranchExists("main")) {
    baseBranch = "main";
  } else if (await checkBranchExists("master")) {
    baseBranch = "master";
  } else {
    console.error("Neither 'main' nor 'master' branch exists.");
    return "";
  }
  const command = new Deno.Command("git", {
    args: ["diff", baseBranch],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code === 0) {
    // If the command was successful, stdout will be the output of the command
    const output = new TextDecoder().decode(stdout);
    return output;
  } else {
    // If there was an error, stderr will contain the error message
    const error = new TextDecoder().decode(stderr);
    console.error("Error:", error);
  }
  return "";
};

export const commitAllChanges = async (message: string): Promise<string> => {
  const run = async (args: string[]) => {
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    return {
      success: code === 0,
      out: new TextDecoder().decode(stdout),
      err: new TextDecoder().decode(stderr),
    };
  };

  // Stage everything (including deletions)
  const add = await run(["add", "--all"]);
  if (!add.success) {
    console.error("git add failed:", add.err.trim());
    return "";
  }

  // Commit with provided message
  const commit = await run(["commit", "-m", message]);
  if (!commit.success) {
    console.error("git commit failed:", commit.err.trim());
    return "";
  }

  return commit.out.trim();
};

export const getGitDiffToLatestCommit = async (): Promise<string> => {
  const cmd = new Deno.Command("git", {
    args: ["diff", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    console.error(
      "git diff HEAD failed:",
      new TextDecoder().decode(stderr).trim(),
    );
    return "";
  }
  return new TextDecoder().decode(stdout);
};

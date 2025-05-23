export const getGitDiffToBaseBranch = async (): Promise<string> => {
  const run = async (args: string[]) => {
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      throw new Error(new TextDecoder().decode(stderr));
    }
    return new TextDecoder().decode(stdout).trim();
  };

  // fetch remote
  await run(["fetch", "--quiet", "origin"]);

  // Determine which branch exists
  let base = "master";
  try {
    const exists = !!(await run(["ls-remote", "--heads", "origin", "main"]));
    if (exists) {
      base = "main";
    }
  } catch {
    // keep master
  }

  // 3) diff HEAD against origin/<base>
  return run(["diff", `origin/${base}...HEAD`]);
};

export const getGitPrStyleDiff = async (): Promise<string> => {
  const run = async (args: string[]) => {
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      throw new Error(new TextDecoder().decode(stderr));
    }
    return new TextDecoder().decode(stdout).trim();
  };

  // 1) fetch remote
  await run(["fetch", "--quiet", "origin"]);

  // 2) find remote base branch
  let base = "master";
  try {
    await run(["ls-remote", "--heads", "origin", "main"]);
    base = "main";
  } catch {
    // keep master
  }

  // 3) diff HEAD against origin/<base>
  return run(["diff", `origin/${base}...HEAD`]);
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

export const getLocalModifiedFilePaths = async (): Promise<string[]> => {
  const runCmd = async (args: string[]): Promise<string> => {
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      throw new Error(new TextDecoder().decode(stderr));
    }
    return new TextDecoder().decode(stdout).trim();
  };

  const changed = (await runCmd([
    "diff",
    "--name-only",
    "HEAD",
  ])).split("\n").filter(Boolean);
  const untracked = (await runCmd([
    "ls-files",
    "--others",
    "--exclude-standard",
  ])).split("\n").filter(Boolean);

  return Array.from(new Set([...changed, ...untracked]));
};

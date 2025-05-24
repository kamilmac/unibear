import { Logger } from "../services/logging.ts"; // Added

export const getGitDiffToBaseBranch = async (): Promise<string> => {
  const run = async (args: string[]) => {
    Logger.debug("Executing git command", { command: `git ${args.join(" ")}` }); // Added
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      Logger.error("Git command failed", {
        command: `git ${args.join(" ")}`,
        code,
        stderr: errorMsg,
      }); // Added
      throw new Error(errorMsg);
    }
    const output = new TextDecoder().decode(stdout).trim();
    Logger.debug("Git command successful", {
      command: `git ${args.join(" ")}`,
      stdout_length: output.length,
    }); // Added
    return output;
  };
  Logger.info("Getting diff to base branch"); // Added
  // fetch remote
  await run(["fetch", "--quiet", "origin"]);

  // Determine which branch exists
  let base = "master";
  try {
    Logger.debug("Checking for 'main' branch existence on remote"); // Added
    const exists = !!(await run(["ls-remote", "--heads", "origin", "main"]));
    if (exists) {
      base = "main";
      Logger.debug("'main' branch found on remote, setting as base."); // Added
    }
  } catch (error: any) {
    Logger.warning(
      "Could not check for 'main' branch, defaulting to 'master'. This might be okay if 'master' is the base.",
      { error: error.message },
    ); // Added
    // keep master
  }
  Logger.debug(`Using base branch: ${base}`); // Added
  // 3) diff HEAD against origin/<base>
  return run(["diff", `origin/${base}...HEAD`]);
};

export const getGitPrStyleDiff = async (): Promise<string> => {
  const run = async (args: string[]) => {
    Logger.debug("Executing git command (PR style diff)", {
      command: `git ${args.join(" ")}`,
    }); // Added
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      Logger.error("Git command failed (PR style diff)", {
        command: `git ${args.join(" ")}`,
        code,
        stderr: errorMsg,
      }); // Added
      throw new Error(errorMsg);
    }
    const output = new TextDecoder().decode(stdout).trim();
    Logger.debug("Git command successful (PR style diff)", {
      command: `git ${args.join(" ")}`,
      stdout_length: output.length,
    }); // Added
    return output;
  };
  Logger.info("Getting PR style diff to base branch"); // Added
  // 1) fetch remote
  await run(["fetch", "--quiet", "origin"]);

  // 2) find remote base branch
  let base = "master";
  try {
    Logger.debug(
      "Checking for 'main' branch existence on remote (PR style diff)",
    ); // Added
    await run(["ls-remote", "--heads", "origin", "main"]);
    base = "main";
    Logger.debug(
      "'main' branch found on remote, setting as base (PR style diff).",
    ); // Added
  } catch (error: any) {
    Logger.warning(
      "Could not check for 'main' branch (PR style diff), defaulting to 'master'. This might be okay if 'master' is the base.",
      { error: error.message },
    ); // Added
    // keep master
  }
  Logger.debug(`Using base branch (PR style diff): ${base}`); // Added
  // 3) diff HEAD against origin/<base>
  return run(["diff", `origin/${base}...HEAD`]);
};

export const commitAllChanges = async (message: string): Promise<string> => {
  const run = async (args: string[]) => {
    Logger.debug("Executing git command (commit)", {
      command: `git ${args.join(" ")}`,
    }); // Added
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
      code, // Added for logging
    };
  };
  Logger.info("Committing all changes", { message }); // Added
  // Stage everything (including deletions)
  const add = await run(["add", "--all"]);
  if (!add.success) {
    Logger.error("git add --all failed", {
      stderr: add.err.trim(),
      code: add.code,
    }); // Added
    // console.error("git add failed:", add.err.trim());
    return "";
  }
  Logger.debug("git add --all successful"); // Added

  // Commit with provided message
  const commit = await run(["commit", "-m", message]);
  if (!commit.success) {
    Logger.error("git commit failed", {
      message,
      stderr: commit.err.trim(),
      code: commit.code,
    }); // Added
    // console.error("git commit failed:", commit.err.trim());
    return "";
  }
  Logger.info("Git commit successful", { message, stdout: commit.out.trim() }); // Added
  return commit.out.trim();
};

export const getGitDiffToLatestCommit = async (): Promise<string> => {
  Logger.info("Getting diff to latest commit (HEAD)"); // Added
  const cmd = new Deno.Command("git", {
    args: ["diff", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    const errorMsg = new TextDecoder().decode(stderr).trim();
    Logger.error("git diff HEAD failed", { code, stderr: errorMsg }); // Added
    // console.error(
    //   "git diff HEAD failed:",
    //   new TextDecoder().decode(stderr).trim(),
    // );
    return "";
  }
  const output = new TextDecoder().decode(stdout);
  Logger.debug("git diff HEAD successful", { output_length: output.length }); // Added
  return output;
};

export const getLocalModifiedFilePaths = async (): Promise<string[]> => {
  const runCmd = async (args: string[]): Promise<string> => {
    Logger.debug("Executing git command (getLocalModifiedFilePaths)", {
      command: `git ${args.join(" ")}`,
    }); // Added
    const cmd = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      Logger.error("Git command failed (getLocalModifiedFilePaths)", {
        command: `git ${args.join(" ")}`,
        code,
        stderr: errorMsg,
      }); // Added
      throw new Error(errorMsg);
    }
    const output = new TextDecoder().decode(stdout).trim();
    Logger.debug("Git command successful (getLocalModifiedFilePaths)", {
      command: `git ${args.join(" ")}`,
      output_length: output.length,
    }); // Added
    return output;
  };
  Logger.info("Getting local modified file paths"); // Added
  const changed = (await runCmd([
    "diff",
    "--name-only",
    "HEAD",
  ])).split("\n").filter(Boolean);
  Logger.debug("Got changed files (diff --name-only HEAD)", {
    count: changed.length,
  }); // Added

  const untracked = (await runCmd([
    "ls-files",
    "--others",
    "--exclude-standard",
  ])).split("\n").filter(Boolean);
  Logger.debug("Got untracked files (ls-files --others --exclude-standard)", {
    count: untracked.length,
  }); // Added

  const allFiles = Array.from(new Set([...changed, ...untracked]));
  Logger.info("Local modified file paths retrieved", {
    count: allFiles.length,
    files: allFiles,
  }); // Added
  return allFiles;
};

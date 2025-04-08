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

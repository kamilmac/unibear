import { COLORS } from "../../utils/constants.ts";
import { getLocalModifiedFilePaths } from "../../utils/git.ts";
import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../../utils/git.ts";
import { LLMAdapter } from "../llm_providers/default.ts";
import { Tool } from "../tools.ts";

export const gitTools = (llm: LLMAdapter): Tool[] => [
  {
    definition: {
      function: {
        name: "git_commit",
        description:
          "Automatically generates a concise, descriptive commit message based on your code changes and performs a git commit. " +
          "Commits all modified files without review. Use when your changes are ready to be committed with an AI-generated message.",
      },
      type: "function",
    },
    process: async (_args: unknown, log) => {
      log(COLORS.tool("\nCreating commit...\n"));
      const diff = await getGitDiffToLatestCommit();
      const response = await llm.send(
        "You are an expert senior engineer. Generate a concise git commit message for the following diff.",
        diff,
      );
      await commitAllChanges(response);
      return `Commit message: ${response}\nShow it to the user!`;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_review",
        description:
          "Analyzes your code changes compared to the base branch (main/master) and provides a detailed code review. " +
          "Highlights potential bugs, architectural issues, and suggests improvements. Useful before submitting PRs " +
          "or when seeking feedback on implementation quality.",
      },
      type: "function",
    },
    process: async (_args: unknown, log) => {
      log(COLORS.tool("\nPreparing review...\n"));
      const diff = await getGitDiffToBaseBranch();
      const response = await llm.send(
        `
You are an expert senior engineer. Given a unified diff to base branch (master or main), produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format.`,
        diff,
      );
      return `This is the review: ${response}\nShow it to the user!`;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_create_pr_description",
        description: "Generates a well-structured Pull Request description in Markdown format based on your code changes. " +
          "Includes a summary of changes and technical details. Saves time when preparing PRs by automatically " +
          "extracting the purpose and key modifications from your code.",
      },
      type: "function",
    },
    process: async (_args, log) => {
      log(COLORS.tool("\nPreparing description for diff to base branch...\n"));
      const diff = await getGitDiffToBaseBranch();
      const response = await llm.send(
        `
You are an AI assistant creating Pull Request (PR) descriptions. Analyze the provided code to understand the changes and their purpose.
Generate a PR description in Markdown with the following sections:
1.  **# Summary:** Briefly state the PR's goal (problem solved or feature added). Infer this from the changes.
2.  **# Changes:** Describe the main technical modifications (key files, components, implementation approach). Be concise.
Keep the tone clear and professional. If the purpose is unclear from the code, note that the summary is an inference. Do not invent information not present in the diff.
3. Remove unnecessary whitespaces|indentation and empty lines.`,
        diff,
      );
      return `PR description: ${response}\nShow it to the user!`;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_list_local_modified_files",
        description:
          "Displays all files that have been modified, staged, or newly created in your git repository. " +
          "Shows the complete list of files with pending changes that would be included in a commit. " +
          "Useful for reviewing what files have been changed before using other git tools.",
      },
      type: "function",
    },
    process: async (_args, log) => {
      log(COLORS.tool("\nListing locally modified files...\n"));
      const files = await getLocalModifiedFilePaths();
      return files.join("\n");
    },
    mode: ["git", "normal", "edit"],
  },
];

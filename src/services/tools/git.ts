import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../../utils/git.ts";
import { Tool } from "../tools.ts";

export const gitTools = (llm): Tool[] => [
  {
    definition: {
      function: {
        name: "git_auto_commit",
        description: "Generate commit message from diff and commit all changes",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async () => {
      const diff = await getGitDiffToLatestCommit();
      const response = llm.send(
        "You are an expert senior engineer. Generate a concise git commit message for the following diff.",
        diff,
      );
      await commitAllChanges(response);
      return `Return directly to user and informa about successfull commit with following message:
      ${response}`;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_review",
        description: "Creates a review of all changes to base git branch",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (_args: unknown) => {
      const diff = await getGitDiffToBaseBranch();
      const response = llm.send(
        `
You are an expert senior engineer. Given a unified diff to base branch (master or main), produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format.`,
        diff,
      );
      return `Return directly to user with following review: ${response}`;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_create_pr_description",
        description: "Creates PR description based on diff to base branch",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (_args: unknown) => {
      const diff = await getGitDiffToBaseBranch();
      const response = llm.send(
        `
You are an AI assistant creating Pull Request (PR) descriptions. Analyze the provided code to understand the changes and their purpose.
Generate a PR description in Markdown with the following sections:
1.  **# Summary:** Briefly state the PR's goal (problem solved or feature added). Infer this from the changes.
2.  **# Changes:** Describe the main technical modifications (key files, components, implementation approach). Be concise.
Keep the tone clear and professional. If the purpose is unclear from the code, note that the summary is an inference. Do not invent information not present in the diff.`,
        diff,
      );
      return `Return directly to user with following PR description: ${response}`;
    },
    mode: ["git"],
  },
];

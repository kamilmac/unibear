import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { z } from "npm:zod";
import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../../utils/git.ts";

export const gitTools = [
  {
    definition: {
      function: {
        name: "git_commit_with_message",
        description: "Creates git commit based on given message",
        strict: true,
        parameters: zodToJsonSchema(
          z.object({
            message: z.string().describe("Message for git commit"),
          }).strict(),
        ),
      },
      type: "function",
    },
    process: async (args: any) => {
      await commitAllChanges(args.message);
      return "Prompt user about succesfull commit with following message: " +
        args.message;
    },
    mode: ["git"],
  },
  {
    definition: {
      function: {
        name: "git_create_msg_and_commit_all_changes",
        description: "Commit all changes to git repository",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (args: any) => {
      const diff = await getGitDiffToLatestCommit();
      return `
        1. Create commit message based on following diff: ${diff}.
        2. Use git_commit_with_message tool to commit changes with created message.`;
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
    process: async (args: any) => {
      const diff = await getGitDiffToBaseBranch();
      const system =
        "You are an expert senior engineer. Given a unified diff to base branch (master or main), produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format";
      return `${system}. The diff: ${diff}`;
    },
    mode: ["normal", "git"],
  },
];

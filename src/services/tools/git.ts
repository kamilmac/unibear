import { COLORS } from "../../utils/constants.ts";
import { getLocalModifiedFilePaths } from "../../utils/git.ts";
import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../../utils/git.ts";
import { LLMAdapter } from "../llm_providers/default.ts";
import { Tool } from "../tools.ts";
import { Logger } from "../logging.ts"; // Added

export const gitTools = (llm: LLMAdapter): Tool[] => [
  {
    definition: {
      function: {
        name: "git_get_diff_to_base",
        description:
          "Retrieves the unified diff between your current branch and the remote base branch (main/master). " +
          "Shows all changes that would be included in a Pull Request. Useful for reviewing changes " +
          "before committing or generating commit messages.",
      },
      type: "function",
    },
    process: async (_args: unknown, print) => {
      print(COLORS.tool("\nGetting diff to base branch...\n"));
      Logger.info("Starting git_get_diff_to_base process");
      try {
        const diff = await getGitDiffToBaseBranch();
        Logger.debug("Got diff to base branch", {
          diffLength: diff.length,
        });
        return diff || "No changes found compared to base branch.";
      } catch (error: any) {
        Logger.error("Error in git_get_diff_to_base process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error getting diff: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "git_get_working_diff",
        description:
          "Retrieves the unified diff of all unstaged and staged changes in the working directory. " +
          "Shows exactly what would be committed. Use this before generating commit messages or committing changes.",
      },
      type: "function",
    },
    process: async (_args: unknown, print) => {
      print(COLORS.tool("\nGetting working directory diff...\n"));
      Logger.info("Starting git_get_working_diff process");
      try {
        const diff = await getGitDiffToLatestCommit();
        Logger.debug("Got working directory diff", {
          diffLength: diff.length,
        });
        return diff || "No uncommitted changes found.";
      } catch (error: any) {
        Logger.error("Error in git_get_working_diff process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error getting diff: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "git_commit",
        description:
          "Commits all changes with the provided message. Takes a commit message as parameter. " +
          "Use git_get_working_diff first to see what will be committed, then use this tool " +
          "with an appropriate commit message.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The commit message to use",
            },
          },
          required: ["message"],
        },
      },
      type: "function",
    },
    process: async (args: any, print) => {
      const { message } = args;
      if (!message) {
        return "Error: commit message is required";
      }
      print(COLORS.tool("\nCommitting changes...\n"));
      Logger.info("Starting git_commit process", { message });
      try {
        await commitAllChanges(message);
        Logger.info("Successfully committed changes", { message });
        return `Successfully committed with message: "${message}"`;
      } catch (error: any) {
        Logger.error("Error in git_commit process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error during commit: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "git_generate_commit_message",
        description:
          "Generates a concise, descriptive commit message based on provided diff. " +
          "Takes a unified diff as parameter and returns an AI-generated commit message. " +
          "Use git_get_working_diff first to get the diff, then use this tool.",
        parameters: {
          type: "object",
          properties: {
            diff: {
              type: "string",
              description: "The unified diff to generate commit message for",
            },
          },
          required: ["diff"],
        },
      },
      type: "function",
    },
    process: async (args: any, print) => {
      const { diff } = args;
      if (!diff) {
        return "Error: diff is required";
      }
      print(COLORS.tool("\nGenerating commit message...\n"));
      Logger.info("Starting git_generate_commit_message process");
      try {
        const response = await llm.send(
          "You are an expert senior engineer. Generate a concise git commit message for the following diff. Follow conventional commit format when appropriate.",
          diff,
        );
        Logger.info("Generated commit message", { message: response });
        return response;
      } catch (error: any) {
        Logger.error("Error in git_generate_commit_message process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error generating commit message: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "git_review",
        description:
          "Analyzes provided code diff and provides a detailed code review. " +
          "Highlights potential bugs, architectural issues, and suggests improvements. " +
          "Takes a unified diff as parameter. Use git_get_diff_to_base first to get the diff.",
        parameters: {
          type: "object",
          properties: {
            diff: {
              type: "string",
              description: "The unified diff to review",
            },
          },
          required: ["diff"],
        },
      },
      type: "function",
    },
    process: async (args: any, print) => {
      const { diff } = args;
      if (!diff) {
        return "Error: diff is required";
      }
      print(COLORS.tool("\nPreparing review...\n"));
      Logger.info("Starting git_review process");
      try {
        const response = await llm.send(
          `You are an expert senior engineer. Given a unified diff, produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format.`,
          diff,
        );
        Logger.info("Generated git review");
        return response;
      } catch (error: any) {
        Logger.error("Error in git_review process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error during review generation: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "git_create_pr_description",
        description:
          "Generates a well-structured Pull Request description in Markdown format based on provided diff. " +
          "Includes a summary of changes and technical details. Takes a unified diff as parameter. " +
          "Use git_get_diff_to_base first to get the diff.",
        parameters: {
          type: "object",
          properties: {
            diff: {
              type: "string",
              description: "The unified diff to create PR description for",
            },
          },
          required: ["diff"],
        },
      },
      type: "function",
    },
    process: async (args: any, print) => {
      const { diff } = args;
      if (!diff) {
        return "Error: diff is required";
      }
      print(COLORS.tool("\nGenerating PR description...\n"));
      Logger.info("Starting git_create_pr_description process");
      try {
        const response = await llm.send(
          `You are an AI assistant creating Pull Request (PR) descriptions. 
Analyze the provided code to understand the changes and their purpose.

Generate a PR description in Markdown with the following sections:
1. **# Summary:** Briefly state the PR's goal (problem solved or 
   feature added). Infer this from the changes.
2. **# Changes:** Describe the main technical modifications (key 
   files, components, implementation approach). Be concise.

IMPORTANT FORMATTING RULES:
- Keep ALL lines under 70 characters maximum
- Break long sentences across multiple lines
- Use proper line wrapping for readability
- Remove unnecessary whitespaces and empty lines
- Maintain clear, professional tone

If the purpose is unclear from the code, note that the summary is 
an inference. Do not invent information not present in the diff.`,
          diff,
        );
        Logger.info("Generated PR description");
        return response;
      } catch (error: any) {
        Logger.error("Error in git_create_pr_description process", {
          error: error.message,
          stack: error.stack,
        });
        return `Error during PR description generation: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
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
    process: async (_args, print) => {
      print(COLORS.tool("\nListing locally modified files...\n"));
      Logger.info("Starting git_list_local_modified_files process"); // Added
      try {
        const files = await getLocalModifiedFilePaths();
        Logger.info("Listed locally modified files", { count: files.length }); // Added
        return files.join("\n");
      } catch (error: any) {
        Logger.error("Error listing local modified files", {
          error: error.message,
          stack: error.stack,
        }); // Added
        return `Error listing files: ${error.message}`;
      }
    },
    mode: ["normal", "modify"],
  },
];

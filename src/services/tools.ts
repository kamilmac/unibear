import { OpenAI } from "npm:openai";
import { createTwoFilesPatch } from "npm:diff";

import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../utils/git.ts";

const EditOperation = z.object({
  old_text: z.string().describe("Text to search for - must match exactly"),
  new_text: z.string().describe("Text to replace with"),
}).strict();

const EditFileArgsSchema = z.object({
  file_path: z.string().describe("Absolute path pointing to file to edit"),
  edits: z.array(EditOperation),
  dryRun: z.boolean().default(false).describe(
    "Preview changes using git-style diff format",
  ),
}).strict();

const GreetArgsSchema = z.object({
  name: z.string().describe("Name of the user e.g. John"),
}).strict();
const WeatherArgsSchema = z.object({
  location: z.string().describe("location to use for weather report"),
}).strict();

const GitCommitArgsSchema = z.object({
  message: z.string().describe("Message for git commit"),
}).strict();

const ReadFileArgsSchema = z.object({
  file_path: z.string().describe("Absolute path of the file"),
}).strict();

const ReadMultipleFilesArgsSchema = z.object({
  file_paths: z.array(z.string()).describe("Absolute paths pointing to files"),
}).strict();

export const tools = (
  withWriteAccess: false,
): Array<OpenAI.ChatCompletionTool> => {
  const tls: Array<OpenAI.ChatCompletionTool> = [
    {
      function: {
        name: "say_hello",
        description:
          "Repeat greeting 8 times and share rhymes with the user's name",
        strict: true,
        parameters: zodToJsonSchema(GreetArgsSchema),
      },
      type: "function",
    },
    {
      function: {
        name: "weather",
        description: "Give weather report for given location",
        strict: true,
        parameters: zodToJsonSchema(WeatherArgsSchema),
      },
      type: "function",
    },
    {
      function: {
        name: "git_commit_with_message",
        description: "Creates git commit based on given message",
        strict: true,
        parameters: zodToJsonSchema(GitCommitArgsSchema),
      },
      type: "function",
    },
    {
      function: {
        name: "git_create_msg_and_commit_all_changes",
        description: "Commit all changes to git repository",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    // {
    //   function: {
    //     name: "read_file",
    //     description: "Return the full contents of a text file",
    //     strict: true,
    //     parameters: zodToJsonSchema(ReadFileArgsSchema),
    //   },
    //   type: "function",
    // },
    {
      function: {
        name: "read_multiple_files",
        description: "Return the full contents of multiple text files",
        strict: true,
        parameters: zodToJsonSchema(ReadMultipleFilesArgsSchema),
      },
      type: "function",
    },
    {
      function: {
        name: "list_directory",
        description:
          "List contents of current workspace directory as an extended tree view",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    {
      function: {
        name: "git_review",
        description: "Creates a review of all changes to base git branch",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
  ];
  if (withWriteAccess) {
    tls.push({
      function: {
        name: "edit_file",
        description:
          "Make line-based edits to a text file. Each edit replaces exact line sequences " +
          "with new content. Returns a git-style diff showing the changes made. Does not attempt to commit any changes to git.",
        strict: false,
        parameters: zodToJsonSchema(EditFileArgsSchema),
      },
      type: "function",
    });
  }

  return tls;
};

export const toolFuncs = {
  say_hello: ({ name }: { name: string }) => {
    return `Hi ${name}. Nice to meet you!. Say it 8 times! Share what rhymes with my name as well.`;
  },
  weather: ({ location }: { location: string }) => {
    return `${location} is frozen now and the temperature is like -1000c. `;
  },
  // edit_file: async (args) => {
  //   const parsed = EditFileArgsSchema.safeParse(args);
  //   if (!parsed.success) {
  //     throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
  //   }

  //   return await applyFileEdits(args.file_path, args.edits);
  // },
  git_commit_with_message: async (args) => {
    await commitAllChanges(args.message);
    return "Prompt user about succesfull commit with following message: " +
      args.message;
  },
  git_create_msg_and_commit_all_changes: async (args) => {
    const diff = await getGitDiffToLatestCommit();
    return `1. Create commit message based on following diff: ${diff}. 2. Use git_commit_with_message tool to commit changes with created message.`;
  },
  // read_file: async ({ file_path, log }: { file_path: string }) => {
  //   log(`reading ${file_path}`);
  //   return await Deno.readTextFile(file_path);
  // },
  read_multiple_files: async (
    { file_paths }: { file_paths: string[] },
    log,
  ) => {
    const results: Record<string, string> = {};
    for (const file_path of file_paths) {
      log(`reading ${file_path}\n`);
      results[file_path] = await Deno.readTextFile(file_path);
    }
    return JSON.stringify(results);
  },
  list_directory: async (args: { path?: string }) => {
    const dirPath = args.path ?? ".";
    // Generate extended tree view
    async function walk(path: string, prefix: string = ""): Promise<string> {
      let tree = "";
      const entries: Deno.DirEntry[] = [];
      for await (const dirEntry of Deno.readDir(path)) {
        entries.push(dirEntry);
      }
      // Exclude hidden files and folders (those starting with '.')
      const visibleEntries = entries.filter((entry) =>
        !entry.name.startsWith(".")
      );
      visibleEntries.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });
      for (let i = 0; i < visibleEntries.length; i++) {
        const entry = visibleEntries[i];
        const isLast = i === visibleEntries.length - 1;
        const connector = isLast ? "└── " : "├── ";
        tree += `${prefix}${connector}${entry.name}\n`;
        if (entry.isDirectory) {
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          tree += await walk(`${path}/${entry.name}`, newPrefix);
        }
      }
      return tree;
    }
    const tree = await walk(dirPath);
    return `Tree of ${dirPath}:\n${tree}`;
  },
  git_review: async (args) => {
    const diff = await getGitDiffToBaseBranch();
    const system =
      "You are an expert senior engineer. Given a unified diff to base branch (master or main), produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format";

    return `${system}. The diff: ${diff}`;
  },
};

async function applyFileEdits(
  filePath: string,
  edits: Array<{ old_text: string; new_text: string }>,
  dryRun = false,
): Promise<string> {
  // Read file content and normalize line endings

  const file = await Deno.readTextFile(filePath);
  const content = normalizeLineEndings(file);

  // Apply edits sequentially
  let modifiedContent = content;
  for (const edit of edits) {
    const normalizedOld = normalizeLineEndings(edit.old_text);
    const normalizedNew = normalizeLineEndings(edit.new_text);

    // If exact match exists, use it
    if (modifiedContent.includes(normalizedOld)) {
      modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
      continue;
    }

    // Otherwise, try line-by-line matching with flexibility for whitespace
    const oldLines = normalizedOld.split("\n");
    const contentLines = modifiedContent.split("\n");
    let matchFound = false;

    for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
      const potentialMatch = contentLines.slice(i, i + oldLines.length);

      // Compare lines with normalized whitespace
      const isMatch = oldLines.every((oldLine, j) => {
        const contentLine = potentialMatch[j];
        return oldLine.trim() === contentLine.trim();
      });

      if (isMatch) {
        // Preserve original indentation of first line
        const originalIndent = contentLines[i].match(/^\s*/)?.[0] || "";
        const newLines = normalizedNew.split("\n").map((line, j) => {
          if (j === 0) return originalIndent + line.trimStart();
          // For subsequent lines, try to preserve relative indentation
          const oldIndent = oldLines[j]?.match(/^\s*/)?.[0] || "";
          const newIndent = line.match(/^\s*/)?.[0] || "";
          if (oldIndent && newIndent) {
            const relativeIndent = newIndent.length - oldIndent.length;
            return originalIndent + " ".repeat(Math.max(0, relativeIndent)) +
              line.trimStart();
          }
          return line;
        });

        contentLines.splice(i, oldLines.length, ...newLines);
        modifiedContent = contentLines.join("\n");
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      throw new Error(`Could not find exact match for edit:\n${edit.old_text}`);
    }
  }

  // Create unified diff
  const diff = createUnifiedDiff(content, modifiedContent, filePath);

  // Format diff with appropriate number of backticks
  let numBackticks = 3;
  while (diff.includes("`".repeat(numBackticks))) {
    numBackticks++;
  }
  const formattedDiff = `${"`".repeat(numBackticks)}diff\n${diff}${
    "`".repeat(numBackticks)
  }\n\n`;

  if (!dryRun) {
    await Deno.writeTextFile(filePath, modifiedContent);
  }

  return formattedDiff;
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function createUnifiedDiff(
  originalContent: string,
  newContent: string,
  filepath: string = "file",
): string {
  // Ensure consistent line endings for diff
  const normalizedOriginal = normalizeLineEndings(originalContent);
  const normalizedNew = normalizeLineEndings(newContent);

  return createTwoFilesPatch(
    filepath,
    filepath,
    normalizedOriginal,
    normalizedNew,
    "original",
    "modified",
  );
}

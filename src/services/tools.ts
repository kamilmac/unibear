import { OpenAI } from "npm:openai";
import { createTwoFilesPatch } from "npm:diff";

import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { commitAllChanges, getGitDiffToLatestCommit } from "../utils/git.ts";

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

const GitLastCommitDiffArgsSchema = z.object({}).strict();
const GitCommitArgsSchema = z.object({
  message: z.string().describe("Message for git commit"),
}).strict();

export const tools: Array<OpenAI.ChatCompletionTool> = [
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
      name: "edit_file",
      description: "Use this tool only if user directly asks for edit" +
        "Make line-based edits to a text file. Each edit replaces exact line sequences " +
        "with new content. Returns a git-style diff showing the changes made. ",
      strict: false,
      parameters: zodToJsonSchema(EditFileArgsSchema),
    },
    type: "function",
  },
  {
    function: {
      name: "git_get_diff_to_previous_commit",
      description:
        "Gets diff to previous commit for purposes of commit message creation",
      strict: true,
      parameters: zodToJsonSchema(GitLastCommitDiffArgsSchema),
    },
    type: "function",
  },
  {
    function: {
      name: "git_commit",
      description: "Creates git commit based on given message",
      strict: true,
      parameters: zodToJsonSchema(GitCommitArgsSchema),
    },
    type: "function",
  },
  {
    function: {
      name: "commit_all_changes",
      description: "Commit all changes to git repository",
      strict: false,
      parameters: {},
    },
    type: "function",
  },
];

export const toolFuncs = {
  say_hello: ({ name }: { name: string }) => {
    return `Hi ${name}. Nice to meet you!. Say it 8 times! Share what rhymes with my name as well.`;
  },
  weather: ({ location }: { location: string }) => {
    return `${location} is frozen now and the temperature is like -1000c. `;
  },
  edit_file: async (args) => {
    const parsed = EditFileArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
    }

    return await applyFileEdits(args.file_path, args.edits);
  },
  git_get_diff_to_previous_commit: async (args) => {
    return await getGitDiffToLatestCommit();
  },
  git_commit: async (args) => {
    return await commitAllChanges(args.message);
  },
  commit_all_changes: async (args) => {
    return "Get git diff to previous commit, and call git_coommit tool with fitting commit message";
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

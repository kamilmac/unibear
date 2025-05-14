import { createTwoFilesPatch } from "npm:diff";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { z } from "npm:zod";
import { Tool } from "../tools.ts";
import { dirname, join } from "https://deno.land/std@0.205.0/path/mod.ts";

const EditOperation = z.object({
  old_text: z.string().describe("Text to search for - must match exactly"),
  new_text: z.string().describe("Text to replace with"),
}).strict();

const EditFileArgsSchema = z.object({
  file_path: z.string().describe("Absolute path pointing to file to edit"),
  edits: z.array(EditOperation),
}).strict();

const SearchOperation = z.object({
  pattern: z.string().describe("Pattern (possibly file name) to match"),
}).strict();

const CreateFilesArgsSchema = z.object({
  file_paths: z
    .array(z.string())
    .describe("Relative file paths to create under current working dir"),
}).strict();

export const fsTools: Tool[] = [
  {
    definition: {
      function: {
        name: "read_multiple_files",
        description: "Return the full contents of multiple text files",
        strict: true,
        parameters: zodToJsonSchema(
          z.object({
            file_paths: z.array(z.string()).describe(
              "Absolute paths pointing to files",
            ),
          }).strict(),
        ),
      },
      type: "function",
    },
    process: async (
      { file_paths },
      log: (str: string) => void,
    ) => {
      const results: Record<string, string> = {};
      for (const file_path of file_paths as string[]) {
        log(`reading from ${file_path}\n`);
        results[file_path] = await Deno.readTextFile(file_path);
      }
      return JSON.stringify(results);
    },
    mode: ["normal", "edit", "git"],
  },
  {
    definition: {
      function: {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "Searches through all subdirectories in the current workspace. The search " +
          "is case-insensitive and matches partial names. Returns full paths to all " +
          "matching items. Great for finding files when you don't know their exact location. " +
          "Never read the given file, Just directly return to user with search results",
        strict: true,
        parameters: zodToJsonSchema(
          z.object({
            pattern: z.string().describe("pattern to match"),
          }).strict(),
        ),
      },
      type: "function",
    },
    process: async (
      args,
      log: (str: string) => void,
    ) => {
      const parsed = SearchOperation.safeParse(args);
      if (!parsed.success) {
        log(`Invalid arguments for search_files: ${parsed.error}`);
        throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
      }
      const results = await searchFiles(
        Deno.cwd(),
        args.pattern as string,
      );
      return JSON.stringify(results);
    },
    mode: ["normal", "edit", "git"],
  },
  {
    definition: {
      function: {
        name: "create_files",
        description:
          "Create multiple files under the current working directory if they don't exist",
        strict: true,
        parameters: zodToJsonSchema(CreateFilesArgsSchema),
      },
      type: "function",
    },
    process: async (args, log) => {
      const parsed = CreateFilesArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid args for create_files: ${parsed.error}`);
      }
      const cwd = Deno.cwd();
      const created: string[] = [];
      const skipped: string[] = [];
      for (const rel of args.file_paths as string[]) {
        const full = join(cwd, rel);
        if (!full.startsWith(cwd + "/") && full !== cwd) {
          throw new Error(`Path "${rel}" is outside working directory`);
        }
        try {
          await Deno.stat(full);
          log(`skip (exists): ${full}\n`);
          skipped.push(rel);
        } catch {
          log(`create: ${full}\n`);
          await Deno.mkdir(dirname(full), { recursive: true });
          await Deno.writeTextFile(full, "");
          created.push(rel);
        }
      }
      return JSON.stringify({ created, skipped });
    },
    mode: ["edit"],
  },
  {
    definition: {
      function: {
        name: "edit_file",
        description:
          "Make line-based edits to a text file. Each edit replaces exact line sequences " +
          "with new content. Returns a git-style diff showing the changes made. Does not attempt to commit any changes to git.",
        strict: true,
        parameters: zodToJsonSchema(EditFileArgsSchema),
      },
      type: "function",
    },
    // deno-lint-ignore no-explicit-any
    process: async (args: any, log: any) => {
      const parsed = EditFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        log(`Failed parsing changes for ${args.file_path}\n`);
        throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
      }
      log(`Writing to ${args.file_path}\n`);
      return await applyFileEdits(args.file_path, args.edits);
    },
    mode: ["edit"],
  },
];

// --- new create_files tool ---

async function applyFileEdits(
  filePath: string,
  edits: Array<{ old_text: string; new_text: string }>,
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
  await Deno.writeTextFile(filePath, modifiedContent);
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
async function searchFiles(
  rootPath: string,
  pattern: string,
): Promise<string[]> {
  const results: string[] = [];
  const skipDirectories = ["node_modules"];

  async function search(currentPath: string) {
    const entries = Deno.readDirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory && skipDirectories.includes(entry.name)) {
        continue;
      }

      try {
        if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(fullPath);
        }
        if (entry.isDirectory) {
          await search(fullPath);
        }
        // deno-lint-ignore no-unused-vars
      } catch (error) {
        continue;
      }
    }
  }

  await search(rootPath);
  return results;
}

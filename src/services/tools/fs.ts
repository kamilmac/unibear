import { createTwoFilesPatch } from "npm:diff";
import * as path from "jsr:@std/path";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { z } from "npm:zod";
import { Tool } from "../tools.ts";
import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import * as os from "node:os";
import { LLMAdapter } from "../llm_providers/default.ts";
import { COLORS, MAX_SIZE } from "../../utils/constants.ts";

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
  path: z.string(),
  content: z.string(),
}).strict();

const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
}).strict();

const ListDirectoryArgsSchema = z.object({
  path: z.string(),
}).strict();

// deno-lint-ignore no-unused-vars
export const fsTools = (llm: LLMAdapter): Tool[] => [
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
      let combined = "";
      for (const file_path of file_paths as string[]) {
        log(COLORS.tool(`\nReading from:\n${file_path}\n`));
        try {
          const stats = await Deno.stat(file_path);
          if (stats.size > MAX_SIZE) {
            log(COLORS.tool("\nFile too big. content ignored.\n"));
            continue;
          }
        } catch {
          log(COLORS.tool("\nCannot access file.\n"));
          continue;
        }
        const data = await Deno.readTextFile(file_path);
        combined += `\n=== ${file_path} ===\n${data}\n`;
      }
      return combined.trim();
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
      log(COLORS.tool(`\nSearching for files:\n${parsed.data.pattern}\n`));
      const results = await searchFiles(
        Deno.cwd(),
        parsed.data.pattern,
      );
      return results.join("\n");
    },
    mode: ["normal", "edit", "git"],
  },
  {
    definition: {
      function: {
        name: "search_content",
        description:
          "Search for a substring in all files (excludes node_modules/.git)",
        strict: true,
        parameters: zodToJsonSchema(
          z.object({
            query: z.string().describe("Text to search for"),
          }).strict(),
        ),
      },
      type: "function",
    },
    process: async (args, log) => {
      const schema = z.object({
        query: z.string(),
      });
      const parsed = schema.safeParse(args);
      if (!parsed.success) throw new Error(parsed.error.message);
      const cwd = Deno.cwd();
      log(
        COLORS.tool(
          `\nSearching content for "${parsed.data.query}" in ${cwd}\n`,
        ),
      );
      const hits = await searchContent(cwd, parsed.data.query);
      return hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n");
    },
    mode: ["normal", "edit"],
  },
  {
    definition: {
      function: {
        name: "write_file",
        description:
          "Create a new file or completely overwrite an existing file with new content. " +
          "Use with caution as it will overwrite existing files without warning. " +
          "Handles text content with proper encoding.",
        strict: true,
        parameters: zodToJsonSchema(CreateFilesArgsSchema),
      },
      type: "function",
    },
    process: async (args, _log) => {
      const parsed = CreateFilesArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      const data = new TextEncoder().encode(parsed.data.content);
      await Deno.writeFile(validPath, data);
      return `Successfully wrote to ${parsed.data.path}`;
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
        log(`Edit file - failed parsing changes:\n${args.file_path}\n`);
        throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.file_path);
      log(COLORS.tool(`\nEdit file - writing to:\n${validPath}\n`));
      return await applyFileEdits(validPath, parsed.data.edits);
    },
    mode: ["edit"],
  },
  {
    definition: {
      function: {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. If the directory already exists, " +
          "this operation will succeed silently. Perfect for setting up directory " +
          "structures for projects or ensuring required paths exist. Only works within allowed directories.",
        parameters: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      type: "function",
    },
    // deno-lint-ignore no-explicit-any
    process: async (args: any, log: any) => {
      const parsed = CreateDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for create_directory: ${parsed.error}`,
        );
      }
      const validPath = await validatePath(parsed.data.path);
      log(COLORS.tool(`\nCreating dir:\n${parsed.data.path}\n`));
      await Deno.mkdir(validPath, { recursive: true });
      return `Successfully created directory ${parsed.data.path}`;
    },
    mode: ["edit"],
  },
  {
    definition: {
      function: {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results clearly distinguish between files and directories with [FILE] and [DIR] " +
          "prefixes. This tool is essential for understanding directory structure and " +
          "finding specific files within a directory. Only works within allowed directories.",
        parameters: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      type: "function",
    },
    // deno-lint-ignore no-explicit-any
    process: async (args: any, _log: any) => {
      const parsed = ListDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for list_directory: ${parsed.error}`,
        );
      }
      const validPath = await validatePath(parsed.data.path);
      const entries = Deno.readDir(validPath);
      const formatted = [];
      for await (const item of entries) {
        formatted.push(`${item.isDirectory ? "[DIR]" : "[FILE]"} ${item.name}`);
      }
      return formatted.join("\n");
    },
    mode: ["normal", "edit"],
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

const searchContent = async (
  rootPath: string,
  query: string,
): Promise<{ file: string; line: number; text: string }[]> => {
  const results: { file: string; line: number; text: string }[] = [];
  const skipDirs = ["node_modules", ".git"];
  async function recurse(dir: string) {
    for await (const ent of Deno.readDir(dir)) {
      if (skipDirs.includes(ent.name)) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory) {
        await recurse(full);
      } else {
        try {
          const stat = await Deno.stat(full);
          if (stat.size > MAX_SIZE) return;
          const text = await Deno.readTextFile(full);
          text.split("\n").forEach((line, i) => {
            if (line.includes(query)) {
              results.push({ file: full, line: i + 1, text: line });
            }
          });
        } catch {}
      }
    }
  }
  await recurse(rootPath);
  return results;
};

const searchFiles = async (
  rootPath: string,
  pattern: string,
): Promise<string[]> => {
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
};

const expandHome = (filepath: string): string => {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
};

// Security utilities
const validatePath = async (requestedPath: string): Promise<string> => {
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(Deno.cwd(), expandedPath);

  const normalizedRequested = path.normalize(absolute);

  // Check if path is within allowed directories
  const isAllowed = normalizedRequested.startsWith(Deno.cwd());
  if (!isAllowed) {
    throw new Error(
      `Access denied - path outside allowed directories: ${absolute} not in ${Deno.cwd()}`,
    );
  }

  // Handle symlinks by checking their real path
  try {
    const realPath = await Deno.realPath(absolute);
    const normalizedReal = path.normalize(realPath);
    const isRealPathAllowed = normalizedReal.startsWith(Deno.cwd());
    if (!isRealPathAllowed) {
      throw new Error(
        "Access denied - symlink target outside allowed directories",
      );
    }
    return realPath;
  } catch (_error) {
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute);
    try {
      const realParentPath = await Deno.realPath(parentDir);
      const normalizedParent = path.normalize(realParentPath);
      const isParentAllowed = normalizedParent.startsWith(Deno.cwd());
      if (!isParentAllowed) {
        throw new Error(
          "Access denied - parent directory outside allowed directories",
        );
      }
      return absolute;
    } catch {
      throw new Error(`Parent directory does not exist: ${parentDir}`);
    }
  }
};

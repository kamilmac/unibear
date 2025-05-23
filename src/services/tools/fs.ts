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
        description:
          "Retrieves and displays the complete contents of multiple text files. Ideal for examining code across related files. Limited to files under the size threshold of 2MB.",
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
          "Recursively locates files and directories containing the specified pattern in their names. " +
          "Performs a case-insensitive search throughout the workspace (excluding node_modules). " +
          "Returns full paths to all matches without reading file contents. Ideal for finding files " +
          "when you know part of the name but not the exact location.",
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
          "Searches for specific text across all files in the workspace, showing matching lines with their file paths and line numbers. " +
          "Excludes node_modules and .git directories. Use this when you need to find where particular code, variables, or text appears across the project.",
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
          "Creates a new file or replaces an existing file with specified content. " +
          "⚠️ CAUTION: Overwrites existing files without confirmation. Maintains proper text encoding. " +
          "Use when you need to create new files or completely replace existing ones.",
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
          "Performs precise text replacements in a file and shows a unified diff of the changes. " +
          "Each edit requires an exact match of old text to be replaced with new text. " +
          "Smart enough to handle whitespace variations between lines. Best for making focused changes to specific code blocks.",
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
          "Creates a new directory or ensures a directory path exists, including any necessary parent directories. " +
          "Safely handles existing directories without errors. Ideal for setting up project structures " +
          "before creating files. Limited to operations within the current workspace.",
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
          "Displays all files and directories at the specified path with clear [FILE] and [DIR] indicators. " +
          "Provides a clean overview of directory contents without recursive listing. Essential for exploring " +
          "project structure and identifying available files in a specific location.",
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

// --- Improved file editing functions ---

async function applyFileEdits(
  filePath: string,
  edits: Array<{ old_text: string; new_text: string }>,
): Promise<string> {
  const file = await Deno.readTextFile(filePath);
  const content = normalizeLineEndings(file);

  // Sort edits by position (reverse order to avoid offset issues)
  const sortedEdits = await sortEditsByPosition(content, edits);

  // Apply edits in reverse order
  let modifiedContent = content;
  for (const edit of sortedEdits.reverse()) {
    modifiedContent = await applyFuzzyEdit(modifiedContent, edit);
  }

  const diff = createUnifiedDiff(content, modifiedContent, filePath);
  await Deno.writeTextFile(filePath, modifiedContent);

  return formatDiffOutput(diff);
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function normalizeForMatching(text: string): string {
  return normalizeLineEndings(text.trim());
}

function formatDiffOutput(diff: string): string {
  let numBackticks = 3;
  while (diff.includes("`".repeat(numBackticks))) {
    numBackticks++;
  }
  return `${"`".repeat(numBackticks)}diff\n${diff}${
    "`".repeat(numBackticks)
  }\n\n`;
}

async function sortEditsByPosition(
  content: string,
  edits: Array<{ old_text: string; new_text: string }>,
): Promise<Array<{ old_text: string; new_text: string; position: number }>> {
  const editsWithPositions = [];

  for (const edit of edits) {
    const normalizedOld = normalizeForMatching(edit.old_text);
    let position = content.indexOf(normalizedOld);

    if (position === -1) {
      // Try fuzzy matching to find position
      const match = findBestMatch(content, normalizedOld);
      position = match ? match.start : -1;
    }

    editsWithPositions.push({ ...edit, position });
  }

  // Sort by position (later positions first for reverse application)
  return editsWithPositions.sort((a, b) => b.position - a.position);
}

function findBestMatch(
  content: string,
  target: string,
): { start: number; end: number; score: number } | null {
  const contentLines = content.split("\n");
  const targetLines = target.split("\n");

  let bestMatch = null;
  let bestScore = 0;

  for (let i = 0; i <= contentLines.length - targetLines.length; i++) {
    const candidateLines = contentLines.slice(i, i + targetLines.length);
    const score = calculateSimilarity(candidateLines, targetLines);

    if (score > bestScore && score > 0.8) { // 80% similarity threshold
      const startPos = contentLines.slice(0, i).join("\n").length +
        (i > 0 ? 1 : 0);
      const endPos = startPos + candidateLines.join("\n").length;

      bestMatch = { start: startPos, end: endPos, score };
      bestScore = score;
    }
  }

  return bestMatch;
}

function calculateSimilarity(lines1: string[], lines2: string[]): number {
  if (lines1.length !== lines2.length) return 0;

  let matches = 0;
  for (let i = 0; i < lines1.length; i++) {
    const line1 = lines1[i].trim();
    const line2 = lines2[i].trim();

    if (line1 === line2) {
      matches++;
    } else if (line1.replace(/\s+/g, " ") === line2.replace(/\s+/g, " ")) {
      matches += 0.9; // Partial match for whitespace differences
    }
  }

  return matches / lines1.length;
}

async function applyFuzzyEdit(
  content: string,
  edit: { old_text: string; new_text: string },
): Promise<string> {
  const normalizedOld = normalizeForMatching(edit.old_text);
  const normalizedNew = edit.new_text;

  // Try exact match first
  if (content.includes(normalizedOld)) {
    return content.replace(normalizedOld, normalizedNew);
  }

  // Try fuzzy matching with better similarity scoring
  const match = findBestMatch(content, normalizedOld);
  if (match) {
    return content.substring(0, match.start) +
      normalizedNew +
      content.substring(match.end);
  }

  throw new Error(
    `Could not find match for:\n${edit.old_text}\n\n` +
      `Context: ${getSurroundingContext(content, normalizedOld)}`,
  );
}

function getSurroundingContext(content: string, target: string): string {
  const lines = content.split("\n");
  const targetLines = target.split("\n");
  const firstTargetLine = targetLines[0].trim();

  // Find lines that partially match the first line of target
  const matches = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) =>
      line.includes(
        firstTargetLine.substring(0, Math.min(20, firstTargetLine.length)),
      )
    )
    .slice(0, 3); // Show max 3 potential matches

  if (matches.length === 0) {
    return "No similar content found";
  }

  return matches
    .map(({ line, index }) => `Line ${index + 1}: ${line}`)
    .join("\n");
}

function createUnifiedDiff(
  originalContent: string,
  newContent: string,
  filepath: string = "file",
): string {
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

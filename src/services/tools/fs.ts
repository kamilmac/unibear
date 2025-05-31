import * as path from "jsr:@std/path";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { z } from "npm:zod";
import { Tool } from "../tools.ts";
import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import * as os from "node:os";
import { LLMAdapter } from "../llm_providers/default.ts";
import { COLORS, MAX_SIZE } from "../../utils/constants.ts";
import { Logger } from "../logging.ts";
import { applyFileEdits } from "../file-editor.ts";

const EditOperationSchema = z.object({
  old_text: z.string().describe("Text to search for - must match exactly"),
  new_text: z.string().describe("Text to replace with"),
}).strict();

const EditFileArgsSchema = z.object({
  file_path: z.string().describe("Absolute path pointing to file to edit"),
  edits: z.array(EditOperationSchema),
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
      print: (str: string) => void,
    ) => {
      // TODO: Check if files are text vs binary
      let combined = "";
      for (const file_path of file_paths as string[]) {
        print(COLORS.tool(`\n📄 Reading from:\n${file_path}\n`));
        Logger.debug("Attempting to read file", { file_path });
        try {
          const stats = await Deno.stat(file_path);
          if (stats.size > MAX_SIZE) {
            print(COLORS.tool("\n⚠️ File too big. content ignored.\n"));
            Logger.warning("File too big, content ignored", {
              file_path,
              size: stats.size,
              maxSize: MAX_SIZE,
            }); // Added
            continue;
          }
        } catch (err: any) {
          print(COLORS.tool("\n❌ Cannot access file.\n"));
          Logger.error("Cannot access file during read", {
            file_path,
            error: err.message,
          }); // Added
          continue;
        }
        const data = await Deno.readTextFile(file_path);
        combined += `\n=== ${file_path} ===\n${data}\n`;
        Logger.debug("Successfully read file", { file_path }); // Added
      }
      return combined.trim();
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "search_files",
        description:
          "Recursively locates files and directories containing the specified pattern in their filenames. " +
          "Performs a case-insensitive search throughout the workspace (excluding node_modules). " +
          "Returns full paths to all matches without reading file contents. Ideal for finding files " +
          "when you know part of the name but not the exact location.",
        strict: true,
        parameters: zodToJsonSchema(SearchOperation),
      },
      type: "function",
    },
    process: async (
      args,
      print: (str: string) => void,
    ) => {
      const parsed = SearchOperation.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for search_files", {
          args,
          error: parsed.error.toString(),
        }); // Added
        print(`\n❌ Invalid arguments for search_files: ${parsed.error}`);
        throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
      }
      Logger.info("Searching for files", { pattern: parsed.data.pattern }); // Added
      print(COLORS.tool(`\n🔍 Searching for files:\n${parsed.data.pattern}\n`));
      const results = await searchFiles(
        Deno.cwd(),
        parsed.data.pattern,
      );
      Logger.info("File search complete", {
        pattern: parsed.data.pattern,
        count: results.length,
      }); // Added
      return results.join("\n");
    },
    mode: ["normal", "modify"],
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
    process: async (args, print) => {
      const schema = z.object({
        query: z.string(),
      });
      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for search_content", {
          args,
          error: parsed.error.message,
        }); // Added
        throw new Error(parsed.error.message);
      }
      const cwd = Deno.cwd();
      Logger.info("Searching content", { query: parsed.data.query, cwd }); // Added
      print(
        COLORS.tool(
          `\n🔍 Searching content for "${parsed.data.query}" in ${cwd}\n`,
        ),
      );
      const hits = await searchContent(cwd, parsed.data.query);
      Logger.info("Content search complete", {
        query: parsed.data.query,
        count: hits.length,
      });
      return hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n");
    },
    mode: ["normal", "modify"],
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
    process: async (args, print) => {
      const parsed = CreateFilesArgsSchema.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for write_file", {
          args,
          error: parsed.error.toString(),
        }); // Added
        throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
      }
      Logger.info("Writing file", { path: parsed.data.path }); // Added
      const validPath = await validatePath(parsed.data.path);
      const data = new TextEncoder().encode(parsed.data.content);
      print(`\n📝 Write file - ${parsed.data.path}\n`);
      await Deno.writeFile(validPath, data);
      Logger.info("Successfully wrote to file", { path: validPath }); // Added
      return `Successfully wrote to ${parsed.data.path}`;
    },
    mode: ["modify"],
  },
  {
    definition: {
      function: {
        name: "edit_file",
        description:
          "Performs precise text replacements in a file and shows a unified diff of the changes. " +
          "Each edit requires an exact match of old text to be replaced with new text. " +
          "When possible, group nearby changes into larger unified-diff hunks with surrounding context rather than many tiny diffs. " +
          "This reduces offset shifts and makes edits more robust to minor whitespace or comment tweaks.",
        strict: true,
        parameters: zodToJsonSchema(EditFileArgsSchema),
      },
      type: "function",
    },
    // deno-lint-ignore no-explicit-any
    process: async (args: any, print: any) => {
      const parsed = EditFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for edit_file", {
          args,
          error: parsed.error.toString(),
        }); // Added
        print(`\n❌ Edit file - failed parsing changes:\n${args.file_path}\n`);
        throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
      }
      Logger.info("Editing file", {
        path: parsed.data.file_path,
        editCount: parsed.data.edits.length,
      }); // Added
      const validPath = await validatePath(parsed.data.file_path);
      print(COLORS.tool(`\n✏️ Edit file - writing to:\n${validPath}\n`));
      const result = await applyFileEdits(validPath, parsed.data.edits);
      Logger.info("File edit complete", { path: validPath }); // Added
      return result;
    },
    mode: ["modify"],
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
    process: async (args: any, print: any) => {
      const parsed = CreateDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for create_directory", {
          args,
          error: parsed.error.toString(),
        }); // Added
        throw new Error(
          `Invalid arguments for create_directory: ${parsed.error}`,
        );
      }
      Logger.info("Creating directory", { path: parsed.data.path }); // Added
      const validPath = await validatePath(parsed.data.path);
      print(COLORS.tool(`\n📁 Creating dir:\n${parsed.data.path}\n`));
      await Deno.mkdir(validPath, { recursive: true });
      Logger.info("Successfully created directory", { path: validPath }); // Added
      return `Successfully created directory ${parsed.data.path}`;
    },
    mode: ["modify"],
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
    process: async (args: any, print: any) => {
      const parsed = ListDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for list_directory", {
          args,
          error: parsed.error.toString(),
        }); // Added
        throw new Error(
          `Invalid arguments for list_directory: ${parsed.error}`,
        );
      }
      Logger.info("Listing directory", { path: parsed.data.path });
      print(COLORS.tool(`\n📁 Listing dir:\n${parsed.data.path}\n`));
      const validPath = await validatePath(parsed.data.path);
      const entries = Deno.readDir(validPath);
      const formatted = [];
      for await (const item of entries) {
        formatted.push(`${item.isDirectory ? "[DIR]" : "[FILE]"} ${item.name}`);
      }
      Logger.info("Directory listing complete", {
        path: validPath,
        count: formatted.length,
      }); // Added
      return formatted.join("\n");
    },
    mode: ["normal", "modify"],
  },
];

async function getIgnoredDirs(): Promise<string[]> {
  try {
    const data = await Deno.readTextFile(".gitignore");
    return data
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("!"))
      .map((l) =>
        l.replace(/\/\*\*.*$/, "").replace(/\*.*$/, "").replace(/\/$/, "")
      )
      .filter((p) => p && p === p.replace(/\./g, ""));
  } catch {
    return [];
  }
}

const searchContent = async (
  rootPath: string,
  query: string,
): Promise<{ file: string; line: number; text: string }[]> => {
  Logger.info("Delegating search_content to ripgrep", { query, rootPath });
  const results: { file: string; line: number; text: string }[] = [];
  const ignoreDirs = await getIgnoredDirs();
  const ignoreGlobs = ignoreDirs.flatMap((d) => [
    "--glob",
    `!${d}/**`,
  ]);
  const cmd = new Deno.Command("rg", {
    args: [
      "--json",
      ...ignoreGlobs,
      "--glob",
      "!.git",
      "--glob",
      "!node_modules",
      query,
      ".",
    ],
    cwd: rootPath,
    stdout: "piped",
    stderr: "null",
  });
  const { stdout } = await cmd.output();
  const lines = new TextDecoder().decode(stdout).split("\n");
  for (const line of lines) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === "match") {
        const path = obj.data.path.text;
        const text = obj.data.lines.text.trimEnd();
        const lineNo = obj.data.line_number;
        results.push({ file: path, line: lineNo, text });
      }
    } catch {
      // skip invalid JSON
    }
  }
  Logger.info("ripgrep search complete", { count: results.length });
  return results;
};

const searchFiles = async (
  rootPath: string,
  pattern: string,
): Promise<string[]> => {
  Logger.debug("Starting file search recursive function", {
    rootPath,
    pattern,
  }); // Added
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
      } catch (error: any) {
        Logger.warning("Error processing entry during file search", {
          path: fullPath,
          error: error.message,
        }); // Added
        continue;
      }
    }
  }

  await search(rootPath);
  Logger.debug("File search recursive function finished", {
    rootPath,
    resultsCount: results.length,
  }); // Added
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
  Logger.debug("Validating path", { requestedPath }); // Added
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(Deno.cwd(), expandedPath);

  const normalizedRequested = path.normalize(absolute);

  // Check if path is within allowed directories
  const isAllowed = normalizedRequested.startsWith(Deno.cwd());
  if (!isAllowed) {
    Logger.error(
      "Path validation failed: Access denied - path outside allowed directories",
      { absolute, cwd: Deno.cwd() },
    ); // Added
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
      Logger.error(
        "Path validation failed: Access denied - symlink target outside allowed directories",
        { realPath, cwd: Deno.cwd() },
      ); // Added
      throw new Error(
        "Access denied - symlink target outside allowed directories",
      );
    }
    Logger.debug("Path validated successfully (symlink or existing file)", {
      realPath,
    }); // Added
    return realPath;
  } catch (_error: any) {
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute);
    try {
      const realParentPath = await Deno.realPath(parentDir);
      const normalizedParent = path.normalize(realParentPath);
      const isParentAllowed = normalizedParent.startsWith(Deno.cwd());
      if (!isParentAllowed) {
        Logger.error(
          "Path validation failed: Access denied - parent directory outside allowed directories",
          { parentDir, cwd: Deno.cwd() },
        ); // Added
        throw new Error(
          "Access denied - parent directory outside allowed directories",
        );
      }
      Logger.debug(
        "Path validated successfully (new file in allowed parent directory)",
        { path: absolute },
      ); // Added
      return absolute;
    } catch (err: any) {
      Logger.error("Path validation failed: Parent directory does not exist", {
        parentDir,
        error: err.message,
      }); // Added
      throw new Error(`Parent directory does not exist: ${parentDir}`);
    }
  }
};

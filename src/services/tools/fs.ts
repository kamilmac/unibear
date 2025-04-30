import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { z } from "npm:zod";
import { Tool } from "../tools.ts";

const EditOperation = z.object({
  old_text: z.string().describe("Text to search for - must match exactly"),
  new_text: z.string().describe("Text to replace with"),
}).strict();
const EditFileArgsSchema = z.object({
  file_path: z.string().describe("Absolute path pointing to file to edit"),
  edits: z.array(EditOperation),
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
        log(`reading ${file_path}\n`);
        results[file_path] = await Deno.readTextFile(file_path);
      }
      return JSON.stringify(results);
    },
    mode: ["normal", "edit", "git"],
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
    process: async (args: any, log: any) => {
      const parsed = EditFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        log(`Failed parsing changes for ${args.file_path}\n`);
        throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
      }
      log(`Writing changes to ${args.file_path}\n`);
      return await applyFileEdits(args.file_path, args.edits);
    },
    mode: ["edit"],
  },
];

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

  await Deno.writeTextFile(filePath, modifiedContent);
  return "success";
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

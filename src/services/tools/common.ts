import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { KEY_BINDINGS } from "../../utils/constants.ts";
import { Tool } from "../tools.ts";
import { fsTools } from "./fs.ts";
import { gitTools } from "./git.ts";
import { LLMAdapter } from "../llm_providers/default.ts";
import { Logger } from "../logging.ts"; // Added

const WebSearchOperation = z.object({
  search_string: z.string().describe("String for search input."),
}).strict();

const CLICommandOperation = z.object({
  command: z.string().describe(
    "The CLI command to execute (e.g., 'npm run dev', 'deno task build')",
  ),
  confirmed: z.boolean().default(false).describe(
    "Set to true only after user has explicitly confirmed execution. Defaults to false for security.",
  ),
}).strict();

export const commonTools = (llm: LLMAdapter): Tool[] => [
  {
    definition: {
      function: {
        name: "web_search",
        description:
          "Performs a web search for the specified query and returns relevant results. Use this tool when you need up-to-date information or external resources beyond the local workspace.",
        strict: true,
        parameters: zodToJsonSchema(WebSearchOperation),
      },
      type: "function",
    },
    process: async (args, print) => {
      const parsed = WebSearchOperation.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for web_search", {
          args,
          error: parsed.error.toString(),
        }); // Added
        print(`\n❌ Invalid arguments for web_search: ${parsed.error}`);
        throw new Error(`Invalid arguments for web_search: ${parsed.error}`);
      }
      Logger.info("Performing web search", {
        search_string: parsed.data.search_string,
      }); // Added
      print(`\n🌐 Searching web for ${args.search_string}...`);
      try {
        const results = await llm.webSearch(parsed.data.search_string);
        Logger.info("Web search successful", {
          search_string: parsed.data.search_string,
          result_length: results.length,
        }); // Added
        return results;
      } catch (error: any) {
        Logger.error("Web search failed", {
          search_string: parsed.data.search_string,
          error: error.message,
        }); // Added
        throw error; // Re-throw the error to be handled by the caller
      }
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "help",
        description:
          "Displays comprehensive documentation about Unibear's features, available tools, and key bindings. Use this tool when users need guidance on how to use the application or its capabilities.",
      },
      type: "function",
    },
    // deno-lint-ignore require-await
    process: async (_args, print) => {
      print("\n❓ Gathering help information...");
      Logger.info("Help tool invoked"); // Added
      const allTools = [
        ...commonTools(llm),
        ...fsTools(llm),
        ...gitTools(llm),
      ];
      const toolDetails = JSON.stringify(allTools.map((t) => ({
        tool_name: t.definition.function.name,
        tool_mode: t.mode,
        tool_description: t.definition.function.description,
      })));
      const response = `
User needs help and doesn't know how to use the app so use below information to help the user. Structure everything in markdown format.
Unibear navigation is loosely based on Vim and Helix editors.
Key bindings: ${JSON.stringify(KEY_BINDINGS)}
Tools that can be enabled in prompt mode:
${toolDetails}`;
      Logger.debug("Help information compiled", {
        response_length: response.length,
      }); // Added
      return response;
    },
    mode: ["normal", "modify"],
  },
  {
    definition: {
      function: {
        name: "execute_cli_command",
        description:
          "Executes a CLI command in the current working directory. Requires user confirmation before execution. " +
          "Use this for running scripts like 'npm run dev', 'deno task build', 'cargo run', etc. " +
          "The command will be displayed to the user for approval before execution.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description:
                "The CLI command to execute (e.g., 'npm run dev', 'deno task build')",
            },
            confirmed: {
              type: "boolean",
              description:
                "Set to true only after user has explicitly confirmed execution. Defaults to false for security.",
            },
          },
          required: ["command", "confirmed"],
          additionalProperties: false,
        },
      },
      type: "function",
    },
    process: async (args, print) => {
      const parsed = CLICommandOperation.safeParse(args);
      if (!parsed.success) {
        Logger.error("Invalid arguments for execute_cli_command", {
          args,
          error: parsed.error.toString(),
        });
        print(
          `\n❌ Invalid arguments for execute_cli_command: ${parsed.error}`,
        );
        throw new Error(
          `Invalid arguments for execute_cli_command: ${parsed.error}`,
        );
      }

      const { command, confirmed = false } = parsed.data;
      Logger.info("CLI command execution requested", { command, confirmed });

      // If not confirmed, ask for user confirmation
      if (!confirmed) {
        print(`\n⚠️  Command execution requested: ${command}\n`);
        return `Command "${command}" requires explicit user confirmation for security. ` +
          `To proceed, use the tool again with confirmed=true parameter. ` +
          `Directory: ${Deno.cwd()}`;
      }

      // Execute the command after confirmation
      print(`\n✅ User confirmed. Executing: ${command}`);
      print(`\n🚀 Running command in: ${Deno.cwd()}`);

      try {
        const commandParts = command.split(" ");
        const cmd = new Deno.Command(commandParts[0], {
          args: commandParts.slice(1),
          stdout: "piped",
          stderr: "piped",
          cwd: Deno.cwd(),
        });

        const process = cmd.spawn();
        const { code, stdout, stderr } = await process.output();

        const stdoutText = new TextDecoder().decode(stdout);
        const stderrText = new TextDecoder().decode(stderr);

        Logger.info("CLI command executed", {
          command,
          exitCode: code,
          stdoutLength: stdoutText.length,
          stderrLength: stderrText.length,
        });

        let result =
          `Command "${command}" completed with exit code: ${code}\n\n`;

        if (stdoutText.trim()) {
          result += `STDOUT:\n${stdoutText}\n\n`;
        }

        if (stderrText.trim()) {
          result += `STDERR:\n${stderrText}\n`;
        }

        if (code !== 0) {
          result += `\n⚠️  Command failed with non-zero exit code: ${code}`;
        } else {
          result += `\n✅ Command completed successfully`;
        }

        return result;
      } catch (error: any) {
        Logger.error("CLI command execution failed", {
          command,
          error: error.message,
        });
        return `❌ Failed to execute command "${command}": ${error.message}`;
      }
    },
    mode: ["modify"],
  },
];

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
    "The CLI command to execute (e.g., 'npm run dev', 'git status', 'cargo run')",
  ),
  confirmed: z.boolean().default(false).describe(
    "Set to true only after user has explicitly confirmed execution. Defaults to false for security.",
  ),
}).strict();

// Helper functions for enhanced CLI command processing
function parseCommand(command: string): string[] {
  // Handle quoted arguments and complex commands
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = "";
    } else if (!inQuotes && char === " ") {
      if (current.trim()) {
        args.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

function getCommandType(baseCommand: string): string {
  const commandTypes: Record<string, string> = {
    git: "Git command",
    npm: "NPM command",
    yarn: "Yarn command",
    pnpm: "PNPM command",
    deno: "Deno command",
    node: "Node.js command",
    cargo: "Cargo command",
    python: "Python command",
    pip: "Pip command",
    docker: "Docker command",
    kubectl: "Kubernetes command",
    make: "Make command",
    cmake: "CMake command",
    go: "Go command",
  };
  
  return commandTypes[baseCommand] || "CLI command";
}

function formatCommandResult(
  command: string,
  code: number,
  stdout: string,
  stderr: string,
  isGitCommand: boolean
): string {
  let result = `Command "${command}" completed with exit code: ${code}\n\n`;
  
  // For git commands, provide more context
  if (isGitCommand && code === 0) {
    const gitSubcommand = parseCommand(command)[1];
    if (gitSubcommand === "status" && stdout.includes("nothing to commit")) {
      result = `\n✅ Git status: Working directory clean\n\n`;
    } else if (gitSubcommand === "add" && !stderr.trim()) {
      result = `\n✅ Files successfully staged for commit\n\n`;
    } else if (gitSubcommand === "commit" && stdout.includes("commit")) {
      const commitMatch = stdout.match(/\[\w+\s+([a-f0-9]+)\]/);
      const commitHash = commitMatch ? commitMatch[1] : "unknown";
      result = `\n✅ Commit successful (${commitHash})\n\n`;
    }
  }
  
  if (stdout.trim()) {
    result += `STDOUT:\n${stdout}\n\n`;
  }
  
  if (stderr.trim()) {
    // For git, some "errors" are actually informational
    const label = isGitCommand && code === 0 ? "INFO" : "STDERR";
    result += `${label}:\n${stderr}\n\n`;
  }
  
  if (code !== 0) {
    if (isGitCommand) {
      result += `\n⚠️  Git command failed with exit code: ${code}`;
      // Add common git error hints
      if (stderr.includes("not a git repository")) {
        result += "\n💡 Hint: Run 'git init' to initialize a repository";
      } else if (stderr.includes("nothing to commit")) {
        result += "\n💡 Hint: No changes to commit";
      }
    } else {
      result += `\n⚠️  Command failed with non-zero exit code: ${code}`;
    }
  } else {
    result += `\n✅ Command completed successfully`;
  }
  
  return result;
}

function getErrorMessage(error: any, baseCommand: string): string {
  const message = error.message || error.toString();
  
  if (message.includes("No such file or directory") || 
      message.includes("command not found")) {
    return `Command '${baseCommand}' not found. Please ensure it's installed and in your PATH.`;
  }
  
  if (message.includes("Permission denied")) {
    return `Permission denied. You may need to run with elevated privileges or check file permissions.`;
  }
  
  return message;
}

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
          "Use this for running scripts like 'npm run dev', 'deno task build', 'cargo run', git commands like 'git status', 'git add', 'git commit', etc. " +
          "Supports complex commands with arguments, pipes, and redirections. The command will be displayed to the user for approval before execution.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description:
                "The CLI command to execute (e.g., 'npm run dev', 'git status', 'cargo run')",
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

      // Parse command to get base command and detect type
      const commandParts = parseCommand(command);
      const baseCommand = commandParts[0];
      const isGitCommand = baseCommand === "git";
      const commandType = getCommandType(baseCommand);

      // If not confirmed, ask for user confirmation
      if (!confirmed) {
        const commandInfo = isGitCommand && commandParts[1] 
          ? `git ${commandParts[1]}` 
          : baseCommand;
        print(`\n⚠️  ${commandType} execution requested: ${command}\n`);
        return `Command "${command}" (${commandInfo}) requires explicit user confirmation for security. ` +
          `To proceed, use the tool again with confirmed=true parameter. ` +
          `Directory: ${Deno.cwd()}`;
      }

      // Execute the command after confirmation
      print(`\n✅ User confirmed. Executing: ${command}`);
      print(`\n🚀 Running ${commandType} in: ${Deno.cwd()}`);

      try {
        const cmd = new Deno.Command(baseCommand, {
          args: commandParts.slice(1),
          stdout: "piped",
          stderr: "piped",
          cwd: Deno.cwd(),
          env: {
            ...Deno.env.toObject(),
            // Ensure git uses color output when appropriate
            ...(isGitCommand && { FORCE_COLOR: "1", GIT_TERMINAL_PROMPT: "0" }),
          },
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

        let result = formatCommandResult(
          command, 
          code, 
          stdoutText, 
          stderrText, 
          isGitCommand
        );

        return result;
      } catch (error: any) {
        Logger.error("CLI command execution failed", {
          command,
          error: error.message,
        });
        const errorMsg = getErrorMessage(error, baseCommand);
        return `❌ Failed to execute command "${command}": ${errorMsg}`;
      }
    },
    mode: ["modify"],
  },
];

import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { KEY_BINDINGS } from "../../utils/constants.ts";
import { Tool } from "../tools.ts";
import { fsTools } from "./fs.ts";
import { gitTools } from "./git.ts";
import { LLMAdapter } from "../llm_providers/default.ts";

const WebSearchOperation = z.object({
  search_string: z.string().describe("String for search input."),
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
        print(`\nInvalid arguments for web_search: ${parsed.error}`);
        throw new Error(`Invalid arguments for web_search: ${parsed.error}`);
      }
      print(`\nSearching web for ${args.search_string}...`);
      return await llm.webSearch(parsed.data.search_string);
    },
    mode: ["web"],
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
    process: async (_args, _print) => {
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
      return response;
    },
    mode: ["normal"],
  },
];

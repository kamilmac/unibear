import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { KEY_BINDINGS } from "../../utils/constants.ts";
import { Tool } from "../tools.ts";
import { fsTools } from "./fs.ts";
import { gitTools } from "./git.ts";
import { LLMAdapter } from "../llm.ts";

const WebSearchOperation = z.object({
  search_string: z.string().describe("String for search input."),
}).strict();

export const commonTools = (llm: LLMAdapter): Tool[] => [
  {
    definition: {
      function: {
        name: "web_search",
        description:
          "Does a web search for given string. Always use this tool when available.",
        strict: true,
        parameters: zodToJsonSchema(WebSearchOperation),
      },
      type: "function",
    },
    process: async (args, log) => {
      const parsed = WebSearchOperation.safeParse(args);
      if (!parsed.success) {
        log(`Invalid arguments for web_search: ${parsed.error}`);
        throw new Error(`Invalid arguments for web_search: ${parsed.error}`);
      }
      log(`Searching web for ${args.search_string}\n`);
      return await llm.webSearch(parsed.data.search_string);
    },
    mode: ["web"],
  },
  {
    definition: {
      function: {
        name: "help",
        description:
          "Provide details about how to use this App. Always run this tool when users shouts for help.",
      },
      type: "function",
    },
    // deno-lint-ignore require-await
    process: async (args, log) => {
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

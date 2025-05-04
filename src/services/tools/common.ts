import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { useStore } from "../../store/main.ts";
import {
  APP_CONTROL_PREFIX,
  TOOL_MODE_KEY_MAP,
} from "../../utils/constants.ts";
import { quit } from "../../utils/helpers.ts";
import { Tool } from "../tools.ts";
import { fsTools } from "./fs.ts";
import { gitTools } from "./git.ts";
import { APP_DIR, kbPath } from "../../utils/config.ts";
import { openai } from "../openai.ts";
import { MODEL } from "../../utils/constants.ts";

const KbArgs = z.object({
  action: z.enum(["add", "edit", "remove", "list"]),
  text: z.string().optional(),
  key: z.string().optional(),
}).strict();

export const commonTools: Tool[] = [
  {
    definition: {
      function: {
        name: APP_CONTROL_PREFIX + "_reset_chat",
        description:
          "Resets chat history and context. Equivalent of starting new session. Run this tools when user prompts similar message to: 'reset chat', 'clear history', 'clear chat'",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (_args, log) => {
      log("Resetting chat!");
      await new Promise((res) => setTimeout(res, 600));
      useStore.getState().clearChatHistory();
      return "";
    },
    mode: ["normal"],
  },

  {
    definition: {
      function: {
        name: APP_CONTROL_PREFIX + "_quit",
        description: "Quits the app completely. Shuts it down.",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (_args, log) => {
      log("Bye!");
      await new Promise((res) => setTimeout(res, 600));
      quit();
      return "";
    },
    mode: ["normal"],
  },

  {
    definition: {
      function: {
        name: "help",
        description:
          "If user ask for help -> use this tool to provide details about app usage",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (_args, log) => {
      const allTools = [
        ...commonTools,
        ...fsTools,
        ...gitTools,
      ];
      const toolDetails = JSON.stringify(allTools.map((t) => ({
        tool_name: t.definition.function.name,
        tool_mode: t.mode,
        tool_description: t.definition.function.description,
      })));
      const keyDetails = JSON.stringify(TOOL_MODE_KEY_MAP);
      const response = `
User needs help and doesn't know how to use the app so use below information to help the user. Structure everything in markdown format.

We provide following tools:
${toolDetails}
Not all tools are avaiable at all time.
User can get into "prompt" mode by pressing "i" key.
Tools can be enabled with following keys in prompt mode:
${keyDetails}
App is loosely inspired by Vim and Helix modes nad user can use HJKL keys in visual mode. Also in visual mode: "p" for paste, "v" for selection, "y" for copy. JK with shift are quick scroll.`;
      return response;
    },
    mode: ["normal"],
  },
];

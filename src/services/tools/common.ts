import { useStore } from "../../store/main.ts";
import { APP_CONTROL_PREFIX } from "../../utils/constants.ts";
import { quit } from "../../utils/helpers.ts";
import { Tool } from "../tools.ts";

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
];

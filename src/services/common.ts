import { useStore } from "../store/index.ts";

export const commonTools = [
  {
    definition: {
      function: {
        name: "app_control_reset_chat_history_and context",
        description:
          "Resets chat history and context. Equivalent of starting new session",
        strict: false,
        parameters: {},
      },
      type: "function",
    },
    process: async (args: any) => {
      useStore.getState().clearChatHistory();
    },
    mode: ["normal"],
  },
];

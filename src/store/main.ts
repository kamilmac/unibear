import { create } from "npm:zustand";
import { streamOpenAIResponse } from "../services/openai.ts";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import {
  BANNER,
  COLORS,
  SYSTEM,
  THE_AI_NAME,
  USER_LABEL,
} from "../utils/constants.ts";
import { countTokens, fileExists } from "../utils/helpers.ts";

marked.use(markedTerminal());

let latestChatItemId = 0;

const getNewChatItemId = () => ++latestChatItemId;

export const useStore = create<Store>((set, get) => ({
  init: () => {
    // Enter alt screen
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?1049h"));
    const setDimensions = () => {
      const { columns, rows } = Deno.consoleSize();
      set({ dimensions: { cols: columns, rows } });
    };
    Deno.addSignalListener("SIGWINCH", setDimensions);
    setDimensions();
  },
  injectClipboard: async () => {
    const clipboardContent = await clippy.readText();
    get().appendChatItem(
      clipboardContent,
      `Pasted content from clipboard:\n${
        COLORS.prompt(clipboardContent.slice(0, 128))
      }\n...`,
      "ai",
    );
  },
  clearChatHistory: () => {
    set({
      chat: [],
      filesInContext: [],
      operationMode: "insert",
    });
  },
  filesInContext: [],
  addFileToContext: (filePath) => {
    const absolute = filePath.startsWith("/")
      ? filePath
      : `${Deno.cwd()}/${filePath}`;
    get().appendChatItem("", `Added ${absolute} to context.`, "ai");
    if (get().filesInContext.includes(absolute)) return;
    set({
      filesInContext: [
        ...get().filesInContext,
        absolute,
      ],
    });
  },
  removeFileFromContext: (filePath) => {
    set({
      filesInContext: get()
        .filesInContext
        .filter((f) => f !== filePath),
    });
  },
  isStreamingResponse: false,
  operationMode: "insert",
  setOperationMode: (mode) => {
    set({ operationMode: mode });
  },
  dimensions: { cols: 0, rows: 0 },
  chat: [
    {
      id: getNewChatItemId(),
      content: "",
      visibleContent: COLORS.banner(BANNER).split("\n"),
      type: "ai",
    },
  ],
  appendChatItem: (content, visibleContent, type) => {
    const newChatItem: ChatItem = {
      id: getNewChatItemId(),
      content,
      visibleContent: [],
      type,
    };
    if (type === "user") {
      newChatItem.visibleContent = [
        COLORS.prompt(`${USER_LABEL}: `) + visibleContent + "\n",
      ];
    } else if (type === "ai") {
      newChatItem.visibleContent = marked.parse(
        COLORS.ai(`${THE_AI_NAME}:\n`) + visibleContent,
      ).split("\n");
    }
    set((state) => ({
      chat: state.chat.concat(newChatItem),
    }));
    return get().chat;
  },
  onSubmitUserPrompt: async (prompt, toolMode) => {
    get().appendChatItem(prompt, prompt, "user");
    let context = "";
    const files = get().filesInContext;
    if (files.length > 0) {
      let validatedFiles = "";
      for await (const file of get().filesInContext) {
        if (!(await fileExists(file))) {
          get().removeFileFromContext(file);
          get().appendChatItem(
            "",
            `Failed loading ${file}. Removing from context.`,
            "ai",
          );
        } else {
          validatedFiles += `${file}\n`;
        }
      }
      if (validatedFiles.length > 0) {
        context = "CONTEXT:\n\n" +
          "File paths of relevant files:\n" +
          validatedFiles +
          "Read contents of those files with relevant tool only if user prompt suggests a need for it.";
      }
    }
    const chat = get().chat;
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      visibleContent: [],
      type: "ai",
    };
    get().setOperationMode("normal");
    set({
      isStreamingResponse: true,
      chat: [...chat, aiChatitem],
    });
    await streamOpenAIResponse(
      context,
      chat,
      toolMode,
      (chunk) => {
        aiChatitem.content += chunk;
        aiChatitem.visibleContent = marked.parse(
          COLORS.ai(`${THE_AI_NAME}:\n`) + aiChatitem.content,
        ).split(
          "\n",
        );
        set({
          chat: [...chat, aiChatitem],
        });
      },
    );
    set({
      isStreamingResponse: false,
    });
  },
}));

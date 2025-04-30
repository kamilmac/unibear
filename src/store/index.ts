import { create } from "npm:zustand";
import { streamOpenAIResponse } from "../services/openai.ts";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import { BANNER, COLORS, SYSTEM, THE_AI_NAME } from "../utils/constants.ts";
import {
  countTokens,
  fileExists,
  getContentFromFile,
} from "../utils/helpers.ts";
import { basename } from "https://deno.land/std@0.205.0/path/mod.ts";

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
  isGitBaseDiffInjectionEnabled: false,
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
      tokensInput: 0,
      tokensOutput: 0,
      filesInContext: [],
      operationMode: "insert",
    });
  },
  workspaceName: basename(Deno.cwd()),
  filesInContext: [],
  tokensInput: 0,
  tokensOutput: 0,
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
  systemMessage: "",
  textArea: "",
  setTextArea: (text) => {
    set({ textArea: text });
  },
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
        COLORS.prompt("USER: ") + visibleContent + "\n",
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
    let filesContext = "";
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
        filesContext =
          `Load these files (absolute file paths):\n${validatedFiles}`;
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
      tokensInput: countTokens(
        SYSTEM + filesContext +
          chat.map((c) => c.content).join("\n"),
      ),
      chat: [...chat, aiChatitem],
    });
    await streamOpenAIResponse(
      filesContext,
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
      tokensOutput: countTokens(aiChatitem.content),
    });
  },
  injectContext: (content, visibleContent) => {
    get().appendChatItem(content, visibleContent, "injector");
  },
}));

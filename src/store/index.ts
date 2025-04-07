import { create } from "npm:zustand";
import { streamOpenAIResponse } from "../services/openai.ts";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
export type ChatItemType = "user" | "ai" | "injector";
import chalk from "npm:chalk";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";

marked.use(markedTerminal());

export type ChatItem = {
  id: number;
  content: string;
  visibleContent: string;
  type: ChatItemType;
  status?: string;
};

type OperationMode = "insert" | "normal";

type Store = {
  init: () => void;
  dimensions: {
    cols: number;
    rows: number;
  };
  clearChatHistory: () => void;
  filesInContext: string[];
  addFileToContext: (filePath: string) => void;
  operationMode: OperationMode;
  setOperationMode: (mode: OperationMode) => void;
  systemMessage: string;
  textArea: string;
  setTextArea: (text: string) => void;
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string) => void;
  appendChatItem: (
    content: string,
    visibleContent?: string,
    type: ChatItemType,
  ) => ChatItem[];
  isStreamingResponse: boolean;
  injectClipboard: () => void;
  tokensInput: number;
  tokensOutput: number;
  injectContext: (content: string, visibleContent: string) => void;
};

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
    get().injectContext(await clippy.readText(), "Injected clipboard content");
  },
  clearChatHistory: () => {
    set({
      chat: [],
      tokensInput: 0,
      tokensOutput: 0,
      filesInContext: [],
      operationMode: "insert",
    });
    get().appendChatItem("", "Context and chat history cleared!", "command");
  },
  filesInContext: [],
  tokensInput: 0,
  tokensOutput: 0,
  addFileToContext: (filePath) => {
    if (get().filesInContext.includes(filePath)) return;
    set({
      filesInContext: [
        ...get().filesInContext,
        filePath,
      ],
    });
    get().appendChatItem("", `Added ${filePath} to context.`, "injector");
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
  chat: [],
  appendChatItem: (content, visibleContent, type) => {
    const newChatItem: ChatItem = {
      id: getNewChatItemId(),
      content,
      visibleContent: "",
      type,
    };
    if (type === "command") {
      newChatItem.visibleContent = marked.parse(
        "\n " + visibleContent + " ",
      );
    } else {
      newChatItem.visibleContent = marked.parse(chalk.bgMagentaBright.black(
        "\n " + visibleContent + " ",
      ));
    }
    set((state) => ({
      chat: state.chat.concat(newChatItem),
    }));
    return get().chat;
  },
  onSubmitUserPrompt: async (prompt) => {
    let filesContext = "";
    for await (const file of get().filesInContext) {
      const content = await getContentFromFile(file);
      filesContext += `
        File:${file}

        ${content}

      `;
    }
    const chat = get().appendChatItem(prompt, prompt, "user");
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      visibleContent: "\n",
      type: "ai",
    };
    get().setOperationMode("normal");
    set({ isStreamingResponse: true });
    const context = filesContext + chat.map((c) => c.content).join("\n");
    set({
      tokensInput: context.split("  ").filter((char) =>
        char !== " "
      ).join("").length / 3.7,
    });
    await streamOpenAIResponse(
      context,
      (chunk) => {
        aiChatitem.content += chunk;
        aiChatitem.visibleContent = marked.parse(aiChatitem.content);
        set({
          chat: [...chat, aiChatitem],
        });
      },
    );
    set({
      isStreamingResponse: false,
      tokensOutput: aiChatitem.content.split("  ").filter((char) =>
        char !== " "
      ).join("").length / 3.7,
    });
  },
  injectContext: (content, visibleContent) => {
    get().appendChatItem(content, visibleContent, "injector");
  },
}));

const getContentFromFile = async (
  filePath: string,
): Promise<string | undefined> => {
  try {
    const fileContent = await Deno.readTextFile(filePath);
    return fileContent;
  } catch (error) {
    console.error("Error reading file: ", error);
  }
};

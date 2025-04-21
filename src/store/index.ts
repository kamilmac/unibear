import { create } from "npm:zustand";
import { streamOpenAIResponse } from "../services/openai.ts";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import {
  BANNER,
  COLORS,
  HELP_TEXT,
  IS_DEV,
  SYSTEM,
} from "../utils/constants.ts";
import { getGitDiffToBaseBranch } from "../utils/git.ts";
import { buildCommands } from "./commands.ts";

marked.use(markedTerminal());

export type ChatItemType = "user" | "ai" | "injector" | "command";

export type ChatItem = {
  id: number;
  content: string;
  visibleContent: string[];
  type: ChatItemType;
  status?: string;
};

type OperationMode = "insert" | "normal" | "command";

export type Command = {
  process: (arg?: string) => void;
};

export type Store = {
  init: () => void;
  dimensions: {
    cols: number;
    rows: number;
  };
  isGitBaseDiffInjectionEnabled: boolean;
  toggleGitDiffToBaseBranchInContext: () => void;
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
    visibleContent: string,
    type: ChatItemType,
  ) => ChatItem[];
  isStreamingResponse: boolean;
  isCommandInFlight: boolean;
  injectClipboard: () => void;
  tokensInput: number;
  tokensOutput: number;
  injectContext: (content: string, visibleContent: string) => void;
  commands: Record<string, Command>;
};

let latestChatItemId = 0;

const getNewChatItemId = () => ++latestChatItemId;

const countTokens = (str: string): number => {
  return str
    .split("  ")
    .filter((char) => char !== " ")
    .join("").length / 3.7;
};

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
    if (IS_DEV) {
      get().appendChatItem("", marked.parse(HELP_TEXT), "command");
    }
  },
  toggleGitDiffToBaseBranchInContext: () => {
    set({
      isGitBaseDiffInjectionEnabled: !get().isGitBaseDiffInjectionEnabled,
    });
  },
  isGitBaseDiffInjectionEnabled: false,
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
      isGitBaseDiffInjectionEnabled: false,
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
  isCommandInFlight: false,
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
      type: "command",
    },
  ],
  appendChatItem: (content, visibleContent, type) => {
    const newChatItem: ChatItem = {
      id: getNewChatItemId(),
      content,
      visibleContent: [],
      type,
    };
    if (type === "injector") {
      newChatItem.visibleContent = [
        COLORS.command("COMMAND: ") + visibleContent + "\n",
      ];
    } else if (type === "command") {
      newChatItem.visibleContent = marked.parse(visibleContent)
        .split("\n");
    } else if (type === "user") {
      newChatItem.visibleContent = [
        COLORS.prompt("USER: ") + visibleContent + "\n",
      ];
    } else {
      newChatItem.visibleContent = marked.parse(visibleContent).split("\n");
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
    let gitContext = "";
    if (get().isGitBaseDiffInjectionEnabled) {
      const content = await getGitDiffToBaseBranch();
      gitContext = `
        Git diff to base branch:
        ${content}  
      `;
    }
    const chat = get().appendChatItem(prompt, prompt, "user");
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      visibleContent: [],
      type: "ai",
    };
    get().setOperationMode("normal");
    const context = gitContext + filesContext;
    set({
      isStreamingResponse: true,
      tokensInput: countTokens(
        SYSTEM + gitContext + filesContext +
          chat.map((c) => c.content).join("\n"),
      ),
      chat: [...chat, aiChatitem],
    });
    await streamOpenAIResponse(
      context,
      chat,
      (chunk) => {
        aiChatitem.content += chunk;
        aiChatitem.visibleContent = marked.parse(aiChatitem.content).split(
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
  commands: buildCommands(set, get),
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

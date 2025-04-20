import { create } from "npm:zustand";
import {
  generateCommitMessage,
  generatePRDescription,
  streamOpenAIResponse,
} from "../services/openai.ts";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import {
  BANNER,
  COLORS,
  HELP_TEXT,
  IS_DEV,
  PORT,
  SYSTEM,
} from "../utils/constants.ts";
import {
  commitAllChanges,
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../utils/git.ts";

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

type Command = {
  process: (arg?: string) => void;
};

type Store = {
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
  commands: {
    "toggle_git_diff": {
      process: () => {
        useStore.getState().toggleGitDiffToBaseBranchInContext();
        let msg = "Enabled Git Diff to Base branch injection";
        if (!useStore.getState().isGitBaseDiffInjectionEnabled) {
          msg = "Disabled Git Diff to Base branch injection";
        }
        useStore.getState().appendChatItem(
          "",
          msg,
          "command",
        );
      },
    },
    "clear": {
      process: () => {
        useStore.getState().clearChatHistory();
      },
    },
    "help": {
      process: () => {
        useStore.getState().appendChatItem(
          "",
          HELP_TEXT,
          "command",
        );
      },
    },
    "commit": {
      process: async () => {
        useStore.setState(() => ({ isCommandInFlight: true }));
        const diff = await getGitDiffToLatestCommit();
        if (!diff) {
          useStore.getState().appendChatItem(
            "",
            "No changes to commit",
            "command",
          );
          useStore.setState(() => ({ isCommandInFlight: false }));
          return;
        }
        const commitMsg = await generateCommitMessage(diff);
        commitAllChanges(commitMsg);
        useStore.setState(() => ({ isCommandInFlight: false }));
        useStore.getState().appendChatItem(
          "",
          `Commited all changes: ${commitMsg}`,
          "command",
        );
      },
    },
    "pr": {
      process: async () => {
        useStore.setState(() => ({ isCommandInFlight: true }));
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          useStore.getState().appendChatItem(
            "",
            "No changes to base branch",
            "command",
          );
          useStore.setState(() => ({ isCommandInFlight: false }));
          return;
        }
        const prDesc = await generatePRDescription(diff);
        useStore.setState(() => ({ isCommandInFlight: false }));
        useStore.getState().appendChatItem(
          "",
          `Commited all changes: ${prDesc}`,
          "command",
        );
      },
    },
    "inject-file": {
      process: async (arg) => {
        if (!arg) return;
        await injectFile(arg);
      },
    },
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

// Function to send file path to the inject file endpoint
async function injectFile(filePath: string): Promise<void> {
  try {
    // Convert to absolute path if not already
    const absolutePath = filePath.startsWith("/")
      ? filePath
      : `${Deno.cwd()}/${filePath}`;

    const response = await fetch(`http://localhost:${PORT}/inject/file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath: absolutePath }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Server responded with ${response.status}: ${
          errorData.error || response.statusText
        }`,
      );
    }

    console.log(`File injected successfully: ${filePath}`);
  } catch (error) {
    console.error("Failed to inject file:", error);
  }
}

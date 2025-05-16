import { create } from "npm:zustand";
import { streamLLMResponse } from "../services/llm.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import { AI_LABEL, COLORS, USER_LABEL } from "../utils/constants.ts";
import { fileExists } from "../utils/helpers.ts";
import clipboard from "npm:clipboardy";
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
  injectClipboard: () => {
    try {
      const text = clipboard.readSync();
      if (!text) return;
      const max = 128;
      const preview = text.slice(0, max);
      const suffix = text.length > max ? "…" : "";
      get().appendChatItem(
        text,
        `Pasted content from clipboard:\n${COLORS.prompt(preview)}${suffix}`,
        "ai",
      );
    } catch {
      // silently ignore failures
    }
  },
  clearChatHistory: () => {
    set({
      chat: [],
      filesInContext: [],
      operationMode: "prompt",
    });
  },
  filesInContext: [],
  addFileToContext: (filePath) => {
    const cwd = Deno.cwd();
    const absolute = filePath.startsWith("/") ? filePath : `${cwd}/${filePath}`;
    if (get().filesInContext.includes(absolute)) return;
    get().appendChatItem("", `Added ${filePath} to context.\n`, "external");
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
  operationMode: "prompt" as OperationMode,
  setOperationMode: (mode) => {
    set({ operationMode: mode });
  },
  dimensions: { cols: 0, rows: 0 },
  chat: [],
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
      newChatItem.visibleContent = (marked.parse(
        COLORS.ai(`${AI_LABEL}:\n`) + visibleContent,
      ) as string).split("\n");
    } else if (type === "external") {
      newChatItem.visibleContent = [COLORS.statusLineInactive(visibleContent)];
    }
    set((state) => ({
      chat: state.chat.concat(newChatItem),
    }));
    return get().chat;
  },
  removeChatItem: (id: number) => {
    if (get().isStreamingResponse) return;
    const item = get().chat.find((c) => c.id === id);
    if (item?.type === "external") {
      get().filesInContext.forEach((file) => {
        const relative = file.slice(Deno.cwd().length + 1);
        if (
          item.visibleContent.some((line) => line.includes(relative))
        ) {
          get().removeFileFromContext(file);
        }
      });
    }
    set((state) => ({
      chat: state.chat.filter((c) => c.id !== id),
    }));
  },
  onSubmitUserPrompt: async (prompt, toolMode) => {
    get().appendChatItem(prompt, prompt, "user");
    let context = "\n\nCONTEXT:\n" +
      "Current Working Directory: " + Deno.cwd() + "\n" +
      "It may be relevant later when using filesystem tools\n";
    const files = get().filesInContext;
    if (files.length > 0) {
      let validatedFiles = "";
      for await (const file of get().filesInContext) {
        if (!(await fileExists(file))) {
          get().appendChatItem(
            "",
            `Failed loading ${file}. Removing from context...`,
            "ai",
          );
          get().removeFileFromContext(file);
        } else {
          validatedFiles += `${file}\n`;
        }
      }
      if (validatedFiles.length > 0) {
        context += "File paths of relevant files:\n" +
          validatedFiles +
          "Read those files with relevant tool if their content is not already in the context.";
      }
    }
    const chat = get().chat;
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      visibleContent: [],
      type: "ai",
    };
    get().setOperationMode("visual");
    set({
      isStreamingResponse: true,
      chat: [...chat, aiChatitem],
    });
    await streamLLMResponse(
      context,
      chat,
      toolMode,
      (chunk) => {
        aiChatitem.content += chunk;
        aiChatitem.visibleContent = (marked.parse(
          COLORS.ai(AI_LABEL) +
            (toolMode !== "normal"
              ? COLORS.statusLineInactive(" (" + toolMode + ")")
              : "") +
            ":\n" +
            aiChatitem.content,
        ) as string).split(
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

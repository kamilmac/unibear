import { create } from "npm:zustand";
import { streamLLMResponse } from "../services/llm.ts";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";
import { AI_LABEL, COLORS, USER_LABEL } from "../utils/constants.ts";
import { fileExists } from "../utils/helpers.ts";
import clipboard from "npm:clipboardy";
import { Logger } from "../services/logging.ts"; // Added

marked.use(markedTerminal());

let latestChatItemId = 0;

const getNewChatItemId = () => ++latestChatItemId;

export const useStore = create<Store>((set, get) => ({
  init: () => {
    Logger.info("Initializing UI store and dimensions"); // Added
    // Enter alt screen
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?1049h"));
    const setDimensions = () => {
      const { columns, rows } = Deno.consoleSize();
      set({ dimensions: { cols: columns, rows } });
      Logger.debug("Console dimensions updated", { columns, rows }); // Added
    };
    if (Deno.build.os !== "windows") {
      Deno.addSignalListener("SIGWINCH", setDimensions);
    }
    setDimensions();
  },
  injectClipboard: () => {
    Logger.debug("Attempting to inject clipboard content"); // Added
    try {
      const text = clipboard.readSync();
      if (!text) {
        Logger.debug("Clipboard is empty or unreadable"); // Added
        return;
      }
      const max = 128;
      const preview = text.slice(0, max);
      const suffix = text.length > max ? "…" : "";
      get().appendChatItem(
        text,
        `Pasted content from clipboard:\n${COLORS.prompt(preview)}${suffix}`,
        "ai",
      );
      Logger.info("Clipboard content injected into chat", {
        preview_length: preview.length,
        full_length: text.length,
      }); // Added
    } catch (error: any) {
      Logger.warning("Failed to inject clipboard content", {
        error: error.message,
      }); // Added
      // silently ignore failures
    }
  },
  clearChatHistory: () => {
    Logger.info("Clearing chat history and context"); // Added
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
    if (get().filesInContext.includes(absolute)) {
      Logger.debug("File already in context, not adding again", {
        filePath: absolute,
      }); // Added
      return;
    }
    get().appendChatItem("", `Added ${filePath} to context.\n`, "external");
    Logger.info("Added file to context", { filePath: absolute }); // Added
    set({
      filesInContext: [
        ...get().filesInContext,
        absolute,
      ],
    });
  },
  removeFileFromContext: (filePath) => {
    Logger.info("Removing file from context", { filePath }); // Added
    set({
      filesInContext: get()
        .filesInContext
        .filter((f) => f !== filePath),
    });
  },
  isStreamingResponse: false,
  isCancellationRequested: false,
  cancelStream: () => {
    Logger.info("Stream cancellation requested by user");
    set({ isCancellationRequested: true });
  },
  operationMode: "prompt" as OperationMode,
  setOperationMode: (mode) => {
    Logger.debug("Operation mode changed", {
      newMode: mode,
      oldMode: get().operationMode,
    }); // Added
    set({ operationMode: mode });
  },
  modifyMode: true,
  setModifyMode: (enabled) => {
    Logger.debug("Modify mode changed", {
      newMode: enabled,
      oldMode: get().modifyMode,
    });
    set({ modifyMode: enabled });
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
    Logger.debug("Appending chat item", {
      type,
      id: newChatItem.id,
      content_length: content.length,
    }); // Added
    set((state) => ({
      chat: state.chat.concat(newChatItem),
    }));
    return get().chat;
  },
  removeChatItem: (id: number) => {
    if (get().isStreamingResponse) {
      Logger.warning("Attempted to remove chat item while streaming", { id }); // Added
      return;
    }
    const item = get().chat.find((c) => c.id === id);
    if (item?.type === "external") {
      Logger.debug(
        "Chat item to remove is external, checking associated files",
        { id },
      ); // Added
      get().filesInContext.forEach((file) => {
        const relative = file.slice(Deno.cwd().length + 1);
        if (
          item.visibleContent.some((line) => line.includes(relative))
        ) {
          Logger.debug(
            "Removing associated file from context due to chat item removal",
            { file, chatItemId: id },
          ); // Added
          get().removeFileFromContext(file);
        }
      });
    }
    Logger.info("Removing chat item", { id }); // Added
    set((state) => ({
      chat: state.chat.filter((c) => c.id !== id),
    }));
  },
  onSubmitUserPrompt: async (prompt) => {
    const toolMode = get().modifyMode ? "modify" : "normal";
    Logger.info("Submitting user prompt", {
      prompt_length: prompt.length,
      toolMode,
    }); // Added
    get().appendChatItem(prompt, prompt, "user");
    let context = "\n\nCONTEXT:\n" +
      "Current Working Directory: " + Deno.cwd() + "\n" +
      "It may be relevant later when using filesystem tools\n";
    const files = get().filesInContext;
    Logger.debug("Building context for LLM", {
      initial_context_length: context.length,
      files_in_context_count: files.length,
    }); // Added
    if (files.length > 0) {
      let validatedFiles = "";
      for await (const file of get().filesInContext) {
        if (!(await fileExists(file))) {
          Logger.warning("File in context not found, removing", { file }); // Added
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
        Logger.debug("Added validated files to LLM context", {
          validated_files_string_length: validatedFiles.length,
        }); // Added
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
    Logger.info("Starting LLM response stream", { toolMode }); // Added
    set({
      isStreamingResponse: true,
      isCancellationRequested: false,
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
            ":\n" +
            aiChatitem.content,
        ) as string).split(
          "\n",
        );
        set({
          chat: [...chat, aiChatitem],
        });
      },
      () => get().isCancellationRequested,
    );
    if (get().isCancellationRequested) {
      Logger.info("LLM response stream cancelled by user"); // Added
      aiChatitem.content += `\n\n*${
        COLORS.statusLineInactive("[Stream cancelled by user]")
      }*`;
      aiChatitem.visibleContent = (marked.parse(
        COLORS.ai(AI_LABEL) +
          ":\n" +
          aiChatitem.content,
      ) as string).split(
        "\n",
      );
      set({
        chat: [...chat, aiChatitem],
      });
    } else {
      Logger.info("LLM response stream finished"); // Added
    }
    set({
      isStreamingResponse: false,
      isCancellationRequested: false,
    });
  },
}));

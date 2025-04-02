import { create } from "npm:zustand";
import { streamOpenAIResponse } from "../services/openai.ts";

export type ChatItemType = "user" | "ai" | "injector";

export type ChatItem = {
  id: number;
  content: string;
  contentOverride?: string;
  type: ChatItemType;
  title?: string;
  hasCode?: boolean;
  selected?: boolean;
  status?: string;
};

type Store = {
  init: () => void;
  dimensions: {
    cols: number;
    rows: number;
  };
  systemMessage: string;
  textArea: string;
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string) => void;
  appendChatItem: (
    content: string,
    type: ChatItemType,
    contentOverride?: string,
  ) => ChatItem[];
  isStreamingResponse: boolean;
  injectContext: (content: string, contentOverride: string) => void;
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
  isStreamingResponse: false,
  dimensions: { cols: 0, rows: 0 },
  systemMessage: "",
  textArea: "",
  chat: [],
  appendChatItem: (content, type, contentOverride) => {
    const newChatItem: ChatItem = {
      id: getNewChatItemId(),
      content,
      type,
    };
    if (contentOverride) {
      newChatItem.contentOverride = contentOverride;
    }
    set((state) => ({
      chat: state.chat.concat(newChatItem),
    }));
    // const newChat = [...get().chat, newChatItem];
    // set({ chat: newChat });
    return get().chat;
  },
  onSubmitUserPrompt: async (prompt) => {
    const chat = get().appendChatItem(prompt, "user");
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      type: "ai",
    };
    set({ isStreamingResponse: true });
    await streamOpenAIResponse(
      chat.map((c) => c.content).join(" \n"),
      (chunk) => {
        aiChatitem.content += chunk;
        set({
          chat: [...chat, aiChatitem],
        });
      },
    );
    set({ isStreamingResponse: false });
  },
  injectContext: (content, contentOverride) => {
    get().appendChatItem(content, "injector", contentOverride);
  },
}));

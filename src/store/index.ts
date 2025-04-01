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
  systemMessage: string;
  textArea: string;
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string) => void;
  appendChatItem: (
    content: string,
    type: ChatItemType,
    contentOverride?: string,
  ) => ChatItem[];
  injectContext: (content: string, contentOverride: string) => void;
};

let latestChatItemId = 0;

const getNewChatItemId = () => ++latestChatItemId;

// Create the store and export it for the server to use
export const useStore = create<Store>((set, get) => ({
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
    const newChat = [...get().chat, newChatItem];
    set({ chat: newChat });
    return newChat;
  },
  onSubmitUserPrompt: (prompt) => {
    const chat = get().appendChatItem(prompt, "user");
    const aiChatitem: ChatItem = {
      id: getNewChatItemId(),
      content: "",
      type: "ai",
    };
    streamOpenAIResponse(
      chat.map((c) => c.content).join(" \n"),
      (chunk) => {
        aiChatitem.content += chunk;
        set({
          chat: [...chat, aiChatitem],
        });
      },
    );
  },
  injectContext: (content, contentOverride) => {
    get().appendChatItem(content, "injector", contentOverride);
  },
}));

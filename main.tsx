import React from "npm:react";
import { Box, render, Text, useInput } from "npm:ink";
import { create } from "npm:zustand";
import { OpenAI } from "npm:openai";

type ChatItemType = "user" | "ai" | "injector";

type ChatItem = {
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

const openai = new OpenAI({
  apiKey:
    "sk-SLVQgBG7ACn1N6vxsAyra9CnQa7e7i4NghA67rt8x4T3BlbkFJwbeX0mRL4IrPBgjhf5D3t4aDAoSLOmuTPIMqaeaysA",
});

const streamOpenAIResponse = async (
  content: string,
  cb: (content: string) => void,
) => {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content }],
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      cb(content);
    }
  } catch (error) {
    console.error({ error });
  }
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

const App = () => {
  const chat = useStore((store) => store.chat);
  const injectContext = useStore((store) => store.injectContext);

  // No automatic injection on startup - will be handled by the server

  return (
    <Box
      width="100%"
      flexDirection="column"
    >
      <Box flexDirection="column">
        {chat.map((item, index) => (
          <Text key={index}>{item.contentOverride ?? item.content}</Text>
        ))}
      </Box>
      <Box borderStyle="round" height={6}>
        <UserInput />
      </Box>
    </Box>
  );
};

const UserInput = () => {
  const PREFIX = " > ";
  const CURSOR = "▌";
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);

  useInput((_input, key) => {
    if (key.delete) {
      setInput(input.slice(0, -1));
      return;
    }
    if (key.return) {
      submit(input);
      setInput("");
      return;
    }
    setInput(input + _input);
  });

  return (
    <Text>
      {PREFIX}
      {input}
      {CURSOR}
    </Text>
  );
};

render(<App />);

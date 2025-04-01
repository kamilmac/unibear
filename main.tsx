import React from "npm:react";
import { Box, render, Text, useInput } from "npm:ink";
import { create } from "npm:zustand";
import { OpenAI } from "npm:openai";
import { Application, Router } from "jsr:@oak/oak";
import { handleCliArgs } from "./cli.ts";

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

  return (
    <Box
      width="100%"
      flexDirection="column"
    >
      <Box flexDirection="column">
        {chat.map((item, index) => (
          <Box
            key={index}
          >
            <Text>{item.contentOverride ?? item.content}</Text>
          </Box>
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

// Initialize the server
const initServer = async () => {
  const app = new Application();
  const router = new Router();

  // POST endpoint to inject text
  router.post("/inject/text", async (ctx) => {
    try {
      const body = await ctx.request.body.json();
      const { text, override } = body;

      if (!text) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Missing 'text' field in request body" };
        return;
      }

      const textOverride = override ||
        `Injected context: ${text.substring(0, 20)}${
          text.length > 20 ? "..." : ""
        }`;
      useStore.getState().injectContext(text, textOverride);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Text injected successfully",
      };
    } catch (error) {
      console.error("Error injecting text:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to inject text" };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  await app.listen({ port: 3000 });
};

// Check CLI arguments first
const args = Deno.args;
handleCliArgs(args).then(handled => {
  if (!handled) {
    // Only start the server and render the app if we're not just injecting text
    initServer().catch((err) => {
      console.error("Failed to start server:", err);
    });
    
    render(<App />);
  } else {
    // Exit after handling the inject command
    Deno.exit(0);
  }
});

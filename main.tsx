import React, { useEffect, useState } from "npm:react";
import { Box, Newline, render, Text, useInput, useStdin } from "npm:ink";
import { create } from "npm:zustand";
import { OpenAI } from "npm:openai";

type ChatItem = {
  id: number;
  content: string;
  type: "raw_string" | "context_injection";
  owner: "user" | "ai";
  title?: string;
  hasCode?: boolean;
  selected?: boolean;
};

type Store = {
  systemMessage: string;
  textArea: string;
  chat: ChatItem[];
  context: string;
  onSubmitPrompt: (prompt: string) => void;
  addRandomChatItem: () => void;
  sendFileToContext: (path: string) => void;
  sendTextToContext: (text: string) => void;
};

export const useStore = create<Store>((set, get) => ({
  systemMessage: "",
  textArea: "",
  chat: [],
  context: "",
  onSubmitPrompt: (prompt) => {
    set({
      chat: [...get().chat, {
        id: performance.now(),
        content: prompt,
        owner: "user",
        type: "raw_string",
      }],
    });
    const item: ChatItem = {
      id: performance.now(),
      content: "",
      owner: "ai",
      type: "raw_string",
    };
    const chat = [...get().chat];
    generateCodeStreamingOpenAI(
      chat.map((c) => c.content).join(" \n"),
      (content) => {
        item.content += content;
        set({
          chat: [...chat, item],
        });
      },
    );
  },
  addRandomChatItem: () => {
    const item: ChatItem = {
      content:
        "SFAKa klja slkfjijli ajslkjs flkajs flkajwiljf laksj flkaj sflkj aslkf jalksjf lkaj fklasj fklaj sfjk ajsf \n \n",
      owner: "ai",
      type: "raw_string",
    };
    set({
      chat: [...get().chat, item],
    });
  },
  sendFileToContext: (path) => {
  },
  sendTextToContext: (text) => {
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
        {chat.map((item, index) => <Text key={index}>{item.content}</Text>)}
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
  const [input, setInput] = useState("");
  const submit = useStore((store) => store.onSubmitPrompt);

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

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey:
    "sk-SLVQgBG7ACn1N6vxsAyra9CnQa7e7i4NghA67rt8x4T3BlbkFJwbeX0mRL4IrPBgjhf5D3t4aDAoSLOmuTPIMqaeaysA",
});

async function generateCodeStreamingOpenAI(prompt, cb) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", // Specify the GPT-4o model
      messages: [{ role: "user", content: prompt }],
      stream: true, // Enable streaming
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      cb(content);
    }
  } catch (error) {
    console.error("failed");
  }
}

/**

**/

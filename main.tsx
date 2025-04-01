import React, { useEffect, useState } from "npm:react";
import { Box, Newline, render, Text, useInput, useStdin } from "npm:ink";
import { create } from "npm:zustand";

type ChatItem = {
  content: string;
  type: "raw_string" | "context_injection";
  owner: "user" | "ai";
  title?: string;
  hasCode?: boolean;
  selected?: boolean;
};

type Store = {
  textArea: string;
  chat: ChatItem[];
  context: string;
  onSubmitPrompt: (prompt: string) => void;
  addRandomChatItem: () => void;
  sendFileToContext: (path: string) => void;
  sendTextToContext: (text: string) => void;
};

export const useStore = create<Store>((set, get) => ({
  textArea: "",
  chat: [],
  context: "",
  onSubmitPrompt: (prompt) => {
    get().addRandomChatItem();
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

/**

**/

import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";

export const App = () => {
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

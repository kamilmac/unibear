import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";

export const App = () => {
  const init = useStore((store) => store.init);
  const chat = useStore((store) => store.chat);
  const dims = useStore((store) => store.dimensions);

  React.useEffect(() => {
    init();
  }, []);

  return (
    <Box
      width={dims.cols}
      height={dims.rows}
      flexDirection="column"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        height={dims.rows - 6}
      >
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

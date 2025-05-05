import React from "npm:react";
import { Box, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import { UserInput } from "./UserInput.tsx";
import { StatusLine } from "./StatusLine.tsx";
import { Chat } from "./Chat.tsx";
import { KEY_BINDINGS, TEXT_AREA_HEIGHT } from "../utils/constants.ts";
import { quit } from "../utils/helpers.ts";

export const App = () => {
  const init = useStore((store) => store.init);
  const dims = useStore((store) => store.dimensions);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);

  React.useEffect(() => {
    init();
  }, []);

  useInput((_input, key) => {
    if (key.ctrl && _input === "q") {
      quit();
    }

    if (opMode !== "visual" && key.escape) {
      setOpMode("visual");
      return;
    }
    if (opMode === "visual" && _input === KEY_BINDINGS.promptMode[0]) {
      setOpMode("prompt");
      return;
    }
  });

  const chatHeight = opMode === "visual"
    ? dims.rows
    : dims.rows - TEXT_AREA_HEIGHT;

  return (
    <Box
      width={dims.cols}
      height={dims.rows}
      flexDirection="column"
    >
      <Box
        flexDirection="column"
        height={chatHeight}
      >
        <Chat
          height={chatHeight}
        />
      </Box>
      <UserInput />
      <StatusLine />
    </Box>
  );
};

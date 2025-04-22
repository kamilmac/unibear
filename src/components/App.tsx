import React from "npm:react";
import { Box, useApp, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";
import { StatusLine } from "./StatusLine.tsx";
import { Chat } from "./Chat.tsx";
import { TEXT_AREA_HEIGHT } from "../utils/constants.ts";
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

    if (opMode !== "normal" && key.escape) {
      setOpMode("normal");
      return;
    }
    if (opMode === "normal" && _input === "i") {
      setOpMode("insert");
      return;
    }
    if (opMode === "normal" && key.shift && _input === ":") {
      setOpMode("command");
      return;
    }
  });

  const chatHeight = opMode === "normal"
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

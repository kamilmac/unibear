import React from "npm:react";
import { Box, useApp, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";
import { StatusLine } from "./StatusLine.tsx";
import { Chat } from "./Chat.tsx";

const TEXT_AREA_HEIGHT = 6;

export const App = () => {
  const { exit } = useApp();
  const init = useStore((store) => store.init);
  const dims = useStore((store) => store.dimensions);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);
  const chat = useStore((store) => store.chat);
  const renderedChat = chat.flatMap((c) => c.visibleContent);

  React.useEffect(() => {
    init();
  }, []);

  useInput((_input, key) => {
    if ((key.ctrl && _input === "q") || (key.ctrl && _input === "c")) {
      exit();
      Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?1049l")); // Exit alternate screen
      // process.exit(0);
    }

    if (opMode === "insert" && key.escape) {
      setOpMode("normal");
      return;
    }
    if (opMode === "normal" && _input === "i") {
      setOpMode("insert");
      return;
    }
  });

  const chatHeight = opMode === "insert"
    ? dims.rows - TEXT_AREA_HEIGHT
    : dims.rows;

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
          content={renderedChat}
        />
      </Box>
      {opMode === "insert" &&
        (
          <UserInput
            height={TEXT_AREA_HEIGHT}
          />
        )}
      <StatusLine />
    </Box>
  );
};

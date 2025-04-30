import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import {
  COLORS,
  TEXT_AREA_HEIGHT,
  TOOL_MODE_KEY_MAP,
} from "../utils/constants.ts";

export const UserInput = () => {
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);
  const dims = useStore((store) => store.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((store) => store.isStreamingResponse);
  const opMode = useStore((store) => store.operationMode);
  const [toolMode, setToolMode] = React.useState<ToolMode>("normal");

  React.useEffect(() => {
    setTimeout(enableFocus, 30);
  }, []);

  useInput((_input, key) => {
    if (opMode === "normal") return;
    if (input == "" && TOOL_MODE_KEY_MAP[_input]) {
      setToolMode(TOOL_MODE_KEY_MAP[_input]);
      return;
    }
    if (key.delete) {
      if (input === "") {
        setToolMode("normal");
      }
      setInput(input.slice(0, -1));
      return;
    }
    if (key.return) {
      if (isStreaming) return;
      submit(input, toolMode);
      setInput("");
      return;
    }
    setInput(input + _input);
  });

  if (opMode === "normal") return null;

  let prefix = "";
  if (toolMode !== "normal") {
    prefix = COLORS.statusLineInactive(
      "(" + toolMode + ")" + " ",
    );
  }
  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.border}
      height={TEXT_AREA_HEIGHT}
      flexDirection="row"
    >
      <Box
        width={3}
      >
        {opMode === "insert" &&
          <Text>{COLORS.prompt(" > ")}</Text>}
      </Box>
      <Box
        width={dims.cols - 6}
        height={TEXT_AREA_HEIGHT - 2}
        overflow="hidden"
      >
        <Text dimColor={isStreaming}>
          {prefix + input + COLORS.cursor("█")}
        </Text>
      </Box>
    </Box>
  );
};

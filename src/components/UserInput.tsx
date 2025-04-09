import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import {
  COLORS,
  COMMAND_PREFIX,
  TEXT_AREA_HEIGHT,
} from "../utils/constants.ts";
import { commands } from "../utils/cli.ts";

export const UserInput = () => {
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);
  const dims = useStore((store) => store.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((store) => store.isStreamingResponse);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);

  React.useEffect(() => {
    setTimeout(enableFocus, 30);
  }, []);

  useInput((_input, key) => {
    if (opMode === "normal") return;
    if (key.delete) {
      if (input.length === 0) {
        setOpMode("insert");
      }
      setInput(input.slice(0, -1));
      return;
    }
    if (input === "" && _input === COMMAND_PREFIX) {
      setOpMode("command");
      return;
    }
    if (key.return) {
      if (isStreaming) return;
      if (opMode === "command" && input.length > 0) {
        const command = input.trim();
        setOpMode("insert");
        commands[command]?.process?.();
      } else {
        submit(input);
      }
      setInput("");
      return;
    }
    setInput(input + _input);
  });

  if (opMode === "normal") return null;

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
        {opMode === "command" &&
          <Text>{COLORS.command(` ${COMMAND_PREFIX} `)}</Text>}
      </Box>
      <Box
        width={dims.cols - 6}
        height={TEXT_AREA_HEIGHT - 2}
        overflow="hidden"
      >
        <Text color={isStreaming ? COLORS.textDisabled : COLORS.text}>
          {input + "█"}
        </Text>
      </Box>
    </Box>
  );
};

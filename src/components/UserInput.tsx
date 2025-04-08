import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { COMMAND_PREFIX, TEXT_AREA_HEIGHT } from "../utils/constants.ts";
import { commands } from "../utils/cli.ts";

export const UserInput = () => {
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);
  const dims = useStore((store) => store.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((store) => store.isStreamingResponse);
  const opMode = useStore((store) => store.operationMode);

  React.useEffect(() => {
    enableFocus();
  }, []);

  useInput((_input, key) => {
    if (opMode === "normal") return;
    if (key.delete) {
      setInput(input.slice(0, -1));
      return;
    }
    if (key.return) {
      if (isStreaming) return;
      if (input.startsWith(COMMAND_PREFIX)) {
        const command = input.slice(1);
        commands[command]?.process?.();
      } else {
        submit(input);
      }
      setInput("");
      return;
    }
    setInput(input + _input);
  });

  if (opMode == "normal") return null;

  return (
    <Box
      borderStyle="round"
      borderColor="grey"
      height={TEXT_AREA_HEIGHT}
      flexDirection="row"
    >
      <Box
        width={3}
      >
        <Text>{" > "}</Text>
      </Box>
      <Box
        width={dims.cols - 6}
        height={TEXT_AREA_HEIGHT - 2}
        overflow="hidden"
      >
        <Text color={isStreaming ? "grey" : "white"}>
          {input + "█"}
        </Text>
        {!input &&
          (
            <Text color="grey">
              {" "}
              /help
            </Text>
          )}
      </Box>
    </Box>
  );
};

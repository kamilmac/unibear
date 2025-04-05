import React from "npm:react";
import { Box, Text, useFocus, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";

export const UserInput = ({ height }: { height: number }) => {
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);
  const dims = useStore((store) => store.dimensions);
  const { enableFocus } = useFocusManager();
  const injectClipboard = useStore((store) => store.injectClipboard);

  React.useEffect(() => {
    enableFocus();
  }, []);

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
    if (key.ctrl && _input === "p") {
      injectClipboard();
      return;
    }
    setInput(input + _input);
  });

  return (
    <Box
      borderStyle="round"
      borderColor="grey"
      height={height}
      flexDirection="row"
    >
      <Box
        width={3}
      >
        <Text>{" > "}</Text>
      </Box>
      <Box
        width={dims.cols - 6}
        height={height - 2}
        overflow="hidden"
      >
        <Text>
          {input + "█"}
        </Text>
      </Box>
    </Box>
  );
};

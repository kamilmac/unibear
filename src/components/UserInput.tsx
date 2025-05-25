import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import {
  COLORS,
  PROMPT_PLACEHOLDER,
  TEXT_AREA_HEIGHT,
} from "../utils/constants.ts";

export const UserInput = () => {
  const [input, setInput] = React.useState<string>("");
  const [cursor, setCursor] = React.useState<number>(0);
  const submit = useStore((s) => s.onSubmitUserPrompt);
  const dims = useStore((s) => s.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((s) => s.isStreamingResponse);
  const opMode = useStore((s) => s.operationMode);

  React.useEffect(() => {
    setTimeout(enableFocus, 30);
  }, []);

  useInput((ch, key) => {
    if (opMode === "visual") return;

    if (key.leftArrow) {
      setCursor((c: number) => Math.max(0, c - 1));
      return;
    }
    if (key.rightArrow) {
      setCursor((c: number) => Math.min(input.length, c + 1));
      return;
    }

    if (key.delete) {
      if (cursor > 0) {
        setInput((s: string) => s.slice(0, cursor - 1) + s.slice(cursor));
        setCursor((c: number) => c - 1);
      }
      return;
    }

    if (key.return) {
      if (isStreaming) return;
      submit(input);
      setInput("");
      setCursor(0);
      return;
    }

    setInput((s: string) => s.slice(0, cursor) + ch + s.slice(cursor));
    setCursor((c: number) => c + ch.length);
  });

  if (opMode === "visual") return null;

  const before = input.slice(0, cursor);
  const after = input.slice(cursor);
  const currentChar = after.charAt(0) || " ";
  const rest = after.slice(1);

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.border}
      height={TEXT_AREA_HEIGHT}
      flexDirection="row"
    >
      <Box width={3}>
        {opMode === "prompt" && <Text>{COLORS.prompt(" > ")}</Text>}
      </Box>
      <Box
        width={dims.cols - 6}
        height={TEXT_AREA_HEIGHT - 2}
        overflow="hidden"
      >
        {(input === "")
          ? (
            <Text dimColor>
              {COLORS.statusLineInactive(PROMPT_PLACEHOLDER)}
            </Text>
          )
          : (
            <Text dimColor={isStreaming}>
              {before + COLORS.cursor(currentChar) + rest}
            </Text>
          )}
      </Box>
    </Box>
  );
};

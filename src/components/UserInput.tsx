import React from "npm:react";
import { Box, Text, Transform, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import { COLORS, PROMPT_PLACEHOLDER } from "../utils/constants.ts";

interface UserInputProps {
  onHeightChange?: (h: number) => void;
}

let boxHeight = 3;
export const UserInput: React.FC<UserInputProps> = ({ onHeightChange }: UserInputProps) => {
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

  const innerWidth = dims.cols - 6;

  React.useEffect(() => {
    onHeightChange?.(boxHeight);
  }, [boxHeight, onHeightChange]);

  if (opMode === "visual") return null;

  const before = input.slice(0, cursor);
  const after = input.slice(cursor);
  const currentChar = after.charAt(0) || " ";
  const rest = after.slice(1);

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.border}
      height={boxHeight}
      flexDirection="row"
    >
      <Box width={3}>
        <Text>{COLORS.prompt(" > ")}</Text>
      </Box>
      <Box
        width={innerWidth}
        height={boxHeight - 2}
        overflow="hidden"
      >
        {(input === "")
          ? (
            <Text dimColor>
              {COLORS.statusLineInactive(PROMPT_PLACEHOLDER)}
            </Text>
          )
          : (
            <Transform
              transform={(line, idx) => {
                boxHeight = idx + 4;
                return line;
              }}
            >
              <Text dimColor={isStreaming}>
                {before + COLORS.cursor(currentChar) + rest}
              </Text>
            </Transform>
          )}
      </Box>
    </Box>
  );
};

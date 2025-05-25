import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import {
  COLORS,
  KEY_BINDINGS,
  TEXT_AREA_HEIGHT,
  TOOL_MODE_KEY_MAP,
} from "../utils/constants.ts";

export const UserInput = () => {
  const [input, setInput] = React.useState<string>("");
  const [cursor, setCursor] = React.useState<number>(0);
  const submit = useStore((s) => s.onSubmitUserPrompt);
  const dims = useStore((s) => s.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((s) => s.isStreamingResponse);
  const opMode = useStore((s) => s.operationMode);
  const modifyMode = useStore((s) => s.modifyMode);
  const setModifyMode = useStore((s) => s.setModifyMode);

  React.useEffect(() => {
    setTimeout(enableFocus, 30);
  }, []);

  useInput((ch, key) => {
    if (opMode === "visual") return;

    if (input === "" && TOOL_MODE_KEY_MAP[ch]) {
      const newToolMode = TOOL_MODE_KEY_MAP[ch];
      setModifyMode(newToolMode === "modify");
      return;
    }

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
      } else if (input === "") {
        setModifyMode(false);
      }
      return;
    }

    if (key.return) {
      if (isStreaming) return;
      submit(input, modifyMode ? "modify" : "normal");
      setInput("");
      setCursor(0);
      setModifyMode(false);
      return;
    }

    setInput((s: string) => s.slice(0, cursor) + ch + s.slice(cursor));
    setCursor((c: number) => c + ch.length);
  });

  if (opMode === "visual") return null;

  let prefix = "";
  if (modifyMode) {
    prefix = COLORS.statusLineInactive(`(modify) `);
  }

  const before = input.slice(0, cursor);
  const after = input.slice(cursor);
  const currentChar = after.charAt(0) || " ";
  const rest = after.slice(1);

  const placeholder = modifyMode
    ? "Modify mode: file-editing tools enabled"
    : `Press '${KEY_BINDINGS.useModifyTools[0]}' for modify mode`;

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
        {(input === "" && prefix === "")
          ? <Text dimColor>{COLORS.statusLineInactive(placeholder)}</Text>
          : (
            <Text dimColor={isStreaming}>
              {prefix + before + COLORS.cursor(currentChar) + rest}
            </Text>
          )}
      </Box>
    </Box>
  );
};

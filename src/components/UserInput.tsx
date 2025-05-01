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
  const [cursor, setCursor] = React.useState(0);
  const submit = useStore((s) => s.onSubmitUserPrompt);
  const dims = useStore((s) => s.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((s) => s.isStreamingResponse);
  const opMode = useStore((s) => s.operationMode);
  const [toolMode, setToolMode] = React.useState<ToolMode>("normal");

  React.useEffect(() => {
    setTimeout(enableFocus, 30);
  }, []);

  useInput((ch, key) => {
    if (opMode === "normal") return;

    if (input === "" && TOOL_MODE_KEY_MAP[ch]) {
      setToolMode(TOOL_MODE_KEY_MAP[ch]);
      return;
    }

    if (key.leftArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.rightArrow) {
      setCursor((c) => Math.min(input.length, c + 1));
      return;
    }

    if (key.delete) {
      if (cursor > 0) {
        setInput((s) => s.slice(0, cursor - 1) + s.slice(cursor));
        setCursor((c) => c - 1);
      } else if (input === "") {
        setToolMode("normal");
      }
      return;
    }

    if (key.return) {
      if (isStreaming) return;
      submit(input, toolMode);
      setInput("");
      setCursor(0);
      setToolMode("normal");
      return;
    }

    setInput((s) => s.slice(0, cursor) + ch + s.slice(cursor));
    setCursor((c) => c + ch.length);
  });

  if (opMode === "normal") return null;

  let prefix = "";
  if (toolMode !== "normal") {
    prefix = COLORS.statusLineInactive(`(${toolMode}) `);
  }

  const before = input.slice(0, cursor);
  const after = input.slice(cursor);

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.border}
      height={TEXT_AREA_HEIGHT}
      flexDirection="row"
    >
      <Box width={3}>
        {opMode === "insert" && <Text>{COLORS.prompt(" > ")}</Text>}
      </Box>
      <Box
        width={dims.cols - 6}
        height={TEXT_AREA_HEIGHT - 2}
        overflow="hidden"
      >
        <Text dimColor={isStreaming}>
          {prefix}
          {before}
          {COLORS.cursor("█")}
          {after}
        </Text>
      </Box>
    </Box>
  );
};

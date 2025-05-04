import React from "npm:react";
import { Box, Text, useFocusManager, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import {
  COLORS,
  TEXT_AREA_HEIGHT,
  TOOL_MODE_KEY_MAP,
} from "../utils/constants.ts";

function commonPrefix(arr: string[]): string {
  if (!arr.length) return "";
  let p = arr[0];
  for (const s of arr) {
    let i = 0;
    while (i < p.length && p[i] === s[i]) i++;
    p = p.slice(0, i);
  }
  return p;
}

function listDir(path: string): string[] {
  try {
    return Array.from(Deno.readDirSync(path)).map((e) =>
      e.isDirectory ? e.name + "/" : e.name
    );
  } catch {
    return [];
  }
}

function getSuggestion(
  input: string,
  cursor: number,
): string {
  const before = input.slice(0, cursor);
  const slash = before.lastIndexOf("/");
  const dir = slash >= 0 ? before.slice(0, slash) || "/" : ".";
  const fragment = slash >= 0 ? before.slice(slash + 1) : before;
  const candidates = listDir(dir).filter((n) => n.startsWith(fragment));
  if (!candidates.length) return "";
  const next = commonPrefix(candidates);
  return next.slice(fragment.length);
}

export const UserInput = () => {
  const [input, setInput] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const [suggest, setSuggest] = React.useState("");
  const [suggestActive, setSuggestActive] = React.useState(false);

  const submit = useStore((s) => s.onSubmitUserPrompt);
  const dims = useStore((s) => s.dimensions);
  const { enableFocus } = useFocusManager();
  const isStreaming = useStore((s) => s.isStreamingResponse);
  const opMode = useStore((s) => s.operationMode);
  const [toolMode, setToolMode] = React.useState<"normal" | string>(
    "normal",
  );

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
      setSuggestActive(false);
      return;
    }
    if (key.rightArrow && suggestActive) {
      setInput((s) => s.slice(0, cursor) + suggest + s.slice(cursor));
      setCursor((c) => c + suggest.length);
      setSuggest("");
      setSuggestActive(false);
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
      setSuggestActive(false);
      return;
    }

    if (key.return) {
      if (isStreaming) return;
      submit(input, toolMode);
      setInput("");
      setCursor(0);
      setToolMode("normal");
      setSuggestActive(false);
      return;
    }

    if (ch === "/") {
      const newInput = input.slice(0, cursor) + "/" + input.slice(cursor);
      const newCursor = cursor + 1;
      setInput(newInput);
      setCursor(newCursor);
      const s = getSuggestion(newInput, newCursor);
      setSuggest(s);
      setSuggestActive(!!s);
      return;
    }

    const newInput = input.slice(0, cursor) + ch + input.slice(cursor);
    const newCursor = cursor + ch.length;
    setInput(newInput);
    setCursor(newCursor);

    if (suggestActive) {
      const s = getSuggestion(newInput, newCursor);
      setSuggest(s);
      if (!s) setSuggestActive(false);
    }
  });

  if (opMode === "normal") return null;

  const prefix = toolMode === "normal"
    ? ""
    : COLORS.statusLineInactive(`(${toolMode}) `);

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
          {suggestActive && <Text dimColor>{suggest}</Text>}
          {after}
        </Text>
      </Box>
    </Box>
  );
};

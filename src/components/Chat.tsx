import React from "npm:react";
import { Box, Text, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import stripAnsi from "npm:strip-ansi";
import clipboard from "npm:clipboardy";
import {
  BANNER,
  COLORS,
  CURSOR_SCROLL_PADDING,
  KEY_BINDINGS,
} from "../utils/constants.ts";
import { Thinking } from "./Thinking.tsx";

function isBetween(number: number, a: number, b: number): boolean {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return number >= min && number <= max;
}

export const Chat = (
  { height }: { height: number },
) => {
  const chat = useStore((store) => store.chat);
  const [seqBuffer, setSeqBuffer] = React.useState("");
  const opMode = useStore((store) => store.operationMode);
  const dims = useStore((store) => store.dimensions);
  const injectClipboard = useStore((store) => store.injectClipboard);
  const isStreaming = useStore((store) => store.isStreamingResponse);
  const removeChatItem = useStore((store) => store.removeChatItem);
  const [chatRenderOffset, setChatRenderOffset] = React.useState(0);
  const [autoscrollActive, setAutoscrollActive] = React.useState(false);
  const [cursorLineIndex, setCursorLineIndex] = React.useState<number>(0);
  const [selectionOriginLineIndex, setSelectionOriginLineIndex] = React
    .useState(null);
  const innerRef = React.useRef();
  const kb = KEY_BINDINGS;
  const bannerLinesCount = COLORS.banner(BANNER).split("\n").length;

  const fullChatLines: string[] = React.useMemo(
    () => [
      ...COLORS.banner(BANNER).split("\n"),
      ...chat.flatMap((c) => c.visibleContent),
    ],
    [
      chat,
    ],
  );

  const fullChatLinesNumber = fullChatLines.length;

  const renderedChatContentLines: string[] = React.useMemo(
    () =>
      fullChatLines.slice(
        chatRenderOffset,
        chatRenderOffset + height,
      ),
    [chatRenderOffset, height, fullChatLines],
  );

  const renderedChatWrappedLinesNumber: number = React.useMemo(() => {
    let num = 0;
    for (let i = 0; i < renderedChatContentLines.length; i += 1) {
      const w = dims.cols * 1.1;
      const wraptimes = Math.floor(
        stripAnsi(renderedChatContentLines[i]).length / w,
      );
      num += 1 - wraptimes;
    }
    return num;
  }, [renderedChatContentLines, dims]);

  const scrollUpBy = React.useCallback((num: number) => {
    let newCursorLineIndex = cursorLineIndex - num;
    if (newCursorLineIndex < 0) {
      newCursorLineIndex = 0;
    }
    setCursorLineIndex(newCursorLineIndex);
    if (newCursorLineIndex < CURSOR_SCROLL_PADDING + chatRenderOffset) {
      let newScrollTop = chatRenderOffset - num;
      if (newScrollTop < 0) {
        newScrollTop = 0;
      }
      setChatRenderOffset(newScrollTop);
    }
  }, [cursorLineIndex, chatRenderOffset]);

  const scrollDownBy = React.useCallback((num: number) => {
    const newCursorLineIndex = cursorLineIndex + num;
    if (
      newCursorLineIndex >= fullChatLinesNumber + CURSOR_SCROLL_PADDING
    ) {
      return;
    }
    setCursorLineIndex(newCursorLineIndex);
    if (
      newCursorLineIndex >
        chatRenderOffset + renderedChatWrappedLinesNumber -
          CURSOR_SCROLL_PADDING
    ) {
      setChatRenderOffset(chatRenderOffset + num);
    }
  }, [
    cursorLineIndex,
    fullChatLinesNumber,
    chatRenderOffset,
    renderedChatWrappedLinesNumber,
  ]);

  React.useEffect(() => {
    if (!seqBuffer) return;
    const t = setTimeout(() => setSeqBuffer(""), 500);
    return () => clearTimeout(t);
  }, [seqBuffer]);

  // Hack-ish solution to scroll to the top when chat got cleared
  React.useEffect(() => {
    if (fullChatLinesNumber < bannerLinesCount + 2) {
      setChatRenderOffset(0);
      setCursorLineIndex(0);
      return;
    }
  }, [fullChatLinesNumber]);

  // Autoscroll to bottom when new message comes in
  React.useEffect(() => {
    if (isStreaming && autoscrollActive) { // Modified condition
      setCursorLineIndex(fullChatLinesNumber - 1);
      setChatRenderOffset(
        Math.max(0, fullChatLinesNumber - Math.round(height / 2)),
      );
    }
  }, [fullChatLinesNumber, isStreaming, autoscrollActive, height]); // Added autoscrollActive and height

  // Re-enable autoscroll when a new stream begins
  React.useEffect(() => {
    setAutoscrollActive(isStreaming);
  }, [isStreaming]);

  useInput((_input, key) => {
    setAutoscrollActive(false);
    if (key.downArrow) {
      scrollDownBy(1);
      return;
    }
    if (key.upArrow) {
      scrollUpBy(1);
      return;
    }
    if (opMode !== "visual") return;

    const matchKey = (arr: readonly string[]): boolean => {
      const next = seqBuffer + _input;
      if (arr.includes(next)) {
        setSeqBuffer("");
        return true;
      }
      if (arr.some((s) => s.startsWith(next))) {
        setSeqBuffer(_input);
        return false;
      }
      return false;
    };

    if (matchKey(kb.paste) && selectionOriginLineIndex === null) {
      injectClipboard();
      return;
    }
    if (key.escape) {
      setSelectionOriginLineIndex(null);
      return;
    }
    if (matchKey(kb.select)) {
      setSelectionOriginLineIndex(
        selectionOriginLineIndex === null ? cursorLineIndex : null,
      );
      return;
    }
    if (matchKey(kb.yank)) {
      const clipped = fullChatLines.filter((_, i) =>
        isBetween(
          i,
          selectionOriginLineIndex ?? cursorLineIndex,
          cursorLineIndex,
        )
      );
      if (clipped.length) {
        clipboard.write(stripAnsi(clipped.join("\n")) + "\n");
        setSelectionOriginLineIndex(null);
      }
      return;
    }
    if (matchKey(kb.goToEnd)) {
      setAutoscrollActive(true);
      setCursorLineIndex(fullChatLinesNumber - 1);
      setChatRenderOffset(
        Math.max(0, fullChatLinesNumber - Math.round(height / 4)),
      );
      return;
    }
    if (matchKey(kb.goToTop)) {
      setCursorLineIndex(1);
      setChatRenderOffset(0);
      return;
    }
    if (matchKey(kb.moveDown)) {
      scrollDownBy(1);
      return;
    }
    if (matchKey(kb.moveUp)) {
      scrollUpBy(1);
      return;
    }
    if (matchKey(kb.bigMoveDown)) {
      scrollDownBy(4);
      return;
    }
    if (matchKey(kb.bigMoveUp)) {
      scrollUpBy(4);
      return;
    }
    if (matchKey(kb.del)) {
      const idx = cursorLineIndex - bannerLinesCount;
      if (idx >= 0) {
        let acc = 0;
        for (const item of chat) {
          if (idx < acc + item.visibleContent.length) {
            removeChatItem(item.id);
            setCursorLineIndex(Math.max(0, cursorLineIndex - 1));
            setSelectionOriginLineIndex(null);
            break;
          }
          acc += item.visibleContent.length;
        }
      }
      return;
    }
  });

  const formattedContent = renderedChatContentLines.map((line, i) => {
    if (chatRenderOffset + i === cursorLineIndex && opMode === "visual") {
      return COLORS.selectedLineBg(stripAnsi(line || " "));
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) >= selectionOriginLineIndex &&
      (chatRenderOffset + i) < cursorLineIndex
    ) {
      return COLORS.selectedLineBg(stripAnsi(line));
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) <= selectionOriginLineIndex &&
      (chatRenderOffset + i) >= cursorLineIndex
    ) {
      return COLORS.selectedLineBg(stripAnsi(line));
    }
    return line;
  }).join("\n");

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.border}
      height={height}
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        ref={innerRef}
        flexShrink={0}
        flexDirection="column"
        paddingX={1}
      >
        <Text>{formattedContent}</Text>
        {isStreaming && <Thinking />}
        {!isStreaming && opMode === "visual" &&
          (
            <Text dimColor>
              (Press 'i' to prompt, 'Ctrl-q' to exit, 'Ctrl-d' to clear chat)
            </Text>
          )}
        {chat.length === 0 &&
          (
            <Text dimColor>
              (Write 'help!' if you're lost)
            </Text>
          )}
      </Box>
    </Box>
  );
};

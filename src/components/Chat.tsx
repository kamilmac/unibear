import React from "npm:react";
import { Box, Text, useInput } from "npm:ink";
import { useStore } from "../store/main.ts";
import stripAnsi from "npm:strip-ansi";
import * as clippy from "https://deno.land/x/clippy/mod.ts";
import { BANNER, COLORS, CURSOR_SCROLL_PADDING } from "../utils/constants.ts";
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
  const [chatRenderOffset, setChatRenderOffset] = React.useState(0);
  const [cursorLineIndex, setCursorLineIndex] = React.useState<number>(0);
  const [selectionOriginLineIndex, setSelectionOriginLineIndex] = React
    .useState(null);
  const innerRef = React.useRef();

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
      newCursorLineIndex > fullChatLinesNumber + CURSOR_SCROLL_PADDING
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
    if (fullChatLinesNumber < 5) {
      setChatRenderOffset(0);
      setCursorLineIndex(0);
    }
  }, [fullChatLinesNumber]);

  useInput((_input, key) => {
    if (key.downArrow) {
      scrollDownBy(2);
      return;
    }

    if (key.upArrow) {
      scrollUpBy(2);
      return;
    }

    if (opMode === "normal") {
      if (
        opMode === "normal" &&
        selectionOriginLineIndex === null &&
        _input === "p"
      ) {
        injectClipboard();
        return;
      }
      if (key.escape) {
        setSelectionOriginLineIndex(null);
      }
      if (_input === "v") {
        if (selectionOriginLineIndex === null) {
          setSelectionOriginLineIndex(cursorLineIndex);
        } else {
          setSelectionOriginLineIndex(null);
        }
      }
      if (_input === "y") {
        const clipped = fullChatLines.filter((_, index) => {
          return isBetween(
            index,
            selectionOriginLineIndex || cursorLineIndex,
            cursorLineIndex,
          );
        });
        if (clipped.length > 0) {
          clippy.writeText(
            stripAnsi(clipped.filter((c) => c !== null).join("\n")) + "\n",
          );
          setSelectionOriginLineIndex(null);
        }
      }
      if (_input === "g" || _input === "e" || _input === "G") {
        const buf = seqBuffer + _input;
        setSeqBuffer(buf);
        if (buf === "ge" || buf === "G") {
          const newPos = Math.max(
            0,
            fullChatLinesNumber - Math.round(height / 4),
          );
          setCursorLineIndex(fullChatLinesNumber - 1);
          setChatRenderOffset(newPos);
          setSeqBuffer("");
        } else if (buf === "gg") {
          setCursorLineIndex(1);
          setChatRenderOffset(0);
          setSeqBuffer("");
        }
        return;
      }
      if (_input === "j") {
        scrollDownBy(1);
        return;
      }
      if (_input === "k") {
        scrollUpBy(1);
        return;
      }
      if (_input === "J") {
        scrollDownBy(4);
        return;
      }
      if (_input === "K") {
        scrollUpBy(4);
        return;
      }
    }
  });

  const formattedContent = renderedChatContentLines.map((line, i) => {
    if (chatRenderOffset + i === cursorLineIndex && opMode === "normal") {
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
        {!isStreaming && opMode === "normal" &&
          (
            <Text dimColor>
              (Press 'i' to prompt)
            </Text>
          )}
        {chat.length === 0 &&
          (
            <Text dimColor>
              (Write 'help' if you're lost)
            </Text>
          )}
      </Box>
    </Box>
  );
};

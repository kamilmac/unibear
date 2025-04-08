import React from "npm:react";
import { Box, Text, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import chalk from "npm:chalk";
import stripAnsi from "npm:strip-ansi";
import * as clippy from "https://deno.land/x/clippy/mod.ts";

const CURSOR_SCROLL_PADDING = 5;

function isBetween(number: number, a: number, b: number): boolean {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return number >= min && number <= max;
}

export const Chat = (
  { height }: { height: number },
) => {
  const chat = useStore((store) => store.chat);
  const opMode = useStore((store) => store.operationMode);
  const dims = useStore((store) => store.dimensions);
  const [chatRenderOffset, setChatRenderOffset] = React.useState(0);
  const [cursorLineIndex, setCursorLineIndex] = React.useState<number>(0);
  const [selectionOriginLineIndex, setSelectionOriginLineIndex] = React
    .useState(null);
  const innerRef = React.useRef();

  const fullChatLines: string[] = React.useMemo(
    () => chat.flatMap((c) => c.visibleContent),
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

  let renderedChatWrappedLinesNumber: number = React.useMemo(() => {
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
    let newCursorLineIndex = cursorLineIndex + num;
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
        const clipped = fullChatLines.filter((line, index) => {
          return isBetween(
            index,
            selectionOriginLineIndex || cursorLineIndex,
            cursorLineIndex,
          );
        });
        if (clipped.length > 0) {
          clippy.writeText(
            stripAnsi(clipped.filter((c) => c !== null).join("\n")),
          );
        }
      }
      if (_input === "G") {
        const newPos = Math.max(
          0,
          fullChatLinesNumber - Math.round(height / 4),
        );
        setCursorLineIndex(fullChatLinesNumber - 1);
        setChatRenderOffset(newPos);
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
      return chalk.bgGray(stripAnsi(line || " "));
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) >= selectionOriginLineIndex &&
      (chatRenderOffset + i) < cursorLineIndex
    ) {
      return chalk.bgGray(stripAnsi(line));
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) < selectionOriginLineIndex &&
      (chatRenderOffset + i) >= cursorLineIndex
    ) {
      return chalk.bgGray(stripAnsi(line));
    }
    return line;
  }).join("\n");

  return (
    <Box
      borderStyle="round"
      borderColor="grey"
      height={height}
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        ref={innerRef}
        flexShrink={0}
        flexDirection="column"
        padding={1}
      >
        <Text>{formattedContent}</Text>
      </Box>
    </Box>
  );
};

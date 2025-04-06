import React from "npm:react";
import { Box, Text, useApp, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";
import chalk from "npm:chalk";
import stripAnsi from "npm:strip-ansi";
import * as clippy from "https://deno.land/x/clippy/mod.ts";

const TEXT_AREA_HEIGHT = 6;

export const App = () => {
  const { exit } = useApp();
  const init = useStore((store) => store.init);
  const dims = useStore((store) => store.dimensions);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);

  React.useEffect(() => {
    init();
  }, []);

  useInput((_input, key) => {
    if ((key.ctrl && _input === "q") || (key.ctrl && _input === "c")) {
      exit();
      Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?1049l")); // Exit alternate screen
      // process.exit(0);
    }

    if (opMode === "insert" && key.escape) {
      setOpMode("normal");
      return;
    }
    if (opMode === "normal" && _input === "i") {
      setOpMode("insert");
      return;
    }
  });

  const chatHeight = opMode === "insert"
    ? dims.rows - TEXT_AREA_HEIGHT
    : dims.rows;

  return (
    <Box
      width={dims.cols}
      height={dims.rows}
      flexDirection="column"
    >
      <Box
        flexDirection="column"
        height={chatHeight}
      >
        <Chat
          height={chatHeight}
        />
      </Box>
      {opMode === "insert" &&
        (
          <UserInput
            height={TEXT_AREA_HEIGHT}
          />
        )}
      <LegendLine />
    </Box>
  );
};

const LegendLine = () => {
  const opMode = useStore((store) => store.operationMode);
  const tokensIn = useStore((store) => store.tokensInput);
  const tokensOut = useStore((store) => store.tokensOutput);
  const modes = {
    insert: chalk.bgGreen.black(" PROMPT "),
    normal: chalk.bgBlue.black(" VISUAL "),
  };
  return (
    <Box
      justifyContent="space-between"
      height={1}
    >
      <Text>{modes[opMode]}</Text>
      <Text>Tokens: {Math.round(tokensIn)} / {Math.round(tokensOut)}</Text>
    </Box>
  );
};

const CURSOR_SCROLL_PADDING = 5;
let clipboard: (string | null)[] = [];

const Chat = (
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

  const content = chat.flatMap((c) => c.parsedContent);
  const fullChatContentLinesNumber = content.length;
  const renderedChatContentLines = content.slice(
    chatRenderOffset,
    chatRenderOffset + height,
  );
  let renderedChatContentWrappedLinesNumber = 0;
  for (let i = 0; i < renderedChatContentLines.length; i += 1) {
    const w = dims.cols * 1.1;
    const wraptimes = Math.floor(
      stripAnsi(renderedChatContentLines[i]).length / w,
    );
    renderedChatContentWrappedLinesNumber += 1 - wraptimes;
  }

  const scrollUpBy = (num: number) => {
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
  };

  const scrollDownBy = (num: number) => {
    let newCursorLineIndex = cursorLineIndex + num;
    if (
      newCursorLineIndex > fullChatContentLinesNumber + CURSOR_SCROLL_PADDING
    ) {
      return;
    }
    setCursorLineIndex(newCursorLineIndex);
    if (
      newCursorLineIndex >
        chatRenderOffset + renderedChatContentWrappedLinesNumber -
          CURSOR_SCROLL_PADDING
    ) {
      setChatRenderOffset(chatRenderOffset + num);
    }
  };

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
      if (_input === "v") {
        if (selectionOriginLineIndex === null) {
          setSelectionOriginLineIndex(cursorLineIndex);
        } else {
          // copy to clipboard
          // if (clipboard?.length) {
          //   formattedContent;
          //   clippy.writeText(
          //     stripAnsi(clipboard.filter((c) => c !== null).join("\n")),
          //   );
          //   clipboard = [];
          // }
          setSelectionOriginLineIndex(null);
        }
      }
      if (_input === "G") {
        setCursorLineIndex(fullChatContentLinesNumber - 4);
        setChatRenderOffset(fullChatContentLinesNumber - 4);
        return;
      }
      if (_input === "d") {
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

  let formattedContent = renderedChatContentLines.map((line, i) => {
    if (chatRenderOffset + i === cursorLineIndex) {
      const l = chalk.bgGray(stripAnsi(line || " "));
      return l;
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) >= selectionOriginLineIndex &&
      (chatRenderOffset + i) < cursorLineIndex
    ) {
      const l = chalk.bgGray(stripAnsi(line));
      clipboard[chatRenderOffset + i] = l;
      return l;
    }
    if (
      selectionOriginLineIndex &&
      (chatRenderOffset + i) < selectionOriginLineIndex &&
      (chatRenderOffset + i) >= cursorLineIndex
    ) {
      const l = chalk.bgGray(stripAnsi(line));
      clipboard[chatRenderOffset + i] = l;
      return l;
    }
    clipboard[chatRenderOffset + i] = null;
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
        padding={2}
      >
        <Text>{formattedContent}</Text>
      </Box>
    </Box>
  );
};

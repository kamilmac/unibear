import React from "npm:react";
import { Box, measureElement, Text, useInput } from "npm:ink";
import { ChatItem, useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";
import chalk from "npm:chalk";

const TEXT_AREA_HEIGHT = 6;

export const App = () => {
  const init = useStore((store) => store.init);
  const chat = useStore((store) => store.chat);
  const dims = useStore((store) => store.dimensions);
  const streaming = useStore((store) => store.isStreamingResponse);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);
  const renderedChat = useStore((store) => store.renderedChatContent);

  React.useEffect(() => {
    init();
  }, []);

  useInput((_input, key) => {
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
          content={renderedChat}
        />
      </Box>
      {opMode === "insert" &&
        (
          <Box borderStyle="round" height={TEXT_AREA_HEIGHT}>
            <UserInput />
          </Box>
        )}
    </Box>
  );
};

const CURSOR_SCROLL_PADDING = 5;
function Chat(
  { height, content }: { height: number; content: string },
) {
  const midLine = Math.floor(height / 3);
  const opMode = useStore((store) => store.operationMode);
  const dims = useStore((store) => store.dimensions);
  const [startIndex, setStartIndex] = React.useState(0);
  const [cursorLineIndex, setCursorLineIndex] = React.useState<number>(0);
  const [selectionOrigin, setSelectionOrigin] = React.useState(null);
  const innerRef = React.useRef();

  React.useEffect(() => {
    const dimensions = measureElement(innerRef.current);

    console.log(dimensions.height);
    // dispatch({
    //   type: "SET_INNER_HEIGHT",
    //   innerHeight: dimensions.height,
    // });
  }, []);

  const contentLines = content.split("\n").slice(
    startIndex,
    startIndex + height,
  );
  let contentLinesNum = 0;
  let wrappedLines = 0;
  for (let i = 0; i < contentLines.length; i += 1) {
    const w = dims.cols - 2;
    const wraptimes = Math.floor(contentLines[i].length / w);
    wrappedLines += wraptimes;
    // contentLinesNum += 1;
    contentLinesNum += 1;
  }
  contentLinesNum = contentLinesNum - wrappedLines;
  let visibleContent = contentLines.join(
    "\n",
  );

  useInput((_input, key) => {
    // if (key.downArrow) {
    //   setStartIndex(startIndex + 1);
    // }

    // if (key.upArrow) {
    //   setStartIndex(startIndex - 1);
    // }

    if (opMode === "normal") {
      if (_input === "s") {
        if (selectionOrigin === null) {
          setSelectionOrigin(startIndex + midLine);
        } else {
          setSelectionOrigin(null);
        }
      }
      if (_input === "j") {
        setCursorLineIndex(cursorLineIndex + 1);
        if (cursorLineIndex > contentLinesNum - CURSOR_SCROLL_PADDING) {
          setStartIndex(startIndex + 1);
        }
        return;
      }
      if (_input === "k") {
        setCursorLineIndex(cursorLineIndex - 1);
        if (cursorLineIndex < CURSOR_SCROLL_PADDING + startIndex) {
          let newScrollTop = startIndex - 1;
          if (newScrollTop < 0) {
            newScrollTop = 0;
          }
          setStartIndex(newScrollTop);
        }
        return;
      }
    }
  });

  // Write me bubble sort in zig and rust

  let formattedContent = visibleContent.split("\n").map((line, i) => {
    if (startIndex + i === cursorLineIndex) {
      // line = "DDDDDDDDDDDDDDD";
      // return cursorLineIndex + "YOYOYOYOYOYOYOYOYOYOYOY";
      return chalk.bgBlue(chalk.inverse(line));
    }
    // if (selectionOrigin) {
    //   if (i + startIndex + mid > selectionOrigin) {
    //     return chalk.bgGray(line);
    //   }
    // }
    // return i + ":" + startIndex + " " + contentLinesNum + " " + line;
    return line;
  }).join("\n");
  return (
    <Box
      borderStyle="round"
      height={height}
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        ref={innerRef}
        flexShrink={0}
        flexDirection="column"
      >
        <Text>{formattedContent}</Text>
      </Box>
    </Box>
  );
}

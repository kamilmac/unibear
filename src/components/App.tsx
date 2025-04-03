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

function Chat(
  { height, content }: { height: number; content: string },
) {
  const opMode = useStore((store) => store.operationMode);
  const [scrollTop, setScrollTop] = React.useState(0);
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

  useInput((_input, key) => {
    if (key.downArrow) {
      setScrollTop(scrollTop + 1);
    }

    if (key.upArrow) {
      setScrollTop(scrollTop - 1);
    }

    if (opMode === "normal") {
      if (_input === "s") {
        if (selectionOrigin === null) {
          setSelectionOrigin(scrollTop);
        } else {
          setSelectionOrigin(null);
        }
      }
      if (_input === "j") {
        const newScrollTop = scrollTop + 1;
        setScrollTop(newScrollTop);
        return;
      }
      if (_input === "k") {
        let newScrollTop = scrollTop - 1;
        if (newScrollTop < 0) {
          newScrollTop = 0;
        }
        setScrollTop(newScrollTop);
        return;
      }
    }
  });

  const mid = Math.floor(height / 2);
  // Write me bubble sort in zig and rust

  let visibleContent = content.split("\n").slice(
    scrollTop,
    scrollTop + height,
  ).join(
    "\n",
  );
  let formattedContent = visibleContent.split("\n").map((line, i) => {
    if (selectionOrigin) {
      if (i + scrollTop < selectionOrigin + mid) {
        return chalk.bgBlack(chalk.inverse(line));
      }
    }
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

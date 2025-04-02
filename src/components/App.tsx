import React from "npm:react";
import { Box, measureElement, Text, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";
import { marked } from "npm:marked";
import { markedTerminal } from "npm:marked-terminal";

marked.use(markedTerminal());

export const App = () => {
  const init = useStore((store) => store.init);
  const chat = useStore((store) => store.chat);
  const dims = useStore((store) => store.dimensions);
  const streaming = useStore((store) => store.isStreamingResponse);
  const opMode = useStore((store) => store.operationMode);
  const setOpMode = useStore((store) => store.setOperationMode);

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

  const chatHeight = opMode === "insert" ? dims.rows - 6 : dims.rows;

  return (
    <Box
      width={dims.cols}
      height={dims.rows}
      flexDirection="column"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        height={chatHeight}
      >
        <ScrollArea height={chatHeight}>
          {chat.map((item, index) => (
            <Box
              key={index}
              flexShrink={0}
            >
              <Text>{marked.parse(item.contentOverride ?? item.content)}</Text>
            </Box>
          ))}
        </ScrollArea>
      </Box>
      {opMode === "insert" &&
        (
          <Box borderStyle="round" height={6}>
            <UserInput />
          </Box>
        )}
    </Box>
  );
};

function ScrollArea(
  { height, children }: { height: number; children?: React.Element },
) {
  const opMode = useStore((store) => store.operationMode);
  const [scrollTop, setScrollTop] = React.useState(0);

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
      setScrollTop(scrollTop + 3);
    }

    if (key.upArrow) {
      setScrollTop(scrollTop - 3);
    }

    if (opMode === "normal") {
      if (_input === "j") {
        setScrollTop(scrollTop + 3);
      }
      if (_input === "k") {
        setScrollTop(scrollTop - 3);
      }
    }
  });

  return (
    <Box
      height={height}
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        ref={innerRef}
        flexShrink={0}
        flexDirection="column"
        marginTop={-scrollTop}
      >
        {children}
      </Box>
    </Box>
  );
}

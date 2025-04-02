import React from "npm:react";
import { Box, measureElement, Text, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";
import { UserInput } from "./UserInput.tsx";

export const App = () => {
  const init = useStore((store) => store.init);
  const chat = useStore((store) => store.chat);
  const dims = useStore((store) => store.dimensions);

  React.useEffect(() => {
    init();
  }, []);

  return (
    <Box
      width={dims.cols}
      height={dims.rows}
      flexDirection="column"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        height={dims.rows - 6}
      >
        <ScrollArea height={dims.rows - 6}>
          {chat.map((item, index) => (
            <Box
              key={index}
              width={dims.cols - 2}
              flexShrink={0}
            >
              <Text>{item.contentOverride ?? item.content}</Text>
            </Box>
          ))}
        </ScrollArea>
      </Box>
      <Box borderStyle="round" height={6}>
        <UserInput />
      </Box>
    </Box>
  );
};

function ScrollArea(
  { height, children }: { height: number; children?: React.Element },
) {
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
      setScrollTop(scrollTop - 1);
    }

    if (key.upArrow) {
      setScrollTop(scrollTop + 1);
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

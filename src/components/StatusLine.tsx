import chalk from "npm:chalk";
import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/index.ts";

export const StatusLine = () => {
  const opMode = useStore((store) => store.operationMode);
  const tokensIn = useStore((store) => store.tokensInput);
  const tokensOut = useStore((store) => store.tokensOutput);
  const files = useStore((store) => store.filesInContext);
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
      <Text>{files.length}F</Text>
      <Text>Tokens: {Math.round(tokensIn)} / {Math.round(tokensOut)}</Text>
    </Box>
  );
};

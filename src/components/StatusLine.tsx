import chalk from "npm:chalk";
import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/index.ts";

export const StatusLine = () => {
  const opMode = useStore((store) => store.operationMode);
  const tokensIn = useStore((store) => store.tokensInput);
  const tokensOut = useStore((store) => store.tokensOutput);
  const files = useStore((store) => store.filesInContext);
  const gitDiffEnabled = useStore((store) =>
    store.isGitBaseDiffInjectionEnabled
  );

  const modes = {
    insert: chalk.bgGreen.black(" PROMPT "),
    normal: chalk.bgBlue.black(" VISUAL "),
    command: chalk.bgMagenta.black(" COMMAND "),
  };

  return (
    <Box
      justifyContent="space-between"
      height={1}
    >
      <Text>{modes[opMode]}</Text>
      <Box justifyContent="flex-end">
        {files.length > 0
          ? <Text color="black" backgroundColor="green">{files.length}F</Text>
          : <Text color="white">{files.length}F</Text>}
        <Text>{" "}</Text>
        {gitDiffEnabled
          ? (
            <>
              <Text backgroundColor="green" color="black">GD</Text>
              <Text>{" "}</Text>
            </>
          )
          : (
            <>
              <Text color="white">GD</Text>
              <Text>{" "}</Text>
            </>
          )}
        <Text>
          {Math.round(tokensIn)}/{Math.round(tokensOut)}
        </Text>
      </Box>
    </Box>
  );
};

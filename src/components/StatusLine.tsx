import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/index.ts";
import { COLORS } from "../utils/constants.ts";

export const StatusLine = () => {
  const opMode = useStore((store) => store.operationMode);
  const tokensIn = useStore((store) => store.tokensInput);
  const tokensOut = useStore((store) => store.tokensOutput);
  const files = useStore((store) => store.filesInContext);
  const gitDiffEnabled = useStore((store) =>
    store.isGitBaseDiffInjectionEnabled
  );

  const modes = {
    insert: COLORS.promptIndicator(" PROMPT "),
    normal: COLORS.visualIndicator(" VISUAL "),
    command: COLORS.commandIndicator(" COMMAND "),
  };

  return (
    <Box
      justifyContent="space-between"
      height={1}
    >
      <Text>{modes[opMode]}</Text>
      <Box justifyContent="flex-end">
        <Text>
          {files.length > 0
            ? COLORS.statusLineActive(`${files.length}F `)
            : COLORS.statusLineInactive(`${files.length}F `)}
          {gitDiffEnabled
            ? COLORS.statusLineActive("GD ")
            : COLORS.statusLineInactive("GD ")}
          {COLORS.statusLineInactive(
            `${Math.round(tokensIn)}/${Math.round(tokensOut)}`,
          )}
        </Text>
      </Box>
    </Box>
  );
};

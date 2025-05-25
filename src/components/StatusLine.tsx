import React from "npm:react";
import { Box, Text } from "npm:ink";
import { useStore } from "../store/main.ts";
import { COLORS, WORKSPACE_NAME } from "../utils/constants.ts";

export const StatusLine = () => {
  const opMode = useStore((store) => store.operationMode);
  const files = useStore((store) => store.filesInContext);
  const modifyMode = useStore((store) => store.modifyMode);

  const modes = {
    prompt: COLORS.prompt(" PROMPT "),
    visual: COLORS.visual(" VISUAL "),
  };

  return (
    <Box
      justifyContent="space-between"
      height={1}
    >
      <Text inverse>{modes[opMode]}</Text>
      <Text>{COLORS.statusLineInactive(WORKSPACE_NAME)}</Text>
            <Box justifyContent="flex-end">
        <Text>
          {modifyMode
            ? COLORS.statusLineActive(" + ")
            : COLORS.statusLineInactive(" + ")}
          {files.length > 0
            ? COLORS.statusLineActive(`${files.length}F`)
            : COLORS.statusLineInactive(`${files.length}F`)}
        </Text>
      </Box>
    </Box>
  );
};

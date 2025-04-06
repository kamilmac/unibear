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
  const chat = useStore((store) => store.chat);
  const renderedChat = chat.map((c) => c.parsedContent).join(
    "\n",
  );

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
          content={renderedChat}
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

const getGitDiffToBaseBranch = async () => {
  const checkBranchExists = async (branch: string) => {
    const command = new Deno.Command("git", {
      args: ["show-ref", "--quiet", `refs/heads/${branch}`],
    });
    const { code } = await command.output();
    return code === 0; // 0 means the branch exists
  };

  // Determine which branch exists
  let baseBranch = "main";
  if (await checkBranchExists("main")) {
    baseBranch = "main";
  } else if (await checkBranchExists("master")) {
    baseBranch = "master";
  } else {
    console.error("Neither 'main' nor 'master' branch exists.");
    return null;
  }
  const command = new Deno.Command("git", {
    args: ["diff", baseBranch],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code === 0) {
    // If the command was successful, stdout will be the output of the command
    const output = new TextDecoder().decode(stdout);
    return output;
    console.log("Output:", output);
  } else {
    // If there was an error, stderr will contain the error message
    const error = new TextDecoder().decode(stderr);
    console.error("Error:", error);
  }
};

const Chat = (
  { height, content }: { height: number; content: string },
) => {
  const opMode = useStore((store) => store.operationMode);
  const dims = useStore((store) => store.dimensions);
  const [chatRenderOffset, setChatRenderOffset] = React.useState(0);
  const submit = useStore((store) => store.onSubmitUserPrompt);
  const [cursorLineIndex, setCursorLineIndex] = React.useState<number>(0);
  const [selectionOriginLineIndex, setSelectionOriginLineIndex] = React
    .useState(null);
  const innerRef = React.useRef();

  const fullChatContentLinesNumber = content.split("\n").length;
  const renderedChatContentLines = content.split("\n").slice(
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
          if (clipboard?.length) {
            formattedContent;
            clippy.writeText(
              stripAnsi(clipboard.filter((c) => c !== null).join("\n")),
            );
            clipboard = [];
          }
          setSelectionOriginLineIndex(null);
        }
      }
      if (_input === "G") {
        setCursorLineIndex(fullChatContentLinesNumber - 4);
        setChatRenderOffset(fullChatContentLinesNumber - 4);
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
      if (_input === "g") {
        getGitDiffToBaseBranch().then((resp) => {
          submit(resp);
        });
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

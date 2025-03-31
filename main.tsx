import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useApp, useInput } from "npm:ink";
import TextInput from "npm:ink-text-input";
import process from "node:process";
// import process from "node:process";

const App = () => {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useInput((input, key) => {
    // Check for Shift+Enter combination
    if (key.return && key.shift) {
      // Add a newline character to the current input
      setInput((prevInput) => prevInput + "\n");
      // Prevent default behavior
      return;
    }
  });

  const handleSubmit = (value: string) => {
    // Only submit if the value doesn't end with a newline
    // This prevents submission when Shift+Enter was just pressed
    if (!value.endsWith("\n")) {
      setHistory([...history, value]);
      setInput("");
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column">
        {history.map((item, i) => <Text key={i}>{item}</Text>)}
      </Box>
      <Box height={12} borderStyle="single" borderColor="green" padding={1}>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type something..."
          showCursor={true}
        />
      </Box>
    </Box>
  );
};

render(<App />, {
  stdout: process.stdout,
  stdin: process.stdin,
  exitOnCtrlC: true,
  patchConsole: true,
  fullscreen: true,
});

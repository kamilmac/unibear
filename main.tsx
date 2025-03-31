import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useApp, useInput } from "npm:ink";
import TextInput from "npm:ink-text-input";
// import process from "node:process";

const App = () => {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  // Handle key presses
  useInput((input, key) => {
    if (key.return && key.shift) {
      // Submit on Shift+Enter
      if (input.trim()) {
        setHistory([...history, input]);
        setInput("");
      }
    } else if (key.return) {
      // Add new line on Enter
      setInput(prev => prev + "\n");
    }
  });

  const handleSubmit = (value: string) => {
    // This won't be triggered anymore as we're handling submission manually
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column">
        {history.map((item, i) => <Text key={i}>{item}</Text>)}
      </Box>
      <Box height={12} borderStyle="single" borderColor="green" padding={1}>
        <Box flexDirection="column" width="100%">
          <Text>
            {input.split('\n').map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </Text>
          <Text>
            <Text dimColor>(Press Shift+Enter to submit)</Text>
          </Text>
        </Box>
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

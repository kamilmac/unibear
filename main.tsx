import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useInput, useApp } from "npm:ink";
import TextInput from "npm:ink-text-input";

const App = () => {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const handleSubmit = (value: string) => {
    setHistory([...history, value]);
    setInput("");
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
  fullscreen: true
});
